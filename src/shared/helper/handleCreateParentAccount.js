
const axios = require('axios');
const { log } = require('../utils/logger');

async function createParentAccount(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options,functionName) {
    try {
        log.INFO(functionName, "Create Parent Account Url :\n" + JSON.stringify(PARENT_ACCOUNT_URL));
        log.INFO(functionName, "Create Parent Account Body :\n" + JSON.stringify(PARENT_ACCOUNT_PARAMS));
        let createParent = await axios.patch(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options);
        let createParentID = createParent['data'];
        log.INFO(functionName, "Create Parent Account Response :\n" + createParentID);
        if (typeof createParentID != 'undefined') {
            return [createParentID, true];
        }
        return ["Unable to create parentAccount", false];
    } catch (error) {
        log.ERROR(functionName, "Create Parent Account Full Error : \n" + JSON.stringify(error), 500);
        log.ERROR(functionName,"Create Parent Account Error : \n" + JSON.stringify(error.response.data[0]), 500);
        throw error;
    }
}
module.exports = { createParentAccount }