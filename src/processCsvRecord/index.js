const Dynamo = require("../shared/dynamoDb/index");
const get = require('lodash.get');
const set = require('lodash.set');
const { insertRecord, updateRecordStatus, getItem } = require("../shared/dynamoDb/index");
const { getOwnerID } = require('../shared/helper/getOwnerId');
const { createChildAccount } = require('../shared/helper/handleCreateChildAccount');
const { createParentAccount } = require('../shared/helper/handleCreateParentAccount');
const { upsertSalesForecastDetails, fetchSalesForecastRecordIdByPatch } = require('../shared/helper/handleSaleForcastDetail');
const { log } = require("../shared/utils/logger");

const PARENT_ACCOUNT_RECORD_TYPE_ID = process.env.PARENT_RECORDS_TYPE_ID;
const CHILD_ACCOUNT_RECORD_TYPE_ID = process.env.CHILD_RECORD_TYPE_ID;
const PARENT_ACCOUNT_TABLE = process.env.PARENT_ACCOUNT_DYNAMO_TABLE;
const CHILD_ACCOUNT_TABLE = process.env.CHILD_ACCOUNT_DYNAMO_TABLE;
const SALE_FORECAST_TABLE = process.env.SALE_FORECAST_DYNAMO_TABLE;
let SALES_FORECAST_RECORD_ID_URL = "";
let UPSERT_SALES_FORECAST_DETAILS_BASE_URL = "";
let OWNER_USER_ID_BASE_URL = "";
let PARENT_ACCOUNT_BASE_URL = "";
let CHILD_ACCOUNT_BASE_URL = "";
let FETCH_CHILD_ACCOUNT_BASE_URL = "";

let alreadyProcessedBillToNumber = [];
let reProcessedRecords = [];
let alreadyProcessedRecords = [];

let accessToken = "";
let instanceUrl = "";
let sourceSystem = "";
let billToNumber = "";
let controllingCustomerNumber = "";
let controllingCustomerName = "";
let year = "";
let month = "";
let childName = "";
let totalCharge = "";
let totalCost = "";
let parentName = "";
let billingStreet = "";
let city = "";
let state = "";
let country = "";
let postalCode = "";
let owner = "";
let division__c = "";

let createdAt = new Date().toISOString();
let parentDataArr = [];
let childDataArr = [];
let forecastDetailsArr = [];

let parentReqNamesArr = [];
let childReqNamesArr = [];
let childParentIdsArr = [];
let forecastDetailsReqNamesArr = [];

let parentDataExcellArr = [];
let childDataExcellArr = [];
let forecastDataExcellArr = [];

let parentDataExcellObj = {};
let childDataExcellObj = {};
let forecastDataExcellObj = {};

let childType = "Customer";

let loopCount = 0;

