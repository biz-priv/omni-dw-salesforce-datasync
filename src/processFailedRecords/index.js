const { generateAccessToken } = require('../shared/helper/generateAccessToken');
const { createChildAccount } = require('../shared/helper/handleCreateChildAccount');
const { fetchSalesForecastRecordIdByPatch, upsertSalesForecastDetails } = require('../shared/helper/handleSaleForcastDetail');
const { sendProcessedRecordsEmail } = require('../shared/sendEmail/index');
const Dynamo = require('../shared/dynamoDb/index');
const { log } = require('../shared/utils/logger');

const TOKEN_BASE_URL = process.env.TOKEN_BASE_URL;
const CHILD_ACCOUNT_TABLE = process.env.CHILD_ACCOUNT_DYNAMO_TABLE;
const SALE_FORECAST_TABLE = process.env.SALE_FORECAST_DYNAMO_TABLE;

let functionName = ""
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    // console.info("Event: ", JSON.stringify(event));
    log.INFO(functionName, "Event: " + JSON.stringify(event))
    let childTableName = process.env.CHILD_ACCOUNT_DYNAMO_TABLE;
    let parentTableName = process.env.PARENT_ACCOUNT_DYNAMO_TABLE;
    let forecastTableName = process.env.SALE_FORECAST_DYNAMO_TABLE;

    let loopCount = 0;
    let DbDataCount = 0;
    let hasMoreData = "false";

    try {
        /************************ Fetching Failed Records From Dynamo DB ************************/
        let status = false;
        let childFailedRecords = await Dynamo.scanTableData(childTableName, status);
        let parentFailedRecords = await Dynamo.scanTableData(parentTableName, status);
        let forecastFailedRecords = await Dynamo.scanTableData(forecastTableName, status);

        const parentAccountFailureCount = parentFailedRecords.length;
        const childAccountFailureCount = childFailedRecords.length;
        const forecastDetailsFailureCount = forecastFailedRecords.length;

        DbDataCount = parentAccountFailureCount + childAccountFailureCount + forecastDetailsFailureCount;

        if (parentFailedRecords.length > 0 || childFailedRecords.length > 0 || forecastFailedRecords.length > 0) {
            let token = await generateAccessToken(TOKEN_BASE_URL, functionName);
            let accessToken = token['access_token'];
            let instanceUrl = token['instance_url'];

            const OWNER_USER_ID_BASE_URL = instanceUrl + process.env.OWNER_USER_ID_BASE_URL;
            const CHILD_ACCOUNT_BASE_URL = instanceUrl + process.env.CHILD_ACCOUNT_BASE_URL;
            const SALES_FORECAST_RECORD_ID_URL = instanceUrl + process.env.SALES_FORECAST_RECORD_ID_BASE_URL;
            const UPSERT_SALES_FORECAST_DETAILS_BASE_URL = instanceUrl + process.env.UPSERT_SALES_FORECAST_DETAILS_BASE_URL;

            let options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                }
            };
            const [childRecords, childLoopCount, childAccountSuccessCount, childAccountFailedCount] = await handleChildFailedRecords(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_BASE_URL, childFailedRecords, options, functionName);
            loopCount += childLoopCount;
            // console.info("childAccountSuccessCount :  ", childAccountSuccessCount);
            log.INFO(functionName, "childAccountSuccessCount :  " + childAccountSuccessCount)
            // console.info("childAccountFailedCount : ", childAccountFailedCount);
            log.INFO(functionName, "childAccountFailedCount : " + childAccountFailedCount)

            if (childRecords.length > 0) {
                let splitSize = 20;
                for (let i = 0; i < childRecords.length; i += splitSize) {
                    let splitRecords = childRecords.slice(i, i + splitSize);
                    await insertProcessedRecordsIntoDynamoDb(CHILD_ACCOUNT_TABLE, splitRecords);
                }
            }

            const [forecastRecords, forecastLoopCount, forecastDetailsSuccessCount, forecastDetailsFailedCount] = await handleForecastFailedRecords(SALES_FORECAST_RECORD_ID_URL, UPSERT_SALES_FORECAST_DETAILS_BASE_URL, forecastFailedRecords, options, functionName);
            loopCount += forecastLoopCount;
            // console.info("forecastDetailsSuccessCount : " + forecastDetailsSuccessCount);
            log.INFO(functionName, "forecastDetailsSuccessCount : " + forecastDetailsSuccessCount)
            // console.info("forecastDetailsFailedCount : " + forecastDetailsFailedCount);
            log.INFO(functionName, "forecastDetailsFailedCount : " + forecastDetailsFailedCount)
            if (forecastRecords.length > 0) {
                let splitSize = 20;
                for (let i = 0; i < forecastRecords.length; i += splitSize) {
                    let splitRecords = forecastRecords.slice(i, i + splitSize);
                    await insertProcessedRecordsIntoDynamoDb(SALE_FORECAST_TABLE, splitRecords);
                }
            }

            let mailSubject = "SalesForce Re-Processed Records";
            let mailBody = "Hello,<br><br>Total Child Account Re-Processed Failed Records Count : <b>" + childAccountFailureCount + "</b><br>Total Succeeded Child Account Records Count After Re-Processing : <b>" + childAccountSuccessCount + "</b><br>" + "Total Failed Child Account Records Count After Re-Processing : <b>" + childAccountFailedCount + "</b><br><br>" + "Total Sale Forecast Detail Re-Processed Failed Records Count : <b>" + forecastDetailsFailureCount + "</b><br>" + "Total Succeeded Forecast Detail Records Count After Re-Processing : <b>" + forecastDetailsSuccessCount + "</b><br>" + "Total Failed Forecast Detail Records Count After Re-Processing : <b>" + forecastDetailsFailedCount + "</b><Br>Thanks.";
            await sendProcessedRecordsEmail(mailSubject, mailBody, functionName);
        }
    }
    catch (error) {
        console.error(error);
        log.ERROR(functionName, error, 500)
    }
    if (loopCount == DbDataCount) {
        hasMoreData = "false";
    } else {
        hasMoreData = "true";
    }
    return { hasMoreData };
}

