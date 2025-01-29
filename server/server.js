// Description: Main server file for the image editor application.
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const passport = require('passport');
const session = require('express-session');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn, GoogleCallback, AuthCheck } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
const { ResizeImage } = require('./controllers/resizeImage');
const { enhanceImage } = require('./controllers/UpscaleImage');
require('dotenv').config();
require('./passportConfig');

//Express app
const app = express();
const port = process.env.PORT || 3000;
const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

//Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
//Passport and Multer middleware
app.use(passport.initialize());
app.use(passport.session());
const upload = multer({ storage: multer.memoryStorage(),limits: { fileSize: 10 * 1024 * 1024 } });

//Signups and Signins
app.post('/signup', SignUp);
app.post('/signin', SignIn);
//Authenticating with Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', GoogleCallback);
app.get('/auth/check', AuthCheck);
//uploading and editing images
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);
app.post('/resize', upload.single('image'), ResizeImage);
app.post('/upscale', upload.single('image'), enhanceImage);


//Database connection and server start
MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => {
    console.error('Database connection error:', err);
});