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

let dbPath = path.resolve('./mount-database/node-cache_tor-html-loader.sqlite')
console.log('[AUTO RESTART] watching: ' + dbPath)
setInterval(() => {
  // fetch file details
  
  
  if (fs.existsSync(dbPath) === false) {
    console.log('[AUTO RESTART] ' + fs.existsSync(dbPath) + ' is not found.')
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
  