const { Client } = require("pg");
const { getLatestTimestampFromSSM, updateLatestTimestampToSSM } = require("../shared/ssm/index");
const get = require('lodash.get');
const { startXlsxS3Process} = require('../shared/s3/index');
const AWS = require('aws-sdk');
const { log } = require("../shared/utils/logger");
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });

const s3BucketName = process.env.S3_BUCKET_NAME;
const s3Path = 'liveData';

let functionName = "";
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    log.INFO(functionName, "Event: \n" + JSON.stringify(event));
    try {
        if(get(event, 'Payload.type', null) === 'RetryAllErrors'){
          await retrieveFailedRecords(functionName);
        } else {
            const defaultTime = new Date(Date.now() - 46800 * 1000).toISOString();
            const lastProcessedTime = get(await getLatestTimestampFromSSM(functionName), 'Parameter.Value', defaultTime);
            const queryTime = (lastProcessedTime.replace("T", " ")).replace("Z", "");
            const result = await handleDBOperation(queryTime, functionName);
            if (result.length > 0) {
                await startXlsxS3Process(s3BucketName, result, s3Path, functionName);
                await updateLatestTimestampToSSM(new Date().toISOString(), functionName);
                return { message: "Data Loaded To S3", recordsCount: result.length };
            } else {
                log.INFO(functionName, "No Records Found");
                await updateLatestTimestampToSSM(new Date().toISOString(), functionName);
                return { message: "No Records Found", recordsCount: 0 };
            }
        }
    } catch (error) {
        console.error("Error : \n", JSON.stringify(error));
        log.ERROR(functionName, "Error : \n" + JSON.stringify(error), 500);
        throw error;
    }
};

async function handleDBOperation(queryTime, functionName) {
    log.INFO(functionName, "Executing the query for new Records after : " + queryTime);
    const client = new Client({
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    await client.connect();
    let sqlQuery = `select * from datamart.sf_sales_summary where (load_create_date >= '${queryTime}' or load_update_date >= '${queryTime}')`;
    log.INFO(functionName, "Sql Query : " + sqlQuery);
    let dbResponse = await client.query(sqlQuery);
    let result = dbResponse.rows;
    await client.end();
    log.INFO(functionName, "Redshift response length : " + result.length);
    return result;
}

async function retrieveFailedRecords(functionName) {
  try {
    const tableName = process.env.DATASYNC_DYNAMO_TABLE_NAME;
    let lastEvaluatedKey = null;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      const queryParams = {
        TableName: tableName,
        IndexName: 'status-createdTime-index',
        KeyConditionExpression: '#statusAlias = :statusValue',
        ExpressionAttributeNames: {
          '#statusAlias': 'status',
        },
        ExpressionAttributeValues: {
          ':statusValue': 'Failed',
        },
        Limit: 300,
        ExclusiveStartKey: lastEvaluatedKey,
      };
  
      const queryResult = await dynamoDB.query(queryParams).promise();  
      if ((get(queryResult, 'Items')).length > 0) {
        log.INFO(functionName, "Retrieved records:" + get(queryResult, 'Items'));
        log.INFO(functionName, "LastEvaluatedKey:" + get(queryResult, 'LastEvaluatedKey'));
        await startXlsxS3Process(s3BucketName, get(queryResult, 'Items'), s3Path, functionName);
        lastEvaluatedKey = get(queryResult, 'LastEvaluatedKey', null);
        hasMoreRecords = !!lastEvaluatedKey;
      } else {
        hasMoreRecords = false;
      }
    }
    log.INFO(functionName, "All failed records have been retrieved from DynamoDB.");
  } catch (error) {
    log.ERROR(functionName, "Error: " + error, 500);
  }
}
