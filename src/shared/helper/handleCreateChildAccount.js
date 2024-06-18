/*
* File: src\shared\helper\handleCreateChildAccount.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const axios = require('axios');
const { getCrmAdminOwnerID } = require('./getOwnerId');
const { log } = require('../utils/logger');

async function createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options, FETCH_CHILD_ACCOUNT_BASE_URL, functionName) {
    let resChildAccountId = "";
    try {
        log.INFO(functionName, "Create Child Account Url : \n" + JSON.stringify(CHILD_ACCOUNT_URL));
        log.INFO(functionName, "Create Child Account Body : \n" + JSON.stringify(childAccountBody));
        const createChildAccountReq = await axios.patch(CHILD_ACCOUNT_URL, childAccountBody, options);
        log.INFO(functionName, "Create Child Account Response : \n" + createChildAccountReq['data']);
        resChildAccountId = createChildAccountReq.data.id;
        return [resChildAccountId, true];
    } catch (error) {
        log.ERROR(functionName,"Create Child Account Error. Checking For Duplicates: \n" +JSON.stringify(error),500);
        if (error.response.data.length >= 1) {
            let errorResponse = error.response.data[0];
            let childAccountId = checkDuplicateEntry(errorResponse);
            if (childAccountId != null) {
                try {
                    let fetchChildAccountsList = await axios.get(FETCH_CHILD_ACCOUNT_BASE_URL, options);
                    let childAccountsApiRecentItems = fetchChildAccountsList.data.recentItems;
                    let checkExistingAccount = findExistingChildAccount(childAccountId, childAccountsApiRecentItems);

                    if (checkExistingAccount.length > 0) {

                        resChildAccountId = childAccountId;
                        return [resChildAccountId, true];
                    }
                } catch (newError) {
                    log.ERROR(functionName,"Find Existing Child Account Error : \n" + JSON.stringify(newError),500);
                    throw newError;
                }
            } else if (checkInactiveUserEntry(errorResponse)) {
                log.ERROR(functionName,"Inactive Owner Account. Fetching ID from CRM Admin",500);
                let crmAdminOwnerID = await getCrmAdminOwnerID(OWNER_USER_ID_BASE_URL, options, functionName)
                if (crmAdminOwnerID != false) {
                    childAccountBody['OwnerId'] = crmAdminOwnerID;
                    return await createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options, functionName);
                }
                log.ERROR(functionName,"Failed Error : \n" + JSON.stringify(error.response.data[0]), 500);
            }
        } else {
            log.ERROR(functionName, "Duplicate Records Not Found : \n" + error.response.data[0], 500);
        }
        log.ERROR(functionName,"Child Account Error : \n" + error.response.data[0], 500);
        throw error;
    }
}

function checkDuplicateEntry(findValue) {
    if (typeof findValue.errorCode != "undefined" && findValue.errorCode.toUpperCase().trim() == "DUPLICATES_DETECTED") {
        return findValue.duplicateResult.matchResults[0].matchRecords[0].record.Id;
    }
    return null;
}

function checkInactiveUserEntry(findValue) {
    if (typeof findValue.errorCode != "undefined" && findValue.errorCode.toUpperCase().trim() == "INACTIVE_OWNER_OR_USER") {
        return true;
    }
    return false;
}


function findExistingChildAccount(childAccountID, accountRecords) {
    return accountRecords.filter(
        function (record) { return record.Id == childAccountID }
    );
}


module.exports = { createChildAccount }