const AWS = require('aws-sdk');
const SpotifyWebApi = require('spotify-web-api-node');
const { spawn } = require('child_process');
const path = require('path');
const SongRecommendationSystem = require('./SongRecommendationUtils');
const redisService = require('../services/redisService');
require('dotenv').config();

// Configure AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class SongRecommender {
    constructor() {
        this.initialized = this.initialize();
        this.maxRetries = 3;
        this.suggestionHistory = new Set();
        this.dislikedArtistsCatalog = new Map();
    }

    async initialize() {}

    // DynamoDB User Operations
    async findUserById(userId) {
        try {
            const cachedUser = await redisService.getUserAuth(userId);
            if (cachedUser) {
                return {
                    id: cachedUser.userId,
                    spotifyAccessToken: cachedUser.spotifyAccessToken,
                    spotifyRefreshToken: cachedUser.spotifyRefreshToken
                };
            }

            return null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            if (updateData.spotifyAccessToken !== undefined || updateData.spotifyRefreshToken !== undefined) {
                await redisService.updateSpotifyTokens(
                    userId,
                    updateData.spotifyAccessToken,
                    updateData.spotifyRefreshToken
                );
            }

            const updateExpression = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};

            Object.keys(updateData).forEach((key, index) => {
                const attributeName = `#attr${index}`;
                const attributeValue = `:val${index}`;
                
                updateExpression.push(`${attributeName} = ${attributeValue}`);
                expressionAttributeNames[attributeName] = key;
                expressionAttributeValues[attributeValue] = updateData[key];
            });

            const params = {
                TableName: 'Users',
                Key: { id: userId },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };

            const result = await dynamodb.update(params).promise();
            return result.Attributes;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Spotify API Setup and Authentication
    async getSpotifyApi(userId) {
        try {
            if (!userId) {
                throw new Error('No user ID provided');
            }

            const user = await this.findUserById(userId);
            if (!user) {
                console.error('getSpotifyApi: User not found in database', { userId });
                throw new Error('User not found');
            }

            if (!user.spotifyAccessToken) {
                console.error('getSpotifyApi: User has no Spotify access token', { 
                    userId,
                    hasSpotifyId: !!user.spotifyId
                });
                throw new Error('User not authenticated with Spotify');
            }

            const spotifyApi = new SpotifyWebApi({
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/spotify/callback'
            });

            spotifyApi.setAccessToken(user.spotifyAccessToken);
            
            if (!user.spotifyRefreshToken) {
                console.error('getSpotifyApi: No refresh token available', { userId });
                throw new Error('Spotify refresh token missing. Please re-authenticate with Spotify.');
            }
            
            spotifyApi.setRefreshToken(user.spotifyRefreshToken);

            // Attempt to verify token
            try {
                await spotifyApi.getMe();
            } catch (error) {
                console.error('getSpotifyApi: Token may be invalid, attempting refresh', {
                    userId,
                    error: error.message,
                    statusCode: error.statusCode
                });

                try {
                    const data = await spotifyApi.refreshAccessToken();
                    if (!data.body['access_token']) {
                        throw new Error('No access token received after refresh');
                    }

                    const updateData = {
                        spotifyAccessToken: data.body['access_token']
                    };

                    if (data.body['refresh_token']) {
                        updateData.spotifyRefreshToken = data.body['refresh_token'];
                        spotifyApi.setRefreshToken(data.body['refresh_token']);
                    }

                    await this.updateUser(userId, updateData);
                    spotifyApi.setAccessToken(data.body['access_token']);
                    
                    console.log('getSpotifyApi: Token refreshed successfully', { userId });
                } catch (refreshError) {
                    console.error('getSpotifyApi: Error refreshing Spotify token', { 
                        userId, 
                        error: refreshError.message,
                        statusCode: refreshError.statusCode
                    });
                    
                    await this.updateUser(userId, {
                        spotifyAccessToken: null,
                        spotifyRefreshToken: null
                    });
                    
                    throw new Error('Failed to refresh Spotify token. Please re-authenticate with Spotify.');
                }
            }

            return spotifyApi;
        } catch (error) {
            console.error('getSpotifyApi: Error setting up Spotify API', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    async checkSpotifyAuth(userId) {
        try {
            await this.getSpotifyApi(userId);
            return { isAuthenticated: true };
        } catch (error) {
            return { isAuthenticated: false, error: error.message };
        }
    }

    // Spotify API Methods  
    async getArtistInfo(artistId, userId) {
        try {
            const spotifyApi = await this.getSpotifyApi(userId);
            const response = await spotifyApi.getArtist(artistId);

            if (!response || !response.body) {
                throw new Error('No artist data received from Spotify');
            }

            return {
                id: response.body.id,
                name: response.body.name,
                images: response.body.images,
                genres: response.body.genres,
                popularity: response.body.popularity,
                external_urls: response.body.external_urls
            };
        } catch (error) {
            console.error('Error fetching artist info from Spotify:', error);
            if (error.statusCode === 404) return null;
            if (error.statusCode === 429) throw new Error('Rate limit exceeded when fetching artist info');
            throw error;
        }
    }

    async searchArtists(query, userId) {
        try {
            const spotifyApi = await this.getSpotifyApi(userId);
            const response = await spotifyApi.searchArtists(query, { limit: 10 });
            return response.body.artists.items;
        } catch (error) {
            console.error('Error searching artists:', error);
            throw error;
        }
    }

    async likeTrack(trackId, userId) {
        try {
            const spotifyApi = await this.getSpotifyApi(userId);
            await spotifyApi.addToMySavedTracks([trackId]);
            return { success: true, message: 'Track liked successfully' };
        } catch (error) {
            console.error('Error liking track:', error);
            throw new Error('Failed to like track');
        }
    }

    // Core Recommendation Logic
    async findSuitableTrack(preferences = {}, skipCount = 0, retryCount = 0, userId) {
        try {
            const spotifyApi = await this.getSpotifyApi(userId);
            const user = await this.findUserById(userId);
            
            if (!user) {
                throw new Error('User not found');
            }
            
            if (preferences.dislikedArtists?.length) {
                await this.updateDislikedArtistsCatalog(preferences.dislikedArtists, userId);
            }
    
            const searchOptions = {
                limit: 50,
                offset: skipCount + (Math.floor(Math.random() * 200)),
                market: this.getMarketFromUser(user, preferences)
            };
    
            const searchQuery = this.buildSearchQuery(preferences, skipCount);

            let searchResults;
            try {
                searchResults = await spotifyApi.searchTracks(searchQuery, searchOptions);
            } catch (error) {
                console.error('findSuitableTrack: Spotify API search error', {
                    userId,
                    error: error.message,
                    statusCode: error.statusCode
                });
                
                if (error.statusCode === 403) {
                    await this.updateUser(userId, {
                        spotifyAccessToken: null,
                        spotifyRefreshToken: null
                    });
                    throw new Error('Spotify access denied. Please re-authenticate with Spotify.');
                }
                
                if (error.statusCode === 429) {
                    throw new Error('Spotify API rate limit exceeded. Please try again later.');
                }
                throw error;
            }
    
            if (!searchResults.body.tracks?.items?.length) {
                console.warn('findSuitableTrack: No tracks found', { userId, searchQuery });
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(this.broadenSearchPreferences(preferences, retryCount), skipCount, retryCount + 1, userId);
                }
                throw new Error('No tracks found with the current search criteria');
            }
    
            let tracks = this.filterAndProcessTracks(searchResults.body.tracks.items, preferences);
    
            if (tracks.length === 0) {
                console.warn('findSuitableTrack: No valid tracks after filtering', { userId, searchQuery });
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(preferences, skipCount + 50, retryCount + 1, userId);
                }
                throw new Error('No new tracks available. Try different preferences.');
            }
    
            tracks = this.shuffleArray(tracks);
    
            const rankedTracks = await SongRecommendationSystem.rankAndFilterSongs(
                tracks,
                {
                    likedArtists: preferences.likedArtists || [],
                    dislikedArtists: preferences.dislikedArtists || [],
                    likedSongs: preferences.likedSongs || [],
                    dislikedSongs: preferences.dislikedSongs || []
                }
            );
            
            return rankedTracks;
    
        } catch (error) {
            console.error('findSuitableTrack: Error finding tracks', { userId, error: error.message });
            throw error;
        }
    }

    // Helper Methods
    getMarketFromUser(user, preferences) {
        const marketMap = {
            'en': 'US', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'it': 'IT',
            'pt': 'BR', 'ko': 'KR', 'ja': 'JP', 'hi': 'IN', 'ar': 'EG'
        };

        const userCountry = user.country;
        if (userCountry) return userCountry;
        if (preferences.language && marketMap[preferences.language]) {
            return marketMap[preferences.language];
        }
        return 'US';
    }

    buildSearchQuery(preferences, skipCount) {
        const { mood = '', genre = '', language = '', artist, popularity } = preferences;
        let query = '';

        // Language-specific search
        if (language) {
            const languageKeywords = {
                'en': ['english', 'pop', 'rock', 'hip hop', 'country', 'rnb', 'london', 'british'],
                'es': ['reggaeton', 'salsa', 'latino', 'mexicano'],
                'fr': ['français', 'chanson', 'rap français', 'paris'],
                'de': ['deutsch', 'schlager', 'volksmusik', 'berlin'],
                'it': ['italiano', 'opera', 'tarantella', 'milano'],
                'pt': ['português', 'samba', 'fado', 'brasil'],
                'ko': ['k-pop', 'korean', 'seoul', 'ost'],
                'ja': ['j-pop', 'anime', 'tokyo', 'j-rock'],
                'hi': ['bollywood', 'indian', 'desi', 'hindi'],
                'ar': ['arabic', 'khaleeji', 'cairo', 'oud']
            };

            if (languageKeywords[language]) {
                query = `${language} OR `;
                query += languageKeywords[language].join(' OR ');
                if (genre) query += ` ${genre}`;
                if (mood) query += ` ${mood}`;
                return query;
            }
        }

        // Standard search query building
        if (genre) query += `genre:${genre}`;
        
        if (artist) {
            const artistName = typeof artist === 'string' ? artist : artist.name;
            if (artistName) {
                const sanitizedName = artistName.replace(/['"]/g, '').trim();
                if (sanitizedName) query += ` artist:"${sanitizedName}"`;
            }
        }

        // Add mood-based seed words
        const moodSeedWords = this.getMoodSeedWords(mood);
        if (moodSeedWords?.length > 0) {
            const seedWordsToUse = skipCount > 0
                ? moodSeedWords[skipCount % moodSeedWords.length]
                : moodSeedWords.join(' ');
            query = `${seedWordsToUse} ${query}`;
        }

        // Skip certain track types on retry
        if (skipCount > 0) {
            const randomWords = ['remix', 'live', 'instrumental', 'cover', 'acoustic', 'extended'];
            const randomWord = randomWords[skipCount % randomWords.length];
            query += ` NOT ${randomWord}`;
            
            if (skipCount > 30) {
                const secondRandomWord = randomWords[(skipCount + 3) % randomWords.length];
                query += ` NOT ${secondRandomWord}`;
            }
        }

        return query.trim() || 'music';
    }

    filterAndProcessTracks(tracks, preferences) {
        const allowedVersions = preferences.allowedVersions || [];
        
        return tracks
            .filter(track => !this.suggestionHistory.has(track.uri))
            .filter(track => !this.isArtistDisliked(track.artists[0].id))
            .filter(track => {
                const lowerName = track.name.toLowerCase();
                const unwantedVersions = [
                    { key: 'lofi', terms: ['lofi', 'lo fi', 'lo-fi'] },
                    { key: 'instrumental', terms: ['instrumental'] },
                    { key: 'reverb', terms: ['reverb'] },
                    { key: 'remix', terms: ['remix', 'mix'] },
                    { key: 'sped-up', terms: ['sped up'] },
                    { key: 'study', terms: ['study'] },
                    { key: 'mashup', terms: ['mashup'] },
                    { key: 'stereo', terms: ['stereo'] },
                    { key: 'acoustic', terms: ['acoustic'] },
                    { key: 'beats', terms: ['beats'] },
                    { key: 'slowed', terms: ['slowed'] },
                    { key: 'cover', terms: ['cover'] },
                    { key: 'live', terms: ['live'] },
                    { key: 'extended', terms: ['extended'] }
                ];

                return !unwantedVersions.some(version => 
                    !allowedVersions.includes(version.key) && 
                    version.terms.some(term => lowerName.includes(term))
                );
            })
            .map(track => {
                this.suggestionHistory.add(track.uri);
                return {
                    name: track.name,
                    artist: track.artists[0].name,
                    artist_id: track.artists[0].id,
                    uri: track.uri,
                    preview_url: track.preview_url,
                    external_url: track.external_urls.spotify,
                    album_art: track.album.images[0]?.url,
                    popularity: track.popularity,
                    genre: preferences.genre || '',
                    mood: preferences.mood || '',
                    score: track.popularity + (Math.random() * 20)
                };
            });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    isArtistDisliked(artistId) {
        return this.dislikedArtistsCatalog.has(artistId);
    }

    async updateDislikedArtistsCatalog(dislikedArtists, userId) {
        if (!Array.isArray(dislikedArtists)) {
            console.warn('Invalid dislikedArtists parameter: expected an array');
            return;
        }
    
        for (const artist of dislikedArtists) {
            const artistId = typeof artist === 'object' ? artist.artistId : artist;
            if (this.dislikedArtistsCatalog.has(artistId)) continue;
    
            try {
                if (typeof artist === 'object' && artist.name) {
                    this.dislikedArtistsCatalog.set(artistId, {
                        name: artist.name,
                        genre: artist.genre,
                        timestamp: artist.timestamp || Date.now()
                    });
                    continue;
                }
                
                const spotifyApi = await this.getSpotifyApi(userId);
                const artistData = await spotifyApi.getArtist(artistId);
                this.dislikedArtistsCatalog.set(artistId, {
                    name: artistData.body.name,
                    genre: artistData.body.genres?.[0] || '',
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error updating disliked artists:', error);
                this.dislikedArtistsCatalog.set(artistId, {
                    name: 'Unknown Artist',
                    genre: '',
                    timestamp: Date.now()
                });
            }
        }
    }

    broadenSearchPreferences(preferences, retryCount) {
        const broadenedPrefs = { ...preferences };
        
        if (retryCount >= 1 && broadenedPrefs.popularity) {
            delete broadenedPrefs.popularity;
        }
        
        if (retryCount >= 2 && broadenedPrefs.language) {
            delete broadenedPrefs.language;
        }
        
        if (retryCount >= 3 && broadenedPrefs.genre) {
            const genreRelations = {
                'rock': ['alternative', 'indie', 'metal'],
                'pop': ['indie', 'dance', 'electronic'],
                'hip-hop': ['rap', 'rnb', 'trap'],
                'rnb': ['soul', 'hip-hop', 'funk'],
                'electronic': ['house', 'techno', 'dubstep'],
                'classical': ['orchestral', 'piano', 'instrumental'],
                'jazz': ['blues', 'soul', 'funk'],
                'indie': ['alternative', 'folk', 'rock'],
                'metal': ['hard-rock', 'punk', 'thrash'],
                'folk': ['acoustic', 'country', 'indie'],
                'blues': ['jazz', 'soul', 'rock'],
                'country': ['folk', 'americana', 'bluegrass'],
                'latin': ['reggaeton', 'salsa', 'tropical'],
                'reggae': ['dancehall', 'dub', 'ska']
            };
            broadenedPrefs.genre = genreRelations[broadenedPrefs.genre]?.[0] || '';
        }
        
        return broadenedPrefs;
    }

    getMoodSeedWords(mood) {
        const moodSeedMap = {
            'upbeat': ['dance', 'energetic', 'party', 'summer', 'fun'],
            'happy': ['bright', 'cheerful', 'optimistic', 'sunny', 'positive'],
            'sad': ['melancholic', 'emotional', 'heartbreak', 'reflective'],
            'relax': ['peaceful', 'calm', 'serene', 'chill', 'ambient'],
            'intense': ['powerful', 'energy', 'dynamic', 'epic'],
            'romantic': ['love', 'passionate', 'intimate', 'beautiful'],
            'dark': ['mysterious', 'deep', 'atmospheric', 'haunting'],
            'dreamy': ['ethereal', 'space', 'surreal', 'ambient'],
            'epic': ['orchestral', 'cinematic', 'majestic', 'grand'],
            'angry': ['aggressive', 'heavy', 'rage', 'tension']
        };
        return moodSeedMap[mood] || [];
    }

    clearOldSuggestionHistory() {
        if (this.suggestionHistory.size > 1000) {
            this.suggestionHistory.clear();
        }
    }

    async retrySearch(preferences, skipCount, userId) {
        const retryStrategies = [
            async () => {
                const simplifiedPrefs = {
                    mood: preferences.mood,
                    language: preferences.language
                };
                return await this.findSuitableTrack(simplifiedPrefs, skipCount, 0, userId);
            },
            async () => {
                const simplifiedPrefs = {
                    genre: preferences.genre,
                    language: preferences.language
                };
                return await this.findSuitableTrack(simplifiedPrefs, skipCount, 0, userId);
            }
        ];
    
        for (const strategy of retryStrategies) {
            try {
                const results = await strategy();
                if (results && results.length > 0) return results;
            } catch (error) {
                console.error('Retry strategy failed:', error);
                if (error.message.includes('Spotify')) {
                    throw error;
                }
            }
        }
    
        throw new Error('No suitable tracks found after retry attempts');
    }

    // Main Recommendation Method
    async getSongRecommendation(imageAnalysis, skipCount = 0, preferences = {}, userId) {
        try {
            this.clearOldSuggestionHistory();
    
            const authStatus = await this.checkSpotifyAuth(userId);
            if (!authStatus.isAuthenticated) {
                throw new Error(authStatus.error || 'User not authenticated with Spotify');
            }

            const combinedPreferences = {
                mood: imageAnalysis.mood || preferences.mood || '',
                genre: preferences.genre || imageAnalysis.genre || '',
                language: preferences.language || '',
                popularity: preferences.popularity || '',
                artist: preferences.artist || '',
                likedArtists: preferences.likedArtists || [],
                dislikedArtists: preferences.dislikedArtists || [],
                likedSongs: preferences.likedSongs || [],
                dislikedSongs: preferences.dislikedSongs || [],
                allowedVersions: preferences.allowedVersions || [],
                randomSeed: Date.now()
            };
    
            try {
                const tracks = await this.findSuitableTrack(combinedPreferences, skipCount, 0, userId);
                return tracks;
            } catch (error) {
                console.error('getSongRecommendation: Initial search failed', { userId, error: error.message });
                if (error.message.includes('Spotify')) {
                    throw error;
                }
                return await this.retrySearch(combinedPreferences, skipCount, userId);
            }
        } catch (error) {
            console.error('getSongRecommendation: Recommendation error', { userId, error: error.message });
            if (error.message.includes('Spotify')) {
                throw error;
            }
            return [this.getFallbackTrack()];
        }
    }

    // Utility Methods
    async getAvailableGenres(userId) {
        try {
            const spotifyApi = await this.getSpotifyApi(userId);
            const response = await spotifyApi.getAvailableGenreSeeds();
            return response.body.genres;
        } catch (error) {
            console.error('Error fetching genres:', error);
            return [
                'pop', 'rock', 'hip-hop', 'rnb', 'electronic',
                'classical', 'jazz', 'indie', 'metal', 'folk',
                'blues', 'country', 'latin', 'reggae',
                'alternative', 'punk', 'soul', 'funk', 'disco'
            ];
        }
    }

    getFallbackTrack() {
        const fallbackTracks = [
            {
                name: 'River Flows In You',
                artist: 'Yiruma',
                uri: 'spotify:track:4x63W2sLNrtBsJYt5x1vA',
                preview_url: 'https://p.scdn.co/mp3-preview/river-flows-in-you',
                external_url: 'https://open.spotify.com/track/4x63W2sLNrtBsJYt5x1vA',
                album_art: 'https://i.scdn.co/image/ab67616d0000b273e2f'
            },
            {
                name: 'Gymnopédie No. 1',
                artist: 'Erik Satie',
                uri: 'spotify:track:5NGtFXVpXSvwunEIGeviY3',
                preview_url: 'https://p.scdn.co/mp3-preview/gymnopedie-no-1',
                external_url: 'https://open.spotify.com/track/5NGtFXVpXSvwunEIGeviY3',
                album_art: 'https://i.scdn.co/image/ab67616d0000b273f0e'
            }
        ];
    
        return fallbackTracks[Math.floor(Math.random() * fallbackTracks.length)];
    }

    // Image Analysis Methods
    async analyzeImage(imageBuffer) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                path.join(__dirname, '../PythonScripts/image_analysis.py')
            ]);
    
            let dataString = '';
            let errorString = '';
    
            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });
    
            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
                console.error(`Python error: ${data.toString()}`);
            });
    
            pythonProcess.on('error', (error) => {
                console.error('Failed to spawn Python process:', error);
                reject(error);
            });
    
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    console.error('Error output:', errorString);
                    reject(new Error(`Python process failed: ${errorString}`));
                    return;
                }
    
                try {
                    const jsonStartIndex = dataString.indexOf('{');
                    const jsonEndIndex = dataString.lastIndexOf('}');
    
                    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                        throw new Error('No valid JSON output found');
                    }
    
                    const jsonString = dataString.slice(jsonStartIndex, jsonEndIndex + 1);
                    const result = JSON.parse(jsonString);
                    console.log('Python Analysis:', result);
                    resolve(result);
                } catch (error) {
                    console.error('Error parsing JSON output:', error);
                    console.error('Raw output:', dataString);
                    reject(error);
                }
            });
    
            try {
                pythonProcess.stdin.write(imageBuffer);
                pythonProcess.stdin.end();
            } catch (error) {
                console.error('Error writing to Python process:', error);
                reject(error);
            }
        });
    }

    generateDescription(imageAnalysis) {
        const { mood, predictions, genre } = imageAnalysis;
        const mainObject = predictions?.[0]?.object || 'scene';
        const suggestedGenre = genre || 'music';

        const moodDescriptions = {
            'upbeat': 'vibrant and energetic',
            'happy': 'joyful and uplifting',
            'sad': 'melancholic and emotional',
            'relax': 'calm and serene',
            'intense': 'powerful and dynamic',
            'romantic': 'warm and passionate',
            'dark': 'mysterious and intense',
            'dreamy': 'ethereal and dreamy',
            'epic': 'grand and cinematic',
            'angry': 'fierce and aggressive'
        };

        return `This ${moodDescriptions[mood] || 'unique'} ${mainObject} suggests ${suggestedGenre} music. Finding a matching song...`;
    }

    cleanup() {
        this.suggestionHistory.clear();
        this.dislikedArtistsCatalog.clear();
    }
}

const songRecommender = new SongRecommender();
module.exports = songRecommender;