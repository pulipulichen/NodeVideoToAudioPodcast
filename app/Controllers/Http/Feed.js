'use strict'

const ChannelConfig = use('App/Helpers/channel-config.js')
//const UBFeedParser = use('App/Helpers/ub-feed-parser.js')
const PodcastFeedBuilder = use('App/Helpers/podcast-feed-builder.js')
const UBVideoIDParser = use('App/Helpers/ub-video-id-parser.js')

const ubInfo = use('App/Helpers/ub-info.js')

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')

const UBFeedItemsModel = use('App/Models/UBFeedItemsModel')
const PodcastFeedItemsModel = use('App/Models/PodcastFeedItemsModel')

const moment = use('moment')

class Feed {
  async index ({ params, response }) {
    if (params.id && params.id.endsWith('.xml')) {
      params.id = params.id.slice(0, -4)
    }
    if (params.name && params.name.endsWith('.xml')) {
      params.name = params.name.slice(0, -4)
    }
    
    if (params.name === 'favicon.ico') {
      return false
    }
    
    this.config = ChannelConfig.get(params)
    
    // 放著讓它跑
    this.ubFeed = new UBFeedItemsModel(params)
    this.podcastFeed = new PodcastFeedItemsModel(params)
    let feed = await this.ubFeed.getFeed()
    if (feed === null) {
      throw Error('feed is null')
    }
    //console.log(feed.items.map(i => i.title))
    
    if (feed !== false && feed !== null) {
      await NodeCacheSqlite.set(['Feed.index', params], feed)
      //console.log(feed.items.map(i => i.title))
      this.updateItems(feed.items)
    }
    else {
      let tempFeed = await NodeCacheSqlite.get(['Feed.index', params])
      if (!tempFeed) {
        return false
      }
    }
    
//    if (feed && feed.items) {
//      console.log(feed.items.map(i => i.videoID + ' ' + i.title)) 
//    }
    feed.items = await this.podcastFeed.getPodcastItems()
    //console.log(feed.items.map(i => i.videoID + ' ' + i.title))
    
    let podcastOptions = await this.podcastFeed.buildFeedOptions(feed)
    //return podcastOptions
    
    const outputFeed = await PodcastFeedBuilder(podcastOptions)
    //console.log(podcastOptions)
    //return feed
    
    response.header('Content-type', 'text/xml')
    
    return outputFeed
  }
  
  async updateItems (items) {
    if (this.config.type === 'ub-playlist') {
      
      if (this.config.date === 'playlist_sort') {
        //items.reverse()
        
        let now = new Date().getTime()
        //item.date = new Date(new Date().getTime() - (i * 1000 * 60 * 10))
        for (let i = 0; i < items.length; i++) {
          let date = new Date(now - (i * 1000 * 60 * 10)).toISOString()
          //date = moment(date).toString()
          items[i].date = date
          items[i].pubDate = date
          items[i].isoDate = date
          items[i].playlistDate = date
        }
      }
      else {
        items.sort((a, b) => {
          if (a.pubDate === b.pubDate) {
            return 0
          }
          
          if (!a.pubDate || a.pubDate.startsWith('undefined')) {
            return 1
          }
          else if (!b.pubDate || b.pubDate.startsWith('undefined')) {
            return -1
          }
          //console.log('A: ' + a.pubDate + ' - B: ' + b.pubDate)
          try {
            let timeA = moment(a.pubDate).unix()
            let timeB = moment(b.pubDate).unix()  
            return timeB - timeA
          }
          catch (e) {
            console.error(e)
            console.error('A: ' + a.pubDate + ' - B: ' + b.pubDate)
          } 
          return 0
        })
      }
      
      // add date to title
      // 2020-11-01T12:30:01.000Z
      
      //console.log(items)
      //console.log(items.map(i => i.title))
      
      //return false
    }
    
    for (let i = 0; i < items.length; i++) {
      if (!items[i].pubDate 
              || typeof(items[i].pubDate.startsWith) !== 'function' 
              || items[i].pubDate.startsWith('undefined')) {
        // 嘗試清空快取
        await NodeCacheSqlite.clear(['UBInfo', items[i].link])
        
        console.error(items[i])
        throw Error('item has no pubDate')
      }
      
//      let d = moment(items[i].pubDate).format('M.D')
//      items[i].title = '' + d + ']' + items[i].title
    }
    
    //console.log(items.map(i => i.title))

    let savedItems = await this.podcastFeed.getPodcastItems()
    if (savedItems.length >= this.config.maxItems) {
      //console.log(savedItems)
      //console.log(savedItems.map(i => i.title))
      
      let firstSavedItem = savedItems[0]
      
      let firstSavedItemTime
      if (firstSavedItem.isoDate) {
        firstSavedItemTime = moment(firstSavedItem.isoDate).unix()
      }
      else {
        firstSavedItemTime = moment(firstSavedItem.pubDate).unix()
      }
      //console.log(firstSavedItemTime)
      
      items = items.filter(item => {
        //console.log(item.title, item.isoDate, moment(item.isoDate).unix())
        if (item.isoDate) {
          return (moment(item.isoDate).unix() > firstSavedItemTime)
        }
        else {
          return (moment(item.pubDate).unix() > firstSavedItemTime)
        }
      })
      //console.log(firstItem.title, moment(firstItem.isoDate).unix())
      //console.log(items[0].title, moment(items[0].isoDate).unix())
      //console.log(items)
    }
    //return false 
    
    let maxItems = items.length
    if (maxItems === 0) {
      return false
    }
    else if (maxItems > this.config.maxItems) {
      maxItems = this.config.maxItems
    }
    
    //console.log('updateItems maxItems', maxItems)
    for (let i = 0; i < maxItems; i++) {
      let subItems = [items[i]]
      
      subItems = await this.ubFeed.filterItems(subItems)
      
      if (subItems.length === 0 && maxItems < items.length) {
        //console.log('')
        maxItems++
        continue
      }
      
      //console.log('items filtered: ' + items.length)
      await this.podcastFeed.saveUBItems(subItems)
      
      if (this.config.type === 'ub-playlist') {
        await this.sleep(300)
      }
    }
  }
  
  sleep (ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  dl () {
    let podcastFeed = new PodcastFeedItemsModel()
    podcastFeed.startDownloadFailedItems()
    return 'go download'
  }
}

module.exports = Feed
