/* global __dirname */

'use strict'

const ChannelConfig = use('App/Helpers/channel-config.js')
const UBFeedParser = use('App/Helpers/ub-feed-parser.js')
const PodcastFeedBuilder = use('App/Helpers/podcast-feed-builder.js')
const UBVideoIDParser = use('App/Helpers/ub-video-id-parser.js')
const UBMP3Downloader = use('App/Helpers/ub-mp3-downloader/index.js')

const ubInfo = use('App/Helpers/ub-info.js')

const sleep = use('App/Helpers/sleep.js')
const tryToRestartServer = use('App/Helpers/try-to-restart-server/try-to-restart-server.js')

const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')
const Env = use('Env')

const {Sequelize, Model, DataTypes, Op} = require('sequelize')
class FeedItem extends Model {}

let sequelize
let alldownloadedCounter = 100

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

let isDownloading = false

const moment = use('moment')

const getMP3Duration = require('get-mp3-duration')

let cacheEnable = null

class PodcastFeedItemsModel {
  
  constructor (param) {
    if (!param) {
      this.config = ChannelConfig.getFirst()
    }
    else {
      this.config = ChannelConfig.get(param)
    }
    
    this.type = this.config.type
    this.id = this.config.id
    this.name = this.config.name
    
    //console.log(this.config)
  }
  
  async initFeedItems() {
    if (sequelize) {
      return false
    }
    sequelize = new Sequelize({
      host: 'localhost',
      dialect: 'sqlite',

      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      storage: './mount-database/feed-item.sqlite',
      operatorsAliases: 0,
      logging: false,
      transactionType: 'IMMEDIATE'
    })

    FeedItem.init({
      feed_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      feed_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      feed_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      item_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      item_status: {
        type: DataTypes.STRING,
        /**
         * 狀態
         * 0: 等待處理
         * 1: 處理中
         * 2: 準備完成
         * 3: 可以移除了
         */
        defaultValue: 0
      },
      item_info: DataTypes.STRING,
      created_at: {
        type: DataTypes.NUMBER,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.NUMBER,
        allowNull: false
      },
    }, {
      sequelize: sequelize,
      modelName: 'feed_items',
      timestamps: false,
    });

    tryToRestartServer(async () => {
      await sequelize.sync()
    })
    
    return true
  }
  
  async processItems (feed) {
    let ubItems = feed.items
    let podcastItems = []
    
    await this.initFeedItems()
    
    await this.saveUBItems(ubItems)
    this.startDownloadItems()
    podcastItems = await this.getPodcastItems()
    //this.startDeleteExpiredItems()
    
    feed.items = podcastItems
  }
  
  async saveUBItems (ubItems) {
    if (Array.isArray(ubItems) === false) {
      return true
    }
    
    let maxItems = ubItems.length
    if (maxItems > this.config.maxItems) {
      maxItems = this.config.maxItems
    }
    
    //let dataArray = []
    
    for (let i = 0; i < maxItems; i++) {
      let item = ubItems[i]
      
      if (item.playlistDate) {
        item.date = item.playlistDate
      }
      let time = moment(item.date).unix() * 1000
      
      await FeedItem.findOrCreate({
        where: {
          feed_type: this.type,
          feed_id: this.id,
          feed_name: this.name,
          item_id: item.videoID
        },
        defaults: {
          item_info: JSON.stringify(item),
          created_at: time,
          updated_at: time
        }
      })
    }
    
    this.startDownloadItems()
  }
  
  async getPodcastItems() {
    await this.initFeedItems()
    
    let feedItems = await FeedItem.findAll({
      where: {
        'feed_type': this.type,
        'feed_id': this.id,
        'feed_name': this.name,
        'item_status': 2
      },
      order: [['created_at', 'DESC']],
      //limit: this.config.maxItems
    })
    
    
    let podcastItems = []
    
    //console.log(feedItems.length)
    for (let i = 0; i < feedItems.length; i++) {
      let item = feedItems[i]
      let info = JSON.parse(item.item_info)
      //console.log(info.date + ' ' + info.title) 
      if (i < this.config.maxItems) {
        
        //console.log(info.date + ' ' + info.title) 
        //console.log(info)
        podcastItems.push(info)
        continue
      }
      
      item.item_status = 3
      
      tryToRestartServer(async () => {
        item.save()
      })
      
    }
    
    //console.log('==[podcastItems]========')
    //console.log(podcastItems)
    
    return podcastItems
  }
  
