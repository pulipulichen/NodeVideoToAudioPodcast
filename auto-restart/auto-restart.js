/* global __dirname */

const fs = require('fs');
const path = require('path')

var http = require('http');

let startDownload = function () {
  var options = {
      // http://pulipuli.myqnapcloud.com:30380/dl
      host: '127.0.0.1',
      port: 43333,
      path: '/dl'
  }
  var request = http.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) {
          data += chunk;
      });
      res.on('end', function () {
          console.log(data);

      });
  });
  request.on('error', function (e) {
      console.log(e.message);
  });
  request.end();
}


let detectStatus = function () {
  return new Promise((resolve, reject) => {
    var options = {
        // http://pulipuli.myqnapcloud.com:30380/dl
        host: '127.0.0.1',
        port: 43333,
        path: '/dl'
    }
    var request = http.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            console.log(data);
            resolve(true)
        });
    });
    request.on('error', function (e) {
        //console.log(e.message);
        resolve(false)
    });
    request.end();
  })
    
}

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    setTimeout(() => {
      // 嘗試下載
      
    }, 3000)
  })
}

//let dbPath = path.resolve('../mount-database/node-cache_tor-html-loader.sqlite')
//console.log('[AUTO RESTART] watching: ' + dbPath)

console.log('[AUTO RESTART] watching')
setInterval(async () => {
  // fetch file details
  
  /*
  if (fs.existsSync(dbPath) === false) {
    console.log('[AUTO RESTART] ' + fs.existsSync(dbPath) + ' is not found.')
    return false
  }
  
  fs.stat(dbPath, (err, stats) => {
      if(err) {
          throw err;
      }

      let ctime = stats.ctime.getTime()

      // print file last modified date
      //console.log(`File Status Last Modified: ${ctime}`);
      
      let currentTime = (new Date()).getTime()
      
      //console.log('[AUTO-RESTART] ', (currentTime - ctime), 1000 * 60 * 60 * 0.5, ctime, currentTime)
      if ((currentTime - ctime) > 1000 * 60 * 60 * 0.5) {
        console.log('[AUTO-RESTART] ', (currentTime - ctime), ctime, currentTime)
        restartServer()
      }
  })
   */
  
  let status = await detectStatus()
  if (status === false) {
    restartServer()
  }
  else {
    console.log('[AUTO-RESTART] alive')
  }
}, 10 * 1000)
  