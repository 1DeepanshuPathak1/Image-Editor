const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyOperations {
    constructor(recommender) {
        this.recommender = recommender;
    }

    async getSpotifyApi(userId) {
        try {
            if (!userId) {
                throw new Error('No user ID provided');
            }

            const user = await this.recommender.userOps.findUserById(userId);
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

                    await this.recommender.userOps.updateUser(userId, updateData);
                    spotifyApi.setAccessToken(data.body['access_token']);

                    console.log('getSpotifyApi: Token refreshed successfully', { userId });
                } catch (refreshError) {
                    console.error('getSpotifyApi: Error refreshing Spotify token', {
                        userId,
                        error: refreshError.message,
                        statusCode: refreshError.statusCode
                    });

                    await this.recommender.userOps.updateUser(userId, {
                        spotifyAccessToken: null
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
}

module.exports = { SpotifyOperations };