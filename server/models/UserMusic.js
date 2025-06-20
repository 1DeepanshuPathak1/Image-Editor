const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'eu-north-1'
});

class UserMusicPreferences {
    constructor(preferencesData) {
        this.id = preferencesData.id || uuidv4();
        this.userId = preferencesData.userId;
        this.likedArtists = preferencesData.likedArtists || [];
        this.dislikedArtists = preferencesData.dislikedArtists || [];
        this.likedSongs = preferencesData.likedSongs || [];
        this.dislikedSongs = preferencesData.dislikedSongs || [];
        this.savedSongs = preferencesData.savedSongs || [];
        this.createdAt = preferencesData.createdAt || new Date().toISOString();
        this.updatedAt = preferencesData.updatedAt || new Date().toISOString();
    }

    // Add liked artist
    addLikedArtist(artist) {
        const artistData = {
            artistId: artist.artistId,
            name: artist.name,
            genre: artist.genre,
            timestamp: new Date().toISOString()
        };
        this.dislikedArtists = this.dislikedArtists.filter(a => a.artistId !== artist.artistId);
        if (!this.likedArtists.find(a => a.artistId === artist.artistId)) {
            this.likedArtists.push(artistData);
        }
    }

    // Add disliked artist
    addDislikedArtist(artist) {
        const artistData = {
            artistId: artist.artistId,
            name: artist.name,
            genre: artist.genre,
            timestamp: new Date().toISOString()
        };
        this.likedArtists = this.likedArtists.filter(a => a.artistId !== artist.artistId);
        if (!this.dislikedArtists.find(a => a.artistId === artist.artistId)) {
            this.dislikedArtists.push(artistData);
        }
    }

    // Add liked song
    addLikedSong(song) {
        const songData = {
            songId: song.songId,
            name: song.name,
            artist: song.artist,
            artistId: song.artistId,
            genre: song.genre,
            mood: song.mood,
            uri: song.uri,
            album_art: song.album_art,
            external_url: song.external_url,
            popularity: song.popularity,
            timestamp: new Date().toISOString()
        };
        
        this.dislikedSongs = this.dislikedSongs.filter(s => s.songId !== song.songId);
        
        if (!this.likedSongs.find(s => s.songId === song.songId)) {
            this.likedSongs.push(songData);
        }
    }

    // Add disliked song
    addDislikedSong(song) {
        const songData = {
            songId: song.songId,
            name: song.name,
            artist: song.artist,
            artistId: song.artistId,
            genre: song.genre,
            mood: song.mood,
            uri: song.uri,
            album_art: song.album_art,
            external_url: song.external_url,
            popularity: song.popularity,
            timestamp: new Date().toISOString()
        };
        
        this.likedSongs = this.likedSongs.filter(s => s.songId !== song.songId);
        
        if (!this.dislikedSongs.find(s => s.songId === song.songId)) {
            this.dislikedSongs.push(songData);
        }
    }

    addSavedSong(song) {
        const songData = {
            songId: song.songId,
            name: song.name,
            artist: song.artist,
            artistId: song.artistId,
            genre: song.genre,
            mood: song.mood,
            uri: song.uri,
            album_art: song.album_art,
            external_url: song.external_url,
            popularity: song.popularity,
            image: song.image,
            imageType: song.imageType,
            timestamp: new Date().toISOString()
        };
        if (!this.savedSongs.find(s => s.songId === song.songId)) {
            this.savedSongs.push(songData);
        }
    }

    // Remove saved song
    removeSavedSong(songId) {
        this.savedSongs = this.savedSongs.filter(s => s.songId !== songId);
    }

    // Save preferences to DynamoDB
    async save() {
        this.updatedAt = new Date().toISOString();

        const params = {
            TableName: 'UserMusicPreferences',
            Item: {
                id: this.id,
                userId: this.userId,
                likedArtists: this.likedArtists,
                dislikedArtists: this.dislikedArtists,
                likedSongs: this.likedSongs,
                dislikedSongs: this.dislikedSongs,
                savedSongs: this.savedSongs,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt
            }
        };

        try {
            await dynamodb.put(params).promise();
            return this;
        } catch (error) {
            console.error('Error saving user music preferences:', error);
            throw error;
        }
    }

    // Static methods for database operations
    static async findByUserId(userId) {
        const params = {
            TableName: 'UserMusicPreferences',
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        try {
            const result = await dynamodb.query(params).promise();
            return result.Items && result.Items.length > 0 
                ? new UserMusicPreferences(result.Items[0]) 
                : null;
        } catch (error) {
            console.error('Error finding user music preferences:', error);
            throw error;
        }
    }

    static async findById(id) {
        const params = {
            TableName: 'UserMusicPreferences',
            Key: { id }
        };

        try {
            const result = await dynamodb.get(params).promise();
            return result.Item ? new UserMusicPreferences(result.Item) : null;
        } catch (error) {
            console.error('Error finding music preferences by ID:', error);
            throw error;
        }
    }

    static async create(preferencesData) {
        const preferences = new UserMusicPreferences(preferencesData);
        return await preferences.save();
    }

    static async findOneAndUpdate(query, update, options = {}) {
        try {
            let preferences;
            
            if (query.userId) {
                preferences = await UserMusicPreferences.findByUserId(query.userId);
            } else {
                throw new Error('Unsupported query format for findOneAndUpdate');
            }

            if (!preferences && options.upsert) {
                preferences = new UserMusicPreferences({
                    userId: query.userId,
                    ...update
                });
            } else if (!preferences) {
                return null;
            } else {
                // Update existing preferences
                Object.keys(update).forEach(key => {
                    if (key !== 'id' && key !== 'userId') {
                        preferences[key] = update[key];
                    }
                });
            }

            await preferences.save();
            return options.new !== false ? preferences : preferences;
        } catch (error) {
            console.error('Error in findOneAndUpdate:', error);
            throw error;
        }
    }

    static async updateOne(query, update) {
        try {
            const preferences = await UserMusicPreferences.findByUserId(query.userId);
            if (!preferences) {
                throw new Error('User music preferences not found');
            }

            // Handle different update operations
            if (update.$push) {
                Object.keys(update.$push).forEach(key => {
                    if (preferences[key] && Array.isArray(preferences[key])) {
                        preferences[key].push(update.$push[key]);
                    }
                });
            }

            if (update.$pull) {
                Object.keys(update.$pull).forEach(key => {
                    if (preferences[key] && Array.isArray(preferences[key])) {
                        const condition = update.$pull[key];
                        if (condition.songId) {
                            preferences[key] = preferences[key].filter(item => item.songId !== condition.songId);
                        } else if (condition.artistId) {
                            preferences[key] = preferences[key].filter(item => item.artistId !== condition.artistId);
                        }
                    }
                });
            }

            if (update.$set) {
                Object.keys(update.$set).forEach(key => {
                    preferences[key] = update.$set[key];
                });
            }

            await preferences.save();
            return { acknowledged: true, modifiedCount: 1 };
        } catch (error) {
            console.error('Error in updateOne:', error);
            throw error;
        }
    }

    static async deleteOne(query) {
        try {
            const preferences = await UserMusicPreferences.findByUserId(query.userId);
            if (!preferences) {
                return { acknowledged: true, deletedCount: 0 };
            }

            const params = {
                TableName: 'UserMusicPreferences',
                Key: { id: preferences.id }
            };

            await dynamodb.delete(params).promise();
            return { acknowledged: true, deletedCount: 1 };
        } catch (error) {
            console.error('Error deleting user music preferences:', error);
            throw error;
        }
    }
}

module.exports = { UserMusicPreferences };