-- Smart School Attendance & Parent Notification System
-- MySQL schema + seed data
-- Import this file into your Aiven MySQL database: defaultdb

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS parent_student;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'teacher', 'parent') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  section VARCHAR(50) NOT NULL,
  teacher_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_class_section (name, section),
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  roll_number VARCHAR(50) NOT NULL,
  class_id INT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_roll_class (roll_number, class_id),
  CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parent_student (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_parent_student (parent_id, student_id),
  CONSTRAINT fk_parent_student_parent
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_parent_student_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  teacher_id INT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present', 'Absent') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_class_date (student_id, class_id, attendance_date),
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_status (status),
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  attendance_id INT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_parent_attendance_notification (parent_id, attendance_id),
  INDEX idx_parent_read (parent_id, is_read),
  CONSTRAINT fk_notifications_parent
    FOREIGN KEY (parent_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_attendance
    FOREIGN KEY (attendance_id) REFERENCES attendances(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password for all demo users is: password
-- Bcrypt hash below was generated for the word: password
INSERT INTO users (id, name, email, password, role, status) VALUES
(1, 'School Admin', 'admin@school.com', '$2b$10$HpR6xP1QSHC8PjqikV0DS.Kn.z2vxK4FCoNCyU4GK0Hbh.Liz5Ksq', 'admin', 'active'),
(2, 'Demo Teacher', 'teacher@school.com', '$2b$10$HpR6xP1QSHC8PjqikV0DS.Kn.z2vxK4FCoNCyU4GK0Hbh.Liz5Ksq', 'teacher', 'active'),
(3, 'Demo Parent', 'parent@school.com', '$2b$10$HpR6xP1QSHC8PjqikV0DS.Kn.z2vxK4FCoNCyU4GK0Hbh.Liz5Ksq', 'parent', 'active');

INSERT INTO classes (id, name, section, teacher_id) VALUES
(1, 'Grade 5', 'A', 2);

INSERT INTO students (id, name, roll_number, class_id, status) VALUES
(1, 'Ahmed Khan', 'G5A-001', 1, 'active'),
(2, 'Sara Khan', 'G5A-002', 1, 'active');

INSERT INTO parent_student (parent_id, student_id) VALUES
(3, 1),
(3, 2);

INSERT INTO attendances (id, student_id, class_id, teacher_id, attendance_date, status) VALUES
(1, 1, 1, 2, '2026-06-17', 'Absent'),
(2, 2, 1, 2, '2026-06-17', 'Present');

INSERT INTO notifications (parent_id, student_id, attendance_id, title, message, is_read) VALUES
(3, 1, 1, 'Attendance Alert', 'Your child Ahmed Khan was marked Absent on 2026-06-17.', 0);
