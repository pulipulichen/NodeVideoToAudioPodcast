let config = use('./../../channels.js')

if (!config) {
  config = Use('./channels.example.js')
} 

const Env = use('Env')

let configMap = {}
for (let i = 0; i < config.length; i++) {
  let c = config[i]
  let key = c.url
  if (c.name) {
    key = c.name
  }
  
  if (!c.maxItems) {
    c.maxItems = 10
  }
  
  if (!c.type) {
    if (c.url.indexOf('www.youtube.com/playlist?list=') > -1) {
      c.type = 'youtube-playlist'
    }
    else if (c.url.indexOf('www.youtube.com/channel/') > -1) {
      c.type = 'youtube-channel'
    }
  }
  
  if (!c.id) {
    if (c.name) {
      c.id = c.name
    }
    else if (c.type === 'youtube-playlist') {
      c.id = c.url.slice(c.url.lastIndexOf('=') + 1)
    }
    else if (c.type === 'youtube-channel') {
      c.id = c.url.slice(c.url.lastIndexOf('/') + 1)
    }
  }
  
  if (!c.filters) {
    c.filters = []
  }
  else if (Array.isArray(c.filters)) {
    c.filters = [c.filters]
  }
  
  if (c.name) {
    c.feedLink = Env.get('APP_URL') + '/' + c.name + '.xml'
  }
  else {
    c.feedLink = Env.get('APP_URL') + '/' + c.type + '/' + c.id + '.xml'
  }
  
  if (!c.name && c.id) {
    c.name = c.id
  }
  
  if (c.thumbnailBorderColor) {
    if (c.thumbnailBorderColor.startsWith('#')) {
      c.thumbnailBorderColor = c.thumbnailBorderColor.slice(1)
    }
    c.thumbnailBorderColor = c.thumbnailBorderColor.toUpperCase()
  }
  
  if (c.type === 'youtube-playlist') {
    c.feedURL = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + c.id
  }
  else if (c.type === 'youtube-channel') {
    c.feedURL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + c.id
  }
  
  configMap[key] = c
}

class ChannelConfig {
  get (params) {
    let {type, id, name} = params
  
    if (name && configMap[name]) {
      return configMap[name]
    }

    let url
    if (type === 'youtube-playlist') {
      url = 'https://www.youtube.com/playlist?list=' + id
    }
    else if (type === 'youtube-channel') {
      url = 'https://www.youtube.com/channel/' + id
    }
    else {
      return undefined
    }

    return configMap[url]
  }
  
  all () {
    return configMap
  }
}

module.exports = new ChannelConfig()