async function processBillToNumberRecords(record, billToNumberForQueryInDynamoDb, functionName) {
    reProcessedRecords.push(record);
    // console.info('processing record : ', record)
    log.INFO(functionName, "processing record : " + record);
    owner = record['owner'] ? record['owner'] : "crm admin";
    billingStreet = record['addr1'] ? record['addr1'] : "Not Available";
    city = record['city'] ? record['city'] : "Not Available";
    state = record['state'] ? record['state'] : "Not Available";
    country = record['country'] ? record['country'] : "Not Available";
    postalCode = record['zip'] ? record['zip'] : "Not Available";
    parentName = record['parent'] ? record['parent'] : "Not Available";
    sourceSystem = record['source system'] ? record['source system'] : "Not Available";
    sourceSystem = sourceSystem.trim();
    billToNumber = record['bill to number'] ? record['bill to number'] : "Not Available";
    childName = record['bill to customer'] ? record['bill to customer'] : "Not Available";
    controllingCustomerNumber = record['cntrolling customer number'] ? record['cntrolling customer number'] : "Not Available";
    controllingCustomerName = record['cntrolling customer'] ? record['cntrolling customer'] : "Not Available";
    year = record['year'] ? record['year'] : "Not Available";
    month = record['month'] ? record['month'] : "Not Available";
    totalCharge = record['total charge'] ? record['total charge'] : "Not Available";
    totalCost = record['total cost'] ? record['total cost'] : "Not Available";
    division__c = record['division'] ? record['division'] : "Not Available";
    currentLoadCreateDate = record['load_create_date'] ? record['load_create_date'] : "Not Available";
    currentLoadUpdateDate = record['load_update_date'] ? record['load_update_date'] : "Not Available";

    /************************ Header's For API's ************************/
    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    };
    /************************ Create Parent Account ************************/
    const PARENT_ACCOUNT_PARAMS = {
        "Name": parentName,
        "RecordTypeId": PARENT_ACCOUNT_RECORD_TYPE_ID,
    }

    const PARENT_ACCOUNT_URL = PARENT_ACCOUNT_BASE_URL + parentName.replace(/\//g, '%2F').replace(/\\/g, '%5C').replace(/%/g, '%25');
    const [createParentRes, parentIdStatus] = await createParentAccount(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options, functionName);

    if (parentIdStatus == false) {
        let parentResData = createParentRes;
        createdAt = new Date().toISOString();
        let parentData = {
            PutRequest: {
                Item: {
                    req_Name: parentName,
                    req_record_type_id: PARENT_ACCOUNT_RECORD_TYPE_ID,
                    res_id: "Null",
                    res_data: parentResData,
                    api_insert_Status: false,
                    created_At: createdAt
                }
            }
        };

        if (!parentReqNamesArr.includes(parentName)) {
            parentReqNamesArr.push(parentName);
            parentDataArr.push(parentData);
        };

        parentDataExcellObj['Status'] = 'Failed'
        parentDataExcellObj['Request Params'] = JSON.stringify(PARENT_ACCOUNT_PARAMS);
        parentDataExcellObj['Response'] = JSON.stringify(parentResData);
        parentDataExcellArr.push(parentDataExcellObj);
    } else {
        let parentDataId = createParentRes['id'];
        let parentResData = createParentRes;

        createdAt = new Date().toISOString();

        let parentData = {
            PutRequest: {
                Item: {
                    req_Name: parentName,
                    req_record_type_id: PARENT_ACCOUNT_RECORD_TYPE_ID,
                    res_id: parentDataId,
                    res_data: parentResData,
                    api_insert_Status: true,
                    created_At: createdAt
                }
            }
        };

        if (!parentReqNamesArr.includes(parentName)) {
            parentReqNamesArr.push(parentName);
            parentDataArr.push(parentData);
        };

        /************************ Generating Owner Id ************************/

        const ownerId = await getOwnerID(OWNER_USER_ID_BASE_URL, options, owner, functionName);

        /************************ Creating Child Account ************************/
        const CHILD_ACCOUNT_URL = CHILD_ACCOUNT_BASE_URL + `${sourceSystem}-${division__c}-${billToNumber}-${controllingCustomerNumber}`;
        let childAccountBody = {
            "Name": childName,
            "Controlling_Customer_Name__c": controllingCustomerName,
            "Source_System__c": sourceSystem,
            "Division__c": division__c,
            "OwnerId": ownerId,
            "BillingStreet": billingStreet,
            "BillingCity": city,
            "BillingState": state,
            "BillingCountry": country,
            "BillingPostalCode": postalCode,
            "Bill_To_Only__c": true,
            "Controlling_Only__c": true,
            "Bill_To_Number__c": billToNumber,
            "Controlling_Number__c": controllingCustomerNumber,
            "ParentId": parentDataId,
            "Type": childType,
            "RecordTypeId": CHILD_ACCOUNT_RECORD_TYPE_ID
        };

        const [createChildAccountRes, createChildExecutionStatus] = await createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options, FETCH_CHILD_ACCOUNT_BASE_URL, functionName);
        let childDynamoData = {
            PutRequest: {
                Item: {
                    req_Name: childName,
                    req_Source_System__c: sourceSystem,
                    req_Division__c: division__c,
                    req_OwnerId: ownerId,
                    req_BillingStreet: billingStreet,
                    req_BillingCity: city,
                    req_BillingState: state,
                    req_BillingCountry: country,
                    req_BillingPostalCode: postalCode,
                    req_Bill_To_Only__c: true,
                    req_Controlling_Only__c: true,
                    req_Bill_To_Number__c: billToNumber,
                    req_Controlling_Number__c: controllingCustomerNumber,
                    req_Controlling_Customer_Name__c: controllingCustomerName,
                    req_Type: childType,
                    req_ParentId: parentDataId,
                    req_RecordTypeId: CHILD_ACCOUNT_RECORD_TYPE_ID,
                    res_child_account_id: "Null",
                    api_insert_Status: false,
                    created_At: createdAt
                }
            }
        };
        let customerUniqueId = `${sourceSystem}${division__c}${billToNumber}${controllingCustomerNumber}${year}${month}`;
        let saleForecastData = {
            PutRequest: {
                Item: {
                    unique_Record_ID: customerUniqueId,
                    sourceSystem: sourceSystem,
                    billToNumber: billToNumber,
                    controllingCustomerNumber: controllingCustomerNumber,
                    req_Name: `${childName} ${year} ${month}`,
                    req_ChildName: childName,
                    req_Year__c: year,
                    req_Month__c: month,
                    req_Date__c: `${year}-${month}-01`,
                    req_Total_Charge__c: totalCharge,
                    req_Total_Cost__c: totalCost,
                    req_Sales_Forecast__c: "Null",
                    res_Sale_Forcast_Id: "Null",
                    res_Forcast_Data: "Null",
                    api_insert_Status: false,
                    created_At: createdAt
                }
            }
        };
        if (createChildExecutionStatus != false) {
            childDynamoData = {
                PutRequest: {
                    Item: {
                        req_Name: childName,
                        req_Source_System__c: sourceSystem,
                        req_Division__c: division__c,
                        req_OwnerId: ownerId,
                        req_BillingStreet: billingStreet,
                        req_BillingCity: city,
                        req_BillingState: state,
                        req_BillingCountry: country,
                        req_BillingPostalCode: postalCode,
                        req_Bill_To_Only__c: true,
                        req_Controlling_Only__c: true,
                        req_Bill_To_Number__c: billToNumber,
                        req_Controlling_Number__c: controllingCustomerNumber,
                        req_Controlling_Customer_Name__c: controllingCustomerName,
                        req_Type: childType,
                        req_ParentId: parentDataId,
                        req_RecordTypeId: CHILD_ACCOUNT_RECORD_TYPE_ID,
                        res_child_account_id: createChildAccountRes,
                        api_insert_Status: true,
                        created_At: createdAt
                    }
                }
            }
            let selecselectedSaleForcastIdEndpoint = `${sourceSystem}${division__c}${billToNumber}${controllingCustomerNumber}${year}`;

            let fetchSalesForecastIdPatchBody = {
                "Name": childName + '-' + year,
                "Client__c": createChildAccountRes,
                "Year__c": year,
                "Bill_To_Number__c": billToNumber,
                "Controlling_Number__c": controllingCustomerNumber,
                "OwnerId": ownerId
            }
            /************************ Fetch Record Id ************************/
            const [selectedSaleForcastId, fetchSalesForecastIdStatus] = await fetchSalesForecastRecordIdByPatch(options, selecselectedSaleForcastIdEndpoint, SALES_FORECAST_RECORD_ID_URL, fetchSalesForecastIdPatchBody, functionName);
            if (fetchSalesForecastIdStatus != false) {
                /************************ Upsert Sales Forecast Record ************************/
                const [upsertSalesForecastDetail, upsertForecastStatus, upsertForecastPayload] = await upsertSalesForecastDetails(options, customerUniqueId, childName, year, month, totalCharge, totalCost, selectedSaleForcastId, UPSERT_SALES_FORECAST_DETAILS_BASE_URL, functionName);
                if (upsertForecastStatus != false) {
                    saleForecastData = {
                        PutRequest: {
                            Item: {
                                unique_Record_ID: customerUniqueId,
                                sourceSystem: sourceSystem,
                                billToNumber: billToNumber,
                                controllingCustomerNumber: controllingCustomerNumber,
                                req_Name: `${childName} ${year} ${month}`,
                                req_ChildName: childName,
                                req_Year__c: year,
                                req_Month__c: month,
                                req_Date__c: `${year}-${month}-01`,
                                req_Total_Charge__c: totalCharge,
                                req_Total_Cost__c: totalCost,
                                req_Sales_Forecast__c: selectedSaleForcastId,
                                req_Child_Account_Id: createChildAccountRes,
                                req_Owner_Id: ownerId,
                                res_Sale_Forcast_Id: upsertSalesForecastDetail.id,
                                res_Forcast_Data: upsertSalesForecastDetail,
                                api_insert_Status: true,
                                created_At: createdAt
                            }
                        }
                    }
                    parentDataExcellObj = {};
                    childDataExcellObj = {};
                    forecastDataExcellObj = {};
                } else {
                    saleForecastData = {
                        PutRequest: {
                            Item: {
                                unique_Record_ID: customerUniqueId,
                                sourceSystem: sourceSystem,
                                billToNumber: billToNumber,
                                controllingCustomerNumber: controllingCustomerNumber,
                                req_Name: `${childName} ${year} ${month}`,
                                req_ChildName: childName,
                                req_Year__c: year,
                                req_Month__c: month,
                                req_Date__c: `${year}-${month}-01`,
                                req_Total_Charge__c: totalCharge,
                                req_Total_Cost__c: totalCost,
                                req_Sales_Forecast__c: selectedSaleForcastId,
                                req_Child_Account_Id: createChildAccountRes,
                                req_Owner_Id: ownerId,
                                res_Forcast_Data: upsertSalesForecastDetail,
                                api_insert_Status: false,
                                created_At: createdAt
                            }
                        }
                    };

                    forecastDataExcellObj['Status'] = "Failed";
                    forecastDataExcellObj['Request Params'] = JSON.stringify(upsertForecastPayload);
                    forecastDataExcellObj['Response'] = upsertSalesForecastDetail;
                    forecastDataExcellArr.push(forecastDataExcellObj);

                    // console.info("Line 401 ==> Unable to send Forecast Detail Payload : " + JSON.stringify(saleForecastData));
                    log.INFO(functionName, "Line 401 ==> Unable to send Forecast Detail Payload : " + JSON.stringify(saleForecastData))
                }
            } else {
                forecastDataExcellObj['Status'] = "Failed";
                forecastDataExcellObj['Request Params'] = JSON.stringify({
                    unique_Record_ID: customerUniqueId,
                    sourceSystem: sourceSystem,
                    billToNumber: billToNumber,
                    controllingCustomerNumber: controllingCustomerNumber,
                    req_Name: `${childName} ${year} ${month}`,
                    req_Year__c: year,
                    req_Month__c: month,
                    req_Date__c: `${year}-${month}-01`,
                    req_Total_Charge__c: totalCharge,
                    req_Total_Cost__c: totalCost,
                    api_insert_Status: false,
                    created_At: createdAt
                });
                forecastDataExcellObj['Response'] = selectedSaleForcastId;
                forecastDataExcellArr.push(forecastDataExcellObj);

                // console.info("Line 423 ==>Unable to send Forecast Detail Payload : " + JSON.stringify(saleForecastData));
                log.INFO(functionName, "Line 423 ==>Unable to send Forecast Detail Payload : " + JSON.stringify(saleForecastData))
            }
        }
        else {
            childDataExcellObj['Status'] = "Failed";
            childDataExcellObj['Request Params'] = JSON.stringify(childAccountBody);
            childDataExcellObj['Response'] = createChildAccountRes;
            childDataExcellArr.push(childDataExcellObj);
        }

        if (!childReqNamesArr.includes(childName) && !childParentIdsArr.includes(parentDataId)) {
            childDataArr.push(childDynamoData);
            childReqNamesArr.push(childName);
            childParentIdsArr.push(parentDataId);
        }

        if (!forecastDetailsReqNamesArr.includes(`${sourceSystem}${division__c}${billToNumber}${controllingCustomerNumber}${year}${month}`)) {
            forecastDetailsArr.push(saleForecastData);
            forecastDetailsReqNamesArr.push(`${sourceSystem}${division__c}${billToNumber}${controllingCustomerNumber}${year}${month}`);
        }
        /************************ Inserting Parent Records To DynamoDB ************************/
        if (parentDataArr.length >= 20) {
            await Dynamo.handleItems(PARENT_ACCOUNT_TABLE, parentDataArr);
            parentDataArr = [];
            parentReqNamesArr = [];
        }
        /************************ Inserting Child Records To DynamoDB ************************/
        if (childDataArr.length >= 20) {
            await Dynamo.handleItems(CHILD_ACCOUNT_TABLE, childDataArr);
            childDataArr = [];
            childReqNamesArr = [];
            childParentIdsArr = [];
        }
        /************************ Inserting Forecast Records To DynamoDB ************************/
        if (forecastDetailsArr.length >= 20) {
            await Dynamo.handleItems(SALE_FORECAST_TABLE, forecastDetailsArr);
            forecastDetailsArr = [];
            forecastDetailsReqNamesArr = [];
        }

        loopCount += 1;
    }
    alreadyProcessedBillToNumber.push(billToNumberForQueryInDynamoDb);
}

