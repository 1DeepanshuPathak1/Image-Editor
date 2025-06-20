const { EditedImage, UploadedImage } = require('../models/Imagehandler');
const { executePythonScript } = require('./Filters');

const FilterRequest = async (req, res) => {
    try {
        const { filterType } = req.params;
        const { imageUrl } = req.query;

        if (!filterType || !imageUrl) {
            return res.status(400).json({ error: 'Missing filterType or imageUrl' });
        }

        const scriptPath = `${__dirname}/../PythonScripts/image_edit.py`;
        const args = [filterType, imageUrl];
        const output = await executePythonScript(scriptPath, args);

        const editedImage = await EditedImage.create({
            image: Buffer.from(output, 'base64'),
            timestamp: new Date().toISOString()
        });

        res.status(200).json({ filteredImage: `data:image/png;base64,${editedImage.image.toString('base64')}` });
    } catch (error) {
        console.error('Filter request error:', error);
        res.status(500).json({ error: 'Failed to apply filter', details: error.message });
    }
};

const UploadPost = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.isAuthenticated() ? req.user._id : req.session.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const uploadedImage = await UploadedImage.create({
            image: req.file.buffer,
            timestamp: new Date().toISOString()
        });

        res.status(201).json({ message: 'Image uploaded successfully', imageId: uploadedImage.imageId });
    } catch (error) {
        console.error('Upload post error:', error);
        res.status(500).json({ error: 'Failed to upload image', details: error.message });
    }
};

module.exports = { FilterRequest, UploadPost };