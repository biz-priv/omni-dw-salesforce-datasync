/*
* File: src\shared\utils\logger.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const log4js = require('log4js');
const moment = require('moment');

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: "messagePassThrough" } } },
    categories: { default: { appenders: ["out"], level: "info" } }
});
const logger = log4js.getLogger("out");

module.exports.log = {
    INFO(functionName, message, status = 200) {
        logger.info(JSON.stringify({
            "@timestamp": moment().format(),
            "status": status,
            "message": JSON.stringify(message),
            "service-name": process.env.SERVICE,
            "application": "omni",
            "region": process.env.REGION,
            "functionName": functionName ?? "",
        })); 
    },
    ERROR(functionName, message, status = 500) {
        logger.info(JSON.stringify({
            "@timestamp": moment().format(),
            "status": status,
            "message": JSON.stringify(message),
            "service-name": process.env.SERVICE,
            "application": "omni",
            "region": process.env.REGION,
            "functionName": functionName ?? "",
        }));
    }
}