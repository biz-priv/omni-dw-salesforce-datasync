/*
* File: src\archiveFile\index.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-06-02
* Confidential and Proprietary
*/
const get = require('lodash.get');
const { moveS3ObjectToArchive } = require('../shared/s3/index');
const { log } = require('../shared/utils/logger');

let functionName = "";
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    log.INFO(functionName, "Event:" + JSON.stringify(event));
    if(get(event, 'Payload.Key', null )){
        await moveS3ObjectToArchive(process.env.S3_BUCKET_NAME, get(event, 'Payload.Key'), functionName);
        return { message: "File Archived" };
    } else {
        log.INFO(functionName, "No File");
        return { message: "No File" };
    }
};