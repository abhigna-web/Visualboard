const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Board = require('../models/Board');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/boards – Get all boards for current user
router.get('/', auth, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
        { isPublic: true },
      ],
    })
      .populate('owner', 'name email color')
      .populate('members.user', 'name email color')
      .sort({ updatedAt: -1 });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/boards – Create a new board
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, background, isPublic, tags } = req.body;
    const board = new Board({
      title,
      description,
      background,
      isPublic,
      tags,
      owner: req.user._id,
      inviteCode: uuidv4().slice(0, 8).toUpperCase(),
    });
    await board.save();

    // Add board to user
    await require('../models/User').findByIdAndUpdate(req.user._id, { $push: { boards: board._id } });

    await board.populate('owner', 'name email color');
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/boards/:id – Get single board
router.get('/:id', auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email color')
      .populate('members.user', 'name email color');
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/boards/:id – Update board metadata
router.put('/:id', auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const { title, description, background, isPublic, tags } = req.body;
    if (title) board.title = title;
    if (description !== undefined) board.description = description;
    if (background) board.background = background;
    if (isPublic !== undefined) board.isPublic = isPublic;
    if (tags) board.tags = tags;

    await board.save();
    res.json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/boards/:id/save-elements – Persist board elements
router.post('/:id/save-elements', auth, async (req, res) => {
  try {
    const { elements } = req.body;
    await Board.findByIdAndUpdate(req.params.id, { elements });
    res.json({ message: 'Board saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/boards/join/:code – Join via invite code
router.post('/join/:code', auth, async (req, res) => {
  try {
    const board = await Board.findOne({ inviteCode: req.params.code.toUpperCase() });
    if (!board) return res.status(404).json({ message: 'Invalid invite code' });

    const alreadyMember = board.members.find((m) => m.user.toString() === req.user._id.toString());
    const isOwner = board.owner.toString() === req.user._id.toString();

    if (!alreadyMember && !isOwner) {
      board.members.push({ user: req.user._id, role: 'editor' });
      await board.save();
      await require('../models/User').findByIdAndUpdate(req.user._id, { $push: { boards: board._id } });
    }

    res.json({ boardId: board._id, message: 'Joined board' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/boards/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await board.deleteOne();
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
