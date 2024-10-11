const mongoose = require('mongoose');

const editedImageSchema = new mongoose.Schema({
  originalImage: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedImage' },
  editedFilename: { type: String, required: true },
  editType: { type: String, required: true }, // e.g., 'blackwhite', 'greyscale'
  editDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EditedImage', editedImageSchema);
