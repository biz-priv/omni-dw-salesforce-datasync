
const axios = require('axios');
const { log } = require('../utils/logger');

async function createParentAccount(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options,functionName) {
    try {
        // console.info("Create Parent Account Url :\n", JSON.stringify(PARENT_ACCOUNT_URL));
        log.INFO(functionName, "Create Parent Account Url :\n" + JSON.stringify(PARENT_ACCOUNT_URL))
        // console.info("Create Parent Account Body :\n", JSON.stringify(PARENT_ACCOUNT_PARAMS));
        log.INFO(functionName, "Create Parent Account Body :\n" + JSON.stringify(PARENT_ACCOUNT_PARAMS))
        let createParent = await axios.patch(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options);
        let createParentID = createParent['data'];
        // console.info("Create Parent Account Response :\n", createParentID);
        log.INFO(functionName, "Create Parent Account Response :\n" + createParentID)
        if (typeof createParentID != 'undefined') {
            return [createParentID, true];
        }
        return ["Unable to create parentAccount", false];
    } catch (error) {
        // console.error("Create Parent Account Full Error : \n" + JSON.stringify(error));
        log.ERROR(functionName, "Create Parent Account Full Error : \n" + JSON.stringify(error), 500)
        // console.error("Create Parent Account Error : \n" + JSON.stringify(error.response.data[0]));
        log.ERROR(functionName,"Create Parent Account Error : \n" + JSON.stringify(error.response.data[0]), 500)
        throw error;
    }
}
module.exports = { createParentAccount }