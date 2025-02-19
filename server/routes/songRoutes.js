const express = require('express');
const router = express.Router();
const multer = require('multer');
const songRecommender = require('../controllers/songRecommender');
const { UserMusicPreferences } = require('../models/UserMusic');
const songRecommendationSystem = require('../controllers/SongRecommendationUtils');
const mongoose = require('mongoose');

const upload = multer({ storage: multer.memoryStorage() });


router.delete('/history/:userId/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findOne({ userId });
        if (!preferences) {
            return res.status(404).json({ error: 'User preferences not found' });
        }

        
        preferences.likedSongs = preferences.likedSongs.filter(song => 
            song.songId !== songId && song.uri?.split(':')[2] !== songId
        );
        preferences.dislikedSongs = preferences.dislikedSongs.filter(song => 
            song.songId !== songId && song.uri?.split(':')[2] !== songId
        );

        await preferences.save();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
router.delete('/preferences/:userId/artist/:artistId', async (req, res) => {
    try {
        const { userId, artistId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findOne({ userId });
        if (!preferences) {
            return res.status(404).json({ error: 'User preferences not found' });
        }

        
        preferences.likedArtists = preferences.likedArtists.filter(artist => 
            artist.artistId !== artistId
        );
        preferences.dislikedArtists = preferences.dislikedArtists.filter(artist => 
            artist.artistId !== artistId
        );

        await preferences.save();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error removing artist:', error);
        res.status(500).json({ error: 'Failed to remove artist' });
    }
});

router.get('/artist/:artistId', async (req, res) => {
    try {
        await songRecommender.initialized;
        const { artistId } = req.params;
        
        const artistData = await songRecommender.getArtistInfo(artistId);
        
        if (!artistData) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        
        res.json(artistData);
    } catch (error) {
        console.error('Error fetching artist:', error);
        res.status(500).json({ error: 'Failed to fetch artist information' });
    }
});

router.get('/preferences/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findOne({ userId });
        if (!preferences) {
            const defaultPreferences = {
                userId,
                likedSongs: [],
                dislikedSongs: [],
                likedArtists: [],
                dislikedArtists: []
            };
            await UserMusicPreferences.create(defaultPreferences);
            return res.json(defaultPreferences);
        }

        res.json(preferences);
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
});


router.post('/feedback', async (req, res) => {
    try {
        const { songId, artistId, type, scope, userId, songData } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Valid user ID is required' });
        }

        if (!songId || !artistId || !type || !scope) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        let preferences = await UserMusicPreferences.findOne({ userId });
        if (!preferences) {
            preferences = await UserMusicPreferences.create({ userId });
        }

        if (scope === 'song') {
            if (type === 'like') {
                preferences.dislikedSongs = preferences.dislikedSongs.filter(s => s.songId !== songId);
                if (!preferences.likedSongs.some(s => s.songId === songId) && songData) {
                    preferences.likedSongs.push({
                        songId,
                        name: songData.name,
                        artist: songData.artist,
                        artistId: songData.artist_id,
                        genre: songData.genre,
                        mood: songData.mood,
                        uri: songData.uri,
                        album_art: songData.album_art,
                        timestamp: new Date(),
                        popularity: songData.popularity
                    });
                }
            } else {
                preferences.likedSongs = preferences.likedSongs.filter(s => s.songId !== songId);
                if (!preferences.dislikedSongs.some(s => s.songId === songId) && songData) {
                    preferences.dislikedSongs.push({
                        songId,
                        name: songData.name,
                        artist: songData.artist,
                        artistId: songData.artist_id,
                        genre: songData.genre,
                        mood: songData.mood,
                        uri: songData.uri,
                        album_art: songData.album_art,
                        timestamp: new Date(),
                        popularity: songData.popularity
                    });
                }
            }
        } else if (scope === 'artist') {
            if (type === 'like') {
                preferences.dislikedArtists = preferences.dislikedArtists.filter(a => a.artistId !== artistId);
                if (!preferences.likedArtists.some(a => a.artistId === artistId) && songData) {
                    preferences.likedArtists.push({
                        artistId,
                        name: songData.artist,
                        timestamp: new Date()
                    });
                }
            } else {
                preferences.likedArtists = preferences.likedArtists.filter(a => a.artistId !== artistId);
                if (!preferences.dislikedArtists.some(a => a.artistId === artistId) && songData) {
                    preferences.dislikedArtists.push({
                        artistId,
                        name: songData.artist,
                        timestamp: new Date()
                    });
                }
            }
        }

        await preferences.save();
        res.status(200).json({
            success: true,
            message: `Successfully recorded ${type} feedback for ${scope}`,
            preferences
        });
    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({ error: 'Failed to process feedback' });
    }
});


