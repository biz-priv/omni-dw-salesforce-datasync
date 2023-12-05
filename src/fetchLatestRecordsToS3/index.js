const { Client } = require("pg");
const { getLatestTimestampFromSSM, updateLatestTimestampToSSM } = require("../shared/ssm/index");
const get = require('lodash.get');
const { startXlsxS3Process} = require('../shared/s3/index');
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });

const s3BucketName = process.env.S3_BUCKET_NAME;
const s3Path = 'liveData';

module.exports.handler = async (event) => {
    console.info("Event: \n", JSON.stringify(event));
    try {
        if(get(event, 'Payload.type', null) === 'RetryAllErrors'){
          await retrieveFailedRecords();
        } else {
            const defaultTime = new Date(Date.now() - 46800 * 1000).toISOString();
            const lastProcessedTime = get(await getLatestTimestampFromSSM(), 'Parameter.Value', defaultTime);
            const queryTime = (lastProcessedTime.replace("T", " ")).replace("Z", "");
            const result = await handleDBOperation(queryTime);
            if (result.length > 0) {
                await startXlsxS3Process(s3BucketName, result, s3Path);
                await updateLatestTimestampToSSM(new Date().toISOString());
                return { message: "Data Loaded To S3", recordsCount: result.length };
            } else {
                console.info("No Records Found");
                await updateLatestTimestampToSSM(new Date().toISOString());
                return { message: "No Records Found", recordsCount: 0 };
            }
        }
    } catch (error) {
        console.error("Error : \n", JSON.stringify(error));
        throw error;
    }
};

async function handleDBOperation(queryTime) {
    console.info('Executing the query for new Records after : ' + queryTime);
    const client = new Client({
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    await client.connect();
    let sqlQuery = `select * from datamart.sf_sales_summary where (load_create_date >= '${queryTime}' or load_update_date >= '${queryTime}')`;
    console.info('Sql Query : ', sqlQuery);
    let dbResponse = await client.query(sqlQuery);
    let result = dbResponse.rows;
    await client.end();
    console.info("Redshift response length : ", result.length);
    return result;
}

async function retrieveFailedRecords() {
  try {
    const tableName = process.env.DATASYNC_DYNAMO_TABLE_NAME;
    let lastEvaluatedKey = null;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      const scanParams = {
        TableName: tableName,
        Limit: 300,
        ExclusiveStartKey: lastEvaluatedKey,
        FilterExpression: '#statusAlias = :statusValue',
        ExpressionAttributeNames: {
          '#statusAlias': 'status',
        },
        ExpressionAttributeValues: {
          ':statusValue': 'Failed',
        }
      };

      const scanResult = await dynamoDB.scan(scanParams).promise();
      if ((get(scanResult, 'Items')).length > 0 && get(scanResult, 'LastEvaluatedKey')) {
        console.log('Retrieved records:', get(scanResult, 'Items'));
        console.log('LastEvaluatedKey:', get(scanResult, 'LastEvaluatedKey'));
        lastEvaluatedKey = get(scanResult, 'LastEvaluatedKey', null);
        await startXlsxS3Process(s3BucketName, get(scanResult, 'Items'), s3Path);
        return { message: 'Data Loaded To S3', recordsCount: get(scanResult, 'Items').length };
      } else {
        hasMoreRecords = false;
      }
    }
    console.log('All failed records have been retrieved from DynamoDB.');
  } catch (error) {
    console.error('Error:', error);
  }
}
