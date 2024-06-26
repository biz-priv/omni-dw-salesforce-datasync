/*
* File: src\shared\sendEmail\index.js
* Project: Omni-dw-salesforce-datasync
* Author: Bizcloud Experts
* Date: 2024-03-02
* Confidential and Proprietary
*/
const nodemailer = require("nodemailer");
const fs = require('fs');
const { log } = require("../utils/logger");

async function sendEmail(mailSubject, body, functionName) {
    return new Promise(async (resolve, reject) => {
        try {
            const TRANSPORTER = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });
            let emailParams = {
                from: process.env.SMTP_SENDER,
                to: process.env.SMTP_RECEIVER,
                subject: process.env.stage + "-" + mailSubject,
                html: body,
                attachments: [
                    {
                        filename: 'salesForceFailedRecords.xlsx',
                        path: '/tmp/salesforceFailedRecords.xlsx'
                    },
                ],
            }
            let sendEmailReport = await TRANSPORTER.sendMail(emailParams);
            log.INFO(functionName, "emailSent : " + sendEmailReport );
            await fs.unlinkSync('/tmp/salesforceFailedRecords.xlsx');
                // {
                //     from: process.env.SMTP_SENDER,
                //     to: process.env.SMTP_RECEIVER,
                //     subject: process.env.stage + "-" + mailSubject,
                //     html: body,
                //     attachments: [
                //         {
                //             filename: 'salesForceFailedRecords.xlsx',
                //             path: '/tmp/salesforceFailedRecords.xlsx'
                //         },
                //     ],
                // },
                // (error, info) => {
                //     if (error) {
                //         try {
                //             fs.unlinkSync('/tmp/salesforceFailedRecords.xlsx')
                //             console.error("Email Error occurred : \n" + JSON.stringify(error));
                //         }
                //         catch (errorEmail) {
                //             console.error("fs unlink email error : ",JSON.stringify(errorEmail));
                //         }
                //         resolve(error)
                //     }
                //     try {
                //         fs.unlinkSync('/tmp/salesforceFailedRecords.xlsx')
                //     }
                //     catch (errorEmail) {
                //         console.error("fsUnlinkEmailError",JSON.stringify(errorEmail));
                //     }
                //     console.info("Email sent : \n", JSON.stringify(info));
                //     resolve(info)
                // }
            // );
            resolve(true);
        } catch (error) {
            log.ERROR(functionName, "Send Email Error : \n" + error ,500);
            resolve(false);
        }
    })
}

async function sendProcessedRecordsEmail(mailSubject, body, functionName) {
    return new Promise((resolve, reject) => {
        try {
            const TRANSPORTER = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });
            TRANSPORTER.sendMail(
                {
                    from: process.env.SMTP_SENDER,
                    to: process.env.SMTP_RECEIVER,
                    subject: process.env.stage + "-" + mailSubject,
                    html: body,
                },
                (error, info) => {
                    if (error) {
                        log.ERROR(functionName, "Email Error occurred : \n" + JSON.stringify(error) ,500);
                        resolve(error);
                    }
                    log.INFO(functionName, "Email sent : \n" + JSON.stringify(info) );
                    resolve(info);
                }
            );
            return true;
        } catch (error) {
            log.ERROR(functionName, "Error : \n" + error ,500);
            return false;
        }
    })
}
module.exports = { sendEmail, sendProcessedRecordsEmail }

