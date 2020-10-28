let Parser = require('rss-parser')
const parser = new Parser()
let parserLock = false

const UBURLtoFeedURL = function (url) {
  
  // https://www.youtube.com/playlist?list=PLKnvkZ00-pHoryIGQYEKFLnFbAi-B_dxd
  // https://www.youtube.com/feeds/videos.xml?playlist_id=YOURPLAYLISTIDHERE
  // https://www.youtube.com/feeds/videos.xml?playlist_id=PLKnvkZ00-pHrmEr4FbvzMueT5p7bdc18-
  
  let feedURL
  let urlObject = new URL(url);
  let params = urlObject.searchParams
  
  if (url.startsWith('https://www.youtube.com/playlist?list=')
          && params.has('list')) {
    feedURL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + params.get('list')
  }
  
  // https://www.youtube.com/channel/UCLzWMcpNlhHo0c0yOyWksvQ
  // https://www.youtube.com/feeds/videos.xml?channel_id=UCGSfK5HeiIhuFfXoKE47TzA
  // https://www.youtube.com/feeds/videos.xml?channel_id=PulipuliChen
  
  if (url.startsWith('https://www.youtube.com/channel/')) {
    let channelID = urlObject.pathname
    channelID = channelID.slice(channelID.lastIndexOf('/') + 1)
    feedURL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelID
  }
  
  return feedURL
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const UBFeedParser = async function (url) {
  let feedURL = UBURLtoFeedURL(url)
  if (!feedURL) {
    return undefined
  }
  
  while (parserLock === true) {
    console.log('parser is loading. URL is waiting: ' + url)
    await sleep(1000)
  }
  
  parserLock = true
  let result = await parser.parseURL(feedURL)
  parserLock = false
  
  return result
}

module.exports = UBFeedParser

