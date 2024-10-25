const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn } = require('./controllers/connect');
const { resizeImage } = require('./controllers/resizeImage');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
require('dotenv').config({ path: './.env' });

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
app.post('/resize', upload.single('image'), async (req, res) => {
    try {
        const { width, height } = req.query;
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const resizedImage = await resizeImage(req.file.buffer, parseInt(width), parseInt(height));
        res.set('Content-Type', 'image/png');
        res.send(resizedImage);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
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
