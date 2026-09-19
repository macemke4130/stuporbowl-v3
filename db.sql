use stuporbowl;
select * from year2026;
select * from users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(128),
  email VARCHAR(128) UNIQUE NOT NULL,
  password VARCHAR(128) NOT NULL,
  permissions CHAR(16) NOT NULL DEFAULT "0000000000000000",
  date_created TIMESTAMP DEFAULT NOW()
);

drop table users;

INSERT INTO users (full_name, email, password, permissions) VALUES (
"Lucas Mace",
"lucasmace4130@gmail.com", 
"password", "1000000000000000"
);

INSERT INTO users (full_name, email, password, permissions) VALUES (
"Test 1",
"test1@gmail.com", 
"test1", "0100000100000000"
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date_created TIMESTAMP DEFAULT NOW(),
  posted_by INT NOT NULL,
  title VARCHAR(64) NOT NULL,
  content TEXT NOT NULL
);

DROP TABLE posts;

INSERT INTO posts (id, posted_by, title, content) VALUES (1, 1, "Hello, World!", "This is a test post.");

select 
posts.id,
posts.date_created,
posts.title,
posts.content,
users.full_name as posted_by
 from posts join users on posts.posted_by = users.id;
 
 CREATE TABLE registrations (
	id INT PRIMARY KEY AUTO_INCREMENT,
	date_created TIMESTAMP DEFAULT NOW(),
    race_year INT NOT NULL,
    racer_number INT NOT NULL,
	name VARCHAR(64) NOT NULL,
    email VARCHAR(128) NOT NULL,
    pronouns VARCHAR(32) NOT NULL,
	birthday DATE NOT NULL,
    twin_cities_local BOOL NOT NULL,
    origin_city VARCHAR(32),
    bike_type ENUM('fixed', 'single-speed', 'geared', 'electric') NOT NULL,
    race_type ENUM('stupor', 'speed') NOT NULL,
    gender_category ENUM('open', 'women', 'trans') NOT NULL,
    shirt_size ENUM('extra-small', 'small', 'medium', 'large', 'extra-large') NOT NULL,
    payment_method ENUM('cash', 'venmo', 'sponsored') NOT NULL,
    racer_has_paid BOOL DEFAULT FALSE,
    racer_has_signed_waiver BOOL DEFAULT FALSE
);

drop table registrations;

CREATE TABLE racer_counters (
    race_year INT PRIMARY KEY,
    last_racer_number INT NOT NULL DEFAULT 0
);