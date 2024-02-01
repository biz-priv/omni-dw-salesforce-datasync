const csv = require('fast-csv')
const { log } = require('./logger')

async function csvToJSON(s3Stream, functionName) {
  return new Promise((resolve) => {
    try {
      let data = []
      csv.parseStream(s3Stream, { headers: true })
        .on('data', (row) => {
          data.push(row)
        }).on("end", function () {
          resolve(data)
        })
    } catch (error) {
      console.error('Error:', error);
      log.ERROR(functionName, "Error:" + error, 500)
      throw error;
    }
  })
}

module.exports = { csvToJSON }