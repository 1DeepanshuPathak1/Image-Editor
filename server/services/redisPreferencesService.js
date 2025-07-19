const Redis = require('redis');
const { UserMusicPreferences } = require('../models/UserMusic');

class RedisUserPreferencesService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = Redis.createClient({
                host: '127.0.0.1',
                port: 6381,
                retry_unfulfilled_commands: true,
                retry_delay_on_cluster_down: 300,
                retry_delay_on_failover: 100,
                max_attempts: 3
            });

            this.client.on('error', (err) => {
                console.error('Redis User Preferences Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Redis User Preferences connected successfully');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('Redis User Preferences client ready');
                this.isConnected = true;
            });

            await this.client.connect();
            await this._setupExpirationHandler();
        } catch (error) {
            console.error('Redis User Preferences connection error:', error);
            this.isConnected = false;
        }
    }

    async _setupExpirationHandler() {
        try {
            await this.client.configSet('notify-keyspace-events', 'Ex');
            const subscriber = this.client.duplicate();
            await subscriber.connect();
            
            await subscriber.pSubscribe('__keyevent@0__:expired', async (message, channel) => {
                if (message.startsWith('preferences:warning:')) {
                    const userId = message.replace('preferences:warning:', '');
                    console.log(`Preferences cache warning expired for user: ${userId}, saving dirty data...`);
                    await this._saveDirtyDataBeforeExpiry(userId);
                }
            });
        } catch (error) {
            console.error('Error setting up expiration handler:', error);
        }
    }

    async _saveDirtyDataBeforeExpiry(userId) {
        try {
            if (!this.isConnected || !this.client) return;
            const prefKey = `preferences:${userId}`;
            const cachedData = await this.client.get(prefKey);
            if (cachedData) {
                const prefData = JSON.parse(cachedData);
                if (prefData.dirty) {
                    console.log(`Saving dirty preferences for user: ${userId}`);
                    await this._saveDirtyDataToDB(userId, prefData);
                    prefData.dirty = false;
                    await this.client.setEx(prefKey, 60, JSON.stringify(prefData));
                }
            }
        } catch (error) {
            console.error('Error saving dirty data before expiry:', error);
        }
    }

    async _saveDirtyDataToDB(userId, prefData) {
        try {
            let preferences = await UserMusicPreferences.findByUserId(userId);
            if (!preferences) {
                preferences = await UserMusicPreferences.create({
                    userId, likedArtists: [], dislikedArtists: [], likedSongs: [], dislikedSongs: [], savedSongs: []
                });
            }

            const savedSongsForDB = prefData.savedSongs.map(song => ({
                ...song, image: song.image ? Buffer.from(song.image, 'base64') : null
            }));

            Object.assign(preferences, {
                likedArtists: prefData.likedArtists,
                dislikedArtists: prefData.dislikedArtists,
                likedSongs: prefData.likedSongs,
                dislikedSongs: prefData.dislikedSongs,
                savedSongs: savedSongsForDB
            });

            await preferences.save();
            console.log(`Successfully saved preferences for user: ${userId}`);
        } catch (error) {
            console.error('Error saving dirty data to DB:', error);
        }
    }

    async getUserPreferences(userId) {
        try {
            if (!this.isConnected || !this.client) return await this._getPreferencesFromDB(userId);
            const prefKey = `preferences:${userId}`;
            const cachedData = await this.client.get(prefKey);
            if (cachedData) {
                const prefData = JSON.parse(cachedData);
                if (prefData.valid) return this._formatPreferencesResponse(prefData);
            }
            const preferencesFromDB = await this._getPreferencesFromDB(userId);
            if (preferencesFromDB) await this._setCacheData(userId, preferencesFromDB);
            return preferencesFromDB;
        } catch (error) {
            console.error('Redis getUserPreferences error:', error);
            return await this._getPreferencesFromDB(userId);
        }
    }

    async getLikedSongs(userId) {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences ? preferences.likedSongs || [] : [];
        } catch (error) {
            console.error('Redis getLikedSongs error:', error);
            return [];
        }
    }

    async getDislikedSongs(userId) {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences ? preferences.dislikedSongs || [] : [];
        } catch (error) {
            console.error('Redis getDislikedSongs error:', error);
            return [];
        }
    }

    async getLikedArtists(userId) {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences ? preferences.likedArtists || [] : [];
        } catch (error) {
            console.error('Redis getLikedArtists error:', error);
            return [];
        }
    }

    async getDislikedArtists(userId) {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences ? preferences.dislikedArtists || [] : [];
        } catch (error) {
            console.error('Redis getDislikedArtists error:', error);
            return [];
        }
    }

    async getSavedSongs(userId) {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences ? preferences.savedSongs || [] : [];
        } catch (error) {
            console.error('Redis getSavedSongs error:', error);
            return [];
        }
    }

    async addLikedSong(userId, song) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                const songData = {
                    songId: song.songId, name: song.name, artist: song.artist, artistId: song.artistId,
                    genre: song.genre, mood: song.mood, uri: song.uri, album_art: song.album_art,
                    external_url: song.external_url, popularity: song.popularity, timestamp: new Date().toISOString()
                };
                preferences.dislikedSongs = preferences.dislikedSongs.filter(s => s.songId !== song.songId);
                if (!preferences.likedSongs.find(s => s.songId === song.songId)) {
                    preferences.likedSongs.push(songData);
                }
                return preferences;
            });
        } catch (error) {
            console.error('Redis addLikedSong error:', error);
        }
    }

    async addDislikedSong(userId, song) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                const songData = {
                    songId: song.songId, name: song.name, artist: song.artist, artistId: song.artistId,
                    genre: song.genre, mood: song.mood, uri: song.uri, album_art: song.album_art,
                    external_url: song.external_url, popularity: song.popularity, timestamp: new Date().toISOString()
                };
                preferences.likedSongs = preferences.likedSongs.filter(s => s.songId !== song.songId);
                if (!preferences.dislikedSongs.find(s => s.songId === song.songId)) {
                    preferences.dislikedSongs.push(songData);
                }
                return preferences;
            });
        } catch (error) {
            console.error('Redis addDislikedSong error:', error);
        }
    }

    async addLikedArtist(userId, artist) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                const artistData = {
                    artistId: artist.artistId, name: artist.name, genre: artist.genre, timestamp: new Date().toISOString()
                };
                preferences.dislikedArtists = preferences.dislikedArtists.filter(a => a.artistId !== artist.artistId);
                if (!preferences.likedArtists.find(a => a.artistId === artist.artistId)) {
                    preferences.likedArtists.push(artistData);
                }
                return preferences;
            });
        } catch (error) {
            console.error('Redis addLikedArtist error:', error);
        }
    }

    async addDislikedArtist(userId, artist) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                const artistData = {
                    artistId: artist.artistId, name: artist.name, genre: artist.genre, timestamp: new Date().toISOString()
                };
                preferences.likedArtists = preferences.likedArtists.filter(a => a.artistId !== artist.artistId);
                if (!preferences.dislikedArtists.find(a => a.artistId === artist.artistId)) {
                    preferences.dislikedArtists.push(artistData);
                }
                return preferences;
            });
        } catch (error) {
            console.error('Redis addDislikedArtist error:', error);
        }
    }

    async addSavedSong(userId, song, imageBuffer, imageType) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                const songData = {
                    songId: song.songId, name: song.name, artist: song.artist, artistId: song.artistId,
                    genre: song.genre, mood: song.mood, uri: song.uri, album_art: song.album_art,
                    external_url: song.external_url, popularity: song.popularity,
                    image: imageBuffer ? imageBuffer.toString('base64') : null, imageType: imageType,
                    timestamp: new Date().toISOString()
                };
                if (!preferences.savedSongs.find(s => s.songId === song.songId)) {
                    preferences.savedSongs.push(songData);
                }
                return preferences;
            });
        } catch (error) {
            console.error('Redis addSavedSong error:', error);
        }
    }

    async removeSavedSong(userId, songId) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                preferences.savedSongs = preferences.savedSongs.filter(s => s.songId !== songId);
                return preferences;
            });
        } catch (error) {
            console.error('Redis removeSavedSong error:', error);
        }
    }

    async removeFromHistory(userId, songId) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                preferences.likedSongs = preferences.likedSongs.filter(s => s.songId !== songId && s.uri?.split(':')[2] !== songId);
                preferences.dislikedSongs = preferences.dislikedSongs.filter(s => s.songId !== songId && s.uri?.split(':')[2] !== songId);
                return preferences;
            });
        } catch (error) {
            console.error('Redis removeFromHistory error:', error);
        }
    }

    async removeArtist(userId, artistId) {
        try {
            await this._updateCacheData(userId, async (preferences) => {
                preferences.likedArtists = preferences.likedArtists.filter(a => a.artistId !== artistId);
                preferences.dislikedArtists = preferences.dislikedArtists.filter(a => a.artistId !== artistId);
                return preferences;
            });
        } catch (error) {
            console.error('Redis removeArtist error:', error);
        }
    }

    async createUserPreferences(userId) {
        try {
            const preferences = {
                id: require('uuid').v4(), userId, likedArtists: [], dislikedArtists: [], likedSongs: [], dislikedSongs: [], savedSongs: [],
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            await this._setCacheData(userId, preferences);
            return preferences;
        } catch (error) {
            console.error('Redis createUserPreferences error:', error);
            throw error;
        }
    }

    async syncUserPreferencesToDatabase(userId) {
        try {
            if (!this.isConnected || !this.client) return;
            const prefKey = `preferences:${userId}`;
            const cachedData = await this.client.get(prefKey);
            if (cachedData) {
                const prefData = JSON.parse(cachedData);
                if (prefData.dirty) {
                    await this._saveDirtyDataToDB(userId, prefData);
                    prefData.dirty = false;
                    await this.client.setEx(prefKey, 900, JSON.stringify(prefData));
                    await this.client.setEx(`preferences:warning:${userId}`, 840, userId);
                }
            }
        } catch (error) {
            console.error('Redis syncUserPreferencesToDatabase error:', error);
        }
    }

    async clearUserPreferencesCache(userId) {
        try {
            await this.syncUserPreferencesToDatabase(userId);
            if (this.isConnected && this.client) {
                await this.client.del(`preferences:${userId}`, `preferences:warning:${userId}`);
            }
        } catch (error) {
            console.error('Redis clearUserPreferencesCache error:', error);
        }
    }

    async _getPreferencesFromDB(userId) {
        try {
            let preferences = await UserMusicPreferences.findByUserId(userId);
            if (!preferences) {
                preferences = await UserMusicPreferences.create({
                    userId, likedArtists: [], dislikedArtists: [], likedSongs: [], dislikedSongs: [], savedSongs: []
                });
            }
            return {
                ...preferences,
                savedSongs: preferences.savedSongs.map(song => ({
                    ...song, image: song.image ? song.image.toString('base64') : null
                }))
            };
        } catch (error) {
            console.error('Error fetching preferences from DB:', error);
            return null;
        }
    }

    async _setCacheData(userId, preferences) {
        if (!this.isConnected || !this.client) return;
        try {
            const prefKey = `preferences:${userId}`;
            const warningKey = `preferences:warning:${userId}`;
            const cacheData = { ...preferences, valid: true, dirty: false };
            await this.client.setEx(prefKey, 900, JSON.stringify(cacheData));
            await this.client.setEx(warningKey, 840, userId);
        } catch (error) {
            console.error('Redis _setCacheData error:', error);
        }
    }

    async _updateCacheData(userId, updateFunction) {
        if (!this.isConnected || !this.client) {
            const preferences = await this._getPreferencesFromDB(userId);
            if (preferences) {
                const updatedPreferences = await updateFunction(preferences);
                const savedSongsForDB = updatedPreferences.savedSongs.map(song => ({
                    ...song, image: song.image && typeof song.image === 'string' ? Buffer.from(song.image, 'base64') : song.image
                }));
                let dbPreferences = await UserMusicPreferences.findByUserId(userId);
                if (!dbPreferences) dbPreferences = await UserMusicPreferences.create({ userId });
                Object.assign(dbPreferences, {
                    likedArtists: updatedPreferences.likedArtists, dislikedArtists: updatedPreferences.dislikedArtists,
                    likedSongs: updatedPreferences.likedSongs, dislikedSongs: updatedPreferences.dislikedSongs, savedSongs: savedSongsForDB
                });
                await dbPreferences.save();
            }
            return;
        }

        try {
            const prefKey = `preferences:${userId}`;
            const warningKey = `preferences:warning:${userId}`;
            let cachedData = await this.client.get(prefKey);
            let prefData = cachedData ? JSON.parse(cachedData) : await this._getPreferencesFromDB(userId) || await this.createUserPreferences(userId);
            const updatedPreferences = await updateFunction(prefData);
            Object.assign(updatedPreferences, { dirty: true, valid: true, updatedAt: new Date().toISOString() });
            await this.client.setEx(prefKey, 900, JSON.stringify(updatedPreferences));
            await this.client.setEx(warningKey, 840, userId);
        } catch (error) {
            console.error('Redis _updateCacheData error:', error);
        }
    }

    _formatPreferencesResponse(prefData) {
        return {
            id: prefData.id, userId: prefData.userId, likedArtists: prefData.likedArtists || [],
            dislikedArtists: prefData.dislikedArtists || [], likedSongs: prefData.likedSongs || [],
            dislikedSongs: prefData.dislikedSongs || [], createdAt: prefData.createdAt, updatedAt: prefData.updatedAt,
            savedSongs: (prefData.savedSongs || []).map(song => ({
                ...song, image: song.image ? `data:${song.imageType};base64,${song.image}` : null
            }))
        };
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
        }
    }
}

const redisUserPreferencesService = new RedisUserPreferencesService();
module.exports = redisUserPreferencesService;