let functionName = ""
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    // console.info("Event: \n", JSON.stringify(event));
    log.INFO(functionName, "Event: \n" + JSON.stringify(event))
    try {
        set(event, 'Payload.id', get(event, 'Payload.id', get(event, "Payload[\ufeffid]")));
        set(event, 'Payload.createdTime', new Date().toISOString());
        const recordCheckResponse = await getItem(process.env.DATASYNC_DYNAMO_TABLE_NAME, get(event, 'Payload.id', get(event, "Payload[\ufeffid]")));
        // console.log('recordCheckResponse', recordCheckResponse);
        log.INFO(functionName, "recordCheckResponse" + recordCheckResponse)
        if(Object.keys(recordCheckResponse).length === 0){
            await insertRecord(process.env.DATASYNC_DYNAMO_TABLE_NAME, event['Payload']);
        } else {
        // } else if (get(recordCheckResponse, 'Item.status', null) !== 'Success'){   
            await updateRecordStatus(get(event,'Payload.id'), 'Processing', {});
        // } else {
        //     return { message: "Skipping Record, Already in Success State" }
        } 
        /************************ Generating Access Token ************************/
        let token = get(event, 'Token');
        accessToken = token['access_token'];
        instanceUrl = token['instance_url'];
        SALES_FORECAST_RECORD_ID_URL = instanceUrl + process.env.SALES_FORECAST_RECORD_ID_BASE_URL;
        UPSERT_SALES_FORECAST_DETAILS_BASE_URL = instanceUrl + process.env.UPSERT_SALES_FORECAST_DETAILS_BASE_URL;
        OWNER_USER_ID_BASE_URL = instanceUrl + process.env.OWNER_USER_ID_BASE_URL;
        PARENT_ACCOUNT_BASE_URL = instanceUrl + process.env.PARENT_ACCOUNT_BASE_URL;
        CHILD_ACCOUNT_BASE_URL = instanceUrl + process.env.CHILD_ACCOUNT_BASE_URL;
        FETCH_CHILD_ACCOUNT_BASE_URL = instanceUrl + process.env.FETCH_CHILD_ACCOUNT_BASE_URL;

        // console.info('Processing the records of bill to Number : ', event['Payload'][`bill to number`]);
        log.INFO(functionName, "Processing the records of bill to Number : " + event['Payload'][`bill to number`])
        await processBillToNumberRecords(event['Payload'], event['Payload'][`bill to number`], functionName);

        /************************ Inserting Parent Records To DynamoDB ************************/
        if (parentDataArr.length > 0) {
            await Dynamo.handleItems(PARENT_ACCOUNT_TABLE, parentDataArr);
        }
        /************************ Inserting Child Records To DynamoDB ************************/
        if (childDataArr.length > 0) {
            await Dynamo.handleItems(CHILD_ACCOUNT_TABLE, childDataArr);
        }
        /************************ Inserting Forecast Records To DynamoDB ************************/
        if (forecastDetailsArr.length > 0) {
            await Dynamo.handleItems(SALE_FORECAST_TABLE, forecastDetailsArr);
        }

        if (parentDataExcellArr.length > 0 || childDataExcellArr.length > 0 || forecastDataExcellArr.length > 0) {
            const parentAccountFailureCount = parentDataExcellArr.length;
            const childAccountFailureCount = childDataExcellArr.length;
            const forecastDetailsFailureCount = forecastDataExcellArr.length;

            //console.info("Parent Account Error Records Count : " + parentAccountFailureCount);
            log.INFO(functionName, "Parent Account Error Records Count : " + parentAccountFailureCount)
            //console.info("Child Account Error Records Count : " + childAccountFailureCount);
            log.INFO(functionName, "Child Account Error Records Count : " + childAccountFailureCount)
            // console.info("Sale Forecast Detail Error Records Count : " + forecastDetailsFailureCount);
            log.INFO(functionName, "Sale Forecast Detail Error Records Count : " + forecastDetailsFailureCount)
        }

        // console.info('unique bill to Number : ', alreadyProcessedBillToNumber);
        log.INFO(functionName, "unique bill to Number : " + alreadyProcessedBillToNumber)
        // console.info('reProcessedRecords : ', JSON.stringify(reProcessedRecords));
        log.INFO(functionName, "reProcessedRecords : " + JSON.stringify(reProcessedRecords))

        console.info('unique bill to Number Length : ', alreadyProcessedBillToNumber.length);
        log.INFO(functionName, "unique bill to Number Length : " + alreadyProcessedBillToNumber.length)
        console.info('reProcessedRecords length : ', reProcessedRecords.length);
        log.INFO(functionName, "reProcessedRecords length : " + reProcessedRecords.length)
        console.info('alreadyProcessedRecords length : ', alreadyProcessedRecords.length);
        log.INFO(functionName, "alreadyProcessedRecords length : " + alreadyProcessedRecords.length)
        alreadyProcessedBillToNumber.length = 0;
        alreadyProcessedRecords.length = 0;
        reProcessedRecords.length = 0;
        parentDataExcellArr.length = 0;
        childDataExcellArr.length = 0;
        forecastDataExcellArr.length = 0;
        // console.info('ID:', get(event,'Payload.id'));
        log.INFO(functionName, "ID:" + get(event,'Payload.id'))
        await updateRecordStatus(get(event,'Payload.id'), 'Success', {});
        return { message: "Processed Record Successfully" }
    } catch (error) {
        console.error("Main Error Message :", get(error, 'message', error));
        log.ERROR(functionName,"Main Error Message :" + get(error, 'message', error) ,500)
        console.error("Main Error Message String :", JSON.stringify(get(error, 'message', error)));
        log.ERROR(functionName,"Main Error Message String :" + JSON.stringify(get(error, 'message', error)) ,500)
        console.error("Main Full Error Message String :", JSON.stringify(error));
        log.ERROR(functionName, "Main Full Error Message String :" + JSON.stringify(error) ,500)
        await updateRecordStatus(get(event,'Payload.id'), 'Failed', JSON.stringify(get(error, 'message', error)));
        throw error;
    }
};