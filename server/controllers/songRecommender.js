const SpotifyWebApi = require('spotify-web-api-node');
const { spawn } = require('child_process');
const path = require('path');
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

    async findSuitableTrack(searchQuery, retryCount = 0) {
        console.log(`Searching for tracks (attempt ${retryCount + 1}), query: ${searchQuery}`);
        
        const searchQueries = [
            searchQuery,                          
            searchQuery.split(' ')[0],          
            `${searchQuery} music`,              
            searchQuery.split(' ').slice(-1)[0]  
        ];

        for (let query of searchQueries) {
            try {
                const searchResults = await this.spotifyApi.searchTracks(query, { 
                    limit: 50,
                    market: 'US'
                });

                if (!searchResults.body.tracks?.items?.length) {
                    console.log(`No results found for query: ${query}`);
                    continue;
                }

                let suitableTracks = searchResults.body.tracks.items.filter(track => 
                    track.preview_url && track.popularity > 20
                );

                if (suitableTracks.length === 0) {
                    suitableTracks = searchResults.body.tracks.items.filter(track => 
                        track.popularity > 20
                    );
                }

                if (suitableTracks.length > 0) {
                    suitableTracks.sort((a, b) => b.popularity - a.popularity);
                    const topTracks = suitableTracks.slice(0, 10);
                    const selectedTrack = topTracks[Math.floor(Math.random() * topTracks.length)];
                    console.log(`Found suitable track: ${selectedTrack.name} by ${selectedTrack.artists[0].name}`);
                    return selectedTrack;
                }
            } catch (error) {
                console.error(`Search error for query "${query}":`, error);
            }
        }

        if (retryCount < 2) {
            const fallbackQueries = ['peaceful', 'acoustic', 'ambient'];
            return this.findSuitableTrack(fallbackQueries[retryCount], retryCount + 1);
        }

        console.log('No suitable tracks found after all attempts');
        return null;
    }

    async getSongRecommendation(imageAnalysis) {
        try {
            await this.ensureAuthenticated();
    
            const moodSearchTerms = {
                'upbeat': 'happy upbeat',
                'peaceful': 'peaceful calm',
                'intense': 'intense energetic',
                'melancholic': 'soft melancholic'
            };
    
            const baseQuery = moodSearchTerms[imageAnalysis.mood] || 'peaceful';
            const genreHint = imageAnalysis.genre_hints?.[0] || '';
            const searchQuery = `${baseQuery} ${genreHint}`.trim();
            console.log('Initial search query:', searchQuery);
    
            const seedTrack = await this.findSuitableTrack(searchQuery);
            if (!seedTrack) {
                console.log('Using fallback track as no suitable tracks found');
                return this.getFallbackTrack();
            }
    
            // Return only the seed track
            return {
                name: seedTrack.name,
                artist: seedTrack.artists[0].name,
                uri: seedTrack.uri,
                preview_url: seedTrack.preview_url,
                external_url: seedTrack.external_urls.spotify,
                album_art: seedTrack.album.images[0]?.url
            };
    
        } catch (error) {
            console.error('Spotify recommendation error:', error);
            return this.getFallbackTrack();
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
            'melancholic': 'thoughtful and atmospheric'
        };

        return `This ${moodDescriptions[mood]} scene featuring ${mainObject} suggests ${suggestedGenre} music. Finding a matching song...`;
    }
}

const recommender = new SongRecommender();
module.exports = recommender;