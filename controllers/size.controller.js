const Size = require('../models/size.model');

exports.createSize = async (req, res) => {
  try {
    const size = await Size.create(req.body);
    res.status(201).json(size);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create size' });
  }
};

exports.getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.find();
    res.status(200).json(sizes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
};

exports.updateSize = async (req, res) => {
  try {
    const updated = await Size.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update size' });
  }
};

exports.deleteSize = async (req, res) => {
  try {
    await Size.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Size deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete size' });
  }
};
