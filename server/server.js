const express = require('express');
const cors = require('cors');
const multer = require('multer');
const passport = require('passport');
const session = require('express-session');
const { MongoDB } = require('./controllers/database');
const { SignUp, SignIn, GoogleCallback, GitHubCallback, AuthCheck } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
const { ResizeImage } = require('./controllers/resizeImage');
const { enhanceImage } = require('./controllers/UpscaleImage');
require('dotenv').config();

// Express app
const app = express();
const port = process.env.PORT || 3000;
const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
require('./passportConfig');

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

app.use((req, _res, next) => {
    if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo;
    }
    next();
});
// Authentication routes
app.post('/signup', SignUp);
app.post('/signin', SignIn);
app.get('/auth/google', (req, res, next) => { req.session.returnTo = req.query.returnTo; passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next); });
app.get('/auth/google/callback', GoogleCallback);
app.get('/auth/github', (req, res, next) => { req.session.returnTo = req.query.returnTo; passport.authenticate('github', {scope:['user:email']})(req, res, next); });
app.get('/auth/github/callback', GitHubCallback);
app.get('/auth/check', AuthCheck);

// Image processing routes
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);
app.post('/resize', upload.single('image'), ResizeImage);
app.post('/upscale', upload.single('image'), enhanceImage);

// Database connection and server start
MongoDB(connectionURL).then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(err => {
    console.error('Database connection error:', err);
});