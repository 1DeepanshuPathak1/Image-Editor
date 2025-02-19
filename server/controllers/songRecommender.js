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
            console.error('Error refreshing Spotify token:', error);
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

    async findSuitableTrack(searchQuery, preferences = {}, skipCount = 0, retryCount = 0) {
        try {
            const searchOptions = {
                limit: 50,
                offset: skipCount,
            };
    
            if (!searchQuery || searchQuery.trim() === '') {
                throw new Error('Search query cannot be empty');
            }
    
            let queryParts = [searchQuery.trim()];
    
            if (preferences.genre && retryCount === 0) {
                queryParts.push(`genre:${preferences.genre}`);
            }
    
            if (preferences.artist && retryCount === 0) {
                if (typeof preferences.artist === 'string') {
                    queryParts.push(`artist:${preferences.artist}`);
                } else if (preferences.artist.name) {
                    const sanitizedArtistName = preferences.artist.name
                        .replace(/['"]/g, '')
                        .trim();
                    if (sanitizedArtistName) {
                        queryParts.push(`artist:"${sanitizedArtistName}"`);
                    }
                }
            }
    
            let finalQuery = queryParts.filter(part => part && part.trim() !== '').join(' ');
    
            if (!finalQuery) {
                throw new Error('No valid search criteria provided');
            }
    
            // Add randomization to the search query to get different results
            if (skipCount > 0) {
                const randomWords = ['remix', 'live', 'acoustic', 'cover', 'instrumental', 'extended'];
                const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
                finalQuery = `${finalQuery} NOT ${randomWord}`;
            }
    
            const searchResults = await this.spotifyApi.searchTracks(finalQuery, searchOptions);
    
            if (!searchResults.body.tracks?.items?.length) {
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(searchQuery, preferences, skipCount, retryCount + 1);
                }
                throw new Error('No tracks found with the current search criteria');
            }
    
            let tracks = searchResults.body.tracks.items
                // Filter out previously suggested songs
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
                    score: track.popularity
                }));
    
            if (tracks.length === 0) {
                if (retryCount < this.maxRetries) {
                    return this.findSuitableTrack(searchQuery, preferences, skipCount + 30, retryCount + 1);
                }
                throw new Error('No new tracks available. Try different preferences.');
            }
    
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
            if (retryCount < this.maxRetries) {
                console.log(`Error in attempt ${retryCount + 1}, retrying with broader search`);
                return this.findSuitableTrack(searchQuery, preferences, skipCount, retryCount + 1);
            }
            console.error('Error finding suitable tracks:', error);
            throw error;
        }
    }

    async retrySearch(searchQuery, preferences, skipCount) {
        const retryStrategies = [
            async () => {
                const baseQuery = `${preferences.mood || ''} ${preferences.genre || ''}`.trim();
                return await this.findSuitableTrack(baseQuery, {
                    language: preferences.language
                }, skipCount);
            },
            async () => {
                return await this.findSuitableTrack(preferences.genre || searchQuery, {
                    language: preferences.language
                }, skipCount);
            },
            async () => {
                return await this.findSuitableTrack(searchQuery, {
                    language: preferences.language
                }, skipCount + 1);
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

            const moodSearchTerms = {
                'upbeat': 'happy upbeat',
                'peaceful': 'peaceful calm',
                'intense': 'intense energetic',
                'melancholic': 'soft melancholic',
                'romantic': 'romantic love',
                'dark': 'dark atmospheric',
                'dreamy': 'dreamy ambient',
                'epic': 'epic orchestral',
                'angry': 'angry aggressive',
                'happy': 'happy cheerful'
            };

            const baseQuery = preferences.mood ?
                moodSearchTerms[preferences.mood] :
                moodSearchTerms[imageAnalysis.mood] || '';

            const genreHint = preferences.genre || imageAnalysis.genre_hints?.[0] || '';
            const searchQuery = `${baseQuery} ${genreHint}`.trim();


            try {
                const tracks = await this.findSuitableTrack(searchQuery, preferences, skipCount);
                return tracks; // Now returns the full list of ranked tracks
            } catch (error) {
                console.log('Initial search failed, trying retry strategies');
                return await this.retrySearch(searchQuery, preferences, skipCount);
            }

        } catch (error) {
            console.error('Recommendation error:', error);
            return [this.getFallbackTrack()]; // Return fallback track in an array
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