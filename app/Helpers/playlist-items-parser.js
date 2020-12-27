const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')
const cheerio = use('cheerio')
const request = use('request')

let cacheLimist = Number(Env.get('CACHE_RETRIEVE_FEED_MINUTES'))
cacheLimist = 0

let cache = {}
let isLoading = false

let loadHTML = async function (url) {
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

let loadCachedHTML = async function (url) {
  return await NodeCacheSqlite.get(['UBInfoPlaylist', url], async () => {
    return await loadHTML(url)
  }, cacheLimist * 60 * 1000)
} 

let buildCheerio = function (url, html) {
  let $
  try {
    $ = cheerio.load(html);
  } catch (e) {
    try {
      $ = cheerio.load(`<div>${html}</div>`)
    } catch (e2) {
      //throw new Error('URL loading error: ' + url)
      console.error('URL loading error: ' + url)
      return false
    }
  }
  
  return $
}

let sliceBetween = function (text, header, footer) {
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

module.exports = async function (url) {
  let html = await loadCachedHTML(url)
  
  // {"playlistVideoRenderer":
  
  let items = []
  
  let allJSON = sliceBetween(html, `var ytInitialData = `, `;</script>`)
  //console.log(html)
  
  JSON.parse(allJSON).contents.twoColumnBrowseResultsRenderer.tabs[0]
          .tabRenderer.content.sectionListRenderer.contents[0]
          .itemSectionRenderer.contents[0]
          .playlistVideoListRenderer.contents
          .map(item => item.playlistVideoRenderer)
          .filter(item => item.isPlayable)
          .map(item => {
            item.title = item.title.runs[0].text
            item.duration = Number(item.lengthSeconds)
            item.link = `https://www.youtube.com/watch?v=` + item.videoId
    
            items.push({
              title: item.title,
              duration: item.duration,
              link: item.link
            })
    
            return item
          })
  
  //items.reverse()
  
  return {
    items
  }
}