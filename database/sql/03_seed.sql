-- Sample products. Users are created by the API on first start
-- (so their passwords are hashed with BCrypt, never stored in SQL).

INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('LAP-001', 'Dell Latitude 5440 Laptop',      'Laptops',     849.00, 12, 3);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('LAP-002', 'Lenovo ThinkPad E14',            'Laptops',     779.00,  2, 3);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('MON-001', 'Samsung 24" FHD Monitor',        'Monitors',    139.00, 25, 5);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('MON-002', 'LG 27" 4K Monitor',              'Monitors',    329.00,  4, 5);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('ACC-001', 'Logitech MX Master 3S Mouse',    'Accessories',  99.00, 40, 10);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('ACC-002', 'Mechanical Keyboard (US layout)','Accessories',  69.00, 18, 8);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('ACC-003', 'USB-C Docking Station',          'Accessories', 159.00,  6, 4);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('NET-001', 'TP-Link Gigabit Switch 8-Port',  'Networking',   35.00, 30, 10);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('NET-002', 'Ubiquiti UniFi Access Point',    'Networking',  149.00,  1, 2);
INSERT INTO products (sku, name, category, unit_price, stock_qty, reorder_level) VALUES ('PWR-001', 'APC 1500VA UPS',                 'Power',       289.00,  9, 3);

COMMIT;
