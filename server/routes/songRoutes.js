const express = require('express');
const router = express.Router();
const multer = require('multer');
const songRecommender = require('../controllers/songRecommender');
const { UserMusicPreferences } = require('../models/UserMusic');

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to validate UUID
const isValidUserId = (userId) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
};

router.post('/save-song', upload.single('image'), async (req, res) => {
    try {
        const { songId, userId, songData } = req.body;

        if (!userId || !isValidUserId(userId)) {
            return res.status(400).json({ error: 'Valid user ID is required' });
        }

        if (!songId || !req.file) {
            return res.status(400).json({ error: 'Song ID and image are required' });
        }

        let preferences = await UserMusicPreferences.findByUserId(userId);
        if (!preferences) {
            preferences = await UserMusicPreferences.create({ 
                userId,
                likedArtists: [],
                dislikedArtists: [],
                likedSongs: [],
                dislikedSongs: [],
                savedSongs: []
            });
        }

        const parsedSongData = typeof songData === 'string' ? JSON.parse(songData) : songData;

        const uri = parsedSongData.uri || `spotify:track:${songId}`;
        if (!uri.startsWith('spotify:track:')) {
            return res.status(400).json({ error: 'Invalid URI format for song' });
        }

        const songEntry = {
            songId,
            name: parsedSongData.name || 'Unknown Track',
            artist: parsedSongData.artist || 'Unknown Artist',
            artistId: parsedSongData.artist_id,
            genre: parsedSongData.genre || '',
            mood: parsedSongData.mood,
            uri,
            album_art: parsedSongData.album_art || '/default-album-art.jpg',
            external_url: parsedSongData.external_url,
            popularity: parsedSongData.popularity || 0,
            image: req.file.buffer,
            imageType: req.file.mimetype,
            timestamp: new Date().toISOString()
        };

        if (!preferences.savedSongs) {
            preferences.savedSongs = [];
        }
        
        preferences.savedSongs = preferences.savedSongs.filter(s => s.songId !== songId);
        preferences.savedSongs.push(songEntry);

        await preferences.save();

        const responsePreferences = {
            ...preferences,
            savedSongs: preferences.savedSongs.map(song => ({
                ...song,
                image: song.image ? `data:${song.imageType};base64,${song.image.toString('base64')}` : null
            }))
        };

        res.status(200).json({
            success: true,
            message: 'Song saved successfully',
            preferences: responsePreferences
        });
    } catch (error) {
        console.error('Error saving song:', error);
        res.status(500).json({ 
            error: 'Failed to save song',
            details: error.message 
        });
    }
});

router.delete('/saved/:userId/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findByUserId(userId);
        if (!preferences) {
            return res.status(404).json({ error: 'User preferences not found' });
        }

        if (!preferences.savedSongs) {
            preferences.savedSongs = [];
        }

        preferences.savedSongs = preferences.savedSongs.filter(song => 
            song.songId !== songId && song.uri?.split(':')[2] !== songId
        );

        await preferences.save();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting saved song:', error);
        res.status(500).json({ error: 'Failed to delete saved song' });
    }
});

