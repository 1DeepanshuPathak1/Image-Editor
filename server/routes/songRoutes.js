const express = require('express');
const router = express.Router();
const multer = require('multer');
const songRecommender = require('../controllers/songRecommender');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/recommend-song', upload.single('image'), async (req, res) => {
    try {
        await songRecommender.initialized;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (req.file.size > 5000000) { // 5MB limit
            return res.status(400).json({ error: 'Image file too large' });
        }

        // Get skip count from query params for regeneration
        const skipCount = parseInt(req.query.skip) || 0;

        // Analyze the image
        const imageAnalysis = await songRecommender.analyzeImage(req.file.buffer);

        if (!imageAnalysis) {
            return res.status(500).json({ error: 'Failed to analyze image' });
        }

        // Generate description from analysis
        const description = songRecommender.generateDescription(imageAnalysis);

        // Get song recommendation with skip count for regeneration support
        const song = await songRecommender.getSongRecommendation(imageAnalysis, skipCount);

        if (!song) {
            return res.status(404).json({ error: 'No suitable song found' });
        }

        // Return complete response including score
        return res.status(200).json({
            description,
            song,
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

router.post('/regenerate-song', async (req, res) => {
    try {
        await songRecommender.initialized;

        const { imageAnalysis, skipCount = 0 } = req.body;

        if (!imageAnalysis) {
            return res.status(400).json({ error: 'No image analysis provided' });
        }

        // Get next song recommendation using the skip count
        const song = await songRecommender.getSongRecommendation(imageAnalysis, skipCount);

        if (!song) {
            return res.status(404).json({ error: 'No suitable song found' });
        }

        return res.status(200).json({ song });

    } catch (error) {
        console.error('Error in regenerate-song route:', error);
        return res.status(500).json({
            error: 'Failed to regenerate song recommendation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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