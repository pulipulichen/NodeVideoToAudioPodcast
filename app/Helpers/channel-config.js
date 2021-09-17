let config = use('./../../mount-config/channels.js')

if (!config) {
  config = Use('./channels.example.js')
} 

const Env = use('Env')

let getUBURLID = function (url) {
  
  if (url.indexOf('www.yo' + 'utu' + 'be.com/playlist') > -1) {
    return new URL(url).searchParams.get('list')
  }
  else if (url.indexOf('www.yo' + 'utu' + 'be.com/channel/') > -1) {
    //c.type = 'youtube-channel'
    return url.split('/')[4]
  }
}

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
    if (c.url.indexOf('www.yo' + 'utu' + 'be.com/playlist?list=') > -1) {
      c.type = 'ub-playlist'
    }
    else if (c.url.indexOf('www.yo' + 'utu' + 'be.com/channel/') > -1) {
      c.type = 'ub-channel'
    }
  }
  
  if (!c.id) {
    if (c.name) {
      c.id = c.name
    }
    else if (c.type === 'ub-playlist') {
      c.id = getUBURLID(c.url)
    }
    else if (c.type === 'ub-channel') {
      c.id = getUBURLID(c.url)
    }
  }
  
  if (!c.filters) {
    c.filters = []
  }
  else if (Array.isArray(c.filters) === false 
          && typeof(c.filters) === 'object') {
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
  
  if (c.type === 'ub-playlist') {
    c.feedURL = 'https://www.y' + 'out' + 'ube.com/feeds/videos.xml?playlist_id=' + getUBURLID(c.url)
  }
  else if (c.type === 'ub-channel') {
    c.feedURL = 'https://www.y' + 'out' + 'ube.com/feeds/videos.xml?channel_id=' + getUBURLID(c.url)
  }
  
  configMap[key] = c
}

class ChannelConfig {
  getFirst () {
    return config[0]
  }
  
  get (params) {
    let {type, id, name} = params
  
    if (name && configMap[name]) {
      return configMap[name]
    }

    let url
    if (type === 'ub-playlist') {
      url = 'https://www.y' + 'out' + 'ube.com/playlist?list=' + id
    }
    else if (type === 'ub-channel') {
      url = 'https://www.y' + 'out' + 'ube.com/channel/' + id
    }
    else {
      console.error(params)
      console.trace('Configuration is not found.')
      return undefined
    }

    return configMap[url]
  }
  
  all () {
    return configMap
  }
}

module.exports = new ChannelConfig()