const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/users – Get all users (admin/teacher only)
router.get('/', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/students – Get only students
router.get('/students', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/progress – Get progress for all students (admin/teacher)
router.get('/progress', auth, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email color progress createdAt')
      .sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/me/progress – Get own progress (student)
router.get('/me/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email color progress boards assignments')
      .populate('boards', 'title updatedAt')
      .populate('assignments', 'title status dueDate priority');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/me – Update own profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, color } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (color) updates.color = color;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
