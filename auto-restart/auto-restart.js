/* global __dirname */

const fs = require('fs');
const path = require('path')

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

setInterval(() => {
  // fetch file details
  let dbPath = path.resolve(__dirname, '/mount-database/node-cache_tor-html-loader.sqlite')
  
  if (fs.existsSync(dbPath) === false) {
    return false
  }
  
  fs.stat(dbPath, (err, stats) => {
      if(err) {
          throw err;
      }

      let ctime = stats.ctime

      // print file last modified date
      console.log(`File Status Last Modified: ${ctime}`);
      
      let currentTime = (new Date()).getTime()
      
      if ((currentTime - ctime) > 1000 * 10) {
        restartServer()
      }
  })
}, 1 * 1000)
  