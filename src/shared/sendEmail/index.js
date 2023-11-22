const nodemailer = require("nodemailer");
const fs = require('fs')

async function sendEmail(mailSubject, body) {
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
            console.info('emailSent : ',sendEmailReport);
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
            console.error("Send Email Error : \n", error);
            resolve(false);
        }
    })
}

async function sendProcessedRecordsEmail(mailSubject, body) {
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
                        console.error("Email Error occurred : \n" + JSON.stringify(error));
                        resolve(error);
                    }
                    console.info("Email sent : \n", JSON.stringify(info));
                    resolve(info);
                }
            );
            return true;
        } catch (error) {
            console.error("Error : \n", error);
            return false;
        }
    })
}
module.exports = { sendEmail, sendProcessedRecordsEmail }

