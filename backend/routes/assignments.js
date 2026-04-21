const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/assignments – Get assignments for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      query = { assignedTo: req.user._id };
    } else {
      query = { createdBy: req.user._id };
    }
    const assignments = await Assignment.find(query)
      .populate('createdBy', 'name email color')
      .populate('assignedTo', 'name email color')
      .populate('board', 'title')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/assignments – Create assignment (admin/teacher only)
router.post('/', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { title, description, assignedTo, board, dueDate, priority, tags, maxScore } = req.body;

    const assignment = new Assignment({
      title,
      description,
      createdBy: req.user._id,
      assignedTo,
      board,
      dueDate,
      priority,
      tags,
      maxScore,
    });
    await assignment.save();

    // Update student progress counters
    if (assignedTo && assignedTo.length > 0) {
      await User.updateMany(
        { _id: { $in: assignedTo } },
        { $inc: { 'progress.totalAssignments': 1 }, $push: { assignments: assignment._id } }
      );
    }

    await assignment.populate('createdBy', 'name email color');
    await assignment.populate('assignedTo', 'name email color');
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/assignments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name email color')
      .populate('assignedTo', 'name email color')
      .populate('submissions.student', 'name email color')
      .populate('board', 'title');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/assignments/:id – Update assignment
router.put('/:id', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name email color')
      .populate('assignedTo', 'name email color');
    if (!assignment) return res.status(404).json({ message: 'Not found' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/assignments/:id/submit – Student submits assignment
router.post('/:id/submit', auth, requireRole('student'), async (req, res) => {
  try {
    const { boardId, attachments } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const alreadySubmitted = assignment.submissions.find(
      (s) => s.student.toString() === req.user._id.toString()
    );
    if (alreadySubmitted) {
      alreadySubmitted.boardId = boardId;
      alreadySubmitted.attachments = attachments;
      alreadySubmitted.submittedAt = new Date();
    } else {
      assignment.submissions.push({ student: req.user._id, boardId, attachments });
    }
    if (assignment.status === 'open') assignment.status = 'in-progress';
    await assignment.save();
    res.json({ message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/assignments/:id/grade – Teacher grades submission
router.post('/:id/grade', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, grade, feedback, status } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const submission = assignment.submissions.find(
      (s) => s.student.toString() === studentId
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = status || 'reviewed';
    await assignment.save();

    // Update student progress if approved
    if (status === 'approved') {
      await User.findByIdAndUpdate(studentId, {
        $inc: { 'progress.completedAssignments': 1 },
      });
    }

    res.json({ message: 'Graded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
