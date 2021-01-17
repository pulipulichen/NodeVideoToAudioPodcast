/* global __dirname */

var tr = require('tor-request');
let torInited = false
let torWaitIniting = false
let fs = require('fs')

const { spawn } = require("child_process");
const path = require('path')
const SocksProxyAgent = require('socks-proxy-agent')

const Env = use('Env')
let autoRestartServerHours = Number(Env.get('SERVER_AUTO_RESTART_HOURS'))

let startTor = async function () {
  // Jan 17 23:02:25.000 [notice] Bootstrapped 100% (done): Done
  if (torWaitIniting === true) {
    return false
  }
  torWaitIniting = true
  
  setTimeout(() => {
    restartServer()
  }, autoRestartServerHours * 60 * 60 * 1000)
  
  let torPath = path.join(__dirname, "/vendors/tor/Tor/tor.exe")
  //console.log()
  /*
  spawn(path.join(__dirname, "/vendors/tor/Tor/tor.exe"), (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      console.log(`${stdout}`);
      if (stdout.endsWith('Bootstrapped 100% (done): Done')) {
        torInited = true
      }
  })
   */
  const ls = spawn(torPath);
  
  ls.stdout.on('data', (data) => {
    data = data.toString().trim()
    
    //console.log(`stdout:`);
    console.log('[TOR INIT] ' + data)
    //console.log('[check] ' + data.endsWith('Bootstrapped 100% (done): Done'))
    
    if (data.endsWith('Bootstrapped 100% (done): Done')) {
      torInited = true
      //console.log('tor is ok')
    }
  });

  ls.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

function sleep (time = 3000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

let agent

let loading = false

module.exports = {
  getAgent: async function () {
    if (torInited === false) {
      if (torWaitIniting === false) {
        startTor()
      }

      while (torInited === false) {
        //console.log('wait proxy')
        await sleep()
      }
    }
      
    const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');
    return agent
  },
  loadHTML: function (url) {
    if (!url) {
      throw Error('no url')
    }

    return new Promise(async (resolve, reject) => {
      if (torInited === false) {
        if (torWaitIniting === false) {
          startTor()
        }

        while (torInited === false) {
          //console.log('wait', url)
          await sleep()
        }
      }

      console.log('[TOR] load html start: ' + url)
      
      while (loading === true) {
        await sleep()
      }
      
      loading = true
      tr.request(url, function (err, res, body) {
        loading = false
        if (!err && res.statusCode === 200) {
          if (!body) {
            return reject(Error ('body is undefined'))
          }
          
          resolve(body)
        } else {
          reject(err)
        }
        //console.log('[TOR] load html end: ' + url)
      })
    })
  }
}