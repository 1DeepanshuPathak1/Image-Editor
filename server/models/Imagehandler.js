const mongoose = require('mongoose');

const editedImageSchema = new mongoose.Schema({
    image: { type: Buffer, required: true },
    timestamp: { type: String, required: true }
  });
  
    const EditedImage = mongoose.model('EditedImage', editedImageSchema);

  
const uploadedImageSchema = new mongoose.Schema({
    image: { type: Buffer, required: true }, 
    timestamp: { type: String, required: true } 
});

    const UploadedImage = mongoose.model('UploadedImage', uploadedImageSchema);


module.exports = {UploadedImage,EditedImage};