router.get('/search-artists', async (req, res) => {
    try {
        await songRecommender.initialized;
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const artists = await songRecommender.searchArtists(q);
        res.json({ artists });
    } catch (error) {
        console.error('Error searching artists:', error);
        res.status(500).json({ error: 'Failed to search artists' });
    }
});


router.post('/recommend-song', upload.single('image'), async (req, res) => {
    try {
        await songRecommender.initialized;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (req.file.size > 5000000) {
            return res.status(400).json({ error: 'Image file too large' });
        }

        const preferences = req.body.preferences ? JSON.parse(req.body.preferences) : {};
        const userId = req.body.userId;
        const skipCount = parseInt(req.query.skip) || 0;

        // Keep track of previously suggested songs
        if (!req.app.locals.suggestedSongs) {
            req.app.locals.suggestedSongs = new Set();
        }

        if (!req.app.locals.lastImageHash) {
            req.app.locals.lastImageHash = null;
        }

        // Generate a simple hash of the image buffer
        const imageHash = require('crypto')
            .createHash('md5')
            .update(req.file.buffer)
            .digest('hex');

        // Reset suggested songs if it's a new image
        if (imageHash !== req.app.locals.lastImageHash) {
            req.app.locals.suggestedSongs.clear();
            req.app.locals.lastImageHash = imageHash;
        }

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const userPrefs = await UserMusicPreferences.findOne({ userId });
            if (userPrefs) {
                preferences.likedSongs = userPrefs.likedSongs || [];
                preferences.dislikedSongs = userPrefs.dislikedSongs || [];
                preferences.likedArtists = userPrefs.likedArtists || [];
                preferences.dislikedArtists = userPrefs.dislikedArtists || [];
            }
        }

        const imageAnalysis = await songRecommender.analyzeImage(req.file.buffer);

        if (!imageAnalysis) {
            return res.status(500).json({ error: 'Failed to analyze image' });
        }

        const description = songRecommender.generateDescription(imageAnalysis);
        
        // Add previously suggested songs to preferences to avoid recommending them again
        preferences.previouslySuggested = Array.from(req.app.locals.suggestedSongs);

        const recommendations = await songRecommender.getSongRecommendation(
            imageAnalysis,
            skipCount,
            preferences
        );

        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            return res.status(404).json({ error: 'No suitable songs found' });
        }

        // Add new songs to the suggested set
        recommendations.forEach(song => {
            req.app.locals.suggestedSongs.add(song.uri);
        });

        return res.status(200).json({
            description,
            song: recommendations[0],
            rankedSongs: recommendations,
            analysis: {
                mood: imageAnalysis.mood,
                energy_level: imageAnalysis.energy_level,
                valence: imageAnalysis.valence,
                genre_hints: imageAnalysis.genre_hints,
                predictions: imageAnalysis.predictions
            }
        });

    } catch (error) {
        console.error('Error in recommend-song route:', error);
        return res.status(500).json({
            error: 'Failed to process request',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/languages', (_req, res) => {
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ja', name: 'Japanese' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ar', name: 'Arabic' }
    ];
    res.json({ languages });
});


router.get('/genres', async (_req, res) => {
    try {
        const genres = await songRecommender.getAvailableGenres();
        res.json({ genres });
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

module.exports = router;