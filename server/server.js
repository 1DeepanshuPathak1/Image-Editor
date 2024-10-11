const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const EditedImage = require('./models/EditedImage');
const moment = require('moment');
const { spawn } = require('child_process');

const UploadedImage = require('./models/UploadedImage');

const app = express();
const PORT = 5000;

// mongo connection
mongoose.connect('mongodb://localhost:27017/imageEditorDB')
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//handle image upload
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
  }

  const formattedTime = moment().format('DD/MM/YY-HH:mm');

  const uploadedImage = new UploadedImage({
      image: req.file.buffer,
      timestamp: formattedTime 
  });
  await uploadedImage.save();
  const base64Image = req.file.buffer.toString('base64');
  res.json({ message: 'File uploaded successfully', image: base64Image, id: uploadedImage._id, timestamp: formattedTime });
});

app.get('/edit/:filterType', async (req, res) => {
    const filterType = req.params.filterType;
    const imageId = req.query.id;

    const uploadedImage = await UploadedImage.findById(imageId);
    if (!uploadedImage) {
        return res.status(404).json({ message: 'Image not found' });
    }

    try {
        const editedImageBuffer = await applyFilter(uploadedImage.image, filterType);
        const editedImage = new EditedImage({ image: editedImageBuffer });
        await editedImage.save();
        const base64Image = editedImageBuffer.toString('base64');
        res.json({ message: 'Image edited successfully', image: base64Image });
    } catch (error) {
        res.status(500).json({ message: 'Error editing image', error });
    }
});

//apply fliter with python script
const applyFilter = async (imageBuffer, filterType) => {
  return new Promise((resolve, reject) => {
    const process = spawn('python', ['image_edit.py', filterType]);
    process.stdin.write(imageBuffer);
    process.stdin.end();

    let editedImageData = [];
    process.stdout.on('data', (data) => editedImageData.push(data));
    process.stderr.on('data', (data) => reject(new Error(data.toString())));
    process.on('error', reject);
    process.on('close', (code) => code ? reject(new Error(`Exited with code ${code}`)) : resolve(Buffer.concat(editedImageData)));
  });
};


//server start
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
