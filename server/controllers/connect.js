const moment = require('moment');
const { User, Log } = require('../models/User');
const UAParser = require('ua-parser-js'); 
const passport = require('passport')


const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] 
        || req.headers['x-real-ip']
        || req.connection.remoteAddress
        || req.socket.remoteAddress;
};


async function SignUp(req,res) {
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
        console.error(error);
        res.status(500).json({ message: 'Error creating user' });
    }
}

async function SignIn(req,res)  {
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
            return res.status(400).json({ message: 'No Users Found or Invalid Email.' });
        }
        if (!await user.comparePassword(password)) {
            await Log.create({
                email,
                ip: userIp,
                browser: userBrowser,
                device: userDevice || 'unknown', 
                status: 'failed',
                timestamp: moment().format("DD/MM/YY-HH:mm"), 
            });
            return res.status(400).json({ message: 'Invalid Password.' });
        }
        await Log.create({
            email,
            ip: userIp,
            realIP:getClientIP(req),
            browser: userBrowser,
            device: userDevice,
            status: 'success',
            provider: 'local',
            timestamp: moment().format("DD/MM/YY-HH:mm"),
        });
        res.status(200).json({ message: 'Sign in successful!' });
    } catch (error) {
        console.error('Error during sign in:', error);
        res.status(500).json({ message: 'Server error.' });
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
                timestamp: moment().format("DD/MM/YY-HH:mm"),
                userId: req.user._id
            });

            req.session.user = {
                id: req.user._id,
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
                timestamp: moment().format("DD/MM/YY-HH:mm"),
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
                    timestamp: moment().format("DD/MM/YY-HH:mm"),
                    error: 'No user data received'
                });
                return res.redirect(`${process.env.CLIENT_URL}/signin?error=auth_failed`);
            }
            await Log.create({
                email: req.user.email,
                ip: req.ip,
                realIP: getClientIP(req),
                browser: userBrowser || 'unknown',
                device: userDevice || 'unknown',
                status: 'success',
                provider: 'github',
                timestamp: moment().format("DD/MM/YY-HH:mm"),
                userId: req.user._id
            });
            req.session.user = {
                id: req.user._id,
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
                timestamp: moment().format("DD/MM/YY-HH:mm"),
                error: error.message
            });
            res.redirect(`${process.env.CLIENT_URL}/signin?error=server_error`);
        }
    }
];

async function AuthCheck(req, res) {
    try {
        const isAuthenticated = req.isAuthenticated();
        res.json({ isAuthenticated });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            isAuthenticated: false,
            error: 'Authentication check failed'
        });
    }
}

module.exports = {SignUp,SignIn, GoogleCallback, GitHubCallback, AuthCheck};