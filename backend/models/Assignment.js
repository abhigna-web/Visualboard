const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'reviewed', 'approved', 'rejected'], default: 'submitted' },
  grade: { type: Number, min: 0, max: 100 },
  feedback: { type: String, default: '' },
  attachments: [String],
});

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
    dueDate: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['open', 'in-progress', 'completed', 'archived'], default: 'open' },
    tags: [String],
    submissions: [submissionSchema],
    maxScore: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
