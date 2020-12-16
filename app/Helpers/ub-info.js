const request = use('request')
const cheerio = use('cheerio')

const moment = use('moment')

let isLoading = false
let cache = {}

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')

class UBInfo {
  
  load (url) {
    if (url.indexOf('www.y' + 'out' + 'ube.com/channel/') > -1) {
      return this.loadChannel(url)
    }
    else if (url.indexOf('www.y' + 'out' + 'ube.com/playlist?list=') > -1) {
      return this.loadPlaylist(url)
    }
    else {
      return this.loadVideo(url)
    }
  }
  
  sleep (time = 500) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
  
  async loadChannel (url) {
    if (cache[url]) {
      return cache[url]
    }
    
    let html = await NodeCacheSqlite.get(['UBInfo', url], async () => {
      return await this.loadHTML(url)
    })
    
    if (!html) {
      await NodeCacheSqlite.clear(['UBInfo', url])
      //console.error('body html is empty: ' + url)
      //throw new Error('body html is empty: ' + url)
      await this.sleep()
      return await this.loadChannel(url)
    }
    let info = this.parseChannelHTML(html, url)
    cache[url] = info
    return info
  }
  
  async loadVideo (url) {
    if (cache[url]) {
      return cache[url]
    }
    
    let html = await NodeCacheSqlite.get(['UBInfo', url], async () => {
      return await this.loadHTML(url)
    }, 1 * 60 * 60 * 1000)
    let info = this.parseVideoHTML(html, url)
    
    if (info.isOffline) {
      await NodeCacheSqlite.clear(['UBInfo', url])
    }
    
    cache[url] = info
    return info
  }
  
  async loadDuration(url) {
    let info = await this.loadVideo(url)
    return info.duration
  }
  
  async loadPlaylist (url) {
    if (cache[url]) {
      return cache[url]
    }
    
    let html = await NodeCacheSqlite.get(['UBInfo', url], async () => {
      return await this.loadHTML(url)
    })
    let info = this.parsePlaylistHTML(html, url)
    cache[url] = info
    return info
  }
  
  async loadHTML(url) {
    while (isLoading === true) {
      await this.sleep()
      
      if (cache[url]) {
        return false
      }
    }
    
    isLoading = true
    
    return new Promise((resolve) => {
      request(url, (error, response, body) => {
        resolve(body)
        isLoading = false
      });
    })
  }
  
  sliceBetween(text, header, footer) {
    if (typeof(text) !== 'string') {
      return undefined
    }
    
    let startPos = text.indexOf(header)
    if (startPos === -1) {
      return undefined
      startPos = 0
    }
    else {
      startPos = startPos + header.length
    }
    
    let endPos = text.indexOf(footer, startPos)
    if (endPos === -1) {
      return undefined
      endPos = text.length
    }
    
    return text.slice(startPos, endPos)
  }
  
  parseVideoHTML (body, url) {
    
    if (!body) {
      console.error('body is empty: ' + url)
      return {
        isOffline: true
      }
    }
    
    
    let $
    try {
      $ = cheerio.load(body);
    }
    catch (e) {
      try {
        $ = cheerio.load(`<div>${body}</div>`)
      }
      catch (e2) {
        //throw new Error('URL loading error: ' + url)
        console.error('URL loading error: ' + url)
        return {
          isOffline: true
        }
      }
    }
    
    let info = {}
    
    info.isOffline = (body.indexOf('"playabilityStatus":{"status":"LIVE_STREAM_OFFLINE"') > -1
            || body.indexOf('"thumbnailOverlays":[{"thumbnailOverlayTimeStatusRenderer":{"text":{"accessibility":{"accessibilityData":{"label":"LIVE"}},"simpleText":"LIVE"},"style":"LIVE","icon":{"iconType":"LIVE"}}},') > -1
            || body.indexOf('{"subreason":{"simpleText":"This video is private."}') > -1
            || body.indexOf(',"errorScreen":{"playerErrorMessageRenderer":{"subreason":{"simpleText":') > -1)
    
    //info.description = $('meta[itemprop="description"]').eq(0).attr('content')
    info.description = this.sliceBetween(body, `"},"description":{"simpleText":"`, `"},"lengthSeconds":"`)
    if (typeof(info.description) === 'string') {
      info.description = info.description.trim().split('\\n').join('\n').trim()
    }
    
    info.ownerChannelName = this.sliceBetween(body, `","ownerChannelName":"`, `"`)
    info.channelId = $('meta[itemprop="channelId"]').eq(0).attr('content')
    info.channelLink = 'https://www.y' + 'out' + 'ube.com/channel/' + info.channelId
    
    info.channelAvatar = this.sliceBetween(body, `"}}},{"videoSecondaryInfoRenderer":{"owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":[{"url":"`, `"`)
    if (!info.channelAvatar) {
      info.channelAvatar = this.sliceBetween(body, `"{"videoSecondaryInfoRenderer":{"owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":[{"url":"`, `"`)
    }
    if (!info.channelAvatar) {
      info.channelAvatar = this.sliceBetween(body, `{"videoSecondaryInfoRenderer":{"owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":[{"url":"`, `"`)
    }
    
    
    if (info.channelAvatar) {
      try {
        info.channelAvatar = info.channelAvatar.split('=s48-c-k').join('=s1024-c-k')
      }
      catch (e) {
        console.error('cannot found channelAvatar: ' + url, e)
      }
    }
    
    info.duration = moment.duration($('meta[itemprop="duration"]').eq(0).attr('content')).asSeconds()
    
    if (info.duration === 0) {
      info.isOffline = true
    }
    
    info.author_url = $('span[itemprop="author"] > link[itemprop="url"]').eq(0).attr('href')
    info.genre = $('meta[itemprop="genre"]').eq(0).attr('content')
    
    // window["ytInitialPlayerResponse"] = 
    
    // "},"description":{"simpleText":"
    // "},"lengthSeconds":"
    
    return info
  }
  
  parseChannelHTML (body, url) {
    let info = {}
    
    try {
      if (!body) {
        throw new Error('body is empty: ' + url)
      }
      
      var $ = cheerio.load(body);


      info.title = $('meta[name="title"]').eq(0).attr('content')

      info.channelAvatar = this.sliceBetween(body, `"}},"avatar":{"thumbnails":[{"url":"`, `"`)
      //console.log('channelAvatar', body)
      if (!info.channelAvatar) {
        throw new Error('channelAvatar is not found', url)
      }
      info.channelAvatar = info.channelAvatar.split('=s100-c-k').join('=s1024-c-k')
      info.channelAvatar = info.channelAvatar.split('=s48-c-k').join('=s1024-c-k')
      info.thumbnail = info.channelAvatar
    }
    catch (e) {
      console.error('parseChannelHTML error! ', url)
      throw new Error(e)
    }
    
    return info
  }
  
  parsePlaylistHTML (body, url) {
    var $ = cheerio.load(body);
    
    let info = {}
    
    info.title = $('meta[name="title"]').eq(0).attr('content')
    
    info.ownerAvatar = this.sliceBetween(body, `{"videoOwner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":[{"url":"`, `"`)
    info.ownerAvatar = info.ownerAvatar.split('=s100-c-k').join('=s1024-c-k')
    info.ownerAvatar = info.ownerAvatar.split('=s48-c-k').join('=s1024-c-k')
    info.thumbnail = info.ownerAvatar
    
    return info
  }
}

module.exports = new UBInfo()