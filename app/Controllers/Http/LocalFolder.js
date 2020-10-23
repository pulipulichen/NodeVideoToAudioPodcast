'use strict'

const path = use('path')
const recursive = use("recursive-readdir")

const LocalFolderConfig = use('App/Helpers/local-folder-config')
const NodeCacheSqlite = use('App/Helpers/node-cache-sqlite.js')

const fs = use('fs')
const getMP3Duration = use('get-mp3-duration')
const moment = use('moment')

const Env = use('Env')

const PodcastFeedBuilder = use('App/Helpers/podcast-feed-builder.js')

const { getVideoDurationInSeconds } = require('get-video-duration')

let cacheExpire = null

class LocalFolder {
  // http://pc.pulipuli.info:43333/local-folder/aaa
  async index ({ params, response }) {
    let {name} = params
    if (name.endsWith('.xml')) {
      name = name.slice(0, -4)
    }
    
    this.config = LocalFolderConfig.get(name)
    
    //console.log(config)
    let items = await NodeCacheSqlite.get(['LocalFolder', this.config.name, 'items'], async () => {
      return await this.getItems()
    }, 24 * 60 * 60 * 1000)
    
    //return items.map(i => i.title)
    
    let options = this.buildFeedOptions(items)
    //return options
    
    const outputFeed = await PodcastFeedBuilder(options)
    
    response.header('Content-type', 'text/xml')
    //console.log(podcastOptions)
    //return feed
    return outputFeed
  }
  
  buildFeedOptions (items) {
    let options = {}
    
    for (let key in this.config) {
      options[key] = this.config[key]
    }
    
    options.thumbnail = this.config.feed_thumbnail
    options.feedLink = this.config.feed_link
    options.link = this.config.feed_link
    
    options.items = items
    return options
  }
  
  async getItems () {
    
    //let dirpath = './public/podcasts/local-folders/ivy/'
    let dirpath = this.config.dirpath
    //console.log(path.basename(dirpath))
    
    let files = await recursive(dirpath, ['*.html'])
    files = this.removeDirPathOverlap(files)
    
    this.subtitles = files.filter(f => f.endsWith('.srt') || f.endsWith('.ssa'))
    //console.log(this.subtitles)
    
    let items = []
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      if (file.endsWith(this.config.ext) === false) {
        continue
      }
      
      let item = await NodeCacheSqlite.get(['LocalFolder', this.config.name, file], async () => {
        return {
          filepath: file,
          title: this.getTitle(file),
          description: this.getDescription(file),
          duration: await this.getDuration(file),
          thumbnail: this.getThumbnail(file),
          author: this.getAuthor(file),
          dateUnix: this.getModifiedDateUnix(file),
          date: this.getModifiedDate(file, i),
          mediaURL: this.getMediaURL(file),
          subtitles: this.getSubtitles(file),
        }
      }, cacheExpire)
      items.push(item)
    }
    
    items = this.sortItems(items)
    if (this.config.sort === 'filename'
            || this.config.sort === 'filename-number') {
      let dirPath = this.getFilePath('/')
      const stats = fs.statSync(dirPath)
      let mtime = stats.mtime
      items = items.map((item, i) => {
        item.date = moment(mtime).subtract(i, 'day')
        return item
      })
    }
    
    return items
    
    /*
    files.sort((a, b) => {
      if (a < b) {
        return 1
      }
      else {
        return -1
      }
    })
    */
    //console.log(files)
    
