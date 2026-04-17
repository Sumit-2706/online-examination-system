# 🎓 Online Examination System
### Full-Stack Web Application | Node.js · Express · MySQL · HTML/CSS/JS

---

## 📋 Project Summary

A complete web-based examination portal for educational institutions, supporting:
- **Teacher/Admin portal** — question bank, exam scheduling, result analytics
- **Student portal** — exam taking with live countdown timer, instant results
- **Auto-evaluation** — MCQ answers checked server-side, score + grade generated instantly
- **JWT authentication** — secure, stateless sessions with role-based access control

---

## 🗂️ Project Structure

```
online-exam-system/
├── backend/
│   ├── config/
│   │   └── db.js              ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            ← JWT verify + role guard
│   ├── routes/
│   │   ├── auth.js            ← Register / Login
│   │   ├── questions.js       ← Question Bank CRUD
│   │   ├── exams.js           ← Exam management + taking
│   │   └── results.js         ← Result retrieval + stats
│   ├── server.js              ← Express app entry point
│   ├── package.json
│   └── .env.example           ← Copy to .env and configure
│
├── frontend/
│   ├── css/
│   │   └── style.css          ← Global stylesheet (580 lines)
│   ├── js/
│   │   └── utils.js           ← API client, Auth, UI helpers
│   ├── index.html             ← Login page
│   ├── register.html          ← Student registration
│   ├── teacher-dashboard.html ← Teacher SPA (4 sections)
│   ├── student-dashboard.html ← Student SPA (3 sections)
│   ├── exam.html              ← Live exam with timer
│   └── result.html            ← Result + answer review
│
├── database/
│   └── schema.sql             ← Full DDL + sample data
│
└── docs/
    └── OES_Project_Documentation.docx ← Complete academic documentation
```

---

## ⚙️ Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| Node.js  | v18+ LTS | https://nodejs.org |
| MySQL    | v8.0+   | https://dev.mysql.com/downloads/mysql/ |
| npm      | v9+     | Comes with Node.js |

---

## 🚀 Setup Instructions (Step by Step)

### Step 1 — Setup Database

Open MySQL terminal or Workbench and run:

```sql
-- Option A: MySQL terminal
mysql -u root -p
SOURCE /full/path/to/online-exam-system/database/schema.sql;

-- Option B: MySQL Workbench
-- File → Open SQL Script → select database/schema.sql → Execute (⚡)
```

Verify setup:
```sql
USE online_exam_db;
SHOW TABLES;
-- Should show: exam_enrollments, exam_questions, exams,
--              questions, results, student_answers, students, teachers
```

---

### Step 2 — Configure Environment

```bash
cd backend/
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=online_exam_db

JWT_SECRET=ReplaceWithALongRandomSecret_2024!
JWT_EXPIRES_IN=8h

PORT=5000
NODE_ENV=development
```

---

### Step 3 — Install Dependencies & Start Server

```bash
cd backend/
npm install
npm start
```

Expected output:
```
╔══════════════════════════════════════════╗
║   🎓 Online Examination System           ║
║   Server running on  http://localhost:5000║
╚══════════════════════════════════════════╝

✅  MySQL connected — database: online_exam_db
```

---

### Step 4 — Open the Application

Open your browser and go to: **http://localhost:5000**

---

## 🔐 Demo Credentials

| Role    | Email                    | Password     | Extra           |
|---------|--------------------------|--------------|-----------------|
| Teacher | anita@college.edu        | Password@123 | CS Department   |
| Teacher | ramesh@college.edu       | Password@123 | Math Department |
| Student | rahul@student.edu        | Password@123 | Roll: CS2021001 |
| Student | priya@student.edu        | Password@123 | Roll: CS2021002 |
| Student | amit@student.edu         | Password@123 | Roll: IT2021003 |

---

## 📱 Feature Walkthrough

### As Teacher:
1. Login at http://localhost:5000 → Select **Teacher** tab
2. **Dashboard** — see stats: exams created, questions, students, attempts
3. **Question Bank** → Add Question → fill MCQ form → Save
4. **Exams** → Create Exam → fill details → select questions → enroll students → Create
5. **Results** → select exam from dropdown → view all student scores + stats

