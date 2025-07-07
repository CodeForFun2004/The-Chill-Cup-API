const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contact: { type: String },
  openHours: { type: String },
  isActive: { type: Boolean, default: true },
  mapUrl: { type: String },
  image: { type: String },

  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Store', storeSchema);
