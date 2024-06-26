/*
* File: src\shared\helper\generateAccessToken.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const axios = require('axios');
const { log } = require('../utils/logger');

async function generateAccessToken(tokenUrl, functionName) {
    try {
        log.INFO(functionName, "Access Token Url : \n" + JSON.stringify(tokenUrl));
        let response = await axios.post(tokenUrl);
        log.INFO(functionName, "Access Token Response : \n" + response.data);
        return response.data;   
    } catch(e) {
        log.ERROR(functionName, "generateAccessToken Error: " + JSON.stringify(e), 500);
        throw e;
    }
}

module.exports = { generateAccessToken }