const {Filter} = require('./Filters');
const {UploadedImage, EditedImage} = require('../models/Imagehandler')
const moment = require('moment');

async function FilterRequest(req,res) {
    const { filterType } = req.params;
    const { id, rotation = 0, intensity = 50 } = req.query;

    const uploadedImage = await UploadedImage.findById(id);
    if (!uploadedImage) return res.status(404).json({ message: 'Image not found' });

    try {
        const editedImageBuffer = await Filter(uploadedImage.image, filterType, rotation, intensity);
        const base64Image = editedImageBuffer.toString('base64');
        const formattedTime = moment().format('DD/MM/YY-HH:mm');
        const editedImage = new EditedImage({ image: editedImageBuffer, timestamp: formattedTime });
        await editedImage.save();
        res.json({ message: 'Image edited successfully', image: base64Image });
    } catch (error) {
        console.error('Error during editing:', error);
        res.status(500).json({ message: 'Error editing image', error });
    }
};

async function UploadPost(req,res){
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const formattedTime = moment().format('DD/MM/YY-HH:mm');
    const uploadedImage = new UploadedImage({ image: req.file.buffer, timestamp: formattedTime });
    await uploadedImage.save();
    const base64Image = req.file.buffer.toString('base64');
    res.json({ message: 'File uploaded successfully', image: base64Image, id: uploadedImage._id });
}

module.exports = {FilterRequest,UploadPost};