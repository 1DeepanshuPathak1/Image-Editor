const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true } // Add this field
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
    browser: { type: String, required: true },
    device: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { 
        type: String, 
        required: true 
    },
});

const Log = mongoose.model('Log', logSchema);
const User = mongoose.model('User', userSchema);
module.exports = { User, Log };