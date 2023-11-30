
const axios = require('axios');
const { getCrmAdminOwnerID } = require('./getOwnerId');

async function createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options, FETCH_CHILD_ACCOUNT_BASE_URL) {
    let resChildAccountId = "";
    try {
        console.info("Create Child Account Url : \n", JSON.stringify(CHILD_ACCOUNT_URL));
        console.info("Create Child Account Body : \n", JSON.stringify(childAccountBody));
        const createChildAccountReq = await axios.patch(CHILD_ACCOUNT_URL, childAccountBody, options);
        console.info("Create Child Account Response : \n", createChildAccountReq['data']);
        resChildAccountId = createChildAccountReq.data.id;
        return [resChildAccountId, true];
    } catch (error) {
        console.error("Create Child Account Error. Checking For Duplicates: \n" +JSON.stringify(error));
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
                    console.error("Find Existing Child Account Error : \n" + JSON.stringify(newError));
                    throw newError;
                }
            } else if (checkInactiveUserEntry(errorResponse)) {
                console.error("Inactive Owner Account. Fetching ID from CRM Admin");
                let crmAdminOwnerID = await getCrmAdminOwnerID(OWNER_USER_ID_BASE_URL, options)
                if (crmAdminOwnerID != false) {
                    childAccountBody['OwnerId'] = crmAdminOwnerID;
                    return await createChildAccount(OWNER_USER_ID_BASE_URL, CHILD_ACCOUNT_URL, childAccountBody, options);
                }
                console.error("Failed Error : \n", JSON.stringify(error.response.data[0]));
            }
        } else {
            console.error("Duplicate Records Not Found : \n", error.response.data[0]);
        }
        console.error("Child Account Error : \n", error.response.data[0]);
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