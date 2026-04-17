// routes/auth.js  —  Registration & Login for Students and Teachers
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const router   = express.Router();

// ── Helper: generate JWT ─────────────────────────────────────
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

// ── Helper: email format check ───────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ════════════════════════════════════════════════════════════
//  POST /api/auth/student/register
// ════════════════════════════════════════════════════════════
router.post('/student/register', async (req, res) => {
  const { name, email, password, roll_number, department } = req.body;

  // ── Validation ──────────────────────────────────────────
  if (!name || !email || !password || !roll_number) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and roll number are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    // Check duplicate email / roll number
    const [existing] = await db.query(
      'SELECT id FROM students WHERE email = ? OR roll_number = ?',
      [email, roll_number]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email or Roll Number already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO students (name, email, password, roll_number, department) VALUES (?,?,?,?,?)',
      [name, email, hashed, roll_number, department || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      studentId: result.insertId,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════
//  POST /api/auth/student/login
// ════════════════════════════════════════════════════════════
router.post('/student/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM students WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const student  = rows[0];
    const match    = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken({ id: student.id, role: 'student', email: student.email });

    return res.json({
      success: true,
      token,
      user: {
        id:          student.id,
        name:        student.name,
        email:       student.email,
        roll_number: student.roll_number,
        department:  student.department,
        role:        'student',
      },
    });
  } catch (err) {
    console.error('Student login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  POST /api/auth/teacher/login
// ════════════════════════════════════════════════════════════
router.post('/teacher/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM teachers WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const teacher = rows[0];
    const match   = await bcrypt.compare(password, teacher.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken({ id: teacher.id, role: 'teacher', email: teacher.email });

    return res.json({
      success: true,
      token,
      user: {
        id:      teacher.id,
        name:    teacher.name,
        email:   teacher.email,
        subject: teacher.subject,
        role:    'teacher',
      },
    });
  } catch (err) {
    console.error('Teacher login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
