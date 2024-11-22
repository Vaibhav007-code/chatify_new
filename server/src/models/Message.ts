import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'media', 'voice'], default: 'text' },
  mediaUrl: { type: String },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Message', messageSchema); 