const SongRecommendationSystem = require('../SongRecommendationUtils');

class RecommendationLogic {
    constructor(recommender) {
        this.recommender = recommender;
    }

    async findSuitableTrack(preferences = {}, skipCount = 0, retryCount = 0, userId) {
        try {
            const spotifyApi = await this.recommender.spotifyOps.getSpotifyApi(userId);
            const user = await this.recommender.userOps.findUserById(userId);

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
                    await this.recommender.userOps.updateUser(userId, {
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
                if (retryCount < this.recommender.maxRetries) {
                    return this.findSuitableTrack(this.broadenSearchPreferences(preferences, retryCount), skipCount, retryCount + 1, userId);
                }
                throw new Error('No tracks found with the current search criteria');
            }

            let tracks = this.filterAndProcessTracks(searchResults.body.tracks.items, preferences);

            if (tracks.length === 0) {
                console.warn('findSuitableTrack: No valid tracks after filtering', { userId, searchQuery });
                if (retryCount < this.recommender.maxRetries) {
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
            if (error.statusCode === 403) {
                await this.recommender.userOps.updateUser(userId, {
                    spotifyAccessToken: null
                });
                throw new Error('Spotify access denied. Please re-authenticate with Spotify.');
            }
            console.error('findSuitableTrack: Error finding tracks', { userId, error: error.message });
            throw error;
        }
    }

    getMarketFromUser(user, preferences) {
        const marketMap = {
            'en': 'US', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'it': 'IT',
            'pt': 'BR', 'ko': 'KR', 'ja': 'JP', 'hi': 'IN', 'ar': 'SA'
        };

        const userCountry = user.country;
        if (userCountry) return userCountry;
        if (preferences.language && marketMap[preferences.language]) {
            return marketMap[preferences.language];
        }
        return 'US';
    }

    buildSearchQuery(preferences, skipCount) {
        const { mood = '', genre = '', language = '', artist } = preferences;
        const queryParts = [];

        if (artist) {
            const artistName = typeof artist === 'string' ? artist : artist.name;
            if (artistName) {
                const sanitizedName = artistName.replace(/['"]/g, '').trim();
                if (sanitizedName) {
                    queryParts.push(`artist:"${sanitizedName}"`);
                }
            }
        }

        if (genre) {
            queryParts.push(`genre:"${genre}"`);
        }

        if (language) {
            const languageTerms = this.getLanguageSearchTerms(language);
            if (languageTerms.length > 0) {
                const languageQuery = languageTerms.map(term => `"${term}"`).join(' OR ');
                queryParts.push(`(${languageQuery})`);
            }
        }

        const moodKeywords = this.getMoodKeywords(mood);
        if (moodKeywords.length > 0) {
            const moodTerm = skipCount > 0 
                ? moodKeywords[skipCount % moodKeywords.length]
                : moodKeywords[0];
            queryParts.push(moodTerm);
        }

        if (skipCount > 0) {
            const excludeTerms = ['remix', 'live', 'acoustic', 'instrumental'];
            const excludeIndex = Math.floor(skipCount / 10) % excludeTerms.length;
            queryParts.push(`NOT ${excludeTerms[excludeIndex]}`);
        }

        return queryParts.length > 0 ? queryParts.join(' ') : 'track:*';
    }

    getLanguageSearchTerms(language) {
        const languageMap = {
            'en': ['english'],
            'es': ['spanish', 'latino', 'reggaeton'],
            'fr': ['french', 'français'],
            'de': ['german', 'deutsch'],
            'it': ['italian', 'italiano'],
            'pt': ['portuguese', 'português', 'brasil'],
            'ko': ['korean', 'k-pop', 'kpop'],
            'ja': ['japanese', 'j-pop', 'jpop'],
            'hi': ['hindi', 'bollywood', 'desi'],
            'ar': ['arabic', 'عربي']
        };
        return languageMap[language] || [];
    }

    getMoodKeywords(mood) {
        const moodMap = {
            'upbeat': ['energetic', 'upbeat', 'lively'],
            'happy': ['happy', 'cheerful', 'joyful'],
            'sad': ['sad', 'melancholic', 'emotional'],
            'relax': ['relaxing', 'calm', 'chill'],
            'intense': ['intense', 'powerful', 'dramatic'],
            'romantic': ['romantic', 'love', 'passionate'],
            'dark': ['dark', 'moody', 'atmospheric'],
            'dreamy': ['dreamy', 'ethereal', 'ambient'],
            'epic': ['epic', 'cinematic', 'grand'],
            'angry': ['aggressive', 'angry', 'fierce']
        };
        return moodMap[mood] || [];
    }

    filterAndProcessTracks(tracks, preferences) {
        const allowedVersions = preferences.allowedVersions || [];

        return tracks
            .filter(track => !this.recommender.suggestionHistory.has(track.uri))
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
                this.recommender.suggestionHistory.add(track.uri);
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
        return this.recommender.dislikedArtistsCatalog.has(artistId);
    }

    async updateDislikedArtistsCatalog(dislikedArtists, userId) {
        if (!Array.isArray(dislikedArtists)) {
            console.warn('Invalid dislikedArtists parameter: expected an array');
            return;
        }

        for (const artist of dislikedArtists) {
            const artistId = typeof artist === 'object' ? artist.artistId : artist;
            if (this.recommender.dislikedArtistsCatalog.has(artistId)) continue;

            try {
                if (typeof artist === 'object' && artist.name) {
                    this.recommender.dislikedArtistsCatalog.set(artistId, {
                        name: artist.name,
                        genre: artist.genre,
                        timestamp: artist.timestamp || Date.now()
                    });
                    continue;
                }

                const spotifyApi = await this.recommender.spotifyOps.getSpotifyApi(userId);
                const artistData = await spotifyApi.getArtist(artistId);
                this.recommender.dislikedArtistsCatalog.set(artistId, {
                    name: artistData.body.name,
                    genre: artistData.body.genres?.[0] || '',
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error updating disliked artists:', error);
                this.recommender.dislikedArtistsCatalog.set(artistId, {
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

    clearOldSuggestionHistory() {
        if (this.recommender.suggestionHistory.size > 1000) {
            this.recommender.suggestionHistory.clear();
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

    async getSongRecommendation(imageAnalysis, skipCount = 0, preferences = {}, userId) {
        try {
            this.clearOldSuggestionHistory();

            const authStatus = await this.recommender.spotifyOps.checkSpotifyAuth(userId);
            if (!authStatus.isAuthenticated) {
                throw new Error(authStatus.error || 'User not authenticated with Spotify');
            }

            const combinedPreferences = {
                mood: preferences.mood || imageAnalysis.mood || '',
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

    async getAvailableGenres(userId) {
        try {
            const spotifyApi = await this.recommender.spotifyOps.getSpotifyApi(userId);
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

    cleanup() {
        this.recommender.suggestionHistory.clear();
        this.recommender.dislikedArtistsCatalog.clear();
    }
}

module.exports = { RecommendationLogic };