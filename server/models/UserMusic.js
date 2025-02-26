// UserMusic.js
const mongoose = require('mongoose');

const userMusicPreferencesSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likedArtists: [{
        artistId: String,
        name: String,
        genre: String,  
        timestamp: { type: Date, default: Date.now }
    }],
    dislikedArtists: [{
        artistId: String,
        name: String,
        genre: String,  
        timestamp: { type: Date, default: Date.now }
    }],
    likedSongs: [{
        songId: String,
        name: String,
        artist: String,
        artistId: String,
        genre: String,  
        mood: String,
        uri: String,
        album_art: String,
        external_url: String,
        popularity: Number,
        timestamp: { type: Date, default: Date.now }
    }],
    dislikedSongs: [{
        songId: String,
        name: String,
        artist: String,
        artistId: String,
        genre: String,  
        mood: String,
        uri: String,
        album_art: String,
        external_url: String,
        popularity: Number,
        timestamp: { type: Date, default: Date.now }
    }],
    savedSongs: [{
        songId: String,
        name: String,
        artist: String,
        artistId: String,
        genre: String,
        mood: String,
        uri: String,
        album_art: String,
        external_url: String,
        popularity: Number,
        image: Buffer,
        imageType: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    defaults: {
        likedArtists: [],
        dislikedArtists: [],
        likedSongs: [],
        dislikedSongs: [],
        savedSongs: []
    }
});

userMusicPreferencesSchema.index({ userId: 1 });

const UserMusicPreferences = mongoose.model('UserMusicPreferences', userMusicPreferencesSchema);

module.exports = { UserMusicPreferences };