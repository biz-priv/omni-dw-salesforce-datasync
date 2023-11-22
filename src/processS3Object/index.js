const get = require('lodash.get');
const { generateAccessToken } = require('../shared/helper/generateAccessToken');

module.exports.handler = async (event) => {
    try {
        console.info("Event:", JSON.stringify(event));
        return {
            Key: get(event, 'Key'),
            Bucket: process.env.S3_BUCKET_NAME,
            Token: await generateAccessToken(process.env.TOKEN_BASE_URL)
        };
    } catch(e){
        console.error('Error', JSON.stringify(e))
        throw e;
    }
};