const { exec } = require("child_process");
const fs = require("fs")

let errorCounter = 0

let UBDL = async function (videoID, outputPath) {
  try {
    return await UBDL1(videoID, outputPath)
  }
  catch (e) {
    try {
      return await UBDL2(videoID, outputPath)
    }
    catch (e) {
      errorCounter++

      if (errorCounter >= 20) {
        await updateUBDL()
      }

      return false
    }
    
  }
}

let UBDL1 = async function (videoID, outputPath) {
  console.log('[START UBDL1]', videoID, outputPath)
  return new Promise((resolve, reject) => {
    let cmd = 'you' + 'tu' + 'be-dl --extract-audio --audio-format mp3 --output "' + outputPath + '" https://www.you' + 'tu' + 'be.com/watch?v=' + videoID

    exec(cmd, (error, stdout, stderr) => {
      /*
      if (error) {
        //console.log(`error: ${error.message}`);
        reject(error)
        return;
      }
      if (stderr) {
        reject(error)
        return;
      }
      */
      if (fs.existsSync(outputPath)) {
        resolve(true)
      }
      else {
        reject(error)
      }
      //console.log(`stdout: ${stdout}`);
      
    });
  })
}

let UBDL2 = async function (videoID, outputPath) {
  console.log('[START UBDL2]', videoID, outputPath)
  return new Promise((resolve, reject) => {
    let cmd = 'you' + 'tu' + 'be-dl -v --ignore-config -x --audio-format mp3 --output "' + outputPath + '" https://www.you' + 'tu' + 'be.com/watch?v=' + videoID

    exec(cmd, (error, stdout, stderr) => {
      if (fs.existsSync(outputPath)) {
        resolve(true)
      }
      else {
        reject(error)
      }
      //console.log(`stdout: ${stdout}`);
      resolve(true)
    });
  })
}

let updateUBDL = async function () {
  console.log('[UPDATE UBDL]', videoID, outputPath)
  return new Promise((resolve, reject) => {
    let cmd = 'wget https://yt-dl.org/downloads/latest/yo' + 'utu' + 'be-dl -O /usr/local/bin/yo' + 'utu' + 'be-dl; chmod a+rx /usr/local/bin/yo' + 'utu' + 'be-dl'

    exec(cmd, (error, stdout, stderr) => {
      resolve(true)
    });
  })
}
module.exports = UBDL