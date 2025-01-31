const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    githubId: { type: String },
    avatarUrl: { type: String },
    username: { type: String }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

const logSchema = new mongoose.Schema({
    email: { type: String, required: true },
    ip: { type: String, required: true },
    realIP: {type: String},
    browser: { type: String, required: true },
    device: { type: String, required: true },
    status: { type: String, required: true },
    provider: { type: String, enum: ['local', 'google', 'github'] },
    timestamp: { type: String, required: true },
    ipDetails: {
        country: String,
        region: String,
        city: String,
        timezone: String
    }
});
logSchema.pre('save', async function(next) {
    try {
        const ipToCheck = this.realIP || this.ip;
        if (ipToCheck === '::1') {
            const response = await axios.get('https://api.ipify.org?format=json');
            this.realIP = response.data.ip;
        }

        if (this.realIP) {
            const geoResponse = await axios.get(`http://ip-api.com/json/${this.realIP}`);
            if (geoResponse.data.status === 'success') {
                this.ipDetails = {
                    country: geoResponse.data.country,
                    region: geoResponse.data.regionName,
                    city: geoResponse.data.city,
                    timezone: geoResponse.data.timezone
                };
            }
        }
    } catch (error) {
        console.error('IP Lookup error:', error);
    }
    next();
});
logSchema.path('ip').validate(function(ip) {
    const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^::1$|^([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;
    return ipRegex.test(ip);
}, 'Invalid IP address format');

const Log = mongoose.model('Log', logSchema);
const User = mongoose.model('User', userSchema);
module.exports = { User, Log };