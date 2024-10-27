const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
require('dotenv').config({ path: './.env' });
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 5000; // Ensure the port matches your client

// MongoDB connection URL
const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

// Middleware
app.use(cors({
    origin: 'http://localhost:3001', // Allow requests from your React app
    methods: ['GET', 'POST', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow headers
    credentials: true // Allow credentials if needed
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Signup and signin routes
app.post('/signup', SignUp);
app.post('/signin', SignIn);

// Routes for Upload and Editing
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);

// Resize route
const fs = require('fs');
const tmp = require('tmp');

app.post('/resize', upload.single('image'), (req, res) => {
    const { width, height } = req.query;

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Create a temporary file
    tmp.file({ postfix: '.png' }, (err, tempPath) => {
        if (err) {
            console.error('Error creating temp file:', err);
            return res.status(500).send('Error creating temp file.');
        }

        // Write the image buffer to the temporary file
        fs.writeFile(tempPath, req.file.buffer, (err) => {
            if (err) {
                console.error('Error saving file:', err);
                return res.status(500).send('Error saving file.');
            }

            // Use the temporary file path for resizing
            const pythonProcess = spawn('python', ['resize.py', tempPath, width, height]);

            let output = '';
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString(); // Collect output data
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Error resizing image, code:', code);
                    return res.status(500).send('Error resizing image.');
                }

                // Clean up temporary file
                fs.unlink(tempPath, (err) => {
                    if (err) console.error('Error deleting temp file:', err);
                });

                // Send back the resized image as base64
                res.json({ resizedImage: output });
            });

        });
    });
});



// Serve static React files
app.use(express.static(path.join(__dirname, 'Client', 'dist')));

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'dist', 'index.html'));
});

// Start server after MongoDB connection
MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => {
    console.error('Database connection error:', err);
});
