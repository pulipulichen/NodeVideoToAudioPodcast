/* global __dirname */

let path = require('path')
//var UBMp3Downloader = use("./UBMp3Downloader.js") // 這裡是大問題，可能要從這裡來修改
//var UBMp3Downloader = use("yo" + "ut" + "ube-mp3-downloader") // 這裡是大問題，可能要從這裡來修改
var UBMp3Downloader = use("App/Helpers/ub-mp3-downloader/lib/UBMp3Downloader.js") // 這裡是大問題，可能要從這裡來修改
let fs = require('fs')
let nodemailer = require('nodemailer')

var npm = require('npm');

const TorHTMLLoader = use('App/Helpers/tor-html-loader/tor-html-loader.js')

let gotError = false

let socks5Agent = require('socks5-https-client/lib/Agent');
const { platform } = require('os');

const Env = use('Env')
//const DEBUG_PREVENT_DOWNLOAD = (Env.get('DEBUG_PREVENT_DOWNLOAD') === 'true')
const DEBUG_DOWNLOAD_AGENT = (Env.get('DEBUG_DOWNLOAD_AGENT') === 'true')

let ubDownload = function (type, id, videoID) {
  let sendMail = async () => {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"NodeVideoToAudioPodcast Bot" <bot@node-video-to-audio-podcast.github.com>', // sender address
      to: "pulipuli.chen@gmail.com", // list of receivers
      subject: "NodeVideoToAudioPodcast Auto Restart Notification", // Subject line
      text: "Please check the problem.", // plain text body
      //html: "<b>Hello world?</b>", // html body
    });
    
    
  }
  
  let updatePackage = () => {
    //console.log('auto restart: update yout' + 'ub' + 'e-mp' + '3-dow' + 'nlo' + 'ader')
    console.log('auto restart: update y' + 'td' + 'l-core')
    npm.load(function(err) {
      // handle errors
      //console.log('keep on error, ')

      // install module ffi
      //npm.commands.install(['yout' + 'ub' + 'e-mp' + '3-dow' + 'nlo' + 'ader'], function(er, data) {
      npm.commands.install(['y' + 'td' + 'l-core'], function(er, data) {
        // log errors or data
        
        console.error('auto restart')
        resertServer()
      });

      npm.on('log', function(message) {
        // log installation progress
        console.log(message);
      });
    });
  }
  
  let autoRestartTimer = setTimeout(() => {
    if (gotError === false) {
      return false
    }
    
    //sendMail()
    updatePackage()
  }, 60 * 60 * 1000)
  
  return new Promise(async (resolve, reject) => {
    let agent
    
    if (DEBUG_DOWNLOAD_AGENT === true) {
      agent = await TorHTMLLoader.getAgent()
    }
    
    //let agent = await TorHTMLLoader.getAgent()
    //console.log(agent)
    
    //Configure Yo utu beMp 3Down l oad er with your settings
    let options = {
      //"ffmpegPath": path.resolve(__dirname, "./ffmpeg.exe"),        // FFmpeg binary location
      "ffmpegPath": 'ffmpeg',        // FFmpeg binary location
      "outputPath": path.resolve("./mount-public/podcasts/" + type + '/' + id + '/'),    // Output file location (default: the home directory)
      "queueParallelism": 1,                  // Download parallelism (default: 1)
      "progressTimeout": 200000000,                // Interval in ms for the progress reports (default: 1000)
      "allowWebm": false,                      // Enable download from WebM sources (default: false)
      'maxRetries': 10,
      'requestOptions': {
        agent: agent, 
//        strictSSL: false,
//        agentClass: socks5Agent,
//        agentOptions: {
//          socksHost: '127.0.0.1', // Defaults to 'localhost'.
//          socksPort: 9050, // Defaults to 1080.
//          // Optional credentials
//          //socksUsername: 'proxyuser',
//          //socksPassword: 'p@ssw0rd',
//          },
        //secure:false,
        headers: {
          //'User-Agent': 'Request-Promise'
//          'User-Agent': 'node.js',
//          secure: false,
//          strictSSL: false,
        }
      }
    }

    if (platform === 'linux') {
      options.ffmpegPath = 'ffmpeg'
    }
    
    options['y' + 'ou' + 'tu' + 'beVideoQuality'] = 'highestaudio' // Desired video quality (default: highestaudio)
    
    let YD = new UBMp3Downloader(options);

    YD.on("finished", function(err, data) {
      clearTimeout(autoRestartTimer)
      gotError = false
      
//      if (DEBUG_PREVENT_DOWNLOAD === true) {
//        throw Error('[DEBUG] download ok')
//      }
      
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
      
      //console.log('ERROR: ', typeof(error))
      //console.log(error.toString())
      
      if (error.toString() === 'Error: Status code: 429') {
        gotError = true
        
        TorHTMLLoader.killTor()
        
        console.trace(error)
        return reject({
          message: 'Access deny',
          sourceURL,
          videoURL: 'https://www.you' + 'tu' + 'be.com/watch?v=' + videoID
        })
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
      gotError = true
      //console.error(error)
      reject(error)
      
      if (error.message && error.message.Error && error.message.Error.startsWith('write EPROTO')) {
        updatePackage()
      }
      
      //resertServer()
      /*
      setTimeout(async () => {
        let result = await ubDownload(type, id, videoID)
        resolve(result)
      }, 3000)
       */
    })
    
    //Download video and save as MP3 file
    YD.download(videoID, videoID + '.mp3');

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