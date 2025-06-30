const mongoose = require('mongoose');
require('dotenv').config();

const mongoURL = process.env.MONGO_URI;

//const mongoCloud = process.env.MONGO_URL;

const connectDB = async () => {
   try {
       await mongoose.connect(mongoURL );
    //   await mongoose.connect(mongoCloud);
      console.log('MongoDB connected successfully');
   } catch (err) {
      console.error('Error connecting MongoDB:', err.message);
      process.exit(1);
   }
};

module.exports = connectDB; 