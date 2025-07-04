const { User } = require('../models/User');
const passport = require('passport');

async function SignUp(req, res) {
    try {
        const { firstName, middleName, lastName, email, password, country } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const newUser = await User.create({ firstName, middleName, lastName, email, password, country });

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('SignUp error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
}

async function SignIn(req, res) {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'No user found.' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Incorrect password.' });
        }

        return new Promise((resolve, reject) => {
            req.login(user, async (loginErr) => {
                if (loginErr) {
                    console.error('Login error:', loginErr);
                    reject(loginErr);
                    return res.status(500).json({ message: 'Error during login' });
                }

                req.session.user = {
                    id: user.id,
                    name: user.firstName,
                    provider: 'local',
                    spotifyConnected: !!user.spotifyAccessToken
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
                        id: user.id,
                        name: user.firstName,
                        spotifyConnected: !!user.spotifyAccessToken
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

            req.session.user = {
                id: req.user.id,
                name: req.user.firstName,
                provider: 'google',
                spotifyConnected: !!req.user.spotifyAccessToken
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
            
            req.session.user = {
                id: req.user.id,
                name: req.user.firstName,
                provider: 'github',
                spotifyConnected: !!req.user.spotifyAccessToken
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

            // Update session with Spotify connection status
            req.session.user = {
                id: req.user.id,
                name: req.user.firstName,
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

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clear Spotify-related fields using the new method
        user.clearSpotifyData();
        await user.save();

        // Update session
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
        if (isAuthenticated && req.user?.spotifyAccessToken) {
            spotifyConnected = true;
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