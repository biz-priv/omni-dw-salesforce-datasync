const get = require('lodash.get');
const AWS = require('aws-sdk');
const { log } = require('../shared/utils/logger');
const { SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });
const moment = require('moment');

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
      // maxResults: 100
    };

    const data = await stepfunctions.listMapRuns(params).promise();                    //Getting 1st mapRunArn using executionArn
    const mapRunArns = data.mapRuns.map(run => get(run, 'mapRunArn'));
    log.INFO(functionName, "mapRunArns" + mapRunArns);

    const mapRunArn = mapRunArns[0];
    // const maxResults = 30;
    // const statusFilter = "SUCCEEDED";

    const executionsData = await stepfunctions.listExecutions({                      // Gets all the Execution of 1st mapRunArn
      mapRunArn: mapRunArn,
      // maxResults: maxResults,
      // statusFilter: statusFilter
    }).promise();

    const executionArns = executionsData.executions.map(execution => execution.executionArn);              //From the executions making a array of executionArn from executionsData
    log.INFO(functionName, "Execution ARNs:" + executionArns);

    const executionMapRunArns = [];

    for (const executionArn of executionArns) {
      const executionParams = { executionArn };

      const executionData = await stepfunctions.listMapRuns(executionParams).promise();
      const mapRunArn = executionData.mapRuns.map(run => get(run, 'mapRunArn'));                 // for each executionArn we are getting mapRunArn's
      if (mapRunArn) {
        executionMapRunArns.push(mapRunArn[0]);
      }
    }

    log.INFO(functionName, "Execution MapRun ARNs:" +  executionMapRunArns);

    let succeeded = 0;
    let failed = 0;


    for (const executionMapRunArn of executionMapRunArns) {
      const mapRunArnparams = { mapRunArn: executionMapRunArn };

      const data = await stepfunctions.describeMapRun(mapRunArnparams).promise();                                // Getting data of mapRunArn's like succeeded,failed,running,pending
      succeeded += get(data, 'executionCounts.succeeded', 0);
      failed += get(data, 'executionCounts.failed', 0);
    }

    log.INFO(functionName, "Values, to sent in mail " + " succeeded: " + succeeded + " failed: " + failed );

    const today = moment().format('YYYY-MM-DD');
    // const snsparams = {                                                                                         // Sending mail to Support Team.
    //   Message: `Hi Team, \n This Report is for salesforce \n Step Function Name: ${stepFunctionName} \n Total number of records loded to s3: ${dataLoadedToS3Count} \n Total number of records succeeded: ${succeeded} \n Total number of records failed: ${failed}, \n `,
    //   Subject: `Salesforce Report - ${today}`,
    //   TopicArn: SNS_TOPIC_ARN,
    // };
    // await sns.publish(snsparams).promise();
    const snsparams = {
      Message: `
          <html>
              <body>
                  <h2>Hi Team,</h2>
                  <p>This Report is for Salesforce Datasync Job:</p>
                  <ul>
                      <li><strong>Step Function Name:</strong> ${stepFunctionName}</li>
                      <li><strong>Total number of records processed:</strong> ${dataLoadedToS3Count}</li>
                      <li><strong>Number of successful records:</strong> ${succeeded}</li>
                      <li><strong>Number of failed records:</strong> ${failed}</li>
                  </ul>
              </body>
          </html>
      `,
      Subject: `Salesforce Report - ${today}`,
      TopicArn: SNS_TOPIC_ARN,
  };
  
  await sns.publish(snsparams).promise();

    return { message: "Reports Sent Successfully. " };
  } catch (error) {
    console.error("Error while sending reports: ",error, error.stack);
    log.ERROR(functionName, "Error while sending reports: " + error + error.stack, 500);
    throw error;
  }
};