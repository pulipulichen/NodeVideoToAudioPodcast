/* global __dirname */

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
const fs = use('fs')
const path = use('path')

const { exec } = require("child_process");

let restartCounter = 10

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

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
    
    //if (params.id === 'PLjjrV9IhkIpcIqZiUfkkxgKtoiD517Kdf') {
    //  console.log(this.config)
    //}
    
    // 放著讓它跑
    this.ubFeed = new UBFeedItemsModel(params)
    this.podcastFeed = new PodcastFeedItemsModel(params)
    let feed = await this.ubFeed.getFeed()
    while (feed === null || feed === false) {
      console.error('[FEED] feed is null', params)
      
      await this.sleep(60 * 1000)
      if (restartCounter > 0) {
        restartCounter--
        feed = await this.ubFeed.getFeed()
      }
      else {
        restartServer()
      }
      
      //restartServer()
      //throw Error('feed is null')
      /*
      return new Promise((resolve) => {
        setTimeout(async () => {
          resolve(await this.index({params, response}))
        }, 30 * 1000)
      })
       */
    }
//    console.log(feed.items.map(i => i.title))
    
//    if (params.id === 'PLjjrV9IhkIpcIqZiUfkkxgKtoiD517Kdf') {
//      console.log('feed', feed)
//    }
    
    if (feed !== false && feed !== null) {
      await NodeCacheSqlite.set('feed-index', params, feed)
      //console.log('feed-index', feed.items.map(i => i.title))
      //console.log('before updateItems ===================')
      this.updateItems(feed.items)
      //console.log('after updateItems ===================')
    }
    else {
      console.log('tempFeed')
      let tempFeed = await NodeCacheSqlite.get('feed-index', params)
      if (!tempFeed) {
        return false
      }
    }
    
//    if (feed && feed.items) {
//      console.log('feed items', feed.items.map(i => i.videoID + ' ' + i.title)) 
//    }
    feed.items = await this.podcastFeed.getPodcastItems()
//    console.log('cached items', feed.items.map(i => i.videoID + ' ' + i.title))

    //if (params.id === 'PLjjrV9IhkIpcIqZiUfkkxgKtoiD517Kdf') {
    //  console.log('cached items', feed.items.map(i => i.videoID + ' ' + i.title))
    //}
    
    let podcastOptions = await this.podcastFeed.buildFeedOptions(feed)
    //return podcastOptions
    
    const outputFeed = await PodcastFeedBuilder(podcastOptions)
    //console.log(podcastOptions)
    //
    if (params.id === 'PLjjrV9IhkIpcIqZiUfkkxgKtoiD517Kdf') {
      console.log('outputFeed', outputFeed)
    }
    //
    //return feed
    
    response.header('Content-type', 'text/xml')
    
    return outputFeed
  }
  
  async updateItems (items) {
    if (this.config.type === 'ub-playlist') {
      //console.log('updateItems 1')
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
      
      //console.log('updateItems 2')
      
      // add date to title
      // 2020-11-01T12:30:01.000Z
      
      //console.log(items)
      //console.log(items.map(i => i.title))
      
      //return false
    }
    
    //console.log('updateItems')
    for (let i = 0; i < items.length; i++) {
      //console.log(typeof(items[i].pubDate), items[i].pubDate, items[i].title, items[i].link)
      if (!items[i].pubDate 
              || typeof(items[i].pubDate.startsWith) !== 'function' 
              || items[i].pubDate.startsWith('undefined')) {
        // 嘗試清空快取
        await NodeCacheSqlite.clear('ubinfo', items[i].link)
        
        console.error(items[i])
        throw Error('item has no pubDate')
      }
      
//      let d = moment(items[i].pubDate).format('M.D')
//      items[i].title = '' + d + ']' + items[i].title
    }
    
    //console.log('updateItems 3')
    
    //console.log(items.map(i => i.title))

    let savedItems = await this.podcastFeed.getPodcastItems()
    
    //console.log('savedItems', savedItems)
    //console.log('items', items)
    
    //console.log(this.config.maxItems)
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
      //console.log(items.map(item => item.title))
    }
    //return false 
    
    let maxItems = items.length
    if (maxItems === 0) {
      return false
    }
    else if (maxItems > this.config.maxItems) {
      maxItems = this.config.maxItems
    }
    
    //console.log('updateItems maxItems', maxItems, items.length, savedItems.length)
    for (let i = 0; i < maxItems; i++) {
      let subItems = [items[i]]
      
      //console.log('subitems 1', subItems.map(item => item.title))
      subItems = await this.ubFeed.filterItems(subItems)
      //console.log('subitems 2', subItems.map(item => item.title))
      
      if (subItems.length === 0 && maxItems < items.length) {
        //console.log('')
        maxItems++
        continue
      }
      
      //console.log('items filtered: ' + subItems.length)
      await this.podcastFeed.saveUBItems(subItems)
      //console.log('items filtered saved: ' + subItems.length)
      
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
  
  pull () {
    exec("/app/git-pull.sh", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
    return 'git pull'
  }
}

module.exports = Feed
