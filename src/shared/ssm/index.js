const AWS = require('aws-sdk');
const { log } = require('../utils/logger');
const ssm = new AWS.SSM();

AWS.config.update({ region: 'us-east-1' });

async function getLatestTimestampFromSSM(timestamp,functionName) {
    try {
        let ssmOptions = {
            Name: process.env.TIMESTAMP_SSM_PARAMETER,
            WithDecryption: false
        };
        timestamp = await ssm.getParameter(ssmOptions).promise();
        return timestamp;
    } catch (error) {
        log.ERROR(functionName, "Get Timestamp Error : \n" +  error, 500);
        return error;
    }
}

async function updateLatestTimestampToSSM(timestamp, functionName) {
    try {
        let params = {
            Name: process.env.TIMESTAMP_SSM_PARAMETER,
            Value: timestamp,
            Overwrite: true,
            Type: 'String'
        };
        let updateTimestamp = await ssm.putParameter(params).promise();
        return true;
    } catch (error) {
        log.ERROR(functionName, "Put Timestamp Error : \n" + error, 500);
        return error;
    }
}


module.exports = { getLatestTimestampFromSSM, updateLatestTimestampToSSM }