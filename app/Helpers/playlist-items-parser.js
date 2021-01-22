const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')
const cheerio = use('cheerio')
const request = use('request')

const UBInfo = use('App/Helpers/ub-info.js')

const ChannelConfig = use('App/Helpers/channel-config.js')

let cacheLimit = Number(Env.get('CACHE_RETRIEVE_PLAYLIST_MINUTES'))
//cacheLimit = 0

let cache = {}
let isLoading = false

const TorHTMLLoader = use('App/Helpers/tor-html-loader/tor-html-loader.js')

let sleep = function (time = 100) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

let loadHTML = async function (url) {
  return await TorHTMLLoader.loadHTML(url, cacheLimit * 60 * 1000)
  /*
    while (isLoading === true) {
      await sleep()
      
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
   */
  }

let loadCachedHTML = async function (url) {
  //return await NodeCacheSqlite.get(['UBInfoPlaylist', url], async () => {
    return await loadHTML(url)
  //}, cacheLimit * 60 * 1000)
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

module.exports = async function (url, maxItem = 5) {
  //console.log('1')
  let html
  try {
    html = await loadCachedHTML(url)
  }
  catch (e) {
    return false
  }
  //console.log('2')
  // {"playlistVideoRenderer":
  
  let items = []
  
  let allJSON = sliceBetween(html, `var ytInitialData = `, `;</script>`)
  //console.log(html)
  //console.log(allJSON)
  
  JSON.parse(allJSON).contents.twoColumnBrowseResultsRenderer.tabs[0]
          .tabRenderer.content.sectionListRenderer.contents[0]
          .itemSectionRenderer.contents[0]
          .playlistVideoListRenderer.contents
          .map(item => item.playlistVideoRenderer)
          .filter(item => (item && item.isPlayable))
          .map(item => {
            item.title = item.title.runs[0].text
            item.duration = Number(item.lengthSeconds)
            item.link = `https://www.youtube.com/watch?v=` + item.videoId
    
            if (items.length > maxItem) {
              return false
            }
    
            items.push({
              title: item.title,
              duration: item.duration,
              link: item.link,
              isPlayable: true
            })
    
            return item
          })
  
  //items.reverse()
  
  for (let i = 0; i < items.length; i++) {
    let item = items[i]
    
    let url = item.link
    
    let info = await UBInfo.load(url)
    for (let key in info) {
      items[i][key] = info[key]
    }
  }
  
  //console.log(items.map(item => item.title))
  
  return {
    items
  }
}