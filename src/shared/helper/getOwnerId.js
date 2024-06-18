/*
* File: src\shared\helper\getOwnerId.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const axios = require('axios');
const { log } = require('../utils/logger');

async function getOwnerID(OWNER_USER_ID_BASE_URL, options, owner, functionName) {
    try {
        let ownerIdUrl = OWNER_USER_ID_BASE_URL + owner.replace(/\//g, '%2F').replace(/\\/g, '%5C');
        log.INFO(functionName, "Owner Id Url : \n" + JSON.stringify(ownerIdUrl));
        const OWNER_USER_ID = await axios.get(ownerIdUrl, options);
        log.INFO(functionName, "Owner Id Response : \n" + OWNER_USER_ID['data']['Id']);
        let ownerIdRes;
        if(OWNER_USER_ID['data']['IsActive']){
            ownerIdRes = OWNER_USER_ID['data']['Id'];
        } else {
            ownerIdRes = await getCrmAdminOwnerID(OWNER_USER_ID_BASE_URL, options, functionName);
        }
        if (typeof ownerIdRes != 'undefined') {
            return ownerIdRes;
        }
        return false;
    } catch (error) {
        log.ERROR(functionName, "Owner Id Error. Processing With Crm Admin : \n" + JSON.stringify(error), 500);
        return await getCrmAdminOwnerID(OWNER_USER_ID_BASE_URL, options, functionName);
    }
}

async function getCrmAdminOwnerID(OWNER_USER_ID_BASE_URL, options, functionName) {
    try {
        let ownerIdUrl = OWNER_USER_ID_BASE_URL + 'crm admin';
        log.INFO(functionName, "Crm Admin Owner Id Url : \n" + JSON.stringify(ownerIdUrl));
        const OWNER_USER_ID = await axios.get(ownerIdUrl, options);
        log.INFO(functionName, "Owner Id Response : \n" + OWNER_USER_ID['data']['Id']);
        let ownerIdRes = OWNER_USER_ID['data']['Id'];
        if (typeof ownerIdRes != 'undefined') {
            return ownerIdRes;
        }
        return false;
    } catch (ownerIderror) {
        log.ERROR(functionName, "Crm Admin Owner Id Error : \n" + JSON.stringify(ownerIderror), 500);
        throw ownerIderror;
    }
}

module.exports = { getOwnerID, getCrmAdminOwnerID }