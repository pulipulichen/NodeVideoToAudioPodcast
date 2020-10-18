'use strict'

// http://pc.pulipuli.info:43333/youtube-playlist/PLKnvkZ00-pHoryIGQYEKFLnFbAi-B_dxd
const ChannelConfig = use('App/Helpers/channel-config.js')
const YouTubeFeedParser = use('App/Helpers/youtube-feed-parser.js')
const PodcastFeedBuilder = use('App/Helpers/podcast-feed-builder.js')
const YouTubeVideoIDParser = use('App/Helpers/youtube-video-id-parser.js')

const youtubeInfo = use('App/Helpers/youtube-info.js')

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')

const YoutubeFeedItemsModel = use('App/Models/YoutubeFeedItemsModel')
const PodcastFeedItemsModel = use('App/Models/PodcastFeedItemsModel')

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
    this.youtubeFeed = new YoutubeFeedItemsModel(params)
    let feed = await this.youtubeFeed.getFeed()
    
    this.updateItems(feed.items)
    
    this.podcastFeed = new PodcastFeedItemsModel(params)
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
    let maxItems = items.length
    if (maxItems > this.config.maxItems) {
      maxItems = this.config.maxItems
    }
    
    if (this.config.type === 'youtube-playlist'
            && this.config.date === 'playlist_sort') {
      items.reverse()
    }
    
    for (let i = 0; i < maxItems; i++) {
      let subItems = [items[i]]
      
      subItems = await this.youtubeFeed.filterItems(subItems)
      
      if (subItems.length === 0 && maxItems < items.length) {
        maxItems++
        continue
      }
      
      //console.log('items filtered: ' + items.length)
      await this.podcastFeed.saveYouTubeItems(subItems)
      
      if (this.config.type === 'youtube-playlist') {
        await this.sleep(300)
      }
    }
  }
  
  sleep (ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Feed
