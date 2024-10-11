const mongoose = require('mongoose');

const uploadedImageSchema = new mongoose.Schema({
    image: { type: Buffer, required: true }, // Store image as Buffer
    timestamp: { type: String, required: true } // Store the formatted timestamp
});

const UploadedImage = mongoose.model('UploadedImage', uploadedImageSchema);
module.exports = UploadedImage;
