// models/Size.ts
const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['S', 'M', 'L'],
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  multiplier: {
    type: Number,
    required: true,
  },
  volume: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Size', sizeSchema);
