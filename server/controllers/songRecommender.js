const SpotifyWebApi = require('spotify-web-api-node');
const { spawn } = require('child_process');
const path = require('path');
const SongRecommendationSystem = require('./SongRecommendationUtils');
require('dotenv').config();

class SongRecommender {
    constructor() {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            throw new Error('Missing required Spotify credentials in environment variables');
        }
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });

        this.initialized = this.initialize();
        this.maxRetries = 3;
    }
    async initialize() {
        try {
            await this.refreshSpotifyToken();
            setInterval(() => this.refreshSpotifyToken(), 45 * 60 * 1000);
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }
    async ensureAuthenticated() {
        try {
            const token = this.spotifyApi.getAccessToken();
            if (!token) {
                await this.refreshSpotifyToken();
            }
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    async getArtistInfo(artistId) {
        await this.ensureAuthenticated();

        try {
            const response = await this.spotifyApi.getArtist(artistId);

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

            if (error.statusCode === 404) {
                return null;
            }
            if (error.statusCode === 429) {
                throw new Error('Rate limit exceeded when fetching artist info');
            }

            throw error;
        }
    }
    async refreshSpotifyToken() {
        try {
            const data = await this.spotifyApi.clientCredentialsGrant();
            this.spotifyApi.setAccessToken(data.body['access_token']);
            console.log('Spotify token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing Spotify token:', error.statusCode, error.message);
            if (error.statusCode === 429) {
                console.log('Rate limited, waiting 5 seconds before retrying...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                return this.refreshSpotifyToken();
            }
            throw new Error('Failed to authenticate with Spotify: ' + error.message);
        }
    }
    async searchArtists(query) {
        await this.ensureAuthenticated();
        try {
            const response = await this.spotifyApi.searchArtists(query, { limit: 10 });
            return response.body.artists.items;
        } catch (error) {
            console.error('Error searching artists:', error);
            throw error;
        }
    }
    async findSuitableTrack(preferences = {}, skipCount = 0, retryCount = 0) {
        try {
            await this.ensureAuthenticated();
            const searchOptions = {
                limit: 50,
                offset: skipCount,
            };
    
            // Important: Set correct market based on language preference
            const marketMap = {
                'es': 'ES', // Spanish
                'fr': 'FR', // French
                'de': 'DE', // German
                'it': 'IT', // Italian
                'pt': 'BR', // Portuguese (Brazil)
                'ko': 'KR', // Korean
                'ja': 'JP', // Japanese
                'hi': 'IN', // Hindi (India)
                'ar': 'EG', // Arabic (Egypt)
            };
    
            if (preferences.language && marketMap[preferences.language]) {
                searchOptions.market = marketMap[preferences.language];
            }
    
            const mood = preferences.mood || '';
            const genre = preferences.genre || '';
    
            // Make language the primary search parameter
            let searchQuery = '';
            
            // Language-specific keywords map
            const languageKeywords = {
                'es': ['español', 'latino', 'castellano'], 
                'fr': ['français', 'chanson'], 
                'de': ['deutsch', 'schlager'], 
                'it': ['italiano', 'canzone'], 
                'pt': ['português', 'mpb', 'samba'], 
                'ko': ['k-pop', '한국어'], 
                'ja': ['j-pop', '日本語'], 
                'hi': ['bollywood', 'hindi song', 'भारतीय'], 
                'ar': ['arabic', 'عربي'],
            };
            
            // If language preference exists, prioritize it in the search
            if (preferences.language && languageKeywords[preferences.language]) {
                // Directly force the language in the query
                searchQuery = `language:${preferences.language} OR `;
                searchQuery += languageKeywords[preferences.language].join(' OR ');
                
                // Add genre and mood as secondary parameters
                if (genre) searchQuery += ` ${genre}`;
                if (mood) searchQuery += ` ${mood}`;
            } else {
                // Fall back to normal search method
                searchQuery = this.buildSearchQuery(mood, genre, preferences, skipCount);
            }
    
            // Log the search query for debugging
            console.log(`Searching with query: ${searchQuery}, market: ${searchOptions.market}`);
    
            // Search for tracks with language priority
            const searchResults = await this.spotifyApi.searchTracks(searchQuery, searchOptions);
    
            if (!searchResults.body.tracks?.items?.length) {
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(this.broadenSearchPreferences(preferences, retryCount), skipCount, retryCount + 1);
                }
                throw new Error('No tracks found with the current search criteria');
            }
    
            let tracks = searchResults.body.tracks.items
                .filter(track => !preferences.previouslySuggested?.includes(track.uri))
                .map(track => ({
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
                    score: track.popularity + (Math.random() * 10)
                }));
    
            if (tracks.length === 0) {
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(preferences, skipCount + 30, retryCount + 1);
                }
                throw new Error('No new tracks available. Try different preferences.');
            }
    
            // Rank and filter songs
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
            // Fix for 404 error - add detailed logging
            console.error(`Error finding tracks: ${error.statusCode} - ${error.message}`);
            
            if (error.statusCode === 404) {
                console.error('404 error - endpoint or resource not found');
                // Fall back to broader search without specific language constraint
                if (preferences.language && retryCount < this.maxRetries) {
                    const newPrefs = {...preferences};
                    delete newPrefs.language;
                    return this.findSuitableTrack(newPrefs, skipCount, retryCount + 1);
                }
            }
            
            if (retryCount < this.maxRetries) {
                console.log(`Error in attempt ${retryCount + 1}, retrying with broader search`);
                return this.findSuitableTrack(this.broadenSearchPreferences(preferences, retryCount), skipCount, retryCount + 1);
            }
            
            throw error;
        }
    }

    buildSearchQuery(mood, genre, preferences, skipCount) {
        let query = '';
        if (genre) {
            query += ` genre:${genre}`;
        }
        if (preferences.artist) {
            if (typeof preferences.artist === 'string') {
                query += ` artist:${preferences.artist}`;
            } else if (preferences.artist.name) {
                const sanitizedArtistName = preferences.artist.name
                    .replace(/['"]/g, '')
                    .trim();
                if (sanitizedArtistName) {
                    query += ` artist:"${sanitizedArtistName}"`;
                }
            }
        }
        const randomWords = ['remix', 'live', 'acoustic', 'cover', 'instrumental', 'extended'];
        if (skipCount > 0) {
            const randomWord = randomWords[skipCount % randomWords.length];
            query += ` NOT ${randomWord}`;
            if (skipCount > 30) {
                const secondRandomWord = randomWords[(skipCount + 3) % randomWords.length];
                query += ` NOT ${secondRandomWord}`;
            }
        }
        if (preferences.popularity) {
            if (preferences.popularity === 'undiscovered') {
                searchOptions.offset += 100;
            }
        }
        const moodSeedWords = this.getMoodSeedWords(mood);
        if (moodSeedWords && moodSeedWords.length > 0) {
            const seedWordsToUse = skipCount > 0
                ? [moodSeedWords[skipCount % moodSeedWords.length]]
                : [moodSeedWords[0]];

            query = seedWordsToUse.join(' ') + query;
        }
        if (query.trim() === '') {
            query = genre || 'music';
        }

        return query.trim();
    }

    broadenSearchPreferences(preferences, retryCount) {
        const broadenedPrefs = { ...preferences };
        if (retryCount > 0) {
            if (broadenedPrefs.language && retryCount >= 2) {
                delete broadenedPrefs.language;
            }
            if (broadenedPrefs.popularity && retryCount >= 1) {
                delete broadenedPrefs.popularity;
            }
            if (broadenedPrefs.genre && retryCount >= 1) {
                const genreRelations = {
                    'rock': ['alternative', 'indie', 'metal'],
                    'pop': ['dance', 'electronic', 'indie'],
                    'hip-hop': ['rap', 'r-n-b', 'urban'],
                    'r-n-b': ['soul', 'urban', 'hip-hop'],
                    'electronic': ['dance', 'house', 'techno'],
                    'classical': ['instrumental', 'orchestral', 'piano'],
                    'jazz': ['blues', 'soul', 'funk'],
                    'indie': ['alternative', 'rock', 'folk'],
                    'metal': ['rock', 'hard-rock', 'punk'],
                    'folk': ['acoustic', 'singer-songwriter', 'indie'],
                    'blues': ['jazz', 'soul', 'rock'],
                    'country': ['folk', 'americana', 'acoustic'],
                    'latin': ['reggaeton', 'pop', 'tropical'],
                    'reggae': ['dancehall', 'dub', 'ska']
                };

                if (retryCount === 1 && genreRelations[broadenedPrefs.genre]) {
                    const relatedGenres = genreRelations[broadenedPrefs.genre];
                    broadenedPrefs.genre = relatedGenres[Math.floor(Math.random() * relatedGenres.length)];
                } else if (retryCount >= 2) {
                    delete broadenedPrefs.genre;
                }
            }
        }
        return broadenedPrefs;
    }
    getMoodSeedWords(mood) {
        const moodSeedMap = {
            'upbeat': ['dance', 'energetic', 'fun', 'party', 'summer'],
            'peaceful': ['calm', 'ambient', 'relax', 'meditation', 'chill'],
            'intense': ['powerful', 'energy', 'strong', 'gym', 'workout'],
            'melancholic': ['sad', 'emotional', 'reflective', 'rainy', 'autumn'],
            'romantic': ['love', 'passion', 'heartfelt', 'intimate', 'beautiful'],
            'dark': ['night', 'mysterious', 'atmospheric', 'deep', 'haunting'],
            'dreamy': ['ethereal', 'floating', 'atmospheric', 'space', 'night'],
            'epic': ['orchestral', 'cinematic', 'trailer', 'majestic', 'grand'],
            'angry': ['aggressive', 'heavy', 'loud', 'tension', 'rage'],
            'happy': ['sunny', 'positive', 'bright', 'cheerful', 'optimistic']
        };

        return moodSeedMap[mood] || [];
    }

    getMoodAudioFeatures(mood) {
        const moodFeatureMap = {
            'upbeat': {
                min_energy: 0.7,
                max_energy: 1.0,
                min_valence: 0.6,
                max_valence: 1.0,
                min_tempo: 110
            },
            'peaceful': {
                min_energy: 0.0,
                max_energy: 0.4,
                min_valence: 0.3,
                max_valence: 0.7,
                max_tempo: 100
            },
            'intense': {
                min_energy: 0.7,
                max_energy: 1.0,
                min_valence: 0.2,
                max_valence: 0.7,
                min_tempo: 120
            },
            'melancholic': {
                min_energy: 0.2,
                max_energy: 0.6,
                min_valence: 0.0,
                max_valence: 0.4,
                max_tempo: 110
            },
            'romantic': {
                min_energy: 0.3,
                max_energy: 0.6,
                min_valence: 0.4,
                max_valence: 0.8,
                target_acousticness: 0.5
            },
            'dark': {
                min_energy: 0.4,
                max_energy: 0.8,
                min_valence: 0.0,
                max_valence: 0.4,
                target_instrumentalness: 0.3
            },
            'dreamy': {
                min_energy: 0.3,
                max_energy: 0.7,
                target_acousticness: 0.6,
                target_instrumentalness: 0.4
            },
            'epic': {
                min_energy: 0.7,
                max_energy: 1.0,
                target_instrumentalness: 0.5,
                min_tempo: 90
            },
            'angry': {
                min_energy: 0.7,
                max_energy: 1.0,
                min_valence: 0.0,
                max_valence: 0.4,
                min_tempo: 100
            },
            'happy': {
                min_energy: 0.5,
                max_energy: 0.9,
                min_valence: 0.7,
                max_valence: 1.0,
                min_tempo: 100
            }
        };

        return moodFeatureMap[mood] || {};
    }

    async retrySearch(preferences, skipCount) {
        const retryStrategies = [
            // Strategy 1: Try with mood only
            async () => {
                const simplifiedPrefs = {
                    mood: preferences.mood,
                    language: preferences.language
                };
                return await this.findSuitableTrack(simplifiedPrefs, skipCount);
            },
            async () => {
                const simplifiedPrefs = {
                    genre: preferences.genre,
                    language: preferences.language
                };
                return await this.findSuitableTrack(simplifiedPrefs, skipCount);
            },
            async () => {
                return await this.findSuitableTrack(preferences, skipCount + 30);
            },
            async () => {
                return await this.findSuitableTrack({ language: preferences.language },
                    Math.floor(Math.random() * 500));
            }
        ];

        for (const strategy of retryStrategies) {
            try {
                const results = await strategy();
                if (results && results.length > 0) return results;
            } catch (error) {
                console.warn('Retry strategy failed:', error);
                continue;
            }
        }

        throw new Error('No suitable tracks found after all retry attempts');
    }

    async getSongRecommendation(imageAnalysis, skipCount = 0, preferences = {}) {
        try {
            await this.ensureAuthenticated();
            const combinedPreferences = {
                mood: preferences.mood || imageAnalysis.mood,
                genre: preferences.genre || (imageAnalysis.genre_hints?.[0] || ''),
                language: preferences.language,
                popularity: preferences.popularity,
                artist: preferences.artist,
                likedArtists: preferences.likedArtists || [],
                dislikedArtists: preferences.dislikedArtists || [],
                likedSongs: preferences.likedSongs || [],
                dislikedSongs: preferences.dislikedSongs || [],
                previouslySuggested: preferences.previouslySuggested || []
            };
            combinedPreferences.randomSeed = Date.now() + skipCount;
            try {
                const tracks = await this.findSuitableTrack(combinedPreferences, skipCount);
                return tracks;
            } catch (error) {
                console.log('Initial search failed, trying retry strategies');
                return await this.retrySearch(combinedPreferences, skipCount);
            }
        } catch (error) {
            console.error('Recommendation error:', error);
            return [this.getFallbackTrack()];
        }
    }

    async getAvailableGenres() {
        await this.ensureAuthenticated();
        try {
            const response = await this.spotifyApi.getAvailableGenreSeeds();
            return response.body.genres;
        } catch (error) {
            console.error('Error fetching genres:', error);
            return [
                "pop", "rock", "hip-hop", "r-n-b", "electronic",
                "classical", "jazz", "indie", "metal", "folk",
                "blues", "country", "latin", "reggae", "world-music",
                "alternative", "punk", "soul", "funk", "disco"
            ];
        }
    }

    getFallbackTrack() {
        const fallbackTracks = [
            {
                name: "River Flows In You",
                artist: "Yiruma",
                uri: "spotify:track:4x63WB2sLNrtBegJYt5xva",
                preview_url: "https://p.scdn.co/mp3-preview/8eb82b5f3e840069d6899a482f3c79d96f926e47",
                external_url: "https://open.spotify.com/track/4x63WB2sLNrtBegJYt5xva",
                album_art: "https://i.scdn.co/image/ab67616d0000b273626b354a5bd2f8c16da38fa5"
            },
            {
                name: "Gymnopédie No. 1",
                artist: "Erik Satie",
                uri: "spotify:track:5NGtFXVpXSvwunEIGeviY3",
                preview_url: "https://p.scdn.co/mp3-preview/5d8e0f5d966f9e4aa9e9a48d87bb6c30c9a1d4f3",
                external_url: "https://open.spotify.com/track/5NGtFXVpXSvwunEIGeviY3",
                album_art: "https://i.scdn.co/image/ab67616d0000b273626849e70b57698df2aa0228"
            }
        ];

        return fallbackTracks[Math.floor(Math.random() * fallbackTracks.length)];
    }

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
                console.error(`Python Error: ${data}`);
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
                    console.log('Python Analysis Result:', result);
                    resolve(result);
                } catch (error) {
                    console.error('Error parsing Python output:', error);
                    console.error('Raw Python Output:', dataString);
                    reject(error);
                }
            });

            pythonProcess.stdin.write(imageBuffer);
            pythonProcess.stdin.end();
        });
    }

    generateDescription(imageAnalysis) {
        const { mood, predictions, genre_hints } = imageAnalysis;
        const mainObject = predictions[0].label;
        const suggestedGenre = genre_hints?.[0] || 'music';

        const moodDescriptions = {
            'upbeat': 'vibrant and energetic',
            'peaceful': 'calm and serene',
            'intense': 'powerful and dynamic',
            'melancholic': 'thoughtful and atmospheric',
            'romantic': 'warm and intimate',
            'dark': 'mysterious and intense',
            'dreamy': 'ethereal and floating',
            'epic': 'grand and powerful',
            'angry': 'fierce and intense',
            'happy': 'bright and cheerful'
        };

        return `This ${moodDescriptions[mood]} scene featuring ${mainObject} suggests ${suggestedGenre} music. Finding a matching song...`;
    }
}

const recommender = new SongRecommender();
module.exports = recommender;