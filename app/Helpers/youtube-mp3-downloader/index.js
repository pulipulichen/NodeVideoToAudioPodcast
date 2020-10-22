/* global __dirname */

let path = require('path')
var YoutubeMp3Downloader = use("youtube-mp3-downloader");
let fs = require('fs')

let youtubeDownload = function (type, id, videoID) {
  let autoRestartTimer = setTimeout(() => {
    resertServer()
  }, 60 * 60 * 1000)
  
  return new Promise((resolve, reject) => {
    //Configure YoutubeMp3Downloader with your settings
    let YD = new YoutubeMp3Downloader({
        "ffmpegPath": path.resolve(__dirname, "./ffmpeg.exe"),        // FFmpeg binary location
        "outputPath": path.resolve("./public/podcasts/" + type + '/' + id + '/'),    // Output file location (default: the home directory)
        "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
        "queueParallelism": 1,                  // Download parallelism (default: 1)
        "progressTimeout": 200000000,                // Interval in ms for the progress reports (default: 1000)
        "allowWebm": false                      // Enable download from WebM sources (default: false)
    });

    //Download video and save as MP3 file
    YD.download(videoID, videoID + '.mp3');

    YD.on("finished", function(err, data) {
      clearTimeout(autoRestartTimer)
      resolve(true)
    })

    YD.on("error", async function(error) {
      //reject(error)
      console.trace('youtube download error', type, id, videoID)
      
      if (error == 'ffmpeg exited with code 1: pipe:0: Invalid data found when processing input') {
        console.log('yes')
      }
      
      console.error(error)
      //reject(error)
      resertServer()
      /*
      setTimeout(async () => {
        let result = await youtubeDownload(type, id, videoID)
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

module.exports = youtubeDownload