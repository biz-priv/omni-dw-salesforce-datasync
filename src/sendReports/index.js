const get = require('lodash.get');
const AWS = require('aws-sdk');
const { log } = require('../shared/utils/logger');

let functionName = "";
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    log.INFO(functionName, "Event:" + JSON.stringify(event));

    const stepfunctions = new AWS.StepFunctions();

    const params = {
        mapRunArn: 'arn:aws:states:us-east-1:332281781429:mapRun:salesforce-datasync-state-machine-prod/S3objectkeys:789e4e6a-a950-4e17-b9c8-3054c9704d33' 
      };
      
      try {
        const data = await stepfunctions.describeMapRun(params).promise();
        console.info(data); 
        return data;
      } catch (err) {
        console.error(err, err.stack); 
        throw err;
      }

};