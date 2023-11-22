
const axios = require('axios');

async function createParentAccount(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options) {
    try {
        console.info("Create Parent Account Url :\n", JSON.stringify(PARENT_ACCOUNT_URL));
        console.info("Create Parent Account Body :\n", JSON.stringify(PARENT_ACCOUNT_PARAMS));
        let createParent = await axios.patch(PARENT_ACCOUNT_URL, PARENT_ACCOUNT_PARAMS, options);
        let createParentID = createParent['data'];
        console.info("Create Parent Account Response :\n", createParentID);
        if (typeof createParentID != 'undefined') {
            return [createParentID, true];
        }
        return ["Unable to create parentAccount", false];
    } catch (error) {
        console.error("Create Parent Account Full Error : \n" + JSON.stringify(error));
        console.error("Create Parent Account Error : \n" + JSON.stringify(error.response.data[0]));
        throw error;
    }
}
module.exports = { createParentAccount }