const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // 'draw' | 'rect' | 'circle' | 'line' | 'text' | 'sticky' | 'arrow'
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  points: [{ x: Number, y: Number }],
  text: String,
  color: { type: String, default: '#ffffff' },
  bgColor: { type: String, default: '#fbbf24' },
  fontSize: { type: Number, default: 16 },
  strokeWidth: { type: Number, default: 2 },
  opacity: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'editor' },
      },
    ],
    elements: [elementSchema],
    background: { type: String, default: '#1a1a2e' },
    isPublic: { type: Boolean, default: false },
    inviteCode: { type: String, unique: true, sparse: true },
    tags: [String],
    thumbnail: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);
