const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const { spawn } = require('child_process');

const UploadedImage = require('./models/UploadedImage');

const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/imageEditorDB')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

app.use(cors());
app.use(express.json());

// Use memory storage to avoid saving files locally
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Handle image upload
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadedImage = new UploadedImage({ image: req.file.buffer }); // Save the image buffer directly to MongoDB
    await uploadedImage.save();

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    res.json({ message: 'File uploaded successfully', image: base64Image, id: uploadedImage._id });
});

// Handle image editing
app.get('/edit/:filterType', async (req, res) => {
    const filterType = req.params.filterType;
    const imageId = req.query.id;

    const uploadedImage = await UploadedImage.findById(imageId);
    if (!uploadedImage) {
        return res.status(404).json({ message: 'Image not found' });
    }

    try {
        const editedImageBuffer = await applyFilter(uploadedImage.image, filterType);
        const base64Image = editedImageBuffer.toString('base64');
        res.json({ message: 'Image edited successfully', image: base64Image }); // Return the edited image in base64 format
    } catch (error) {
        res.status(500).json({ message: 'Error editing image', error });
    }
});

// Apply filter using Python script
const applyFilter = async (imageBuffer, filterType) => {
  return new Promise((resolve, reject) => {
      const process = spawn('python', ['image_edit.py', filterType]);

      // Handle writing to the process
      process.stdin.write(imageBuffer);
      process.stdin.end();

      let editedImageData = [];
      process.stdout.on('data', (data) => {
          editedImageData.push(data);
      });

      process.stderr.on('data', (data) => {
          console.error(`Error from Python script: ${data}`);
          reject(new Error(`Error in Python script: ${data.toString()}`));
      });

      process.on('error', (err) => {
          console.error(`Failed to start subprocess: ${err}`);
          reject(err);
      });

      process.on('close', (code) => {
          if (code === 0) {
              resolve(Buffer.concat(editedImageData)); // Return the edited image buffer
          } else {
              reject(new Error(`Python script exited with code ${code}`));
          }
      });
  });
};

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
