-- =====================================================================
-- ORDER_PKG: all business rules for orders live here, in the database.
-- The API only calls these procedures inside a transaction.
--
-- Errors raised (the API turns them into HTTP 400 / 404 / 409):
--   -20001  product not found or inactive
--   -20002  not enough stock
--   -20003  order not found
--   -20004  order is already cancelled
--   -20005  quantity must be positive
-- =====================================================================

CREATE OR REPLACE PACKAGE order_pkg AS

    -- Creates an empty order header and returns its id.
    PROCEDURE create_order (
        p_customer_name IN  orders.customer_name%TYPE,
        p_created_by    IN  orders.created_by%TYPE,
        p_order_id      OUT orders.order_id%TYPE
    );

    -- Adds one line: checks stock, reserves it, and updates the order total.
    PROCEDURE add_item (
        p_order_id   IN orders.order_id%TYPE,
        p_product_id IN products.product_id%TYPE,
        p_quantity   IN order_items.quantity%TYPE
    );

    -- Cancels an order and puts its stock back.
    PROCEDURE cancel_order (
        p_order_id IN orders.order_id%TYPE
    );

END order_pkg;
/

CREATE OR REPLACE PACKAGE BODY order_pkg AS

    PROCEDURE create_order (
        p_customer_name IN  orders.customer_name%TYPE,
        p_created_by    IN  orders.created_by%TYPE,
        p_order_id      OUT orders.order_id%TYPE
    ) IS
    BEGIN
        INSERT INTO orders (customer_name, created_by)
        VALUES (TRIM(p_customer_name), p_created_by)
        RETURNING order_id INTO p_order_id;
    END create_order;


    PROCEDURE add_item (
        p_order_id   IN orders.order_id%TYPE,
        p_product_id IN products.product_id%TYPE,
        p_quantity   IN order_items.quantity%TYPE
    ) IS
        v_stock  products.stock_qty%TYPE;
        v_price  products.unit_price%TYPE;
        v_name   products.name%TYPE;
    BEGIN
        IF p_quantity IS NULL OR p_quantity <= 0 THEN
            RAISE_APPLICATION_ERROR(-20005, 'Quantity must be greater than zero.');
        END IF;

        -- FOR UPDATE locks the product row until commit, so two users
        -- ordering the last item at the same time can't both succeed.
        BEGIN
            SELECT stock_qty, unit_price, name
              INTO v_stock, v_price, v_name
              FROM products
             WHERE product_id = p_product_id
               AND is_active = 1
               FOR UPDATE;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20001, 'Product ' || p_product_id || ' not found.');
        END;

        IF v_stock < p_quantity THEN
            RAISE_APPLICATION_ERROR(-20002,
                'Not enough stock for ' || v_name || ': ' || v_stock || ' left, ' || p_quantity || ' requested.');
        END IF;

        UPDATE products
           SET stock_qty  = stock_qty - p_quantity,
               updated_at = SYSTIMESTAMP
         WHERE product_id = p_product_id;

        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, p_product_id, p_quantity, v_price);

        UPDATE orders
           SET total_amount = total_amount + (p_quantity * v_price)
         WHERE order_id = p_order_id;
    END add_item;


    PROCEDURE cancel_order (
        p_order_id IN orders.order_id%TYPE
    ) IS
        v_status orders.status%TYPE;
    BEGIN
        BEGIN
            SELECT status INTO v_status
              FROM orders
             WHERE order_id = p_order_id
               FOR UPDATE;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20003, 'Order ' || p_order_id || ' not found.');
        END;

        IF v_status = 'CANCELLED' THEN
            RAISE_APPLICATION_ERROR(-20004, 'Order ' || p_order_id || ' is already cancelled.');
        END IF;

        -- Return each line's quantity to stock.
        FOR item IN (SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id) LOOP
            UPDATE products
               SET stock_qty  = stock_qty + item.quantity,
                   updated_at = SYSTIMESTAMP
             WHERE product_id = item.product_id;
        END LOOP;

        UPDATE orders SET status = 'CANCELLED' WHERE order_id = p_order_id;
    END cancel_order;

END order_pkg;
/
