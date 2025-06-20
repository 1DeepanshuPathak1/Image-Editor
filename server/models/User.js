const AWS = require('aws-sdk');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Configure AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'eu-north-1'
});

class User {
    constructor(userData) {
        this.id = userData.id || userData._id || uuidv4();
        this._id = this.id; // Keep both for compatibility
        this.firstName = userData.firstName;
        this.middleName = userData.middleName;
        this.lastName = userData.lastName;
        this.dateOfBirth = userData.dateOfBirth;
        this.email = userData.email;
        this.password = userData.password;
        this.googleId = userData.googleId;
        this.githubId = userData.githubId;
        this.spotifyId = userData.spotifyId;
        this.spotifyAccessToken = userData.spotifyAccessToken;
        this.spotifyRefreshToken = userData.spotifyRefreshToken;
        this.spotifyTokenExpires = userData.spotifyTokenExpires;
        this.spotifyProfile = userData.spotifyProfile;
        this.avatarUrl = userData.avatarUrl;
        this.username = userData.username;
        this.createdAt = userData.createdAt || new Date().toISOString();
        this.updatedAt = userData.updatedAt || new Date().toISOString();
    }

    // Hash password before saving
    async hashPassword() {
        if (this.password) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        // Clean up null provider IDs
        if (this.googleId === null) this.googleId = undefined;
        if (this.githubId === null) this.githubId = undefined;
        if (this.spotifyId === null) this.spotifyId = undefined;
    }

    // Compare password
    async comparePassword(password) {
        return bcrypt.compare(password, this.password);
    }

    // Save user to DynamoDB
    async save() {
        this.updatedAt = new Date().toISOString();
        
        const params = {
            TableName: 'Users',
            Item: {
                id: this.id,
                firstName: this.firstName,
                middleName: this.middleName,
                lastName: this.lastName,
                dateOfBirth: this.dateOfBirth,
                email: this.email,
                password: this.password,
                googleId: this.googleId,
                githubId: this.githubId,
                spotifyId: this.spotifyId,
                spotifyAccessToken: this.spotifyAccessToken,
                spotifyRefreshToken: this.spotifyRefreshToken,
                spotifyTokenExpires: this.spotifyTokenExpires,
                spotifyProfile: this.spotifyProfile,
                avatarUrl: this.avatarUrl,
                username: this.username,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt
            }
        };

        // Remove undefined values
        Object.keys(params.Item).forEach(key => {
            if (params.Item[key] === undefined) {
                delete params.Item[key];
            }
        });

        try {
            await dynamodb.put(params).promise();
            return this;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    // Clear Spotify data without setting to null (removes attributes entirely)
    clearSpotifyData() {
        delete this.spotifyId;
        delete this.spotifyAccessToken;
        delete this.spotifyRefreshToken;
        delete this.spotifyTokenExpires;
        delete this.spotifyProfile;
    }

    // Static methods for database operations
    static async findById(id) {
        const params = {
            TableName: 'Users',
            Key: { id }
        };

        try {
            const result = await dynamodb.get(params).promise();
            if (result.Item) {
                const user = new User(result.Item);
                user._id = result.Item.id; // Ensure _id is set correctly
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async findOne(query) {
        let params;

        if (query.email) {
            // Search by email using GSI
            params = {
                TableName: 'Users',
                IndexName: 'EmailIndex',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':email': query.email
                }
            };
        } else if (query.googleId) {
            // Search by googleId using GSI
            params = {
                TableName: 'Users',
                IndexName: 'GoogleIdIndex',
                KeyConditionExpression: 'googleId = :googleId',
                ExpressionAttributeValues: {
                    ':googleId': query.googleId
                }
            };
        } else if (query.githubId) {
            // Search by githubId using GSI
            params = {
                TableName: 'Users',
                IndexName: 'GitHubIdIndex',
                KeyConditionExpression: 'githubId = :githubId',
                ExpressionAttributeValues: {
                    ':githubId': query.githubId
                }
            };
        } else if (query.spotifyId) {
            // Search by spotifyId using GSI
            params = {
                TableName: 'Users',
                IndexName: 'SpotifyIdIndex',
                KeyConditionExpression: 'spotifyId = :spotifyId',
                ExpressionAttributeValues: {
                    ':spotifyId': query.spotifyId
                }
            };
        } else if (query.$or) {
            // Handle $or queries (like spotifyId OR email)
            for (const condition of query.$or) {
                if (condition.spotifyId) {
                    const user = await User.findOne({ spotifyId: condition.spotifyId });
                    if (user) return user;
                }
                if (condition.email) {
                    const user = await User.findOne({ email: condition.email });
                    if (user) return user;
                }
            }
            return null;
        } else {
            throw new Error('Unsupported query format');
        }

        try {
            const result = await dynamodb.query(params).promise();
            if (result.Items && result.Items.length > 0) {
                const user = new User(result.Items[0]);
                user._id = result.Items[0].id; // Ensure _id is set correctly
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async create(userData) {
        const user = new User(userData);
        await user.hashPassword();
        return await user.save();
    }
}

module.exports = { User };