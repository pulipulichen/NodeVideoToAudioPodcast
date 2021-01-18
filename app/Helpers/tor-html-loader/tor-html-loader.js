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


const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')

//let cacheLimit = Number(Env.get('CACHE_RETRIEVE_FEED_MINUTES_TOR'))
//cacheLimit = 0

let torSpawn
const kill  = require('tree-kill');

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
  torSpawn = spawn(torPath);
  
  torSpawn.stdout.on('data', (data) => {
    data = data.toString().trim()
    
    //console.log(`stdout:`);
    console.log('[TOR INIT] ' + data)
    //console.log('[check] ' + data.endsWith('Bootstrapped 100% (done): Done'))
    
    if (data.endsWith('Bootstrapped 100% (done): Done')) {
      torInited = true
      //console.log('tor is ok')
    }
  });

  torSpawn.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  torSpawn.on('close', (code) => {
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

let loading = false

module.exports = {
  killTor: function () {
    return restartServer()
    
    if (torSpawn.pid) {
      kill(torSpawn.pid)
      torInited = false
      torWaitIniting = false
      console.log('[TOR] process killed')
    }
  },
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
  request: function (url) {
    return new Promise((resolve, reject) => {
      tr.request(url, (err, res, body) => {
        //loading = false
        //console.log(err)
        //console.log('讀取之後')
        //console.log(res.statusCode)
        if (!res || res.statusCode === 429) {
          console.trace('[TOR] Access deny: ' + url)
          if (res) {
            console.error(res.statusCode)
          }
          //reject('Access deny')
          this.killTor()
          //return null
          return reject(null)
        }

        //console.log(body)
        if (!err && res.statusCode === 200) { 
          if (!body) {
            console.error('[TOR] body is undefined')
            return reject(null)
            //return reject(Error ('body is undefined'))
            //throw Error ('[TOR] body is undefined')
          }
          //console.log('讀取完成', body.length)
          //resolve(body)
          return resolve(body)
        } else {
          //console.log(err)
          //console.error('錯誤')
          //reject(err)
          return reject(null)
          //throw err
        }
        //console.log('[TOR] load html end: ' + url)
      })
    })
  },
  loadHTML: function (url, cacheExpire) {
    if (!url) {
      throw Error('no url')
    }

    try {
      return new Promise(async (resolve, reject) => {
        
        let cacheKey = ['tor-html-loader', url]

        let result = await NodeCacheSqlite.getExists(cacheKey, async () => {
          //console.log('有進入快取中嗎？')
          while (loading === true) {
            await sleep()
          }
          
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
          
          loading = true
          try {
            let result = await this.request(url)
            loading = false
            return result
          }
          catch (e) {
            console.error('[TOR] requst failed: ' + e)
            loading = false
            return false
          }
        }, cacheExpire) 

        if (!result) {
          //console.error('沒有結果，請預備後續處理')
          reject(result)
        }
        else {
          //console.log('順利送出', result.length)
          resolve(result)
        }
        //if (!result) {
          //await NodeCacheSqlite.clear(cacheKey)
        //  result = await this.loadHTML(url)
        //}

        //if ()


      })
    }
    catch (e) {
      console.error(e)
    }
  }
}