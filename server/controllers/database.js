const AWS = require('aws-sdk');

const configureAWS = () => {
    const config = {
        region: process.env.AWS_REGION || 'eu-north-1'
    };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    }

    AWS.config.update(config);
};

const DynamoDB = async () => {
    try {
        configureAWS();

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error('AWS credentials not found in environment variables. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
        }

        const dynamodb = new AWS.DynamoDB();
        
        const tables = await dynamodb.listTables().promise();
        console.log('Connected to DynamoDB, tables:', tables.TableNames);
        
        return dynamodb;
    } catch (err) {
        console.error('DynamoDB connection error:', err.message);
        
        if (err.message.includes('credential') || err.message.includes('AWS_ACCESS_KEY_ID')) {
            console.error('Please ensure your AWS credentials are properly configured in your .env file:');
            console.error('AWS_ACCESS_KEY_ID=your_access_key_id');
            console.error('AWS_SECRET_ACCESS_KEY=your_secret_access_key');
            console.error('AWS_REGION=your_region (optional, defaults to eu-north-1)');
        }
        
        throw err;
    }
};

module.exports = { DynamoDB };