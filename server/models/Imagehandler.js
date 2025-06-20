const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const EditedImage = {
    create: async (imageData) => {
        const params = {
            TableName: 'Images',
            Item: {
                imageId: require('crypto').randomUUID(),
                type: 'EditedImage',
                image: imageData.image,
                timestamp: imageData.timestamp
            }
        };
        await dynamoDB.put(params).promise();
        return params.Item;
    }
};

const UploadedImage = {
    create: async (imageData) => {
        const params = {
            TableName: 'Images',
            Item: {
                imageId: require('crypto').randomUUID(),
                type: 'UploadedImage',
                image: imageData.image,
                timestamp: imageData.timestamp
            }
        };
        await dynamoDB.put(params).promise();
        return params.Item;
    }
};

module.exports = { UploadedImage, EditedImage };