async function insertProcessedRecordsIntoDynamoDb(tableName, records) {
    try {
        await Dynamo.handleItems(tableName, records);
        return true;
    } catch (error) {
        console.error("Error In Inserting Processed Records To Dynamo Db");
        return false;
    }
}

async function handleChildFailedRecords(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_BASE_URL, childFailedRecords, options, functionName) {
    let childReqNamesArr = [];
    let childParentIdsArr = [];
    let childDataArr = [];
    let childLoopCount = 0;
    let childAccountSuccessCount = 0;
    let childAccountFailedCount = 0;
    if (childFailedRecords.length != 0) {

        for (let key in childFailedRecords) {
            let sourceSystem = childFailedRecords[key]['req_Source_System__c'];
            let billToNumber = childFailedRecords[key]['req_Bill_To_Number__c'];
            let controllingCustomerNumber = childFailedRecords[key]['req_Controlling_Number__c'];
            let controllingCustomerName = childFailedRecords[key]['req_Controlling_Customer_Name__c'];
            let childName = childFailedRecords[key]['req_Name'];
            let ownerId = childFailedRecords[key]['req_OwnerId'];
            let billingStreet = childFailedRecords[key]['req_BillingStreet'];
            let city = childFailedRecords[key]['req_BillingCity'];
            let state = childFailedRecords[key]['req_BillingState'];
            let country = childFailedRecords[key]['req_BillingCountry'];
            let postalCode = childFailedRecords[key]['req_BillingPostalCode'];
            let parentDataId = childFailedRecords[key]['req_ParentId'];
            let childType = childFailedRecords[key]['req_Type'];
            let childRecordID = childFailedRecords[key]['req_RecordTypeId'];

            const CHILD_ACCOUNT_URL = CHILD_ACCOUNT_BASE_URL + `${sourceSystem}-${billToNumber}-${controllingCustomerNumber}`;

            let childAccountBody = {
                "Name": childName,
                "Controlling_Customer_Name__c": controllingCustomerName,
                "Source_System__c": sourceSystem,
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
                "Type": childType,
                "ParentId": parentDataId,
                "RecordTypeId": childRecordID
            };

            const [createChildAccountRes, createChildExecutionStatus] = await createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options, functionName);
            if (createChildExecutionStatus != false) {
                childAccountSuccessCount += 1;
                let createdAt = new Date().toISOString();
                let childDynamoData = {
                    PutRequest: {
                        Item: {
                            req_Name: childName,
                            req_Source_System__c: sourceSystem,
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
                            req_RecordTypeId: childRecordID,
                            res_child_account_id: createChildAccountRes,
                            api_insert_Status: true,
                            created_At: createdAt
                        }
                    }
                };
                childDataArr.push(childDynamoData);
                childReqNamesArr.push(childName);
                childParentIdsArr.push(parentDataId);
            } else {
                childAccountFailedCount += 1;
            }
            childLoopCount += 1;
        }
    }
    return [childDataArr, childLoopCount, childAccountSuccessCount, childAccountFailedCount];
}

