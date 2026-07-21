// routes/exams.js  —  Exam Scheduling, Management, and Student Attempt
const express             = require('express');
const db                  = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const router              = express.Router();


router.post('/', authenticate, requireRole('teacher'), async (req, res) => {
  const { title, subject, description, duration_mins, scheduled_at,
          question_ids, student_ids } = req.body;

  if (!title || !subject || !duration_mins || !scheduled_at) {
    return res.status(400).json({ success: false, message: 'Title, subject, duration, and scheduled date are required.' });
  }
  if (!question_ids || question_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one question must be added.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Calculate total marks from selected questions
    const [qRows] = await conn.query(
      'SELECT SUM(marks) AS total FROM questions WHERE id IN (?) AND teacher_id = ?',
      [question_ids, req.user.id]
    );
    const total_marks = qRows[0].total || 0;

    // Insert exam
    const [examResult] = await conn.query(
      `INSERT INTO exams (teacher_id, title, subject, description, duration_mins, total_marks, scheduled_at, is_active)
       VALUES (?,?,?,?,?,?,?,TRUE)`,
      [req.user.id, title, subject, description || '', duration_mins, total_marks, scheduled_at]
    );
    const examId = examResult.insertId;

    // Link questions
    const qValues = question_ids.map(qid => [examId, qid]);
    await conn.query('INSERT INTO exam_questions (exam_id, question_id) VALUES ?', [qValues]);

    // Enroll students (if provided)
    if (student_ids && student_ids.length > 0) {
      const sValues = student_ids.map(sid => [examId, sid]);
      await conn.query('INSERT IGNORE INTO exam_enrollments (exam_id, student_id) VALUES ?', [sValues]);
    }

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: 'Exam created and scheduled.',
      examId,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create exam.' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — List own exams
//  GET /api/exams/teacher
// ════════════════════════════════════════════════════════════
router.get('/teacher', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*,
         (SELECT COUNT(*) FROM exam_questions  eq WHERE eq.exam_id = e.id) AS question_count,
         (SELECT COUNT(*) FROM exam_enrollments en WHERE en.exam_id = e.id) AS student_count,
         (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) AS attempt_count
       FROM exams e
       WHERE e.teacher_id = ?
       ORDER BY e.scheduled_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch exams.' });
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — Toggle exam active/inactive
//  PATCH /api/exams/:id/toggle
// ════════════════════════════════════════════════════════════
router.patch('/:id/toggle', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    await db.query(
      'UPDATE exams SET is_active = NOT is_active WHERE id = ? AND teacher_id = ?',
      [req.params.id, req.user.id]
    );
    return res.json({ success: true, message: 'Exam status toggled.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle exam.' });
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — Delete exam
//  DELETE /api/exams/:id
// ════════════════════════════════════════════════════════════
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    await db.query('DELETE FROM exams WHERE id = ? AND teacher_id = ?', [req.params.id, req.user.id]);
    return res.json({ success: true, message: 'Exam deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete exam.' });
  }
});

// ════════════════════════════════════════════════════════════
//  STUDENT — List enrolled exams
//  GET /api/exams/student
// ════════════════════════════════════════════════════════════
router.get('/student', authenticate, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, t.name AS teacher_name,
         (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) AS question_count,
         (SELECT r.score FROM results r
          WHERE r.exam_id = e.id AND r.student_id = ? LIMIT 1) AS my_score,
         (SELECT r.percentage FROM results r
          WHERE r.exam_id = e.id AND r.student_id = ? LIMIT 1) AS my_percentage
       FROM exams e
       JOIN teachers t ON t.id = e.teacher_id
       JOIN exam_enrollments en ON en.exam_id = e.id
       WHERE en.student_id = ? AND e.is_active = TRUE
       ORDER BY e.scheduled_at ASC`,
      [req.user.id, req.user.id, req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch exams.' });
  }
});

// ════════════════════════════════════════════════════════════
//  STUDENT — Get exam questions (to attempt)
//  GET /api/exams/:id/attempt
// ════════════════════════════════════════════════════════════
router.get('/:id/attempt', authenticate, requireRole('student'), async (req, res) => {
  const examId    = req.params.id;
  const studentId = req.user.id;

  try {
    // Check enrollment
    const [enroll] = await db.query(
      'SELECT id FROM exam_enrollments WHERE exam_id = ? AND student_id = ?',
      [examId, studentId]
    );
    if (enroll.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this exam.' });
    }

    // Check already submitted
    const [attempted] = await db.query(
      'SELECT id FROM results WHERE exam_id = ? AND student_id = ?',
      [examId, studentId]
    );
    if (attempted.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already submitted this exam.' });
    }

    // Fetch exam info
    const [examRows] = await db.query('SELECT * FROM exams WHERE id = ? AND is_active = TRUE', [examId]);
    if (examRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found or inactive.' });
    }
    const exam = examRows[0];

    // Fetch questions — DO NOT send correct_answer to student!
    const [questions] = await db.query(
      `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks
       FROM questions q
       JOIN exam_questions eq ON eq.question_id = q.id
       WHERE eq.exam_id = ?`,
      [examId]
    );

    return res.json({
      success: true,
      exam: {
        id:            exam.id,
        title:         exam.title,
        subject:       exam.subject,
        duration_mins: exam.duration_mins,
        total_marks:   exam.total_marks,
      },
      questions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load exam.' });
  }
});

// ════════════════════════════════════════════════════════════
//  STUDENT — Submit exam answers
//  POST /api/exams/:id/submit
//  Body: { answers: { question_id: 'A'|'B'|'C'|'D', ... } }
// ════════════════════════════════════════════════════════════
router.post('/:id/submit', authenticate, requireRole('student'), async (req, res) => {
  const examId    = req.params.id;
  const studentId = req.user.id;
  const { answers } = req.body;   // { "1": "A", "3": "C", ... }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ success: false, message: 'Answers are required.' });
  }

  const conn = await db.getConnection();
  try {
    // Prevent double submission
    const [already] = await conn.query(
      'SELECT id FROM results WHERE exam_id = ? AND student_id = ?',
      [examId, studentId]
    );
    if (already.length > 0) {
      conn.release();
      return res.status(409).json({ success: false, message: 'Exam already submitted.' });
    }

    // Fetch correct answers
    const [questions] = await conn.query(
      `SELECT q.id, q.correct_answer, q.marks
       FROM questions q
       JOIN exam_questions eq ON eq.question_id = q.id
       WHERE eq.exam_id = ?`,
      [examId]
    );

    // Auto-evaluate
    let score = 0;
    const answerRows = [];
    for (const q of questions) {
      const chosen     = (answers[q.id] || 'NA').toUpperCase();
      const is_correct = chosen === q.correct_answer;
      if (is_correct) score += q.marks;
      answerRows.push({ question_id: q.id, chosen, is_correct });
    }

    // Fetch total_marks
    const [examInfo] = await conn.query('SELECT total_marks FROM exams WHERE id = ?', [examId]);
    const total_marks = examInfo[0]?.total_marks || questions.length;
    const percentage  = total_marks > 0 ? parseFloat(((score / total_marks) * 100).toFixed(2)) : 0;

    // Determine grade
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    await conn.beginTransaction();

    // Insert result
    const [resultRow] = await conn.query(
      `INSERT INTO results (exam_id, student_id, score, total_marks, percentage, grade)
       VALUES (?,?,?,?,?,?)`,
      [examId, studentId, score, total_marks, percentage, grade]
    );
    const resultId = resultRow.insertId;

    // Insert individual answers
    if (answerRows.length > 0) {
      const aValues = answerRows.map(a => [resultId, a.question_id, a.chosen, a.is_correct]);
      await conn.query(
        'INSERT INTO student_answers (result_id, question_id, chosen_answer, is_correct) VALUES ?',
        [aValues]
      );
    }

    await conn.commit();

    return res.json({
      success: true,
      message: 'Exam submitted successfully.',
      result: { score, total_marks, percentage, grade },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to submit exam.' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — Get all students list (for enrollment)
//  GET /api/exams/students-list
// ════════════════════════════════════════════════════════════
router.get('/students-list', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, roll_number, department FROM students ORDER BY name'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
});

module.exports = router;
