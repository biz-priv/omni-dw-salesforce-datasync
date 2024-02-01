const get = require('lodash.get');
const { moveS3ObjectToArchive } = require('../shared/s3/index');
const { log } = require('../shared/utils/logger');

let functionName = ""
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    // console.info("Event:", JSON.stringify(event));
    log.INFO(functionName, "Event:" + JSON.stringify(event))
    if(get(event, 'Payload.Key', null )){
        await moveS3ObjectToArchive(process.env.S3_BUCKET_NAME, get(event, 'Payload.Key'));
        return { message: "File Archived" };
    } else {
        // console.info("No File")
        log.INFO(functionName, "No File")
        return { message: "No File" };
    }
};