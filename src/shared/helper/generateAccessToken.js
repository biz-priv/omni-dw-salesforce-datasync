const axios = require('axios');
const { log } = require('../utils/logger');

async function generateAccessToken(tokenUrl, functionName) {
    try {
        // console.info("Access Token Url : \n", JSON.stringify(tokenUrl));
        log.INFO(functionName, "Access Token Url : \n" + JSON.stringify(tokenUrl));
        let response = await axios.post(tokenUrl);
        // console.info("Access Token Response : \n", response.data);
        log.INFO(functionName, "Access Token Response : \n" + response.data);
        return response.data;   
    } catch(e) {
        // console.error("generateAccessToken Error: ", JSON.stringify(e));
        log.ERROR(functionName, "generateAccessToken Error: " + JSON.stringify(e), 500);
        throw e;
    }
}

module.exports = { generateAccessToken }