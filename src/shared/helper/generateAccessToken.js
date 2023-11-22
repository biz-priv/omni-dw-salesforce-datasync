const axios = require('axios');

async function generateAccessToken(tokenUrl) {
    try {
        console.info("Access Token Url : \n", JSON.stringify(tokenUrl));
        let response = await axios.post(tokenUrl);
        console.info("Access Token Response : \n", response.data);
        return response.data;   
    } catch(e) {
        console.error("generateAccessToken Error: ", JSON.stringify(e));
        throw e;
    }
}

module.exports = { generateAccessToken }