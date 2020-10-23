'use strict'
const ChannelConfig = use('App/Helpers/channel-config.js')
const YouTubeFeedParser = use('App/Helpers/youtube-feed-parser.js')
const PodcastFeedBuilder = use('App/Helpers/podcast-feed-builder.js')
const YouTubeVideoIDParser = use('App/Helpers/youtube-video-id-parser.js')

const youtubeInfo = use('App/Helpers/youtube-info.js')

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')

const fs = require('fs')
const getMP3Duration = require('get-mp3-duration')
const { getVideoDurationInSeconds } = require('get-video-duration')
const moment = use('moment')

class YoutubeFeedItemsModel {
  
  constructor (param) {
    this.config = ChannelConfig.get(param)
    
    this.type = this.config.type
    this.id = this.config.id
    this.name = this.config.name
  } 
  
  async getFeed () {
    //const {type, id} = params
    const config = this.config
    if (!config) {
      return false
    }
    
    let feed = await NodeCacheSqlite.get(['CACHE_RETRIEVE_FEED_MINUTES', config.url], async () => {
      return await YouTubeFeedParser(config.url)
    }, Number(Env.get('CACHE_RETRIEVE_FEED_MINUTES'))  * 60 * 1000)
    //let feed = await YouTubeFeedParser(config.url)
    //console.log(feed)
    
    //const items = await this.filterItems(feed.items, config.filters, config.maxItems)
    //feed.items = items
    
    return feed
  }
  
  getItemDir () {
    return './public/podcasts/' + this.type + '/' + this.id + '/' 
  }
  
  getItemPath (videoID) {
    //let {videoID} = item
    if (typeof(videoID) === 'object') {
      if (videoID.videoID) {
        videoID = videoID.videoID
      }
      else if (videoID.item_id) {
        videoID = videoID.item_id
      }
    }
    return this.getItemDir() + videoID + '.mp3'
  }
  
  async getDuration (item) {
    return await NodeCacheSqlite.get(['duration', item.link], async () => {
      item.videoID = YouTubeVideoIDParser(item.link)
      let itemPath = this.getItemPath(item.videoID)
      //console.log('duration', itemPath, fs.existsSync(itemPath))
      if (fs.existsSync(itemPath) === true) {
        if (itemPath.endsWith('.mp3')) {
          const buffer = fs.readFileSync(itemPath)
          const duration = getMP3Duration(buffer)
          return Math.round(duration / 1000)
        }
        else if (itemPath.endsWith('.mp4')) {
          return await getVideoDurationInSeconds(itemPath)
        }
      }
      else {
        return await youtubeInfo.loadDuration(item.link)
      }  
    })
  }
  
  filterTitle (title) {
    let {filters = [], maxItems = 10} = this.config
    
    if (!filters) {
      filters = []
    }
    
    if (Array.isArray(filters) === false 
            && typeof(filters) === 'object') {
      filters = [filters]
    }
    
    let titleKeys = ['titlePrefix', 'titleSuffix', 'titleInclude', 'titleExclude']
    for (let f = 0; f < filters.length; f++) {
      let filter = filters[f]

      let key, value
      Object.keys(filter).forEach(k => {
        key = k
        value = filter[k]
      })

      if (titleKeys.indexOf(key) > -1) {
        title = title.split(value).join(' ')
      }
    }
    return title
  }
  
  async filterItems(items) {
    let {filters = [], maxItems = 10} = this.config
    
    if (!filters) {
      filters = []
    }
    
    if (Array.isArray(filters) === false 
            && typeof(filters) === 'object') {
      filters = [filters]
    }
    
    let outputItems = []
    if (!maxItems || maxItems > items.length) {
      maxItems = items.length
    }
    
    for (let i = 0; i < maxItems; i++) {
      let item = items[i]
      
      let info = await youtubeInfo.load(item.link)
      if (info.isOffline === true) {
        continue
      }
        
      //let videoID = YouTubeVideoIDParser(item.link)
      
      let duration
      let passed = true
      for (let f = 0; f < filters.length; f++) {
        let filter = filters[f]

        let key, value
        Object.keys(filter).forEach(k => {
          key = k
          value = filter[k]
        })
        
        if (key === 'titlePrefix' 
                && !item.title.startsWith(value)) {
          passed = false
          break
        }
        else if (key === 'titleSuffix' 
                && !item.title.endsWith(value)) {
          passed = false
          break
        }
        else if (key === 'titleInclude' 
                && item.title.indexOf(value) === -1) {
          passed = false
          break
        }
        else if (key === 'titleExclude' 
                && item.title.indexOf(value) > -1) {
          passed = false
          break
        }
        else if (key === 'durationMinSec'
                || key === 'durationMaxSec') {
          
          duration = await this.getDuration(item)
          
          if (key === 'durationMinSec' 
                  && duration < value) {
            passed = false
            break
          }
          else if (key === 'durationMaxSec' 
                  && duration > value) {
            passed = false
            break
          }
        }
      } // for (let f = 0; f < filters.length; f++) {
      
      if (passed === true) {
        if (!duration) {
          duration = await this.getDuration(item)
        }
        item.title = this.filterTitle(item.title)
        item.duration = duration
        item.date = item.isoDate
        for (let key in info) {
          item[key] = info[key]
        }
        
//        if (this.config.type === 'youtube-playlist'
//                && this.config.date === 'playlist_sort') {
//          // i
//          
//          //item.date = moment.unix(((new Date()).getTime() - (i * 1000 * 60 * 10)) / 1000)
//          item.date = new Date(new Date().getTime() - (i * 1000 * 60 * 10))
//          //console.log('playlist date', i, (new Date()).getTime() - (i * 1000 * 60 * 10), item.date, item.title)
//        }
        
        if (!item.description) {
          item.description = item.link
        }
        else if (item.description.startsWith(item.link) === false) {
          item.description = item.link + '\n\n' + item.description
        }
        
        if (!item.videoID) {
          item.videoID = YouTubeVideoIDParser(item.link)
        }
        //item.thumbnail = `http://i3.ytimg.com/vi/${item.videoID}/maxresdefault.jpg`
        item.thumbnail = `http://i3.ytimg.com/vi/${item.videoID}/sddefault.jpg`
        
        // http://i3.ytimg.com/vi/FNDgos99-hQ/maxresdefault.jpg
        item.thumbnails = [
          `http://i3.ytimg.com/vi/${item.videoID}/maxresdefault.jpg`,
          `http://i3.ytimg.com/vi/${item.videoID}/1.jpg`,
          `http://i3.ytimg.com/vi/${item.videoID}/2.jpg`,
          `http://i3.ytimg.com/vi/${item.videoID}/3.jpg`,
        ]
        
        item.MIMEType = 'audio/mpeg'
        
        outputItems.push(item)
      }
    }
    
    return outputItems
  }
}

module.exports = YoutubeFeedItemsModel
