let path = require('path')
var YoutubeMp3Downloader = use("youtube-mp3-downloader");

module.exports = function (type, id, videoID) {
  return new Promise((resolve, reject) => {
    //Configure YoutubeMp3Downloader with your settings
    let YD = new YoutubeMp3Downloader({
        "ffmpegPath": path.resolve(__dirname, "./ffmpeg.exe"),        // FFmpeg binary location
        "outputPath": path.resolve("./public/podcasts/" + type + '/' + id + '/'),    // Output file location (default: the home directory)
        "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
        "queueParallelism": 1,                  // Download parallelism (default: 1)
        "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
        "allowWebm": false                      // Enable download from WebM sources (default: false)
    });

    //Download video and save as MP3 file
    YD.download(videoID, videoID + '.mp3');

    YD.on("finished", function(err, data) {
      resolve(true)
    })

    YD.on("error", function(error) {
      reject(error)
    })
  })
}