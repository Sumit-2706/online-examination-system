// routes/questions.js  —  Question Bank CRUD (Teacher only)
const express             = require('express');
const db                  = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const router              = express.Router();

// All routes require teacher authentication
router.use(authenticate, requireRole('teacher'));

// ════════════════════════════════════════════════════════════
//  GET /api/questions  — list teacher's own questions
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    let sql    = 'SELECT * FROM questions WHERE teacher_id = ?';
    const params = [req.user.id];

    if (subject)    { sql += ' AND subject = ?';    params.push(subject); }
    if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty); }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch questions.' });
  }
});

// ════════════════════════════════════════════════════════════
//  GET /api/questions/:id  — single question
// ════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM questions WHERE id = ? AND teacher_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
//  POST /api/questions  — create a new question
// ════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d,
          correct_answer, subject, difficulty, marks } = req.body;

  // Validate required fields
  if (!question_text || !option_a || !option_b || !option_c || !option_d ||
      !correct_answer || !subject) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (!['A','B','C','D'].includes(correct_answer.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Correct answer must be A, B, C, or D.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO questions
        (teacher_id, question_text, option_a, option_b, option_c, option_d,
         correct_answer, subject, difficulty, marks)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, question_text, option_a, option_b, option_c, option_d,
       correct_answer.toUpperCase(), subject,
       difficulty || 'Medium', marks || 1]
    );

    return res.status(201).json({
      success: true,
      message: 'Question created successfully.',
      questionId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create question.' });
  }
});

// ════════════════════════════════════════════════════════════
//  PUT /api/questions/:id  — update a question
// ════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d,
          correct_answer, subject, difficulty, marks } = req.body;

  try {
    // Ensure question belongs to this teacher
    const [rows] = await db.query(
      'SELECT id FROM questions WHERE id = ? AND teacher_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    await db.query(
      `UPDATE questions SET
        question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
        correct_answer = ?, subject = ?, difficulty = ?, marks = ?
       WHERE id = ?`,
      [question_text, option_a, option_b, option_c, option_d,
       correct_answer.toUpperCase(), subject, difficulty, marks, req.params.id]
    );

    return res.json({ success: true, message: 'Question updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update question.' });
  }
});

// ════════════════════════════════════════════════════════════
//  DELETE /api/questions/:id
// ════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM questions WHERE id = ? AND teacher_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    await db.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
});

module.exports = router;
