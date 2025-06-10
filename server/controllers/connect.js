const moment = require('moment');
const { User, Log } = require('../models/User');
const UAParser = require('ua-parser-js');
const passport = require('passport');
const bcrypt = require('bcrypt');

const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]
        || req.headers['x-real-ip']
        || req.connection.remoteAddress
        || req.socket.remoteAddress;
};

async function SignUp(req, res) {
    try {
        const { firstName, middleName, lastName, dateOfBirth, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const newUser = new User({ firstName, middleName, lastName, dateOfBirth, email, password });
        await newUser.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('SignUp error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
}

async function SignIn(req, res) {
    const { email, password } = req.body;
    const userIp = req.ip;
    const userAgent = req.headers['user-agent'];
    const parser = new UAParser(userAgent);
    const browserInfo = parser.getBrowser();
    const deviceInfo = parser.getDevice();
    const userBrowser = browserInfo.name || "unknown";
    const userDevice = deviceInfo.vendor || "unknown";

    try {
        const user = await User.findOne({ email });
        if (!user) {
            await Log.create({
                email,
                ip: userIp,
                browser: userBrowser,
                device: userDevice || 'unknown',
                status: 'failed',
                timestamp: moment().format("DD/MM/YY-HH:mm"),
            });
            return res.status(400).json({ message: 'No user found.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await Log.create({
                email,
                ip: userIp,
                browser: userBrowser,
                device: userDevice || 'unknown',
                status: 'failed',
                timestamp: moment().format("DD/MM/YY-HH:mm"),
            });
            return res.status(400).json({ message: 'Incorrect password.' });
        }

        await Log.create({
            email: user.email,
            ip: userIp,
            realIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            browser: userBrowser,
            device: userDevice,
            status: 'success',
            provider: 'local',
            timestamp: moment().format("DD/MM/YY-HH:mm"),
            userId: user._id
        });

        return new Promise((resolve, reject) => {
            req.login(user, async (loginErr) => {
                if (loginErr) {
                    console.error('Login error:', loginErr);
                    reject(loginErr);
                    return res.status(500).json({ message: 'Error during login' });
                }

                req.session.user = {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.firstName,
                    provider: 'local'
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
                        id: user._id.toString(),
                        email: user.email,
                        name: user.firstName
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
        const userIp = req.ip;
        const parser = new UAParser(req.headers['user-agent']);
        const userBrowser = parser.getBrowser().name;
        const userDevice = parser.getDevice().type;

        try {
            if (!req.user) {
                console.error('Google authentication failed: No user data');
                await Log.create({
                    email: 'unknown',
                    ip: userIp,
                    browser: userBrowser || 'unknown',
                    device: userDevice || 'unknown',
                    status: 'failed',
                    provider: 'google',
                    timestamp: moment().format("DD/MM/YY-HH:mm"),
                    error: 'No user data received'
                });
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
            }

            await Log.create({
                email: req.user.email,
                ip: userIp,
                realIP: getClientIP(req),
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'success',
                provider: 'google',
                timestamp: moment().format('DD/MM/YY-HH:mm'),
                userId: req.user._id
            });

            req.session.user = {
                id: req.user._id.toString(),
                email: req.user.email,
                name: req.user.firstName,
                provider: 'google'
            };
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(`${process.env.CLIENT_URL}${redirectTo}`);
        } catch (error) {
            console.error('Google OAuth Error:', error);
            await Log.create({
                email: req.user?.email || 'unknown',
                ip: userIp,
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'error',
                provider: 'google',
                timestamp: moment().format("DD/MM/YY-HH:mm:ss"),
                error: error.message
            });
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
        const userIp = req.ip;
        const parser = new UAParser(req.headers['user-agent']);
        const userBrowser = parser.getBrowser().name;
        const userDevice = parser.getDevice().type;

        try {
            if (!req.user) {
                console.error('GitHub authentication failed: No user data');
                await Log.create({
                    email: 'unknown',
                    ip: userIp,
                    browser: userBrowser || 'unknown',
                    device: userDevice || 'unknown',
                    status: 'failed',
                    provider: 'github',
                    timestamp: moment().format("DD/MM/YYYY-HH:mm:ss"),
                    error: 'No user data received'
                });
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
            }
            await Log.create({
                email: req.user.email,
                ip: userIp,
                realIP: getClientIP(req),
                browser: userBrowser || 'unknown',
                device: userDevice || 'email',
                status: 'success',
                provider: 'github',
                timestamp: moment().format("DD/MM/YYYY-HH:mm:ss"),
                userId: req.user._id
            });

            req.session.user = {
                id: req.user._id.toString(),
                email: req.user.email,
                name: req.user.firstName,
                provider: 'github'
            };
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(`${process.env.CLIENT_URL}${redirectTo}`);
        } catch (error) {
            console.error('GitHub OAuth Error:', error);
            await Log.create({
                email: req.user?.email || 'unknown',
                ip: userIp,
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'error',
                provider: 'github',
                timestamp: moment().format("DD/MM/DD/YYYY-HH:mm:ss"),
                error: error.message
            });
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
        const userIp = req.ip;
        const parser = new UAParser(req.headers['user-agent']);
        const userBrowser = parser.getBrowser().name;
        const userDevice = parser.getDevice().type;

        try {
            if (!req.user) {
                // Check for detailed error messages from passport-spotify
                const failureMessage = req.session.messages?.[0] || 'No user data received';
                console.error('Spotify authentication failed:', {
                    failureMessage,
                    session: req.session,
                    headers: req.headers
                });
                await Log.create({
                    email: 'unknown',
                    ip: userIp,
                    browser: userBrowser || 'unknown',
                    device: userDevice || 'unknown',
                    status: 'failed',
                    provider: 'spotify',
                    timestamp: moment().format("DD/MM/YY-HH:mm"),
                    error: failureMessage
                });
                delete req.session.messages;
                const errorMessage = typeof failureMessage === 'string' && failureMessage.includes('non-Premium') 
                    ? 'spotify_non_premium' 
                    : failureMessage.message || 'spotify_auth_failed';
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=${errorMessage}`);
            }

            await Log.create({
                email: req.user.email,
                ip: userIp,
                realIP: getClientIP(req),
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'success',
                provider: 'spotify',
                timestamp: moment().format("DD/MM/YY-HH:mm"),
                userId: req.user._id
            });

            req.session.user = {
                id: req.user._id.toString(),
                email: req.user.email,
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
            await Log.create({
                email: req.user?.email || 'unknown',
                ip: userIp,
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'error',
                provider: 'spotify',
                timestamp: moment().format("DD/MM/YY-HH:mm"),
                error: error.message
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

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clear Spotify-related fields
        user.spotifyId = null;
        user.spotifyAccessToken = null;
        user.spotifyRefreshToken = null;
        user.spotifyTokenExpires = null;
        await user.save();

        // Update session
        if (req.session.user) {
            req.session.user.spotifyConnected = false;
        }

        await Log.create({
            email: user.email,
            ip: req.ip,
            realIP: getClientIP(req),
            browser: new UAParser(req.headers['user-agent']).getBrowser().name || 'unknown',
            device: new UAParser(req.headers['user-agent']).getDevice().type || 'unknown',
            status: 'success',
            provider: 'spotify',
            timestamp: moment().format("DD/MM/YY-HH:mm"),
            userId: user._id,
            action: 'disconnect'
        });

        res.status(200).json({ message: 'Spotify account disconnected successfully' });
    } catch (error) {
        console.error('Spotify disconnect error:', error);
        await Log.create({
            email: req.user?.email || 'unknown',
            ip: req.ip,
            browser: new UAParser(req.headers['user-agent']).getBrowser().name || 'unknown',
            device: new UAParser(req.headers['user-agent']).getDevice().type || 'unknown',
            status: 'error',
            provider: 'spotify',
            timestamp: moment().format("DD/MM/YY-HH:mm"),
            error: error.message,
            action: 'disconnect'
        });
        res.status(500).json({ message: 'Failed to disconnect Spotify' });
    }
}

async function AuthCheck(req, res) {
    try {
        const isAuthenticated = req.isAuthenticated();
        let spotifyConnected = false;
        if (isAuthenticated && req.user?.spotifyAccessToken) {
            spotifyConnected = true;
        }
        res.json({ isAuthenticated, spotifyConnected });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
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