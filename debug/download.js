var YoutubeMp3Downloader = require("./../app/Helpers/ub-mp3-downloader/lib/UBMp3Downloader.js");

//Configure YoutubeMp3Downloader with your settings
var YD = new YoutubeMp3Downloader({
    "ffmpegPath": "ffmpeg",        // FFmpeg binary location
    "outputPath": ".",    // Output file location (default: the home directory)
    "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
    "queueParallelism": 2,                  // Download parallelism (default: 1)
    "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
    "allowWebm": false                      // Enable download from WebM sources (default: false)
});

//Download video and save as MP3 file
// https://www.youtube.com/watch?v=omMYvC2au2w&list=PLKnvkZ00-pHrmEr4FbvzMueT5p7bdc18-&index=2&t=1s
YD.download("omMYvC2au2w");

YD.on("finished", function(err, data) {
    console.log(JSON.stringify(data));
});

YD.on("error", function(error) {
    console.log(error);
})

YD.on("progress", function(progress) {
    console.log(JSON.stringify(progress));
});