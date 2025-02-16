const express = require('express');
const router = express.Router();
const multer = require('multer');
const songRecommender = require('../controllers/songRecommender');
const { UserMusicPreferences } = require('../models/UserMusic');
const songRecommendationSystem = require('../controllers/SongRecommendationUtils');
const mongoose = require('mongoose');

const upload = multer({ storage: multer.memoryStorage() });

// Get user preferences
router.delete('/preferences/:userId/songs/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findOne({ userId });
        if (!preferences) {
            return res.status(404).json({ error: 'User preferences not found' });
        }

        // Remove song from both liked and disliked arrays
        preferences.likedSongs = preferences.likedSongs.filter(song => song.songId !== songId);
        preferences.dislikedSongs = preferences.dislikedSongs.filter(song => song.songId !== songId);

        await preferences.save();

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting song from preferences:', error);
        res.status(500).json({ error: 'Failed to delete song from preferences' });
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

// Delete item from history (for recent suggestions)
router.delete('/history/:userId/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Since we're now handling recent suggestions in memory,
        // we just need to return success
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting history item:', error);
        res.status(500).json({ error: 'Failed to delete history item' });
    }
});

// Handle feedback (like/dislike)
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

// Search artists
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

// Get song recommendation
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

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const userPrefs = await UserMusicPreferences.findOne({ userId });
            if (userPrefs) {
                preferences.likedSongs = userPrefs.likedSongs || [];
                preferences.dislikedSongs = userPrefs.dislikedSongs || [];
                preferences.likedArtists = userPrefs.likedArtists || [];
                preferences.dislikedArtists = userPrefs.dislikedArtists || [];
            }
        }

        const skipCount = parseInt(req.query.skip) || 0;
        const imageAnalysis = await songRecommender.analyzeImage(req.file.buffer);

        if (!imageAnalysis) {
            return res.status(500).json({ error: 'Failed to analyze image' });
        }

        const description = songRecommender.generateDescription(imageAnalysis);
        let recommendations = await songRecommender.getSongRecommendation(
            imageAnalysis,
            skipCount,
            preferences
        );

        // Use the recommendation system to rank and filter songs
        if (Array.isArray(recommendations)) {
            recommendations = await songRecommendationSystem.rankAndFilterSongs(recommendations, preferences);
        } else if (recommendations) {
            recommendations.score = songRecommendationSystem.calculateSongScore(recommendations, preferences);
            songRecommendationSystem.markSongAsSuggested(recommendations.uri);
        }

        if (recommendations) {
            return res.status(200).json({
                description,
                song: Array.isArray(recommendations) ? recommendations[0] : recommendations,
                analysis: {
                    mood: imageAnalysis.mood,
                    energy_level: imageAnalysis.energy_level,
                    valence: imageAnalysis.valence,
                    genre_hints: imageAnalysis.genre_hints,
                    predictions: imageAnalysis.predictions
                }
            });
        }

        return res.status(404).json({ error: 'No suitable song found' });

    } catch (error) {
        console.error('Error in recommend-song route:', error);
        return res.status(500).json({
            error: 'Failed to process request',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Regenerate song recommendation
router.post('/regenerate-song', async (req, res) => {
    try {
        await songRecommender.initialized;
        const { imageAnalysis, skipCount = 0, preferences, userId } = req.body;

        if (!imageAnalysis) {
            return res.status(400).json({ error: 'No image analysis provided' });
        }

        let userPreferences = { ...preferences };
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const userPrefs = await UserMusicPreferences.findOne({ userId });
            if (userPrefs) {
                userPreferences = {
                    ...userPreferences,
                    likedSongs: userPrefs.likedSongs || [],
                    dislikedSongs: userPrefs.dislikedSongs || [],
                    likedArtists: userPrefs.likedArtists || [],
                    dislikedArtists: userPrefs.dislikedArtists || []
                };
            }
        }

        let song = await songRecommender.getNextBestSong(
            imageAnalysis,
            skipCount,
            userPreferences
        );

        if (!song) {
            return res.status(404).json({ error: 'No suitable song found' });
        }

        // Calculate song score and mark as suggested
        song.score = songRecommendationSystem.calculateSongScore(song, userPreferences);
        songRecommendationSystem.markSongAsSuggested(song.uri);

        return res.status(200).json({ song });

    } catch (error) {
        console.error('Error in regenerate-song route:', error);
        return res.status(500).json({
            error: 'Failed to regenerate song recommendation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get available languages
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

// Get available genres
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