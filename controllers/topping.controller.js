const Topping = require('../models/topping.model');

exports.createTopping = async (req, res) => {
  try {
    const topping = await Topping.create(req.body);
    res.status(201).json(topping);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create topping' });
  }
};

exports.getAllToppings = async (req, res) => {
  try {
    const toppings = await Topping.find();
    res.status(200).json(toppings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch toppings' });
  }
};

exports.updateTopping = async (req, res) => {
  try {
    const updated = await Topping.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update topping' });
  }
};

exports.deleteTopping = async (req, res) => {
  try {
    await Topping.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Topping deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete topping' });
  }
};
