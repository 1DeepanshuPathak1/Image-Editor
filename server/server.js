const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;

//middleware
app.use(cors());

//Multer for uploading imagess
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});
const upload = multer({ storage: storage });

//upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({ message: 'File uploaded successfully', imageUrl });
});

//static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//starting server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
