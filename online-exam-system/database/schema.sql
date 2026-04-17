-- ============================================================
--  ONLINE EXAMINATION SYSTEM — Database Schema
--  Engine: MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS online_exam_db;
USE online_exam_db;

-- ──────────────────────────────────────────────────────────
-- TABLE: teachers
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)         NOT NULL,
    email       VARCHAR(150)  UNIQUE NOT NULL,
    password    VARCHAR(255)         NOT NULL,   -- bcrypt hash
    subject     VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- TABLE: students
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)         NOT NULL,
    email         VARCHAR(150)  UNIQUE NOT NULL,
    password      VARCHAR(255)         NOT NULL,   -- bcrypt hash
    roll_number   VARCHAR(50)   UNIQUE NOT NULL,
    department    VARCHAR(100),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- TABLE: questions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id      INT           NOT NULL,
    question_text   TEXT          NOT NULL,
    option_a        VARCHAR(500)  NOT NULL,
    option_b        VARCHAR(500)  NOT NULL,
    option_c        VARCHAR(500)  NOT NULL,
    option_d        VARCHAR(500)  NOT NULL,
    correct_answer  ENUM('A','B','C','D') NOT NULL,
    subject         VARCHAR(100)  NOT NULL,
    difficulty      ENUM('Easy','Medium','Hard') DEFAULT 'Medium',
    marks           INT           DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- TABLE: exams
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id      INT           NOT NULL,
    title           VARCHAR(200)  NOT NULL,
    subject         VARCHAR(100)  NOT NULL,
    description     TEXT,
    duration_mins   INT           NOT NULL DEFAULT 30,
    total_marks     INT           DEFAULT 0,
    scheduled_at    DATETIME      NOT NULL,
    is_active       BOOLEAN       DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- TABLE: exam_questions  (many-to-many: exams ↔ questions)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_questions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    exam_id     INT NOT NULL,
    question_id INT NOT NULL,
    UNIQUE KEY uq_eq (exam_id, question_id),
    FOREIGN KEY (exam_id)     REFERENCES exams(id)     ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- TABLE: exam_enrollments  (student assigned to exam)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_enrollments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    exam_id     INT NOT NULL,
    student_id  INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enroll (exam_id, student_id),
    FOREIGN KEY (exam_id)    REFERENCES exams(id)    ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- TABLE: results
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    exam_id         INT     NOT NULL,
    student_id      INT     NOT NULL,
    score           INT     DEFAULT 0,
    total_marks     INT     DEFAULT 0,
    percentage      DECIMAL(5,2) DEFAULT 0.00,
    grade           VARCHAR(5),
    submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_result (exam_id, student_id),
    FOREIGN KEY (exam_id)    REFERENCES exams(id)    ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────
-- TABLE: student_answers  (individual answers per attempt)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_answers (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    result_id      INT              NOT NULL,
    question_id    INT              NOT NULL,
    chosen_answer  ENUM('A','B','C','D','NA') DEFAULT 'NA',
    is_correct     BOOLEAN          DEFAULT FALSE,
    FOREIGN KEY (result_id)   REFERENCES results(id)   ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ============================================================
--  SAMPLE DATA
-- ============================================================

-- Passwords are bcrypt hash of "Password@123"
INSERT INTO teachers (name, email, password, subject) VALUES
('Dr. Anita Sharma',  'anita@college.edu',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Computer Science'),
('Prof. Ramesh Kumar', 'ramesh@college.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mathematics');

INSERT INTO students (name, email, password, roll_number, department) VALUES
('Rahul Verma',   'rahul@student.edu',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CS2021001', 'Computer Science'),
('Priya Singh',   'priya@student.edu',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CS2021002', 'Computer Science'),
('Amit Patel',    'amit@student.edu',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'IT2021003', 'Information Technology');

-- Sample Questions (teacher_id = 1, Computer Science)
INSERT INTO questions (teacher_id, question_text, option_a, option_b, option_c, option_d, correct_answer, subject, difficulty, marks) VALUES
(1, 'What does OOP stand for?', 'Object Oriented Programming', 'Open Oriented Processing', 'Object Oriented Processing', 'Open Oriented Programming', 'A', 'Computer Science', 'Easy', 1),
(1, 'Which of the following is NOT a primitive data type in Java?', 'int', 'float', 'String', 'char', 'C', 'Computer Science', 'Easy', 1),
(1, 'What is the time complexity of Binary Search?', 'O(n)', 'O(log n)', 'O(n²)', 'O(1)', 'B', 'Computer Science', 'Medium', 2),
(1, 'Which keyword is used to create an object in Java?', 'create', 'object', 'new', 'make', 'C', 'Computer Science', 'Easy', 1),
(1, 'What is polymorphism in OOP?', 'One class, many objects', 'One interface, many implementations', 'Many classes, one object', 'None of the above', 'B', 'Computer Science', 'Medium', 2),
(1, 'Which data structure uses LIFO?', 'Queue', 'Array', 'Stack', 'Linked List', 'C', 'Computer Science', 'Easy', 1),
(1, 'SQL stands for?', 'Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'Stored Query Language', 'A', 'Computer Science', 'Easy', 1),
(1, 'Which HTTP method is used to send data to a server?', 'GET', 'PUT', 'POST', 'FETCH', 'C', 'Computer Science', 'Medium', 2),
(1, 'What does CPU stand for?', 'Control Processing Unit', 'Central Processing Unit', 'Computer Processing Unit', 'Core Processing Unit', 'B', 'Computer Science', 'Easy', 1),
(1, 'Which of the following is a NoSQL database?', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'C', 'Computer Science', 'Medium', 2);

-- Sample Exam
INSERT INTO exams (teacher_id, title, subject, description, duration_mins, total_marks, scheduled_at, is_active) VALUES
(1, 'CS Fundamentals Mid-Term', 'Computer Science', 'Covers OOP, Data Structures, and Databases', 30, 13, NOW(), TRUE);

-- Assign all questions to exam 1
INSERT INTO exam_questions (exam_id, question_id) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10);

-- Enroll students in exam 1
INSERT INTO exam_enrollments (exam_id, student_id) VALUES
(1,1),(1,2),(1,3);
