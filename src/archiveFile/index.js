const get = require('lodash.get');
const { moveS3ObjectToArchive } = require('../shared/s3/index');

module.exports.handler = async (event) => {
    console.info("Event:", JSON.stringify(event));
    if(get(event, 'Payload.Key', null )){
        await moveS3ObjectToArchive(process.env.S3_BUCKET_NAME, get(event, 'Payload.Key'));
        return { message: "File Archived" };
    } else {
        console.info("No File")
        return { message: "No File" };
    }
};