router.delete('/history/:userId/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findByUserId(userId);
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

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const preferences = await UserMusicPreferences.findByUserId(userId);
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
        const { artistId } = req.params;
        const userId = req.query.userId; 

        await songRecommender.initialized;
        
        const artistData = await songRecommender.getArtistInfo(artistId, userId);
        
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

        if (!isValidUserId(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        let preferences = await UserMusicPreferences.findByUserId(userId);
        if (!preferences) {
            preferences = await UserMusicPreferences.create({
                userId,
                likedSongs: [],
                dislikedSongs: [],
                likedArtists: [],
                dislikedArtists: [],
                savedSongs: []
            });
        }

        const responsePreferences = {
            ...preferences,
            savedSongs: preferences.savedSongs.map(song => ({
                songId: song.songId,
                name: song.name || 'Unknown Track',
                artist: song.artist || 'Unknown Artist',
                artistId: song.artistId,
                genre: song.genre || '',
                mood: song.mood,
                uri: song.uri,
                album_art: song.album_art || '/default-album-art.jpg',
                external_url: song.external_url || '',
                popularity: song.popularity || 0,
                image: song.image ? `data:${song.imageType};base64,${song.image.toString('base64')}` : null,
                timestamp: song.timestamp
            }))
        };

        res.json(responsePreferences);
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const { songId, artistId, type, scope, userId, songData } = req.body;

        if (!userId || !isValidUserId(userId)) {
            return res.status(400).json({ error: 'Valid user ID is required' });
        }

        if (!songId || !artistId || !type || !scope) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        let preferences = await UserMusicPreferences.findByUserId(userId);
        if (!preferences) {
            preferences = await UserMusicPreferences.create({ userId });
        }

        const genre = Array.isArray(songData.genres) ? 
            songData.genres[0] || '' : 
            songData.genre || '';

        if (scope === 'song') {
            const songEntry = {
                songId,
                name: songData.name || 'Unknown Track',
                artist: songData.artist || 'Unknown Artist',
                artistId: songData.artist_id,
                genre,
                mood: songData.mood,
                uri: songData.uri,
                album_art: songData.album_art || '/default-album-art.jpg',
                external_url: songData.external_url || '',
                popularity: songData.popularity || 0,
                timestamp: new Date().toISOString()
            };

            if (type === 'like') {
                preferences.dislikedSongs = preferences.dislikedSongs.filter(s => s.songId !== songId);
                if (!preferences.likedSongs.some(s => s.songId === songId)) {
                    preferences.likedSongs.push(songEntry);
                } else {
                    preferences.likedSongs = preferences.likedSongs.map(s => 
                        s.songId === songId ? { ...s, ...songEntry } : s
                    );
                }
            } else {
                preferences.likedSongs = preferences.likedSongs.filter(s => s.songId !== songId);
                if (!preferences.dislikedSongs.some(s => s.songId === songId)) {
                    preferences.dislikedSongs.push(songEntry);
                } else {
                    preferences.dislikedSongs = preferences.dislikedSongs.map(s => 
                        s.songId === songId ? { ...s, ...songEntry } : s
                    );
                }
            }
        } else if (scope === 'artist') {
            const artistEntry = {
                artistId,
                name: songData.artist || 'Unknown Artist',
                genre,
                timestamp: new Date().toISOString()
            };

            if (type === 'like') {
                preferences.dislikedArtists = preferences.dislikedArtists.filter(a => a.artistId !== artistId);
                if (!preferences.likedArtists.some(a => a.artistId === artistId)) {
                    preferences.likedArtists.push(artistEntry);
                } else {
                    preferences.likedArtists = preferences.likedArtists.map(a => 
                        a.artistId === artistId ? { ...a, ...artistEntry } : a
                    );
                }
            } else {
                preferences.likedArtists = preferences.likedArtists.filter(a => a.artistId !== artistId);
                if (!preferences.dislikedArtists.some(a => a.artistId === artistId)) {
                    preferences.dislikedArtists.push(artistEntry);
                } else {
                    preferences.dislikedArtists = preferences.dislikedArtists.map(a => 
                        a.artistId === artistId ? { ...a, ...artistEntry } : a
                    );
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
        const { q, userId } = req.query;

        await songRecommender.initialized;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const artists = await songRecommender.searchArtists(q, userId);
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

        if (!userId || !isValidUserId(userId)) {
            return res.status(400).json({ error: 'Valid user ID is required' });
        }

        if (!req.app.locals.suggestedSongs) {
            req.app.locals.suggestedSongs = new Set();
        }

        if (!req.app.locals.lastImageHash) {
            req.app.locals.lastImageHash = null;
        }

        const imageHash = require('crypto')
            .createHash('md5')
            .update(req.file.buffer)
            .digest('hex');

        if (imageHash !== req.app.locals.lastImageHash) {
            req.app.locals.suggestedSongs.clear();
            req.app.locals.lastImageHash = imageHash;
        }

        if (userId && isValidUserId(userId)) {
            const userPrefs = await UserMusicPreferences.findByUserId(userId);
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
        preferences.previouslySuggested = Array.from(req.app.locals.suggestedSongs);
        const recommendations = await songRecommender.getSongRecommendation(
            imageAnalysis,
            skipCount,
            preferences,
            userId
        );

        if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
            return res.status(404).json({ error: 'No suitable songs found' });
        }

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

router.get('/genres', async (req, res) => {
    try {
        const userId = req.query.userId;
        const genres = await songRecommender.getAvailableGenres(userId);
        res.json({ genres });
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

function setupSongRoutes() {
    router.cleanup = () => {
        if (req.app && req.app.locals && req.app.locals.suggestedSongs) {
            req.app.locals.suggestedSongs.clear();
        }
        if (req.app && req.app.locals) {
            req.app.locals.lastImageHash = null;
        }
    };

    return router;
}

module.exports = setupSongRoutes;