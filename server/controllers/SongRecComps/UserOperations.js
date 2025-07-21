const AWS = require('aws-sdk');
const redisService = require('../../services/redisService');
require('dotenv').config();

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION
});

class UserOperations {
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
            if (updateData.spotifyAccessToken !== undefined) {
                const currentUser = await this.findUserById(userId);
                const refreshToken = updateData.spotifyRefreshToken !== undefined
                    ? updateData.spotifyRefreshToken
                    : currentUser?.spotifyRefreshToken;

                await redisService.updateSpotifyTokens(
                    userId,
                    updateData.spotifyAccessToken,
                    refreshToken
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
}

module.exports = { UserOperations };