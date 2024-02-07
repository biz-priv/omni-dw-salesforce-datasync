const get = require('lodash.get');
const AWS = require('aws-sdk');
const { log } = require('../shared/utils/logger');
const {SNS_TOPIC_ARN } = process.env;
const sns = new AWS.SNS({ region: process.env.REGION });

let functionName = "";
module.exports.handler = async (event, context) => {
  functionName = context.functionName;
  log.INFO(functionName, "Event:" + JSON.stringify(event));

  try {
    const stepfunctions = new AWS.StepFunctions();

    const params = {
      executionArn: 'arn:aws:states:us-east-1:332281781429:execution:salesforce-datasync-state-machine-prod:4efd6de4-7a06-5bdd-d8d0-1c7e9b9cdc85_9d11f9b6-2af2-0503-b9df-a13a8c8ece06',
      maxResults: 100
    };
    let mapRunArns;
    try {
      const data = await stepfunctions.listMapRuns(params).promise();
      console.info("data", data);

      // Extracting mapRunArns
      mapRunArns = data.mapRuns.map(run => get(run, 'mapRunArn'));
      console.info("mapRunArns", mapRunArns);

    } catch (err) {
      console.error(err, err.stack);
      throw err;
    }

    // const subparams = {
    //   mapRunArn: mapRunArns[0]
    // };

    // try {
    //   const data = await stepfunctions.describeMapRun(subparams).promise();
    //   console.info(data);
    // } catch (err) {
    //   console.error(err, err.stack);
    //   throw err;
    // }

    const mapRunArn = mapRunArns[0];
    const maxResults = 10;
    const statusFilter = "SUCCEEDED";

    try {
      // Parameters for listing executions
      const params = {
        mapRunArn: mapRunArn,
        maxResults: maxResults,
        statusFilter: statusFilter
      };

      const data = await stepfunctions.listExecutions(params).promise();

      console.log(data);

      // Extracting executionArns
      const executionArns = data.executions.map(execution => execution.executionArn);
      console.log("Execution ARNs:", executionArns);


      const executionMapRunArns = [];

      // Get mapRunArns for each execution
      if (executionArns) {
        for (const executionArn of executionArns) {
          const executionParams = {
            executionArn: executionArn
          };
          try {
            const executionData = await stepfunctions.listMapRuns(executionParams).promise();
            const mapRunArn = executionData.mapRuns.map(run => get(run, 'mapRunArn'));
            if (mapRunArn) {
              executionMapRunArns.push(mapRunArn[0]);
            }
          } catch (err) {
            console.error(err, err.stack);
          }
        }
      }

      console.log("Execution MapRun ARNs:", executionMapRunArns);

      let succeeded = 0;
      let failed = 0;
      let running = 0;
      let pending = 0;

      for (const executionMapRunArn of executionMapRunArns) {
        const subparams = {
          mapRunArn: executionMapRunArn
        };

        try {
          const data = await stepfunctions.describeMapRun(subparams).promise();
          succeeded += data.executionCounts.succeeded || 0;
          failed += data.executionCounts.failed || 0;
          running += data.executionCounts.running || 0;
          pending += data.executionCounts.pending || 0;
          // console.info(data);
        } catch (err) {
          console.error(err, err.stack);
          throw err;
        }
      }

      console.log("mail", succeeded, failed, running, pending);
      const snsparams = {
        // Message: `Error in ${context.functionName}, Error: ${error.message}`,
        Message: `Total number of records succeeded: ${succeeded} \n Total number of records failed: ${failed}, \n Total number of records running: ${running} \n Total number of records pending: ${pending} \n This is a test test ticket \n Please ignore.`,
        TopicArn: SNS_TOPIC_ARN,
      };
      await sns.publish(snsparams).promise();


    } catch (error) {
      // Log and return error
      console.error(error, error.stack);
      throw error;
    }
  } catch (e) {
    console.error('Error', JSON.stringify(e));
    log.ERROR(functionName, "Error" + JSON.stringify(e), 500);
    throw e;
  }
};