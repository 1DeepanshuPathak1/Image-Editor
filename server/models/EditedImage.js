// models/EditedImage.js
const mongoose = require('mongoose');

const editedImageSchema = new mongoose.Schema({
  image: { type: Buffer, required: true },
});

const EditedImage = mongoose.model('EditedImage', editedImageSchema);
module.exports = EditedImage;
