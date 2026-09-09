INSERT OR IGNORE INTO dining_tables (id, table_number, capacity, status)
VALUES
  (1, 'B01', 2, 'AVAILABLE'),
  (2, 'B02', 4, 'AVAILABLE'),
  (3, 'B03', 6, 'AVAILABLE');

INSERT OR IGNORE INTO menu_items (
  id, name, description, price, category, is_active, sale_price, is_flash_sale
)
VALUES
  (1, 'Cơm rang', 'Cơm rang nhà hàng', 45000, 'Món chính', 1, NULL, 0),
  (2, 'Phở bò', 'Phở bò truyền thống', 55000, 'Món chính', 1, 49000, 1),
  (3, 'Trà đá', 'Trà đá', 5000, 'Đồ uống', 1, NULL, 0);

