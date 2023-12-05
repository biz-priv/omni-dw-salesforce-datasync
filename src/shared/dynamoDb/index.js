const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });

/* insert record in table */
async function handleItems(tableName, record) {

  let params = {
    RequestItems: {
      [`${tableName}`]: record
    }
  }
  console.info("Inserting Records To dynamoDb : \n", params);
  try {
    return await documentClient.batchWrite(params).promise();
  } catch (e) {
    console.error("handleItems Error: ", e);
    return e;
  }
}

async function dbRead(params) {
  try {
    let result = await documentClient.scan(params).promise();
    let data = result.Items;
    if (result.LastEvaluatedKey) {
      params.ExclusiveStartKey = result.LastEvaluatedKey;
      data = data.concat(await dbRead(params));
    }
    return data;
  } catch (error) {
    console.info("Error In DbRead()", error);
    return error;
  }
}

/* retrieve all items from table */
async function scanTableData(tableName, status) {
  let params = {
    TableName: tableName,
    FilterExpression: 'api_insert_Status = :status',
    ExpressionAttributeValues: { ':status': status },
  };

  let data = await dbRead(params);
  return data;
}

async function queryRecordsFromDynamoDb(tableName, indexName, billToNumber){
  try {
    let params = { 
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: (indexName == "req_Bill_To_Number__c-index") ? 'req_Bill_To_Number__c = :billToNumber' : 'billToNumber = :billToNumber',
      ExpressionAttributeValues: { ':billToNumber': billToNumber} 
     }
    let result = await documentClient.query(params).promise();
    let data = result.Items;
    return data
  } catch (error) {
    console.error("Error In queryRecordsFromDynamoDb()", error);
    return error;
  }
}

async function insertRecord(tableName, record) {
  const params = {
    TableName: tableName,
    Item: {
      ...record,
      status: 'Processing',
    }
  };

  try {
    await documentClient.put(params).promise();
    console.log('Item inserted successfully');
  } catch (error) {
    console.error('Unable to insert item', error);
    throw error;
  }
};

async function getItem(tableName, id) {
  const params = {
    TableName: tableName,
    Key: { id }
  };
  console.info('Query Params:', params)
  try {
    let response = await documentClient.get(params).promise();
    console.log('Item retrieved successfully');
    return response;
  } catch (error) {
    console.error('Unable to retrieve item', error);
    throw error;
  }
};

async function updateRecordStatus(id, newStatus, errorMessage) {
  const params = {
    TableName: process.env.DATASYNC_DYNAMO_TABLE_NAME,
    Key: {
      id,
    },
    UpdateExpression: 'SET #status = :status, #errorMessage = :errorMessage, #lastUpdated = :lastUpdated',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#errorMessage': 'errorMessage',
      '#lastUpdated': 'lastUpdated'
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':errorMessage': JSON.stringify(errorMessage),
      ':lastUpdated': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };
  try {
    const result = await documentClient.update(params).promise();
    console.log('Item updated successfully:', result.Attributes);
    return result.Attributes;
  } catch (error) {
    console.error('Unable to update item', error);
    throw error;
  }
};

module.exports = { handleItems, scanTableData, getItem, queryRecordsFromDynamoDb, insertRecord, updateRecordStatus }