  async startDownloadItems () {
    //if (typeof(FeedItem.findOne) !== 'function') {
      await this.initFeedItems()
    //}
    
    if (isDownloading === true) {
      return false
    }
    
    isDownloading = true
    let item = await FeedItem.findOne({
      where: {
        'item_status': 0
      },
      order: [['created_at', 'DESC']],
    })
    
    if (item === null) {
      
      //let waitDownloadFailedItemsIntervalMin = 10
      let waitDownloadFailedItemsIntervalMin = 0
      setTimeout(() => {
        isDownloading = false
        this.startDownloadFailedItems()
      }, waitDownloadFailedItemsIntervalMin * 60 * 1000)
      //this.startDeleteExpiredItems()
      return true
    }
    
    //console.log('== item =============')
    //console.log(item)
    
    let url = 'https://www.yo' + 'ut' + 'ube.com/watch?v=' + item.item_id
    let info = await ubInfo.load(url)
    //console.log(url, 'isOffline', info.isOffline)
    
    let dateString = info.date
    if (typeof(dateString) === 'string') {
      dateString = dateString.slice(0, 10)
    }
    else {
      dateString = info.pubDate
    }
    
    if (typeof(dateString) === 'string') {
      dateString = dateString.slice(0, 10)
    }
    else {
      dateString = info.isoDate
    }
    
    if (typeof(dateString) === 'string') {
      dateString = dateString.slice(0, 10)
    }
    
    //console.log(dateString)
    
    //console.log(info)
    if (info.isOffline === true) {
//      item.item_status = 1
//      let time = moment(item.date).unix()
//      item.updated_at = time
      await item.destroy()
      
      setTimeout(() => {
        isDownloading = false 
        this.startDownloadItems()
      }, 3000)
      return false
    }    
        
    let itemPath = this.getItemPath(item)
    let absoluteItemPath = path.resolve(__dirname, '../.' + itemPath)
    
    let itemPathDate = this.getItemPath(item, dateString)
    let absoluteItemPathDate = path.resolve(__dirname, '../.' + itemPathDate)
    
    if (fs.existsSync(absoluteItemPathDate) === false 
            && fs.existsSync(absoluteItemPath) === true) {
      fs.renameSync(absoluteItemPath, absoluteItemPathDate)
    }
    
    console.log('Normal: ', absoluteItemPathDate, fs.existsSync(absoluteItemPathDate), 'checkDurationMatch', this.isDurationMatch (absoluteItemPathDate, item))
    
    if (fs.existsSync(absoluteItemPathDate) === false 
            || this.isDurationMatch (itemPathDate, item) === false) {
      item.item_status = 1
      let time = moment(item.date).unix()
      item.updated_at = time
      tryToRestartServer(async () => {
        await item.save()
      })
      await this.downloadItem(itemPathDate, item)
    }
    item.item_status = 2
    
    tryToRestartServer(async () => {
      await item.save()
    })
    isDownloading = false
    this.startDownloadItems()
  }
  
