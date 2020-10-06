'use strict'

const YouTubeInfo = use('App/Helpers/youtube-info.js')

class Test {
  // http://pc.pulipuli.info:43333/test/video-info
  async videoInfo ({response}) {
    //return await YouTubeInfo.loadVideo('https://www.youtube.com/watch?v=7X1ynUhiBM4')
    
    //return await YouTubeInfo.load('https://www.youtube.com/channel/UC4ZrOiHkIykV_yU62-j4GjQ')
    return await YouTubeInfo.load('https://www.youtube.com/playlist?list=PLVcZBhCTYSo2I1oprkgH8Hf74XCeUirXN')
  }
}

module.exports = Test
