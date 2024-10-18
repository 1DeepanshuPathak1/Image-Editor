const moment = require('moment');
const { User, Log } = require('../models/User');
const UAParser = require('ua-parser-js'); 


async function SignUp(req,res) {
    try {
        const { firstName, middleName, lastName, dateOfBirth, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user and save to DB
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

    // Prepare log device and browser info
    const userBrowser = browserInfo.name || "unknown";
    const userDevice = deviceInfo.vendor || "unknown"; 

    try {
        const user = await User.findOne({ email });
        
        // If user doesn't exist, log the attempt and send a custom error message
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

        // If user exists but password is incorrect
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

        // Log successful sign-in
        await Log.create({
            email,
            ip: userIp,
            browser: userBrowser,
            device: userDevice,
            status: 'success',
            timestamp: moment().format("DD/MM/YY-HH:mm"),
        });

        // Proceed with successful login logic
        res.status(200).json({ message: 'Sign in successful!' });
    } catch (error) {
        console.error('Error during sign in:', error);
        res.status(500).json({ message: 'Server error.' });
    }
}

module.exports = {SignUp,SignIn};