  async startDownloadFailedItems () {
    //if (typeof(FeedItem.findOne) !== 'function') {
    await this.initFeedItems()
    //}
    
    if (isDownloading === true) {
      return false
    }
    
    isDownloading = true
    let item = await FeedItem.findOne({
      where: {
        'item_status': 1
      },
      order: [['updated_at', 'ASC']],
    })
    
    if (item === null) {
      setTimeout(() => {
        isDownloading = false
      }, 3000)
      //this.startDeleteExpiredItems()
      console.log('All video are downloaded: ' + alldownloadedCounter)
      
      alldownloadedCounter--
      if (alldownloadedCounter === 0) {
        setTimeout(() => {
          restartServer()
        }, 60 * 1000)
      }
      return true
    }
    
    //console.log('== item =============')
    //console.log(item)
    
    
    let url = 'https://www.yo' + 'ut' + 'ube.com/watch?v=' + item.item_id
    let info = await ubInfo.load(url)
    console.log(url, 'isOffline', info.isOffline)
    if (info.isOffline === true) {
      //item.item_status = 1
      //let time = moment(item.date).unix()
      //item.updated_at = time
      await item.destroy()
      setTimeout(() => {
        isDownloading = false 
        this.startDownloadItems() 
      }, 3000)
      return false
    }
    
    let itemPath = this.getItemPath(item)
    let absoluteItemPath = path.resolve(__dirname, '../.' + itemPath)
    
    let itemPathDate = this.getItemPath(item, dateString)
    let absoluteItemPathDate = path.resolve(__dirname, '../.' + itemPathDate)
    
    if (fs.existsSync(absoluteItemPathDate) === false 
            && fs.existsSync(absoluteItemPath) === true) {
      fs.renameSync(absoluteItemPath, absoluteItemPathDate)
    }
    
    console.log('Failed:', absoluteItemPathDate, fs.existsSync(absoluteItemPathDate), 'checkDurationMatch', this.isDurationMatch (absoluteItemPathDate, item))

    if (fs.existsSync(absoluteItemPathDate) === false 
          || this.isDurationMatch (itemPathDate, item) === false) {
      //item.item_status = 1
      let time = moment(item.date).unix()
      item.updated_at = time
      tryToRestartServer(async () => {
        await item.save()
      })
      await this.downloadItem(itemPathDate, item)
    }
    item.item_status = 2
    tryToRestartServer(async () => {
      await item.save()
    })
    isDownloading = false
    this.startDownloadItems()
  }
  
  isDurationMatch (itemPath, item) {
    if (fs.existsSync(itemPath) === false) {
      return false
    }
    
    const buffer = fs.readFileSync(itemPath)
    let duration = getMP3Duration(buffer)
    duration = Math.ceil(duration / 1000)
    
    let info = JSON.parse(item.item_info)
    //console.log(info)
    console.log('isDurationMatch', info.duration, duration, (Math.abs(info.duration - duration) < 60))
    return (Math.abs(info.duration - duration) < 60)
  }
  
  async downloadItem (itemPath, item) {
    let info = JSON.parse(item.item_info)   
    console.log('[' + moment().format('hh:mm:ss') + '] START download (duration: ' + info.duration + ')' +': ' + itemPath + ' https://www.yo' + 'ut' + 'ube.com/watch?v=' + item.item_id)
    //item.item_status = 1
    //await item.save()
    await this.mkdir(item)

    try {
      await UBMP3Downloader(item.feed_type, item.feed_name, item.item_id)
      console.log('[' + moment().format('hh:mm:ss') + '] END download: ' + itemPath)
    }        
    catch (e) {
      //console.error('download fail: ' + e)
      await item.destroy()
      
      isDownloading = false
      
      setTimeout(() => {
        this.startDownloadItems()
      }, 3000 * 100000)
      //console.error(e)
      throw e
      //throw new Exception(e)
      return false
    }
    //console.log('end download: ' + item.item_id)
  }
  
  async mkdir(item) {
    await mkdirp(this.getItemDir(item))
  }
  
  async startDeleteExpiredItems () {
    let expiredItems = await FeedItem.findAll({
      where: {
        'item_status': 3
      }
    })
    
    for (let i = 0; i < expiredItems.length; i++) {
      let item = expiredItems[i]
      let itemPath = this.getItemPath(item)
      
      if (fs.existsSync(itemPath)) {
        fs.unlinkSync(itemPath)
      }
      await item.destroy()
    }
    
    if (expiredItems.length > 0) {
      this.startDeleteExpiredItems()
    }
  }
  
  getItemPath (item, dateString) {
    if (!dateString || dateString === '') {
      return this.getItemDir(item) + item.item_id + '.mp3'
    }
    else {
      return this.getItemDir(item) + dateString + '-' + item.item_id + '.mp3'
    }
  }
  
