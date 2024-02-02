const axios = require('axios');
const get = require('lodash.get');
const set = require('lodash.set');
const { log } = require('../utils/logger');

async function fetchSalesForecastRecordIdByPatch(options, selecselectedSaleForcastIdEndpoint, SALES_FORECAST_RECORD_ID_URL, fetchSalesForecastIdPatchBody, functionName) {
    try {
        let forecastRecordsDataURl = SALES_FORECAST_RECORD_ID_URL + selecselectedSaleForcastIdEndpoint;
        set(fetchSalesForecastIdPatchBody, 'Name', trimCharacters(get(fetchSalesForecastIdPatchBody, 'Name', '')));
        log.INFO(functionName, "Fetch Sales Forecast Id Url : \n" + JSON.stringify(forecastRecordsDataURl));
        log.INFO(functionName, "Fetch Sales Forecast Id Body : \n" + fetchSalesForecastIdPatchBody);
        let forecastRecordsData = await axios.patch(forecastRecordsDataURl, fetchSalesForecastIdPatchBody, options);
        let forecastId = forecastRecordsData['data']['id'];
        log.INFO(functionName, "Fetch Sales Forecast Id Response : \n" + forecastRecordsData['data']);
        if (typeof forecastId != 'undefined') {
            return [forecastId, true];
        }
        throw new Error("Unable to fetch forecast ID");
    } catch (error) {
        log.ERROR(functionName, "Error From Sales Forecast Record Id Api Full Error: " + JSON.stringify(error), 500);
        log.ERROR(functionName, "Error From Sales Forecast Record Id Api Error: " +  JSON.stringify(error.response.data[0]) , 500);
        throw error;
    }
}

function trimCharacters(record) {
    const maxLength = 72;
    if (record.length > maxLength) {
        record = record.slice(0, maxLength);
    }
    console.info('After Trim:', record)
    return record;
}

async function upsertSalesForecastDetails(options, customerUniqueId, childAccountName, year, month, totalCharge, totalCost, selectedSaleForcastId, UPSERT_SALES_FORECAST_DETAILS_BASE_URL, functionName) {
    childAccountName = trimCharacters(childAccountName);
    let upsertSalesForecastDetailBody = {
        "Name": `${childAccountName} ${year} ${month}`,
        "Year__c": year,
        "Month__c": month,
        "Date__c": `${year}-${month}-01`,
        "Total_Charge__c": totalCharge,
        "Total_Cost__c": totalCost,
        "Sales_Forecast__c": selectedSaleForcastId
    };

    try {
        let upsertSalesForecastDetailUrl = UPSERT_SALES_FORECAST_DETAILS_BASE_URL + customerUniqueId;
        log.INFO(functionName, "Upsert Sales Forecast Url : \n" + JSON.stringify(upsertSalesForecastDetailUrl));
        log.INFO(functionName, "Upsert Sales Forecast Body : \n" + JSON.stringify(upsertSalesForecastDetailBody));
        let upsertSalesForecastDetail = await axios.patch(upsertSalesForecastDetailUrl, upsertSalesForecastDetailBody, options);
        log.INFO(functionName, "Upsert Sales Forecast Response : \n" + upsertSalesForecastDetail['data']['id']);
        return [upsertSalesForecastDetail['data'], true, upsertSalesForecastDetailBody];
    } catch (error) {
        log.ERROR(functionName, "Error From Sales Forecast Api Full Error: " + JSON.stringify(error), 500);
        log.ERROR(functionName,"Error From Sales Forecast Api Error: " + JSON.stringify(error.response.data[0]), 500);
        throw error;
    }
}

module.exports = { upsertSalesForecastDetails, fetchSalesForecastRecordIdByPatch }