async function handleForecastFailedRecords(SALES_FORECAST_RECORD_ID_URL, UPSERT_SALES_FORECAST_DETAILS_BASE_URL, forecastDetailsFailedRecords, options, functionName) {
    let forecastDetailsDataArr = [];
    let forecastLoopCount = 0;
    let forecastDetailsSuccessCount = 0;
    let forecastDetailsFailedCount = 0;

    if (forecastDetailsFailedRecords.length != 0) {
        for (let key in forecastDetailsFailedRecords) {
            let customerUniqueId = forecastDetailsFailedRecords[key]['unique_Record_ID'];
            let sourceSystem = forecastDetailsFailedRecords[key]['sourceSystem'];
            let billToNumber = forecastDetailsFailedRecords[key]['billToNumber'];
            let controllingCustomerNumber = forecastDetailsFailedRecords[key]['controllingCustomerNumber'];
            let year = forecastDetailsFailedRecords[key]['req_Year__c'];
            let childName = forecastDetailsFailedRecords[key]['req_ChildName'];
            let month = forecastDetailsFailedRecords[key]['req_Month__c'];
            let totalCharge = forecastDetailsFailedRecords[key]['req_Total_Charge__c'];
            let totalCost = forecastDetailsFailedRecords[key]['req_Total_Cost__c'];
            let createChildAccountRes = forecastDetailsFailedRecords[key]['req_Child_Account_Id'];
            let ownerId = forecastDetailsFailedRecords[key]['req_Owner_Id'];

            let selecselectedSaleForcastIdEndpoint = `${sourceSystem}${billToNumber}${controllingCustomerNumber}${year}`;

            let fetchSalesForecastIdPatchBody = {
                "Name": childName + '-' + year,
                "Client__c": createChildAccountRes,
                "Year__c": year,
                "Bill_To_Number__c": billToNumber,
                "Controlling_Number__c": controllingCustomerNumber,
                "OwnerId": ownerId
            }

            const [selectedSaleForcastId, fetchSalesForecastIdStatus] = await fetchSalesForecastRecordIdByPatch(options, selecselectedSaleForcastIdEndpoint, SALES_FORECAST_RECORD_ID_URL, fetchSalesForecastIdPatchBody, functionName);
            if (fetchSalesForecastIdStatus != false) {
                const [upsertSalesForecastDetail, upsertForecastStatus, upsertForecastPayload] = await upsertSalesForecastDetails(options, customerUniqueId, childName, year, month, totalCharge, totalCost, selectedSaleForcastId, UPSERT_SALES_FORECAST_DETAILS_BASE_URL, functionName);
                if (upsertForecastStatus != false) {
                    let createdAt = new Date().toISOString();
                    let forecastDetailsDynamoData = {
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
                    };
                    forecastDetailsDataArr.push(forecastDetailsDynamoData);
                    forecastDetailsSuccessCount += 1;
                } else {
                    forecastDetailsFailedCount += 1;
                }
            } else {
                forecastDetailsFailedCount += 1;
            }
            forecastLoopCount += 1;
        }
    }
    return [forecastDetailsDataArr, forecastLoopCount, forecastDetailsSuccessCount, forecastDetailsFailedCount];
}