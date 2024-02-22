const get = require('lodash.get');
const AWS = require('aws-sdk');
const { log } = require('../shared/utils/logger');
const { SNS_TOPIC_ARN_FAILURE, SNS_TOPIC_ARN_SUCCESS } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });
const moment = require('moment');

let functionName = "";

module.exports.handler = async (event, context) => {
  functionName = context.functionName;
  const executionArn = get(event, "executionArn");
  const dataLoadedToS3Count = get(event, "dataLoadedToS3");

  // Check if executionArn is missing
  if (!executionArn) {
    console.error("executionArn is missing or undefined");
    return { message: "ExecutionArn is missing or undefined." };
  }

  const stepFunctionName = executionArn.split(":")[6];
  log.INFO(functionName, "Event:" + JSON.stringify(event));

  try {
    const stepfunctions = new AWS.StepFunctions();

    const params = {
      executionArn
    };

    const data = await stepfunctions.listMapRuns(params).promise();
    const mapRunArns = data.mapRuns.map(run => get(run, 'mapRunArn'));
    log.INFO(functionName, "mapRunArns" + mapRunArns);

    const mapRunArn = mapRunArns[0];

    const executionsData = await stepfunctions.listExecutions({
      mapRunArn: mapRunArn,
    }).promise();

    const executionArns = executionsData.executions.map(execution => execution.executionArn);
    log.INFO(functionName, "Execution ARNs:" + executionArns);

    const executionMapRunArns = [];

    for (const executionArn of executionArns) {
      const executionParams = { executionArn };

      const executionData = await stepfunctions.listMapRuns(executionParams).promise();
      const mapRunArn = executionData.mapRuns.map(run => get(run, 'mapRunArn'));
      if (mapRunArn) {
        executionMapRunArns.push(mapRunArn[0]);
      }
    }

    log.INFO(functionName, "Execution MapRun ARNs:" +  executionMapRunArns);

    let succeeded = 0;
    let failed = 0;

    for (const executionMapRunArn of executionMapRunArns) {
      const mapRunArnparams = { mapRunArn: executionMapRunArn };

      const data = await stepfunctions.describeMapRun(mapRunArnparams).promise();
      succeeded += get(data, 'executionCounts.succeeded', 0);
      failed += get(data, 'executionCounts.failed', 0);
    }

    log.INFO(functionName, "Values, to sent in mail " + " succeeded: " + succeeded + " failed: " + failed );

    const today = moment().format('YYYY-MM-DD');
    let snsTopicArn;

    if (failed === 0) {
      snsTopicArn = SNS_TOPIC_ARN_SUCCESS;
    } else {
      snsTopicArn = SNS_TOPIC_ARN_FAILURE;
    }

    const snsparams = {
      Message: `Hi Team, \n This Report is for Salesforce Datasync Job: \n Step Function Name: ${stepFunctionName} \n Total number of records processed: ${dataLoadedToS3Count} \n Number of successful records : ${succeeded} \n Number of failed records: ${failed}, \n `,
      Subject: `Salesforce Report - ${today}`,
      TopicArn: snsTopicArn,
    };

    await sns.publish(snsparams).promise();

    return { message: "Reports Sent Successfully. " };
  } catch (error) {
    console.error("Error while sending reports: ", error, error.stack);
    log.ERROR(functionName, "Error while sending reports: " + error + error.stack, 500);
    throw error;
  }
};
