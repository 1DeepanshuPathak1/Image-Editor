const express = require('express');
const cors = require('cors');
const multer = require('multer');
const passport = require('passport');
const session = require('express-session');
const SpotifyWebApi = require('spotify-web-api-node');
const AWS = require('aws-sdk');
const DynamoDBStore = require('connect-dynamodb')({ session: session });
const { SignUp, SignIn, GoogleCallback, GitHubCallback, SpotifyCallback, SpotifyDisconnect, AuthCheck, isAuthenticated } = require('./controllers/connect');
const { FilterRequest, UploadPost } = require('./controllers/Getrequests');
const { ResizeImage } = require('./controllers/resizeImage');
const { enhanceImage } = require('./controllers/UpscaleImage');
const songRecommender = require('./controllers/songRecommender');
const setupSongRoutes = require('./routes/songRoutes');
const redisService = require('./services/redisService');
const crypto = require('crypto');
require('dotenv').config();

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Express app initialization
const app = express();
const port = process.env.PORT || 3000;

// Middleware configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
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

// DynamoDB session store configuration
const dynamoDBStore = new DynamoDBStore({
    table: 'Sessions',
    AWSConfigJSON: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    ttl: 24 * 60 * 60 * 1000
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: dynamoDBStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

app.use(passport.initialize());
app.use(passport.session());
require('./services/passportConfig');

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// Spotify configuration
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/spotify/callback'
});

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
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/signin` }), (req, res) => {
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}${returnTo}?auth=success`);
});
app.get('/auth/github', (req, res, next) => {
    req.session.returnTo = req.query.returnTo;
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: `${process.env.CLIENT_URL}/signin` }), (req, res) => {
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}${returnTo}?auth=success`);
});
app.get('/auth/spotify', (req, res, _next) => {
    const returnTo = req.query.returnTo || '/song-recommender';
    req.session.returnTo = returnTo;
    const state = crypto.randomUUID();
    req.session.spotifyState = state;
    try {
        const authUrl = spotifyApi.createAuthorizeURL(['user-read-private', 'user-read-email'], state, { prompt: 'login' });
        res.status(200).json({ authUrl });
    } catch (error) {
        console.error('Spotify auth URL error:', error);
        res.status(500).json({ error: 'Failed to generate Spotify auth URL' });
    }
});
app.get('/auth/spotify/callback', (req, res, next) => {
    const { state, error } = req.query;
    const storedState = req.session.spotifyState;
    delete req.session.spotifyState;

    if (error) {
        console.error('Spotify OAuth callback error:', error);
        return res.redirect(`${process.env.CLIENT_URL}/signin?error=spotify_auth_failed`);
    }

    if (state !== storedState) {
        console.error('Spotify OAuth state mismatch:', { received: state, expected: storedState });
        return res.redirect(`${process.env.CLIENT_URL}/signin?error=state_mismatch`);
    }

    passport.authenticate('spotify', { 
        failureRedirect: `${process.env.CLIENT_URL}/signin?error=spotify_auth_failed` 
    })(req, res, next);
}, (req, res) => {
    const returnTo = req.session.returnTo || '/song-recommender';
    delete req.session.returnTo;
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}${returnTo}?spotifyCallback=true`);
});
app.post('/auth/spotify/disconnect', isAuthenticated, SpotifyDisconnect);
app.get('/auth/check', AuthCheck);
app.post('/signout', async (req, res) => {
    try {
        const userId = req.user?.id;
        
        req.logout((err) => {
            if (err) {
                console.error('Logout error during Passport logout:', err);
                return res.status(500).json({ message: 'Failed to sign out (Passport logout error)' });
            }
            
            // Clear Redis cache for the user
            if (userId) {
                redisService.clearUserCache(userId);
            }
            
            if (req.session.user) {
                delete req.session.user;
            }
            if (req.session.spotifyState) {
                delete req.session.spotifyState;
            }
            if (req.session.returnTo) {
                delete req.session.returnTo;
            }
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                    return res.status(500).json({ message: 'Failed to destroy session' });
                }
                res.clearCookie('connect.sid', { path: '/' });
                res.clearCookie('spotify_auth_state', { path: '/' });
                res.status(200).json({ message: 'Signed out successfully' });
            });
        });
    } catch (error) {
        console.error('Signout error:', error);
        res.status(500).json({ message: 'Failed to sign out', details: error.message });
    }
});

app.get('/api/user', async (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        let spotifyConnected = false;
        
        const cachedData = await redisService.getUserAuth(user.id);
        if (cachedData && cachedData.spotifyAccessToken) {
            spotifyConnected = true;
        }
        
        return res.status(200).json({
            userId: user._id.toString(),
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.firstName || user.name,
                spotifyConnected
            }
        });
    } else if (req.session.user) {
        const sessionUser = req.session.user;
        return res.status(200).json({
            userId: sessionUser.id.toString(),
            user: {
                id: sessionUser.id.toString(),
                email: sessionUser.email,
                name: sessionUser.name,
                spotifyConnected: sessionUser.spotifyConnected || false
            }
        });
    }
    
    return res.status(200).json({ userId: null, user: null });
});

// Image processing routes
app.post('/upload', upload.single('image'), UploadPost);
app.get('/edit/:filterType', FilterRequest);
app.post('/resize', upload.single('image'), ResizeImage);
app.post('/upscale', upload.single('image'), enhanceImage);

// Song recommendation routes
const songRouter = setupSongRoutes();
app.use('/api/songs', songRouter);

// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'image-editor-api'
    });
});

// Initialize DynamoDB connection test
const testDynamoDBConnection = async () => {
    try {
        const dynamodb = new AWS.DynamoDB();
        await dynamodb.listTables().promise();
        console.log('DynamoDB connection established successfully');
        return true;
    } catch (error) {
        console.error('DynamoDB connection error:', error);
        return false;
    }
};

// Start server
let server;
Promise.all([testDynamoDBConnection(), redisService.connect()])
    .then(([dynamoConnected, _]) => {
        if (dynamoConnected) {
            server = app.listen(port, () => {
                console.log(`Server running on port ${port}`);
                console.log('Using DynamoDB as the database');
                console.log('Redis cache initialized');
            });
        } else {
            console.error('Failed to connect to DynamoDB');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

const gracefulShutdown = async () => {
    console.log('Received shutdown signal, starting graceful shutdown...');
    songRecommender.cleanup();
    songRouter.cleanup();
    await redisService.disconnect();
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
    console.log('Graceful shutdown completed');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);