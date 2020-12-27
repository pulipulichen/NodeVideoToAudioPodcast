let Parser = require('rss-parser')
const parser = new Parser()
let parserLock = false

const PlaysterItemsParser = use('App/Helpers/playlist-items-parser.js')

const UBURLtoFeedURL = function (url) {
  
  let feedURL
  let urlObject = new URL(url);
  let params = urlObject.searchParams
  
  if (url.startsWith('https://www.y' + 'out' + 'ube.com/playlist?list=')
          && params.has('list')) {
    feedURL = 'https://www.y' + 'out' + 'ube.com/feeds/videos.xml?playlist_id=' + params.get('list')
  }
  
  if (url.startsWith('https://www.y' + 'out' + 'ube.com/channel/')) {
    let channelID = urlObject.pathname
    channelID = channelID.slice(channelID.lastIndexOf('/') + 1)
    feedURL = 'https://www.y' + 'out' + 'ube.com/feeds/videos.xml?channel_id=' + channelID
  }
  
  return feedURL
}

function sleep(ms, maxMs) {
  if (typeof(maxMs) === 'number') {
    let range = [ms, maxMs].sort()
    ms = getRandomInt(range[0], range[1])
  }
  
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let currentFeedURL = ''

const UBFeedParser = async function (url) {
  let feedURL = UBURLtoFeedURL(url)
  if (!feedURL) {
    return undefined
  }
  
  if (feedURL.indexOf('?playlist_id=') > -1) {
    return await PlaysterItemsParser(url)
  }
  
//  while (parserLock === true) {
//    console.log('Parser is loading: ' + currentFeedURL +'\nURL is waiting: ' + url)
//    await sleep(1000, 3000)
//  }
  if (parserLock === true) {
    return undefined
  }
  
  parserLock = true
  currentFeedURL = feedURL
  let result
  try {
    result = await parser.parseURL(feedURL)
  }
  catch (e) {
    console.error(e)
    parserLock = false
    
    return false
  }
  parserLock = false
  
  return result
}

module.exports = UBFeedParser

