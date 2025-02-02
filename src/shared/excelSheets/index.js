const excel = require('excel4node');
const { log } = require('../utils/logger');

function generateExcelSheet(array, worksheet, styleForData, functionName) {
    log.INFO(functionName, "array: " + array);
    let row = 2;
    for (let i in array) {
        let o = 1;
        worksheet.cell(row, o).string(array[i]['Status']).style(styleForData);
        worksheet.cell(row, o + 1).string(array[i]['Request Params']).style(styleForData);
        worksheet.cell(row, o + 2).string(array[i]['Response']).style(styleForData);
        row = row + 1;
    }
}

async function itemInsertIntoExcel(parentDataArr, childDataArr, forecastDetailsArr, functionName) {
    try {
        log.INFO(functionName, JSON.stringify(parentDataArr));
        let workbook = new excel.Workbook();
        let style = workbook.createStyle({
            font: {
                color: '#47180E',
                size: 12
            },
            numberFormat: '$#,##0.00; ($#,##0.00); -'
        });

        let styleForData = workbook.createStyle({
            font: {
                color: '#47180E',
                size: 10
            },
            alignment: {
                wrapText: true,
                horizontal: 'center',
            },
            numberFormat: '$#,##0.00; ($#,##0.00); -'
        });
        let isDataAvailable = 0;

        if (childDataArr.length > 0) {
            let worksheet1 = workbook.addWorksheet('Child Data');
            worksheet1.cell(1, 1).string('Status').style(style);
            worksheet1.cell(1, 2).string('Request Params').style(style);
            worksheet1.cell(1, 3).string('Response').style(style);
            generateExcelSheet(childDataArr, worksheet1, styleForData,functionName)
            isDataAvailable = 1;
        }

        if (forecastDetailsArr.length > 0) {
            let worksheet2 = workbook.addWorksheet('Forecast Data');
            worksheet2.cell(1, 1).string('Status').style(style);
            worksheet2.cell(1, 2).string('Request Params').style(style);
            worksheet2.cell(1, 3).string('Response').style(style);
            generateExcelSheet(forecastDetailsArr, worksheet2, styleForData, functionName)
            isDataAvailable = 1;
        }

        if (parentDataArr.length > 0) {
            let worksheet3 = workbook.addWorksheet('Parent Data');
            worksheet3.cell(1, 1).string('Status').style(style);
            worksheet3.cell(1, 2).string('Request Params').style(style);
            worksheet3.cell(1, 3).string('Response').style(style);
            generateExcelSheet(parentDataArr, worksheet3, styleForData, functionName)
            isDataAvailable = 1;
        }
        if (isDataAvailable) {
            workbook.write('/tmp/salesforceFailedRecords.xlsx');
        }
    } catch (e) {
        log.ERROR(functionName, "itemInsert in Excel Error: " + e, 500);
        return e;
    }
}

module.exports = { itemInsertIntoExcel }