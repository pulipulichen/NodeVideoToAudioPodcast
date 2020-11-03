'use strict'

const ChannelConfig = use('App/Helpers/channel-config.js')
const UBFeedParser = use('App/Helpers/ub-feed-parser.js')
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
    
    this.config = ChannelConfig.get(params)
    
    // 放著讓它跑
    this.ubFeed = new UBFeedItemsModel(params)
    this.podcastFeed = new PodcastFeedItemsModel(params)
    let feed = await this.ubFeed.getFeed()
    this.updateItems(feed.items)
    
    feed.items = await this.podcastFeed.getPodcastItems()
    //console.log(feed.items)
    
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
          let date = new Date(now - (i * 1000 * 60 * 10))
          items[i].date = date
          items[i].pubDate = date
          items[i].isoDate = date
        }
      }
      else {
        items.sort((a, b) => {
          let timeA = moment(a.pubDate).unix()
          let timeB = moment(b.pubDate).unix()
          return timeB - timeA
        })
      }
      
      //console.log(items)
      
      //return false
    }
    
    let savedItems = await this.podcastFeed.getPodcastItems()
    if (savedItems.length >= this.config.maxItems) {
      //console.log(savedItems)
      let firstSavedItem = savedItems[0]
      let firstSavedItemTime = moment(firstSavedItem.isoDate).unix()
      items = items.filter(item => {
        return (moment(item.isoDate).unix() > firstSavedItemTime)
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
