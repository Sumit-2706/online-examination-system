// routes/results.js  —  Result management for Teachers and Students
const express             = require('express');
const db                  = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const router              = express.Router();

// ════════════════════════════════════════════════════════════
//  STUDENT — View own result for an exam
//  GET /api/results/student/:examId
// ════════════════════════════════════════════════════════════
router.get('/student/:examId', authenticate, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, e.title AS exam_title, e.subject
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       WHERE r.exam_id = ? AND r.student_id = ?`,
      [req.params.examId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }

    // Fetch per-question detail
    const [answers] = await db.query(
      `SELECT sa.question_id, sa.chosen_answer, sa.is_correct,
              q.question_text, q.correct_answer, q.marks,
              q.option_a, q.option_b, q.option_c, q.option_d
       FROM student_answers sa
       JOIN questions q ON q.id = sa.question_id
       WHERE sa.result_id = ?`,
      [rows[0].id]
    );

    return res.json({
      success: true,
      result:  rows[0],
      answers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch result.' });
  }
});

// ════════════════════════════════════════════════════════════
//  STUDENT — View all own results
//  GET /api/results/student
// ════════════════════════════════════════════════════════════
router.get('/student', authenticate, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, e.title AS exam_title, e.subject, e.total_marks AS exam_total
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       WHERE r.student_id = ?
       ORDER BY r.submitted_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch results.' });
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — View all results for an exam
//  GET /api/results/exam/:examId
// ════════════════════════════════════════════════════════════
router.get('/exam/:examId', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    // Verify exam belongs to teacher
    const [examCheck] = await db.query(
      'SELECT id FROM exams WHERE id = ? AND teacher_id = ?',
      [req.params.examId, req.user.id]
    );
    if (examCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [rows] = await db.query(
      `SELECT r.*, s.name AS student_name, s.roll_number, s.department, e.title AS exam_title
       FROM results r
       JOIN students s ON s.id = r.student_id
       JOIN exams e    ON e.id = r.exam_id
       WHERE r.exam_id = ?
       ORDER BY r.percentage DESC`,
      [req.params.examId]
    );

    // Summary stats
    const total   = rows.length;
    const avg     = total > 0 ? (rows.reduce((s, r) => s + parseFloat(r.percentage), 0) / total).toFixed(2) : 0;
    const highest = total > 0 ? Math.max(...rows.map(r => parseFloat(r.percentage))) : 0;
    const passed  = rows.filter(r => parseFloat(r.percentage) >= 50).length;

    return res.json({
      success: true,
      data: rows,
      stats: { total, avg, highest, passed, failed: total - passed },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch results.' });
  }
});

// ════════════════════════════════════════════════════════════
//  TEACHER — Dashboard summary stats
//  GET /api/results/teacher/summary
// ════════════════════════════════════════════════════════════
router.get('/teacher/summary', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const [[{ exam_count }]]     = await db.query('SELECT COUNT(*) AS exam_count FROM exams WHERE teacher_id = ?',     [req.user.id]);
    const [[{ question_count }]] = await db.query('SELECT COUNT(*) AS question_count FROM questions WHERE teacher_id = ?', [req.user.id]);
    const [[{ student_count }]]  = await db.query(
      `SELECT COUNT(DISTINCT en.student_id) AS student_count
       FROM exam_enrollments en
       JOIN exams e ON e.id = en.exam_id WHERE e.teacher_id = ?`, [req.user.id]
    );
    const [[{ result_count }]]   = await db.query(
      `SELECT COUNT(*) AS result_count FROM results r
       JOIN exams e ON e.id = r.exam_id WHERE e.teacher_id = ?`, [req.user.id]
    );

    return res.json({
      success: true,
      stats: { exam_count, question_count, student_count, result_count },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
});

// ════════════════════════════════════════════════════════════
//  STUDENT — Dashboard summary stats
//  GET /api/results/student/summary
// ════════════════════════════════════════════════════════════
router.get('/student/summary', authenticate, requireRole('student'), async (req, res) => {
  try {
    const [[{ enrolled }]] = await db.query(
      'SELECT COUNT(*) AS enrolled FROM exam_enrollments WHERE student_id = ?', [req.user.id]
    );
    const [resultRows] = await db.query(
      'SELECT score, total_marks, percentage FROM results WHERE student_id = ?', [req.user.id]
    );
    const attempted  = resultRows.length;
    const avg_score  = attempted > 0 ? (resultRows.reduce((s, r) => s + parseFloat(r.percentage), 0) / attempted).toFixed(2) : 0;
    const best_score = attempted > 0 ? Math.max(...resultRows.map(r => parseFloat(r.percentage))) : 0;

    return res.json({
      success: true,
      stats: { enrolled, attempted, avg_score, best_score },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
});

module.exports = router;
