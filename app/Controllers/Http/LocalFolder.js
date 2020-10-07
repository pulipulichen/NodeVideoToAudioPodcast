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

class LocalFolder {
  // http://pc.pulipuli.info:43333/local-folder/aaa
  async index ({ params }) {
    let {name} = params
    this.config = LocalFolderConfig.get(name)
    
    //console.log(config)
    let items = await NodeCacheSqlite.get(['LocalFolder', this.config.name, 'items'], async () => {
      return await this.getItems()
    }, 1000)
    
    //return items.map(i => i.title)
    
    let options = this.buildFeedOptions(items)
    //return options
    
    const outputFeed = await PodcastFeedBuilder(options)
    
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
    
    let items = []
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      let item = await NodeCacheSqlite.get(['LocalFolder', this.config.name, file], async () => {
        return {
          filepath: file,
          title: this.getTitle(file),
          description: this.getDescription(file),
          duration: this.getDuration(file),
          thumbnail: this.getThumbnail(file),
          author: this.getAuthor(file),
          dateUnix: this.getModifiedDateUnix(file),
          date: this.getModifiedDate(file),
          audioURL: this.getAudioURL(file)
        }
      })
      items.push(item)
    }
    
    items = this.sortItems(items)
    
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
    return this.config.item_thumbnail
  }
  
  getDuration (file) {
    let itemPath = this.getFilePath(file)
    const buffer = fs.readFileSync(itemPath)
    const duration = getMP3Duration(buffer)
    return Math.round(duration / 1000)
  }
  
  getFilePath (file) {
    return path.resolve(this.config.dirpath + file)
  }
  
  getModifiedDate (file) {
    if (typeof(this.config.item_date) === 'function') {
      return this.config.item_date(file)
    }
    
    let itemPath = this.getFilePath(file)
    const stats = fs.statSync(itemPath)
    let mtime = stats.mtime
    return mtime
  }
  
  getModifiedDateUnix (file) {
    let mtime = this.getModifiedDate(file)
    return moment(mtime).unix()
  }
  
  getAudioURL (file) {
    return Env.get('APP_URL') + '/podcasts/local-folders/' + this.config.name + '/' + file
  }
  
  sortItems (items) {
    //console.log(items)
    return items.sort((a, b) => {
      if (this.config.order === 'filename') {
        if (a.filepath < b.filepath) {
          return 1
        }
        else {
          return -1
        }
      }
      else {
        return (b.dateUnix - a.dateUnix)
      }
    })
  }
}

module.exports = LocalFolder
