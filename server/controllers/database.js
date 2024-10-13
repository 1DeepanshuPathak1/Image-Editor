const mongoose = require('mongoose');

async function MongoDB(connectionURL) {
   await mongoose.connect(connectionURL)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('Error connecting to MongoDB:', err));
};

module.exports = {MongoDB};