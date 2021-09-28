/* global path, __dirname */

let counter = 10

const sleep = use('App/Helpers/sleep.js')

let fs = require('fs')

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

module.exports = async function (callback) {
  while (true) {
    try {
      await callback()
      
      if (counter < 10) {
        counter = 10
      }
      
      break
    }
    catch (e) {
      console.error(e)
      counter--
      
      if (counter < 0) {
        return restartServer()
      }
      
      console.log('[RETRY ' + counter  + ']')
      
      await sleep(3000)
    }
  }
  
}