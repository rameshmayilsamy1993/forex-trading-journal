const mongoose = require('mongoose');

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to MongoDB Atlas... (Attempt ${i + 1}/${retries})`);

      await mongoose.connect(process.env.MONGODB_URI, mongoOptions);

      console.log('MongoDB Atlas connected successfully');

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected. Attempting to reconnect...');
        setTimeout(() => connectWithRetry(1, 3000), 3000);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return true;
    } catch (err) {
      console.error(`MongoDB connection failed:`, err.message);

      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Max retry attempts reached. Please check your MongoDB Atlas configuration.');
        process.exit(1);
      }
    }
  }
};

module.exports = { connectWithRetry, mongoose };
