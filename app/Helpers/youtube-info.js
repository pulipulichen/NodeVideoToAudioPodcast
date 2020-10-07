const request = use('request')
const cheerio = use('cheerio')

const moment = use('moment')

let isLoading = false
let cache = {}

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')

class YouTubeInfo {
  
  load (url) {
    if (url.indexOf('www.youtube.com/channel/') > -1) {
      return this.loadChannel(url)
    }
    else if (url.indexOf('www.youtube.com/playlist?list=') > -1) {
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
    
    let html = await NodeCacheSqlite.get(['YouTubeInfo', url], async () => {
      return await this.loadHTML(url)
    })
    let info = this.parseChannelHTML(html, url)
    cache[url] = info
    return info
  }
  
  async loadVideo (url) {
    if (cache[url]) {
      return cache[url]
    }
    
    let html = await NodeCacheSqlite.get(['YouTubeInfo', url], async () => {
      return await this.loadHTML(url)
    })
    let info = this.parseVideoHTML(html, url)
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
    
    let html = await NodeCacheSqlite.get(['YouTubeInfo', url], async () => {
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
    var $ = cheerio.load(body);
    
    let info = {}
    
    info.isOffline = body.indexOf('"playabilityStatus":{"status":"LIVE_STREAM_OFFLINE"') > -1
    
    //info.description = $('meta[itemprop="description"]').eq(0).attr('content')
    info.description = this.sliceBetween(body, `"},"description":{"simpleText":"`, `"},"lengthSeconds":"`)
    if (typeof(info.description) === 'string') {
      info.description = info.description.trim().split('\\n').join('\n').trim()
    }
    
    info.ownerChannelName = this.sliceBetween(body, `","ownerChannelName":"`, `"`)
    info.channelId = $('meta[itemprop="channelId"]').eq(0).attr('content')
    info.channelLink = 'https://www.youtube.com/channel/' + info.channelId
    
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
    info.author_url = $('span[itemprop="author"] > link[itemprop="url"]').eq(0).attr('href')
    info.genre = $('meta[itemprop="genre"]').eq(0).attr('content')
    
    // window["ytInitialPlayerResponse"] = 
    
    // "},"description":{"simpleText":"
    // "},"lengthSeconds":"
    
    return info
  }
  
  parseChannelHTML (body, url) {
    var $ = cheerio.load(body);
    
    let info = {}
    
    info.title = $('meta[name="title"]').eq(0).attr('content')
    
    info.channelAvatar = this.sliceBetween(body, `"}},"avatar":{"thumbnails":[{"url":"`, `"`)
    info.channelAvatar = info.channelAvatar.split('=s100-c-k').join('=s1024-c-k')
    info.channelAvatar = info.channelAvatar.split('=s48-c-k').join('=s1024-c-k')
    info.thumbnail = info.channelAvatar
    
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

module.exports = new YouTubeInfo()