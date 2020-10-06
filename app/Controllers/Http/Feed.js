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
  async index ({ params }) {
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
    return outputFeed
  }
  
  async updateItems (items) {
    let maxItems = items.length
    if (maxItems > this.config.maxItems) {
      maxItems = this.config.maxItems
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
    }
  }
}

module.exports = Feed
