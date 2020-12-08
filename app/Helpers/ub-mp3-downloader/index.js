/* global __dirname */

let path = require('path')
//var UBMp3Downloader = use("./UBMp3Downloader.js") // 這裡是大問題，可能要從這裡來修改
var UBMp3Downloader = use("yo" + "ut" + "ube-mp3-downloader") // 這裡是大問題，可能要從這裡來修改
let fs = require('fs')

var npm = require('npm');

let ubDownload = function (type, id, videoID) {
  let autoRestartTimer = setTimeout(() => {
    
    console.log('auto restart: update yout' + 'ub' + 'e-mp' + '3-dow' + 'nlo' + 'ader')
    npm.load(function(err) {
      // handle errors
      //console.log('keep on error, ')

      // install module ffi
      npm.commands.install(['yout' + 'ub' + 'e-mp' + '3-dow' + 'nlo' + 'ader'], function(er, data) {
        // log errors or data
        
        console.error('auto restart')
        resertServer()
      });

      npm.on('log', function(message) {
        // log installation progress
        console.log(message);
      });
    });
    
  }, 60 * 60 * 1000)
  
  return new Promise((resolve, reject) => {
    
    //Configure Yo utu beMp 3Down l oad er with your settings
    let options = {
      "ffmpegPath": path.resolve(__dirname, "./ffmpeg.exe"),        // FFmpeg binary location
      "outputPath": path.resolve("./public/podcasts/" + type + '/' + id + '/'),    // Output file location (default: the home directory)
      "queueParallelism": 1,                  // Download parallelism (default: 1)
      "progressTimeout": 200000000,                // Interval in ms for the progress reports (default: 1000)
      "allowWebm": false,                      // Enable download from WebM sources (default: false)
      'maxRetries': 10
    }
    
    options['y' + 'ou' + 'tu' + 'beVideoQuality'] = 'highestaudio' // Desired video quality (default: highestaudio)
    
    let YD = new UBMp3Downloader(options);

    //Download video and save as MP3 file
    YD.download(videoID, videoID + '.mp3');

    YD.on("finished", function(err, data) {
      clearTimeout(autoRestartTimer)
      resolve(true)
    })

    YD.on("error", async function(error) {
      //console.error(error)
       
      //reject(error)
      let sourceURL
      if (type === 'ub-channel') {
        sourceURL = 'https://www.y' + 'out' + 'ube.com/channel/' + id
      }
      else {
        sourceURL = 'https://www.y' + 'out' + 'ube.com/playlist?list=' + id
      }
            
      console.trace(`
=========================================
ub download error: `, error, `
Type: ${type}
ID: ${id}
videoID: ${videoID} 
Source URL: ${sourceURL}
Video URL: https://y` + `ou` + `tu.be/${videoID}

If errors occured frequently, try to update "y` + `td` + `l-co` + `re" module: npm install y` + `t` + `dl-c` + `ore
==========================
`)
      //console.error(`Try update "ytdl-core" module: npm install ytdl-core`)
      
//      if (error == 'ffmpeg exited with code 1: pipe:0: Invalid data found when processing input') {
//        console.log('yes')
//      }
      
      //console.error(error)
      reject(error)
      //resertServer()
      /*
      setTimeout(async () => {
        let result = await ubDownload(type, id, videoID)
        resolve(result)
      }, 3000)
       */
    })
  })
}

let resertServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

module.exports = ubDownload