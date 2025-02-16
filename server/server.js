const express = require('express');
const cors = require('cors');
const multer = require('multer');
const passport = require('passport');
const session = require('express-session');
const SpotifyWebApi = require('spotify-web-api-node');
const { MongoDB } = require('./controllers/database');
const MongoStore = require('connect-mongo');
const { SignUp, SignIn, GoogleCallback, GitHubCallback, AuthCheck } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
const { ResizeImage } = require('./controllers/resizeImage');
const { enhanceImage } = require('./controllers/UpscaleImage');
const songRoutes = require('./routes/songRoutes');
require('dotenv').config();

// Express app initialization
const app = express();
const port = process.env.PORT || 3000;
const connectionURL = 'mongodb://localhost:27017/imageEditorDB';

// Middleware configuration
const corsOptions = {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: connectionURL,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',  // Add this
        domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : 'localhost' 
    }
}));



// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
require('./passportConfig');

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// Spotify configuration
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback'
});

// Refresh Spotify token periodically
const refreshSpotifyToken = async () => {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Spotify token refreshed successfully');
    } catch (error) {
        console.error('Error refreshing Spotify token:', error);
    }
};

// Initial token refresh and setup 45-minute refresh interval
refreshSpotifyToken()
    .then(() => {
        setInterval(refreshSpotifyToken, 45 * 60 * 1000);
    })
    .catch(console.error);

// Return To URL middleware
app.use((req, _res, next) => {
    if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo;
    }
    next();
});

// Authentication routes
app.post('/signup', SignUp);
app.post('/signin', SignIn);
app.get('/auth/google', (req, res, next) => {
    req.session.returnTo = req.query.returnTo;
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
app.get('/auth/google/callback', GoogleCallback);
app.get('/auth/github', (req, res, next) => {
    req.session.returnTo = req.query.returnTo;
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});
app.get('/auth/github/callback', GitHubCallback);
app.get('/auth/check', AuthCheck);
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        return res.status(200).json({
            userId: user._id.toString(),
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.firstName || user.name
            }
        });
    } else if (req.session.user) {
        const sessionUser = req.session.user;
        return res.status(200).json({
            userId: sessionUser.id.toString(),
            user: {
                id: sessionUser.id.toString(),
                email: sessionUser.email,
                name: sessionUser.name
            }
        });
    }
    
    return res.status(200).json({ userId: null, user: null });
});

// Spotify authentication routes
app.get('/login', (_req, res) => {
    const scopes = ['user-read-private', 'user-read-email'];
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        res.redirect('/song-recommender');
    } catch (error) {
        console.error('Error in Spotify callback:', error);
        res.redirect('/error');
    }
});

// Image processing routes
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);
app.post('/resize', upload.single('image'), ResizeImage);
app.post('/upscale', upload.single('image'), enhanceImage);

// Song recommendation routes
app.use('/api/songs', songRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
MongoDB(connectionURL)
    .then(() => {
        app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });