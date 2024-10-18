const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
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

// singup and signin routes
app.post('/signup',SignUp);

app.post('/signin',SignIn);

// Routes for Upload and Editing
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);

// Serve static React files
app.use(express.static(path.join(__dirname, 'Client', 'dist')));

// Catch-all route to serve React's index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'dist', 'index.html'));
});

// Start server after MongoDB connection
MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
});
