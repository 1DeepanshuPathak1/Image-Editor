const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
const { spawn } = require('child_process');
require('dotenv').config({ path: './.env' });

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection URL
const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Sign-up and sign-in routes
app.post('/signup', SignUp);
app.post('/signin', SignIn);

// Routes for Upload and Editing
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);

// New route for resizing images
app.post('/resize-image', upload.single('image'), (req, res) => {
    const { width, height } = req.body; // Ensure width and height are sent in the request body
    const tempInputPath = path.join(__dirname, 'uploads', 'temp_image.png');

    // Write the uploaded image buffer to a temporary file for processing
    const fs = require('fs');
    fs.writeFileSync(tempInputPath, req.file.buffer); // Write buffer to file

    // Spawn the Python script
    const pythonProcess = spawn('python', ['image_edit.py', tempInputPath, width, height]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        if (code !== 0) {
            return res.status(500).json({ message: 'Error resizing image.' });
        }
        res.download('uploads/resized_image.png', 'resized_image.png'); // Send the resized image as response
    });
});

// Serve static React files
app.use(express.static(path.join(__dirname, '..', 'Client', 'dist')));

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Client','dist', 'index.html'));
});

// Start server after MongoDB connection
MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
});
