const passport = require('passport');
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

const GoogleCallback = [
    passport.authenticate('google', {
        failureRedirect: '/signin',
        session: true
    }),
    async (req, res) => {
        try {
            if (!req.user) {
                console.error('Google authentication failed: No user data');
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
            }

            const userAuth = await redisService.getUserAuth(req.user.id);

            req.session.user = {
                id: req.user.id,
                provider: 'google',
                spotifyConnected: !!(userAuth && userAuth.spotifyAccessToken)
            };
            
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(`${process.env.CLIENT_URL}${redirectTo}`);
        } catch (error) {
            console.error('Google OAuth Error:', error);
            res.redirect(`${process.env.CLIENT_URL}/signin?error=server_error`);
        }
    }
];

const GitHubCallback = [
    passport.authenticate('github', {
        failureRedirect: '/signin',
        session: true
    }),
    async (req, res) => {
        try {
            if (!req.user) {
                console.error('GitHub authentication failed: No user data');
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
            }

            const userAuth = await redisService.getUserAuth(req.user.id);
            
            req.session.user = {
                id: req.user.id,
                provider: 'github',
                spotifyConnected: !!(userAuth && userAuth.spotifyAccessToken)
            };
            
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(`${process.env.CLIENT_URL}${redirectTo}`);
        } catch (error) {
            console.error('GitHub OAuth Error:', error);
            res.redirect(`${process.env.CLIENT_URL}/signin?error=server_error`);
        }
    }
];

const SpotifyCallback = [
    passport.authenticate('spotify', {
        failureRedirect: `${process.env.CLIENT_URL}/signin?error=spotify_auth_failed`,
        failureMessage: true,
        session: true
    }),
    async (req, res) => {
        try {
            if (!req.user) {
                const failureMessage = req.session.messages?.[0] || 'No user data received';
                console.error('Spotify authentication failed:', {
                    failureMessage,
                    session: req.session,
                    headers: req.headers
                });
                delete req.session.messages;
                const errorMessage = typeof failureMessage === 'string' && failureMessage.includes('non-Premium') 
                    ? 'spotify_non_premium' 
                    : failureMessage.message || 'spotify_auth_failed';
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=${errorMessage}`);
            }

            const userAuth = await redisService.getUserAuth(req.user.id);

            req.session.user = {
                id: req.user.id,
                provider: req.session.user?.provider || 'local',
                spotifyConnected: true
            };

            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('SpotifyCallback: Session save error:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            const redirectTo = req.session.returnTo || '/song-recommender';
            delete req.session.returnTo;
            res.redirect(`${process.env.CLIENT_URL}${redirectTo}?spotifyCallback=true`);
        } catch (error) {
            console.error('Spotify OAuth Error:', {
                error: error.message,
                stack: error.stack,
                user: req.user,
                session: req.session
            });
            const errorMessage = error.message.includes('non-Premium') ? 'spotify_non_premium' : 'server_error';
            res.redirect(`${process.env.CLIENT_URL}/signin?error=${errorMessage}`);
        }
    }
];

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

module.exports = { SignUp, SignIn, GoogleCallback, GitHubCallback, SpotifyCallback, SpotifyDisconnect, AuthCheck, isAuthenticated };