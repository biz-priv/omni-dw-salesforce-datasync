const axios = require('axios');

async function fetchSalesForecastRecordIdByPatch(options, selecselectedSaleForcastIdEndpoint, SALES_FORECAST_RECORD_ID_URL, fetchSalesForecastIdPatchBody) {
    try {
        let forecastRecordsDataURl = SALES_FORECAST_RECORD_ID_URL + selecselectedSaleForcastIdEndpoint;
        console.info("Fetch Sales Forecast Id Url : \n", JSON.stringify(forecastRecordsDataURl));
        console.info("Fetch Sales Forecast Id Body : \n", fetchSalesForecastIdPatchBody);
        let forecastRecordsData = await axios.patch(forecastRecordsDataURl, fetchSalesForecastIdPatchBody, options);
        let forecastId = forecastRecordsData['data']['id'];
        console.info("Fetch Sales Forecast Id Response : \n", forecastRecordsData['data']);
        if (typeof forecastId != 'undefined') {
            return [forecastId, true];
        }
        throw new Error("Unable to fetch forecast ID");
    } catch (error) {
        console.error("Error From Sales Forecast Record Id Api Full Error: ", JSON.stringify(error));
        console.error("Error From Sales Forecast Record Id Api Error: ", JSON.stringify(error.response.data[0]));
        throw error;
    }
}

async function upsertSalesForecastDetails(options, customerUniqueId, childAccountName, year, month, totalCharge, totalCost, selectedSaleForcastId, UPSERT_SALES_FORECAST_DETAILS_BASE_URL) {

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
        let upsertSalesForecastDetail = await axios.patch(upsertSalesForecastDetailUrl, upsertSalesForecastDetailBody, options);
        console.info("Upsert Sales Forecast Url : \n" + JSON.stringify(upsertSalesForecastDetailUrl));
        console.info("Upsert Sales Forecast Body : \n" + JSON.stringify(upsertSalesForecastDetailBody));
        console.info("Upsert Sales Forecast Response : \n" + upsertSalesForecastDetail['data']['id']);
        return [upsertSalesForecastDetail['data'], true, upsertSalesForecastDetailBody];
    } catch (error) {
        console.error("Error From Sales Forecast Api Full Error: " + JSON.stringify(error));
        console.error("Error From Sales Forecast Api Error: " + JSON.stringify(error.response.data[0]));
        throw error;
    }
}

module.exports = { upsertSalesForecastDetails, fetchSalesForecastRecordIdByPatch }
