const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.DEFAULT_AWS });
const { get } = require("lodash");

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

async function updateRecord(payload, newStatus, errorMessage,RecordCheckResponse) {
  const params = {
    TableName: process.env.DATASYNC_DYNAMO_TABLE_NAME,
    Key: {
      id: payload.id,
    },
    UpdateExpression: 'SET #status = :status, #errorMessage = :errorMessage, #lastUpdated = :lastUpdated, #billToCustomer = :billToCustomer, #parent = :parent, #country = :country, #controllingOnly = :controllingOnly, #year = :year, #city = :city, #controllingCustomerNumber = :controllingCustomerNumber, #division = :division, #loadUpdateDate = :loadUpdateDate, #isDeleted = :isDeleted, #sourceSystem = :sourceSystem, #controllingCustomer = :controllingCustomer, #state = :state, #totalCost = :totalCost, #profit = :profit, #owner = :owner, #zip = :zip, #accountManager = :accountManager, #addr1 = :addr1, #salesRep = :salesRep, #loadCreateDate = :loadCreateDate, #totalCharge = :totalCharge, #billToNumber = :billToNumber, #month = :month, #billtoOnly = :billtoOnly',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#errorMessage': 'errorMessage',
      '#lastUpdated': 'lastUpdated',
      '#billToCustomer': 'bill to customer',
      '#parent': 'parent',
      '#country': 'country',
      '#controllingOnly': 'controlling only',
      '#year': 'year',
      '#city': 'city',
      '#controllingCustomerNumber': 'cntrolling customer number',
      '#division': 'division',
      '#loadUpdateDate': 'load_update_date',
      '#isDeleted': 'is_deleted',
      '#sourceSystem': 'source system',
      '#controllingCustomer': 'cntrolling customer',
      '#state': 'state',
      '#totalCost': 'total cost',
      '#profit': 'profit',
      '#owner': 'owner',
      '#zip': 'zip',
      '#accountManager': 'account manager',
      '#addr1': 'addr1',
      '#salesRep': 'sales rep',
      '#loadCreateDate': 'load_create_date',
      '#totalCharge': 'total charge',
      '#billToNumber': 'bill to number',
      '#month': 'month',
      '#billtoOnly': 'billto only'
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':errorMessage': JSON.stringify(errorMessage),
      ':lastUpdated': new Date().toISOString(),
      ':billToCustomer': payload['bill to customer'],
      ':parent': payload['parent'],
      ':country': payload['country'],
      ':controllingOnly': payload['controlling only'],
      ':year': payload['year'],
      ':city': payload['city'],
      ':controllingCustomerNumber': payload['cntrolling customer number'],
      ':division': payload['division'],
      ':loadUpdateDate': payload['load_update_date'],
      ':isDeleted': payload['is_deleted'],
      ':sourceSystem': payload['source system'],
      ':controllingCustomer': payload['cntrolling customer'],
      ':state': payload['state'],
      ':totalCost': payload['total cost'],
      ':profit': payload['profit'],
      ':owner': payload['owner'],
      ':zip': get(RecordCheckResponse, 'parent', null),
      ':accountManager': payload['account manager'],
      ':addr1': payload['addr1'],
      ':salesRep': payload['sales rep'],
      ':loadCreateDate': payload['load_create_date'],
      ':totalCharge': payload['total charge'],
      ':billToNumber': payload['bill to number'],
      ':month': payload['month'],
      ':billtoOnly': payload['billto only']
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

module.exports = { handleItems, scanTableData, getItem, queryRecordsFromDynamoDb, insertRecord, updateRecord, updateRecordStatus }