### As Student:
1. Register at http://localhost:5000/register.html (or use demo credentials)
2. Login → Select **Student** tab
3. **Dashboard** — see enrolled exams
4. Click **Start Exam** → answer questions → Submit
5. View instant result with grade, percentage, and per-question review

---

## 🗄️ Database Schema (7 Tables)

```
teachers          ← Teacher accounts
students          ← Student accounts  
questions         ← MCQ question bank (owned by teacher)
exams             ← Exam definitions (owned by teacher)
exam_questions    ← Junction: which questions are in which exam
exam_enrollments  ← Junction: which students are in which exam
results           ← Final scores (1 per student per exam)
student_answers   ← Per-question answer details for review
```

---

## 🔌 API Endpoints Summary

### Auth (Public)
| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | /api/auth/student/register  | Register student     |
| POST   | /api/auth/student/login     | Student login → JWT  |
| POST   | /api/auth/teacher/login     | Teacher login → JWT  |

### Questions (Teacher JWT required)
| Method | Endpoint              | Description       |
|--------|-----------------------|-------------------|
| GET    | /api/questions        | List questions    |
| POST   | /api/questions        | Create question   |
| PUT    | /api/questions/:id    | Update question   |
| DELETE | /api/questions/:id    | Delete question   |

### Exams
| Method | Endpoint                    | Auth    | Description              |
|--------|----------------------------|---------|--------------------------|
| POST   | /api/exams                  | Teacher | Create exam              |
| GET    | /api/exams/teacher          | Teacher | List teacher's exams     |
| PATCH  | /api/exams/:id/toggle       | Teacher | Toggle active/inactive   |
| GET    | /api/exams/student          | Student | List enrolled exams      |
| GET    | /api/exams/:id/attempt      | Student | Get questions (no answers)|
| POST   | /api/exams/:id/submit       | Student | Submit + auto-evaluate   |

### Results
| Method | Endpoint                      | Auth    | Description          |
|--------|-------------------------------|---------|----------------------|
| GET    | /api/results/student          | Student | All my results       |
| GET    | /api/results/student/:examId  | Student | Result + review      |
| GET    | /api/results/exam/:examId     | Teacher | All results for exam |
| GET    | /api/results/teacher/summary  | Teacher | Dashboard stats      |

---

## 🛡️ Security Features

- ✅ **Password hashing** — bcrypt with salt rounds = 10
- ✅ **JWT authentication** — signed HS256, expires in 8h
- ✅ **Role-based access control** — every protected route has role guard
- ✅ **Answer protection** — correct_answer NEVER sent to student browser
- ✅ **SQL injection prevention** — mysql2 parameterized queries throughout
- ✅ **Double-submission prevention** — UNIQUE constraint on (exam_id, student_id) in results
- ✅ **Enrollment verification** — student can only access exams they're enrolled in

---

## 📊 Grading Scale

| Grade | Percentage | Status |
|-------|-----------|--------|
| A+    | ≥ 90%     | Pass   |
| A     | ≥ 80%     | Pass   |
| B     | ≥ 70%     | Pass   |
| C     | ≥ 60%     | Pass   |
| D     | ≥ 50%     | Pass   |
| F     | < 50%     | Fail   |

---

## 🛠️ Development Commands

```bash
# Start with auto-reload (requires nodemon)
cd backend && npm run dev

# Check for security vulnerabilities
npm audit

# Check server health
curl http://localhost:5000/api/health
```

---

## 📄 Documentation

The `docs/` folder contains the complete academic submission document including:
- Software Requirement Specification (SRS)
- Entity-Relationship Diagram explanation
- Class Diagram & Architecture
- API Reference
- 20 Test Cases (Functional + Security)
- 4-type Maintenance Plan
- Setup Guide
- Sample Data

---

## ⚡ Troubleshooting

| Problem | Solution |
|---------|----------|
| `ER_ACCESS_DENIED_ERROR` | Wrong DB_PASSWORD in .env |
| `ECONNREFUSED` on port 3306 | MySQL service not running — start it |
| `Port 5000 already in use` | Change PORT in .env to 3001 |
| Login fails with correct creds | Re-run schema.sql to reset hashed passwords |
| `Cannot GET /` | Make sure server.js is pointing to correct frontend path |

---

*Built with ❤️ for college lab submission — Node.js + Express + MySQL + Vanilla JS*
