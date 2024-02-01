const get = require('lodash.get');
const { generateAccessToken } = require('../shared/helper/generateAccessToken');
const { log } = require('../shared/utils/logger');

let functionName = ""
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    try {
        // console.info("Event:", JSON.stringify(event));
        log.INFO(functionName, "Event:" + JSON.stringify(event))
        return {
            Key: get(event, 'Key'),
            Bucket: process.env.S3_BUCKET_NAME,
            Token: await generateAccessToken(process.env.TOKEN_BASE_URL, functionName)
        };
    } catch(e){
        console.error('Error', JSON.stringify(e))
        log.ERROR(functionName, "Error" + JSON.stringify(e),500)
        throw e;
    }
};