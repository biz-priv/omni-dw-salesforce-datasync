/*
* File: src\shared\s3\index.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const AWS = require("aws-sdk");
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
let XLSX = require('xlsx');
const { csvToJSON } = require("../utils/utils");
const { log } = require("../utils/logger");

async function startXlsxS3Process(s3BucketName, requestData, path) {
    let chunkSize = 300;
    for (let i = 0, len = requestData.length; i < len; i += chunkSize) {
        let dataToUpload = requestData.slice(i, i + chunkSize);
        const sheetDataBuffer = await prepareSpreadsheet(dataToUpload);
        await uploadFileToS3(s3BucketName, sheetDataBuffer, path);
    }
}

async function uploadFileToS3(s3BucketName, sheetDataBuffer, path) {
    try {
        let date = new Date()
        date = date.toISOString()
        date = date.replace(/:/g, '-')
        const params = {
            Bucket: s3BucketName,
            Key: `${path}/${date}.csv`,
            Body: sheetDataBuffer,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ContentEncoding: 'base64',
            ACL: 'private'
        };

        return new Promise((resolve, reject) => {
            s3.upload(params, function (err, data) {
                if (err) {
                    return reject(err);
                }
                return resolve(data.Location);
            });
        });
    } catch (error) {
        return error
    }
}

async function prepareSpreadsheet(requestData) {
    const wb = XLSX.utils.book_new();
    const sheetData = XLSX.utils.json_to_sheet(requestData);
    XLSX.utils.book_append_sheet(wb, sheetData, 'Sheet 1');
    const sheetDataBuffer = await XLSX.write(wb, { bookType: 'csv', type: 'buffer', bookSST: false });
    return sheetDataBuffer;
}

async function fetchAllKeysFromS3(s3BucketName, token) {
    let allKeys = [];
    let opts = { Bucket: s3BucketName, Prefix: 'liveData/' };
    if (token) opts.ContinuationToken = token;
    return new Promise((resolve, reject) => {
        s3.listObjectsV2(opts, function (err, data) {
            allKeys = allKeys.concat(data.Contents);
            if (data.IsTruncated == "true")
                fetchAllKeysFromS3(s3BucketName, data.NextContinuationToken);
            else {
                resolve(allKeys);
            }
        });
    });
}

async function moveS3ObjectToArchive(s3BucketName, fileName,functionName) {
        try {
            let params = {
                Bucket: s3BucketName,
                CopySource: s3BucketName + '/' + fileName,
                Key: fileName.replace('liveData/', 'archive/')
            };
            let copyObject = await s3.copyObject(params).promise();
            log.INFO(functionName, "Copied :" + params.Key);
            let deleteParams = {
                Bucket: s3BucketName,
                Key: fileName,
            }
            let deleteObject = await s3.deleteObject(deleteParams).promise();
            log.INFO(functionName, "file deleted : " + JSON.stringify(fileName));
            return "completed";
        } catch (error) {
            log.ERROR(functionName, "S3 Copy and delete error : " + JSON.stringify(error), 500);
            return error;
        }
}

async function readS3Object(s3BucketName, fileName, functionName) {
    try {
        let getParams = {
            Bucket: s3BucketName,
            Key: fileName
        }
        const stream = s3.getObject(getParams).createReadStream().on('error', error => {
            return error
        });
        const data = await csvToJSON(stream, functionName);
        return data;
    } catch (error) {
        log.ERROR(functionName, error, 500);
        return error.message;
    }
}
module.exports = { startXlsxS3Process, fetchAllKeysFromS3, moveS3ObjectToArchive, readS3Object }