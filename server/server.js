const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const moment = require('moment');
const { spawn } = require('child_process');
const UploadedImage = require('./models/UploadedImage');
const EditedImage = require('./models/EditedImage'); 

const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/imageEditorDB')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

app.use(cors());
app.use(express.json());

// Multer 
const upload = multer({ storage: multer.memoryStorage() });

// Image Upload
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const formattedTime = moment().format('DD/MM/YY-HH:mm');
    const uploadedImage = new UploadedImage({ image: req.file.buffer, timestamp: formattedTime });
    await uploadedImage.save();

    const base64Image = req.file.buffer.toString('base64');
    res.json({ message: 'File uploaded successfully', image: base64Image, id: uploadedImage._id });
});

// Image Editing
app.get('/edit/:filterType', async (req, res) => {
    const { filterType } = req.params;
    const { id, rotation = 0, intensity = 50 } = req.query;

    const uploadedImage = await UploadedImage.findById(id);
    if (!uploadedImage) return res.status(404).json({ message: 'Image not found' });

    try {
        const editedImageBuffer = await applyFilter(uploadedImage.image, filterType, rotation, intensity);
        const base64Image = editedImageBuffer.toString('base64');
        const formattedTime = moment().format('DD/MM/YY-HH:mm');
        const editedImage = new EditedImage({ image: editedImageBuffer, timestamp: formattedTime });
        await editedImage.save();

        res.json({ message: 'Image edited successfully', image: base64Image });
    } catch (error) {
        console.error('Error during editing:', error);
        res.status(500).json({ message: 'Error editing image', error });
    }
});

// Function applying using python script
const applyFilter = (imageBuffer, filterType, rotation, intensity) => {
  return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['image_edit.py', filterType, rotation.toString(), intensity.toString()]);
      
      pythonProcess.stdin.write(imageBuffer);
      pythonProcess.stdin.end();
      let editedImageBuffer = [];
      pythonProcess.stdout.on('data', (data) => {
          editedImageBuffer.push(data);
      });
      pythonProcess.stderr.on('data', (error) => {
          reject(`Error: ${error}`);
      });
      pythonProcess.on('close', (code) => {
          if (code !== 0) {
              reject(`Process closed with code ${code}`);
          } else {
              resolve(Buffer.concat(editedImageBuffer));
          }
      });
  });
};


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
