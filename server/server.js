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
const port = process.env.PORT || 5000;

const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

app.post('/signup', SignUp);
app.post('/signin', SignIn);

app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);

const fs = require('fs');
const tmp = require('tmp');

app.post('/resize', upload.single('image'), (req, res) => {
    const { width, height, size, format } = req.query;

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    tmp.file({ postfix: '.png' }, (err, tempPath) => {
        if (err) {
            return res.status(500).send('Error creating temp file.');
        }

        fs.writeFile(tempPath, req.file.buffer, (err) => {
            if (err) {
                return res.status(500).send('Error saving file.');
            }

            const pythonProcess = spawn('python', ['resize.py', tempPath, width, height, size, format]);

            let output = '';
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).send('Error resizing image.');
                }

                const outputLines = output.trim().split('\n');
                const lastLine = outputLines[outputLines.length - 1];
                const [resizedImage, actualSize] = lastLine.split(',');

                res.json({ resizedImage, actualSize: parseFloat(actualSize) });
            });
        });
    });
});

app.use(express.static(path.join(__dirname, 'Client', 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Client', 'dist', 'index.html'));
});

MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => {
    console.error('Database connection error:', err);
});