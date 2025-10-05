const redisService = require('../services/redisService');

async function SignUp(req, res) {
    try {
        const { firstName, middleName, lastName, email, password, country } = req.body;
        const existingUser = await redisService.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const newUser = await redisService.createUser({ firstName, middleName, lastName, email, password, country });

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('SignUp error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
}

async function SignIn(req, res) {
    const { email, password } = req.body;

    try {
        const userAuth = await redisService.findUserByEmail(email);
        if (!userAuth) {
            return res.status(400).json({ message: 'No user found.' });
        }

        return new Promise((resolve, reject) => {
            req.login({ id: userAuth.userId }, async (loginErr) => {
                if (loginErr) {
                    console.error('Login error:', loginErr);
                    reject(loginErr);
                    return res.status(500).json({ message: 'Error during login' });
                }

                req.session.user = {
                    id: userAuth.userId,
                    provider: 'local',
                    spotifyConnected: !!userAuth.spotifyAccessToken
                };

                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) {
                            console.error('Session save error in SignIn:', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                resolve();
                return res.status(200).json({
                    message: 'Sign in successful!',
                    user: {
                        id: userAuth.userId,
                        spotifyConnected: !!userAuth.spotifyAccessToken
                    }
                });
            });
        });
    } catch (error) {
        console.error('SignIn error:', error);
        return res.status(500).json({ message: 'Server error during sign-in.' });
    }
}

async function SpotifyDisconnect(req, res) {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await redisService.clearSpotifyTokens(req.user.id);

        if (req.session.user) {
            req.session.user.spotifyConnected = false;
        }

        return res.status(200).json({ message: 'Spotify account disconnected successfully' });
    } catch (error) {
        console.error('Spotify disconnect error:', error);
        return res.status(500).json({ message: 'Failed to disconnect Spotify' });
    }
}

async function AuthCheck(req, res) {
    try {
        const isAuthenticated = req.isAuthenticated();
        let spotifyConnected = false;
        
        if (isAuthenticated && req.user) {
            const userAuth = await redisService.getUserAuth(req.user.id);
            spotifyConnected = !!(userAuth && userAuth.spotifyAccessToken);
        }
        
        return res.json({ isAuthenticated, spotifyConnected });
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(500).json({
            isAuthenticated: false,
            spotifyConnected: false,
            error: 'Authentication check failed'
        });
    }
}

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { SignUp, SignIn, SpotifyDisconnect, AuthCheck, isAuthenticated };