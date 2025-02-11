// server/routes/songRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const songRecommender = require('../controllers/songRecommender');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Route to handle song recommendation requests
// server/routes/songRoutes.js
router.post('/recommend-song', upload.single('image'), async (req, res) => {
    try {
        await songRecommender.initialized;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (req.file.size > 5000000) { // 5MB limit
            return res.status(400).json({ error: 'Image file too large' });
        }

        // Get user preferences if any
        let userPreferences = {};
        try {
            userPreferences = req.body.preferences ? JSON.parse(req.body.preferences) : {};
        } catch (e) {
            console.warn('Failed to parse preferences:', e);
        }

        // Analyze image with error handling
        let imageAnalysis;
        try {
            imageAnalysis = await songRecommender.analyzeImage(req.file.buffer);
        } catch (imageError) {
            console.error('Image analysis error:', imageError);
            return res.status(422).json({
                error: 'Failed to analyze image',
                details: 'Please try a different image'
            });
        }

        // Generate description
        const description = songRecommender.generateDescription(imageAnalysis);

        try {
            // Get song recommendation with retries
            const song = await songRecommender.getSongRecommendation(imageAnalysis);
            
            if (!song) {
                throw new Error('No suitable song found');
            }

            res.json({
                description,
                song,
                analysis: imageAnalysis
            });
        } catch (spotifyError) {
            console.error('Spotify API error:', spotifyError);
            
            // Try to get a fallback track
            const fallbackTrack = songRecommender.getFallbackTrack();
            
            if (fallbackTrack) {
                res.json({
                    description: "Here's a peaceful song while we work on finding better matches...",
                    song: fallbackTrack,
                    analysis: imageAnalysis
                });
            } else {
                res.status(503).json({
                    error: 'Music service temporarily unavailable',
                    details: 'Please try again in a few moments'
                });
            }
        }
    } catch (error) {
        console.error('Song recommendation error:', error);
        res.status(500).json({
            error: 'Failed to process recommendation',
            details: error.message
        });
    }
});

router.delete('/history/:id', (req, res) => {
    try {
        const { id } = req.params;
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete recommendation' });
    }
});

router.get('/genres', async (_req, res) => {
    try {
        const genres = await songRecommender.spotifyApi.getAvailableGenreSeeds();
        res.json(genres.body);
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

module.exports = router;