    /*
    recursive("some/path", function (err, files) {
      // `files` is an array of file paths
      console.log(files);
    });
     */
    //return 'ok: ' + path.resolve(dirpath)
    
  }
  
  removeDirPathOverlap (files) {
    let dirpath = this.config.dirpath
    if (dirpath.startsWith('./')) {
      dirpath = dirpath.slice(2)
    }
    if (dirpath.endsWith('/') === false) {
      dirpath = dirpath + '/'
    }
    
    return files.map(f => {
      return f.slice(dirpath.length - 1).split(path.sep).join('/')
    })
  }
  
  getTitle (file) {
    let metadata = this.config.metadata
    if (metadata === 'file') {
      return file.split(path.sep).join('-')
    }
    else {
      return file.split(path.sep).join('-')
    }
  }
  
  getAuthor (file) {
    return this.config.name
  }
  
  getDescription (file) {
    return file
  }
  
  getThumbnail (file) {
    if (!this.config.item_thumbnail 
            && this.config.feed_thumbnail) {
      return this.config.feed_thumbnail
    }
    
    return this.config.item_thumbnail
  }
  
  async getDuration (file) {
    let itemPath = this.getFilePath(file)
    
    if (itemPath.endsWith('.mp3')) {
      const buffer = fs.readFileSync(itemPath)
      const duration = getMP3Duration(buffer)
      return Math.round(duration / 1000)
    }
    else if (itemPath.endsWith('.mp4')) {
      return await getVideoDurationInSeconds(itemPath)
    }
  }
  
  getFilePath (file) {
    return path.resolve(this.config.dirpath + file)
  }
  
  getModifiedDate (file, i) {
    if (typeof(this.config.item_date) === 'function') {
      return this.config.item_date(file)
    }
    
    let itemPath = this.getFilePath(file)
    /*
    if (this.config.sort === 'filename') {
      itemPath = this.getFilePath('/')
      //console.log(itemPath)
    }
     */
    
    const stats = fs.statSync(itemPath)
    let mtime = stats.mtime
    
    /*
    if (this.config.sort === 'filename') {
      mtime = moment(mtime).add(i, 'hours')
      //console.log(i, file, mtime)
    }
     */
    
    return mtime
  }
  
  getModifiedDateUnix (file) {
    let mtime = this.getModifiedDate(file)
    return moment(mtime).unix()
  }
  
  getMediaURL (file) {
    return Env.get('APP_URL') + '/podcasts/local-folders/' + this.config.name + '/' + this.encodeFileName(file)
  }
  
  encodeFileName (file) {
    //console.log(file)
    //console.log(file.split('/').map(f => encodeURIComponent(f)).join('/'))
    return file.split('/').map(f => encodeURIComponent(f)).join('/')
  }
  
  getSubtitles (file) {
    //let itemPath = this.getFilePath(file)
    let itemPathWithoutExt = file.slice(0, file.lastIndexOf('.'))
    let subtitles = this.subtitles.filter(f => {
      return f.startsWith(itemPathWithoutExt)
    }).map(f => {
      let title = f.slice(itemPathWithoutExt.length, f.lastIndexOf('.'))
      return {
        title,
        url: Env.get('APP_URL') + '/podcasts/local-folders/' + this.config.name + '/' + this.encodeFileName(f)
      }
    })
    
    while (subtitles.length > 1) {
      let firstChar = subtitles[0].title.substr(0, 1)
      let isDifferent = false
      for (let i = 1; i < subtitles.length; i++) {
        if (firstChar !== subtitles[i].title.substr(0, 1)) {
          isDifferent = true
          break
        }
      }
      if (isDifferent === true) {
        break
      }
      else {
        for (let i = 0; i < subtitles.length; i++) {
          subtitles[i].title = subtitles[i].title.substr(1)
        }
      }
    }
    //console.log(subtitles)
    return subtitles
  }
  
  sortItems (items) {
    //console.log(items)
    return items.sort((a, b) => {
      if (this.config.sort === 'filename') {
        
        let aFilepaths = a.filepath.toLowerCase().split('/')
        let bFilepaths = b.filepath.toLowerCase().split('/')
        
        for (let i = 0; i < aFilepaths.length; i++) {
          let aFilepath = aFilepaths[i]
          let bFilepath = bFilepaths[i]
          let order
          
          if (aFilepath === bFilepath) {
            continue
          }
          
          if (!bFilepath) {
            order = true
          }
          else if (!aFilepath) {
            order = false
          }
          else {
            order = (aFilepath < bFilepath)
          }
          if (this.config.order === 'asc') {
            order = !(order)
          }

          //console.log([order, aFilepath, bFilepath])
          if (order) {
            return 1
          }
          else {
            return -1
          }
        }
      }
      else if (this.config.sort === 'filename-number') {
        
        let aFilepaths = a.filepath.toLowerCase().split('/')
        let bFilepaths = b.filepath.toLowerCase().split('/')
        
        for (let i = 0; i < aFilepaths.length; i++) {
          let aFilepath = aFilepaths[i]
          if (aFilepath.lastIndexOf('.') > -1) {
            aFilepath = aFilepath.slice(0, aFilepath.lastIndexOf('.'))
          }
          aFilepath = aFilepath.replace(/\D/g,'')
          
          let bFilepath = bFilepaths[i]
          if (bFilepath.lastIndexOf('.') > -1) {
            bFilepath = bFilepath.slice(0, bFilepath.lastIndexOf('.'))
          }
          bFilepaths = bFilepaths.replace(/\D/g,'')
          let order
          
          if (aFilepath === bFilepath) {
            continue
          }
          
          if (!bFilepath || bFilepath === '') {
            order = true
          }
          else if (!aFilepath || aFilepath === '') {
            order = false
          }
          else {
            order = (Number(aFilepath) < Number(bFilepath))
          }
          if (this.config.order === 'asc') {
            order = !(order)
          }

          //console.log([order, aFilepath, bFilepath])
          if (order) {
            return 1
          }
          else {
            return -1
          }
        }
      }
      else {
        return (b.dateUnix - a.dateUnix)
      }
    })
  }
}

module.exports = LocalFolder
