const get = require('lodash.get');
const AWS = require('aws-sdk');
const { log } = require('../shared/utils/logger');
const { SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });

let functionName = "";

module.exports.handler = async (event, context) => {
  functionName = context.functionName;
  const executionArn = get(event, "executionArn");                                          //Getting Current executionArn from event
  const dataLoadedToS3Count = get(event, "dataLoadedToS3")                           
  const stepFunctionName = executionArn.split(":")[6];
  log.INFO(functionName, "Event:" + JSON.stringify(event));

  try {
    const stepfunctions = new AWS.StepFunctions();

    const params = {
      executionArn,
      maxResults: 100
    };

    const data = await stepfunctions.listMapRuns(params).promise();                    //Getting 1st mapRunArn using executionArn
    const mapRunArns = data.mapRuns.map(run => get(run, 'mapRunArn'));
    log.INFO(functionName, "mapRunArns" + mapRunArns);

    const mapRunArn = mapRunArns[0];
    const maxResults = 30;
    const statusFilter = "SUCCEEDED";

    const executionsData = await stepfunctions.listExecutions({                      // Gets all the Execution of 1st mapRunArn
      mapRunArn: mapRunArn,
      maxResults: maxResults,
      statusFilter: statusFilter
    }).promise();

    const executionArns = executionsData.executions.map(execution => execution.executionArn);              //From the executions making a array of executionArn from executionsData
    console.log("Execution ARNs:", executionArns);

    const executionMapRunArns = [];

    for (const executionArn of executionArns) {
      const executionParams = { executionArn };

      const executionData = await stepfunctions.listMapRuns(executionParams).promise();
      const mapRunArn = executionData.mapRuns.map(run => get(run, 'mapRunArn'));                 // for each executionArn we are getting mapRunArn's
      if (mapRunArn) {
        executionMapRunArns.push(mapRunArn[0]);
      }
    }

    console.log("Execution MapRun ARNs:", executionMapRunArns);

    let succeeded = 0;
    let failed = 0;
    let running = 0;
    let pending = 0;

    for (const executionMapRunArn of executionMapRunArns) {
      const mapRunArnparams = { mapRunArn: executionMapRunArn };

      const data = await stepfunctions.describeMapRun(mapRunArnparams).promise();                                // Getting data of mapRunArn's like succeeded,failed,running,pending
      succeeded += get(data, 'executionCounts.succeeded', 0);
      failed += get(data, 'executionCounts.failed', 0);
      running += get(data, 'executionCounts.running', 0);
      pending += get(data, 'executionCounts.pending', 0);
    }

    console.log("mail", succeeded, failed, running, pending);
    const snsparams = {                                                                                         // Sending mail to Support Team.
      Message: `Hi Team, \n This Report is for salesforce \n Step Function Name: ${stepFunctionName} \n Total number of records loded to s3: ${dataLoadedToS3Count} \n Total number of records succeeded: ${succeeded} \n Total number of records failed: ${failed}, \n Total number of records running: ${running} \n Total number of records pending: ${pending} . \n `,
      TopicArn: SNS_TOPIC_ARN,
    };
    await sns.publish(snsparams).promise();

    return { message: "Reports Sent Successfully. " };
  } catch (error) {
    console.error("Error while sending reports: ",error, error.stack);
    throw error;
  }
};