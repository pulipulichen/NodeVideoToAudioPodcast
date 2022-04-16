const { exec } = require("child_process");


let UBDL = async function (videoID, outputPath) {
  try {
    return UBDL1(videoID, outputPath)
  }
  catch (e) {
    return UBDL2(videoID, outputPath)
  }
}

let UBDL1 = async function (videoID, outputPath) {
  console.log('[START UBDL1]', videoID, outputPath)
  return new Promise((resolve, reject) => {
    let cmd = 'you' + 'tu' + 'be-dl --extract-audio --audio-format mp3 --output "' + outputPath + '" https://www.you' + 'tu' + 'be.com/watch?v=' + videoID

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        //console.log(`error: ${error.message}`);
        reject(error)
        return;
      }
      if (stderr) {
        reject(error)
        return;
      }
      //console.log(`stdout: ${stdout}`);
      resolve(true)
    });
  })
}

let UBDL2 = async function (videoID, outputPath) {
  console.log('[START UBDL2]', videoID, outputPath)
  return new Promise((resolve, reject) => {
    let cmd = 'you' + 'tu' + 'be-dl -v --ignore-config -x --audio-format mp3 --output "' + outputPath + '" https://www.you' + 'tu' + 'be.com/watch?v=' + videoID

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        //console.log(`error: ${error.message}`);
        reject(error)
        return;
      }
      if (stderr) {
        reject(error)
        return;
      }
      //console.log(`stdout: ${stdout}`);
      resolve(true)
    });
  })
}

module.exports = UBDL