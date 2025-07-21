const AWS = require('aws-sdk');
const { UserOperations } = require('./SongRecComps/UserOperations');
const { SpotifyOperations } = require('./SongRecComps/SpotifyOperations');
const { RecommendationLogic } = require('./SongRecComps/RecommendationLogic');
const { ImageAnalysis } = require('./SongRecComps/ImageAnalysis');
require('dotenv').config();

class SongRecommender {
    constructor() {
        this.initialized = this.initialize();
        this.maxRetries = 3;
        this.suggestionHistory = new Set();
        this.dislikedArtistsCatalog = new Map();
        this.userOps = new UserOperations();
        this.spotifyOps = new SpotifyOperations(this);
        this.recommendation = new RecommendationLogic(this);
        this.imageAnalysis = new ImageAnalysis();
    }

    async initialize() { }

    async getSongRecommendation(imageAnalysis, skipCount = 0, preferences = {}, userId) {
        return this.recommendation.getSongRecommendation(imageAnalysis, skipCount, preferences, userId);
    }

    async getAvailableGenres(userId) {
        return this.recommendation.getAvailableGenres(userId);
    }

    cleanup() {
        this.recommendation.cleanup();
    }
}

const songRecommender = new SongRecommender();
module.exports = songRecommender;