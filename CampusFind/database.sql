CREATE DATABASE IF NOT EXISTS campusfind_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campusfind_db;

CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(40) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  type ENUM('lost', 'found') NOT NULL,
  category VARCHAR(40) NOT NULL,
  location VARCHAR(160) NOT NULL,
  item_date DATE NOT NULL,
  description TEXT NOT NULL,
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  contact_email VARCHAR(254) NULL,
  reporter VARCHAR(120) NOT NULL,
  owner_token CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_items_created_at (created_at),
  INDEX idx_items_owner_token (owner_token),
  INDEX idx_items_type_category (type, category)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_claims_item_id (item_id),
  CONSTRAINT fk_claims_item
    FOREIGN KEY (item_id) REFERENCES items (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO items
  (id, title, type, category, location, item_date, description, contact_name, contact_phone, contact_email, reporter, created_at)
VALUES
  ('lost-101', 'Blue Water Bottle', 'lost', 'Accessories', 'Main Library', '2026-10-02',
   'I lost a blue insulated bottle near the reading room on the first floor. It has a silver cap and a small sticker of a star.',
   'Aarav Sharma', '9876543210', 'aarav@campus.edu', 'Library Desk', '2026-10-02 09:30:00'),
  ('found-204', 'Black Wallet', 'found', 'Wallets', 'Cafeteria', '2026-10-01',
   'Found a black leather wallet with student ID cards inside. It was handed over to the cafeteria staff and is awaiting collection.',
   'Riya Mehta', '9123456789', 'riya@campus.edu', 'Student Volunteer', '2026-10-01 15:10:00'),
  ('lost-305', 'ID Card Holder', 'lost', 'Documents', 'Mechanical Block', '2026-09-30',
   'Lost an ID card holder with my student card and a few visiting passes near the exam hall entrance.',
   'Karan Singh', '9988776655', 'karan@campus.edu', 'Class Representative', '2026-09-30 12:40:00'),
  ('found-410', 'USB Type-C Cable', 'found', 'Electronics', 'Computer Lab', '2026-10-03',
   'Found a gray USB-C charging cable beside the workstation table in the lab. It looks new and has a small label on the plug.',
   'Neha Patel', '9034567890', 'neha@campus.edu', 'Lab Assistant', '2026-10-03 11:05:00');
