const mongoose = require('mongoose');

const uploadedImageSchema = new mongoose.Schema({
  image: { type: Buffer, required: true }
});

const UploadedImage = mongoose.model('UploadedImage', uploadedImageSchema);
module.exports = UploadedImage;
