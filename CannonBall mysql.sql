DROP DATABASE IF EXISTS cannonball;
CREATE DATABASE cannonball;
USE cannonball;

CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  image_url VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO locations (name, address, city, district, description) VALUES
('Colombo Futsal Arena', '123 Main Street', 'Colombo', 'Colombo', 'Premium indoor futsal facility'),
('Kandy Sports Hub', '45 Hill Road', 'Kandy', 'Kandy', 'Best indoor sports in Kandy'),
('Galle Indoor Courts', '78 Beach Road', 'Galle', 'Galle', 'Seaside indoor sports center');

SELECT * FROM locations;

CREATE TABLE courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id INT NOT NULL,
  court_name VARCHAR(100) NOT NULL,
  sport_type ENUM('football', 'cricket') NOT NULL,
  capacity INT DEFAULT 10,
  price_per_hour DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

INSERT INTO courts (location_id, court_name, sport_type, price_per_hour) VALUES
(1, 'Court A', 'football', 1500.00),
(1, 'Court B', 'cricket', 1200.00),
(2, 'Court 1', 'football', 1300.00),
(3, 'Main Court', 'cricket', 1000.00);


SELECT * FROM courts;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM users;

CREATE TABLE time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  court_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

INSERT INTO time_slots (court_id, date, start_time, end_time) VALUES
(1, CURDATE(), '08:00:00', '09:00:00'),
(1, CURDATE(), '09:00:00', '10:00:00'),
(1, CURDATE(), '10:00:00', '11:00:00'),
(1, CURDATE(), '15:00:00', '16:00:00'),
(1, CURDATE(), '16:00:00', '17:00:00'),
(2, CURDATE(), '08:00:00', '09:00:00'),
(2, CURDATE(), '10:00:00', '11:00:00'),
(3, CURDATE(), '14:00:00', '15:00:00'),
(3, CURDATE(), '17:00:00', '18:00:00'),
(4, CURDATE(), '09:00:00', '10:00:00');

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  time_slot_id INT NOT NULL,
  payment_method ENUM('cash', 'online') NOT NULL,
  payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);

SHOW TABLES;

DESCRIBE users;

USE cannonball;
SELECT COUNT(*) FROM time_slots;
SELECT * FROM time_slots LIMIT 10;

USE cannonball;

-- Check your users
SELECT id, full_name, email, role FROM users;
UPDATE users SET role = 'admin' WHERE id = 1;


USE cannonball;

-- See total slots count
SELECT COUNT(*) as total_slots FROM time_slots;

-- See available slots
SELECT COUNT(*) as available FROM time_slots WHERE is_available = TRUE;

-- See slots for today
SELECT * FROM time_slots WHERE date = CURDATE() LIMIT 20;

-- See slots per court per day
SELECT court_id, date, COUNT(*) as slots 
FROM time_slots 
GROUP BY court_id, date 
ORDER BY date, court_id
LIMIT 30;











USE cannonball;
UPDATE users SET role = 'admin' WHERE email = 'theekshana@gmail.com';
SELECT id, full_name, email, role FROM users;



