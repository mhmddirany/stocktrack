-- =====================================================================
-- StockTrack schema (Oracle 21c XE / 23ai Free)
-- Runs as the application user (STOCKTRACK).
-- =====================================================================

-- Users who can log in. Passwords are stored as BCrypt hashes, never plain text.
CREATE TABLE app_users (
    user_id        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username       VARCHAR2(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR2(100) NOT NULL,
    full_name      VARCHAR2(100) NOT NULL,
    role           VARCHAR2(20)  NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
    created_at     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Products in the warehouse.
CREATE TABLE products (
    product_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku            VARCHAR2(30)  NOT NULL UNIQUE,
    name           VARCHAR2(120) NOT NULL,
    category       VARCHAR2(50)  NOT NULL,
    unit_price     NUMBER(10,2)  NOT NULL CHECK (unit_price >= 0),
    stock_qty      NUMBER(10)    DEFAULT 0 NOT NULL CHECK (stock_qty >= 0),
    reorder_level  NUMBER(10)    DEFAULT 5 NOT NULL CHECK (reorder_level >= 0),
    is_active      NUMBER(1)     DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)),
    created_at     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at     TIMESTAMP
);

-- An order header. The total is maintained by the PL/SQL package, not by the API.
CREATE TABLE orders (
    order_id       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name  VARCHAR2(120) NOT NULL,
    status         VARCHAR2(20)  DEFAULT 'PLACED' NOT NULL
                   CHECK (status IN ('PLACED', 'CANCELLED')),
    total_amount   NUMBER(12,2)  DEFAULT 0 NOT NULL,
    created_by     NUMBER        NOT NULL REFERENCES app_users(user_id),
    created_at     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Order lines. unit_price is copied from the product at order time,
-- so later price changes don't rewrite old orders.
CREATE TABLE order_items (
    order_item_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       NUMBER       NOT NULL REFERENCES orders(order_id),
    product_id     NUMBER       NOT NULL REFERENCES products(product_id),
    quantity       NUMBER(10)   NOT NULL CHECK (quantity > 0),
    unit_price     NUMBER(10,2) NOT NULL,
    line_total     NUMBER(12,2) GENERATED ALWAYS AS (quantity * unit_price) VIRTUAL
);

CREATE INDEX ix_order_items_order   ON order_items(order_id);
CREATE INDEX ix_order_items_product ON order_items(product_id);
CREATE INDEX ix_orders_created_at   ON orders(created_at);

-- Products at or below their reorder level (used by the dashboard).
CREATE OR REPLACE VIEW low_stock_v AS
SELECT product_id, sku, name, category, unit_price, stock_qty, reorder_level
  FROM products
 WHERE is_active = 1
   AND stock_qty <= reorder_level;
