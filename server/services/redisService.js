const Redis = require('redis');
const { User } = require('../models/User');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = Redis.createClient({
                host: '127.0.0.1',
                port: 6379,
                retry_unfulfilled_commands: true,
                retry_delay_on_cluster_down: 300,
                retry_delay_on_failover: 100,
                max_attempts: 3
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('Redis client ready');
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            console.error('Redis connection error:', error);
            this.isConnected = false;
        }
    }

    // Cache Read Operations
    async getUserAuth(userId) {
        try {
            if (!this.isConnected || !this.client) {
                return await this._getUserFromDB(userId);
            }

            const userKey = `user:${userId}`;
            const cachedData = await this.client.get(userKey);
            
            if (cachedData) {
                const userData = JSON.parse(cachedData);
                return { userId: userData.userId, spotifyAccessToken: userData.spotifyAccessToken, spotifyRefreshToken: userData.spotifyRefreshToken };
            }

            const userFromDB = await this._getUserFromDB(userId);
            if (userFromDB) {
                await this._setCacheData(userId, userFromDB.spotifyAccessToken, userFromDB.spotifyRefreshToken);
            }
            return userFromDB;
        } catch (error) {
            console.error('Redis getUserAuth error:', error);
            return await this._getUserFromDB(userId);
        }
    }

    async findUserByEmail(email) {
        try {
            const user = await User.findOne({ email });
            if (user) {
                await this._setCacheData(user.id, user.spotifyAccessToken, user.spotifyRefreshToken);
                return { userId: user.id, spotifyAccessToken: user.spotifyAccessToken || null, spotifyRefreshToken: user.spotifyRefreshToken || null };
            }
            return null;
        } catch (error) {
            console.error('Redis findUserByEmail error:', error);
            return null;
        }
    }

    async findUserByGoogleId(googleId) {
        try {
            const user = await User.findOne({ googleId });
            if (user) {
                await this._setCacheData(user.id, user.spotifyAccessToken, user.spotifyRefreshToken);
                return { userId: user.id, spotifyAccessToken: user.spotifyAccessToken || null, spotifyRefreshToken: user.spotifyRefreshToken || null };
            }
            return null;
        } catch (error) {
            console.error('Redis findUserByGoogleId error:', error);
            return null;
        }
    }

    async findUserByGithubId(githubId) {
        try {
            const user = await User.findOne({ githubId });
            if (user) {
                await this._setCacheData(user.id, user.spotifyAccessToken, user.spotifyRefreshToken);
                return { userId: user.id, spotifyAccessToken: user.spotifyAccessToken || null, spotifyRefreshToken: user.spotifyRefreshToken || null };
            }
            return null;
        } catch (error) {
            console.error('Redis findUserByGithubId error:', error);
            return null;
        }
    }

    async findUserBySpotifyId(spotifyId) {
        try {
            const user = await User.findOne({ spotifyId });
            if (user) {
                await this._setCacheData(user.id, user.spotifyAccessToken, user.spotifyRefreshToken);
                return { userId: user.id, spotifyAccessToken: user.spotifyAccessToken || null, spotifyRefreshToken: user.spotifyRefreshToken || null };
            }
            return null;
        } catch (error) {
            console.error('Redis findUserBySpotifyId error:', error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            const user = await User.create(userData);
            await this._setCacheData(user.id, user.spotifyAccessToken, user.spotifyRefreshToken);
            return user;
        } catch (error) {
            console.error('Redis createUser error:', error);
            throw error;
        }
    }

    // Cache Write Operations with Status Bit Logic
    async updateSpotifyTokens(userId, spotifyAccessToken, spotifyRefreshToken) {
        try {
            await this._updateCacheData(userId, spotifyAccessToken, spotifyRefreshToken);
        } catch (error) {
            console.error('Redis updateSpotifyTokens error:', error);
        }
    }

    async updateUserSpotifyData(userId, spotifyId, spotifyAccessToken, spotifyRefreshToken, country) {
        try {
            await this._updateCacheData(userId, spotifyAccessToken, spotifyRefreshToken, { spotifyId, country });
        } catch (error) {
            console.error('Redis updateUserSpotifyData error:', error);
        }
    }

    async clearSpotifyTokens(userId) {
        try {
            await this._updateCacheData(userId, null, null);
        } catch (error) {
            console.error('Redis clearSpotifyTokens error:', error);
        }
    }

    // Cache Management Methods
    async syncUserToDatabase(userId) {
        try {
            if (!this.isConnected || !this.client) return;

            const userKey = `user:${userId}`;
            const cachedData = await this.client.get(userKey);

            if (cachedData) {
                const userData = JSON.parse(cachedData);
                if (userData.dirty) {
                    const user = await User.findById(userId);
                    if (user) {
                        user.spotifyAccessToken = userData.spotifyAccessToken;
                        user.spotifyRefreshToken = userData.spotifyRefreshToken;
                        if (userData.spotifyId) user.spotifyId = userData.spotifyId;
                        if (userData.country) user.country = userData.country;
                        if (userData.spotifyAccessToken === null && userData.spotifyRefreshToken === null) {
                            user.clearSpotifyData();
                        }
                        await user.save();
                        userData.dirty = false;
                        await this.client.setEx(userKey, 86400, JSON.stringify(userData));
                    }
                }
            }
        } catch (error) {
            console.error('Redis syncUserToDatabase error:', error);
        }
    }

    async clearUserCache(userId) {
        try {
            await this.syncUserToDatabase(userId);
            if (this.isConnected && this.client) {
                await this.client.del(`user:${userId}`);
            }
        } catch (error) {
            console.error('Redis clearUserCache error:', error);
        }
    }

    // Private Helper Methods
    async _getUserFromDB(userId) {
        try {
            const user = await User.findById(userId);
            if (user) {
                return { userId: user.id, spotifyAccessToken: user.spotifyAccessToken || null, spotifyRefreshToken: user.spotifyRefreshToken || null };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user from DB:', error);
            return null;
        }
    }

    async _setCacheData(userId, spotifyAccessToken, spotifyRefreshToken, extraData = {}) {
        if (!this.isConnected || !this.client) return;

        try {
            const userKey = `user:${userId}`;
            const userData = {
                userId,
                spotifyAccessToken: spotifyAccessToken || null,
                spotifyRefreshToken: spotifyRefreshToken || null,
                valid: true,
                dirty: false,
                ...extraData
            };

            await this.client.setEx(userKey, 86400, JSON.stringify(userData));
        } catch (error) {
            console.error('Redis _setCacheData error:', error);
        }
    }

    async _updateCacheData(userId, spotifyAccessToken, spotifyRefreshToken, extraData = {}) {
    if (!this.isConnected || !this.client) {
        const user = await User.findById(userId);
        if (user) {
            user.spotifyAccessToken = spotifyAccessToken;
            user.spotifyRefreshToken = spotifyRefreshToken;
            if (extraData.spotifyId) user.spotifyId = extraData.spotifyId;
            if (extraData.country) user.country = extraData.country;
            if (spotifyAccessToken === null && spotifyRefreshToken === null) {
                user.clearSpotifyData();
            }
            await user.save();
        }
        return;
    }

    try {
        const userKey = `user:${userId}`;
        const cachedData = await this.client.get(userKey);
        
        let userData;
        if (cachedData) {
            userData = JSON.parse(cachedData);
        } else {
            userData = { userId, valid: true };
        }

        userData.spotifyAccessToken = spotifyAccessToken;
        if (spotifyRefreshToken !== undefined) {
            userData.spotifyRefreshToken = spotifyRefreshToken;
        }
        userData.dirty = true;
        if (extraData.spotifyId) userData.spotifyId = extraData.spotifyId;
        if (extraData.country) userData.country = extraData.country;

        await this.client.setEx(userKey, 86400, JSON.stringify(userData));
    } catch (error) {
        console.error('Redis _updateCacheData error:', error);
    }
}

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
        }
    }
}

const redisService = new RedisService();

module.exports = redisService;