  getItemDir (item) {
    let type, name
    if (item && item.feed_type) {
      type = item.feed_type
      name = item.feed_name
    }
    else {
      type = this.type
      name = this.name
    }
    
    return './mount-public/podcasts/' + type + '/' + name + '/' 
  }
  
  getConfigTitle (feed) {
    let config = this.config
    if (config.title) {
      return config.title
    }
    
    let title = feed.title
    
    let filterAppend = []
    
    let {filters} = this.config
    
    if (!filters) {
      return title
    }
    
    if (Array.isArray(filters) === false 
            && typeof(filters) === 'object') {
      filters = [filters]
    }
    
    filters.forEach((filter) => {
      let key, value
      Object.keys(filter).forEach(k => {
        key = k
        value = filter[k]
      })

      if (key === 'titlePrefix') {
        filterAppend.push(value + '...')
      }
      else if (key === 'titleSuffix') {
        filterAppend.push('...' + value)
      }
      else if (key === 'titleInclude') {
        filterAppend.push('...' + value + '...')
      }
      else if (key === 'durationMinSec') {
        filterAppend.push('> ' + value)
      }
      else if (key === 'durationMaxSec') {
        filterAppend.push('< ' + value)
      }
    })
    
    if (filterAppend.length > 0) {
      title = title + '(' + filterAppend.join(', ') + ')'
    }
    return title
  }
  
  async buildFeedOptions (feed) {
    //await this.processItems(feed)
    
    let config = this.config
    //console.log(feed)
    
    let options = {}
    
    for (let key in config) {
      options[key] = config[key]
    }
    
    options.title = this.getConfigTitle(feed)
    options.link = config.url
    options.feedLink = Env.get('APP_URL') + '/' + this.type + '/' + this.name
    
    if (config.title) {
      options.title = config.title
    }
    
    if (config.description) {
      options.description = config.description
    }
    else {
      options.description = options.link
    }
    
    if (config.thumbnail) {
      options.thumbnail = config.thumbnail
    }
    else {
      let info = await ubInfo.load(options.link)
      options.thumbnail = info.thumbnail
    }
    
    if (options.thumbnail.indexOf('=s100-c-k-') > -1) {
      // https://www.meersworld.net/2020/06/how-to-see-full-size-youtube-account-picture.html
      options.thumbnail = options.thumbnail.split('=s100-c-k-').join('=s1024-c-k-')
    }
    
    if (config.thumbnailBorderColor) {
      // https://yt3.ggpht.com/a/AATXAJxjIiembTJcisZKRuvcc3Uu5RzGcYlnDz6FrkSz=s1024-c-k-c0x00ffffff-no-rj
      // https://yt3.ggpht.com/a/AATXAJxjIiembTJcisZKRuvcc3Uu5RzGcYlnDz6FrkSz=s1024-b100-c-k-c0xff0000-rj
      options.thumbnail = options.thumbnail.split('=s1024-c-k-').join('=s1024-b100-c-k-')
      options.thumbnail = options.thumbnail.split('c0x00ffffff-no-rj').join(`c0x00${config.thumbnailBorderColor}-no-rj`)
    }
    
    //console.log(feed.items)
    if (Array.isArray(feed.items)) {
      options.items = []
      
      let maxItems = feed.items.length
      if (maxItems > this.config.maxItems) {
        maxItems = this.config.maxItems
      }
      for (let i = 0; i < maxItems; i++) {
        let item = feed.items[i]
        
        //console.log(item)
        
        //console.log(info)
        
        //item.date = item.isoDate
        item.mediaURL = this.getItemURL(item.
                videoID),

        options.items.push(item)
      }
    }
    
    return options
  }
  
  getItemURL (videoID) {
    //return 'http://pc.pulipuli.info:43333/podcasts/audio.mp3'
    return Env.get('APP_URL') + '/podcasts/' + this.type + '/' + this.name + '/' + videoID + '.mp3'
  }
  
}

let restartServer = function () {
  let content = JSON.stringify({
    date: (new Date()).getTime()
  })
  console.log('restart server...')
  fs.writeFile(path.resolve(__dirname, 'restart-trigger.json'), content, () => {
    
  })
}

module.exports = PodcastFeedItemsModel
