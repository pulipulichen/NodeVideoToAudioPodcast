'use strict'

const ChannelConfig = use('App/Helpers/channel-config.js')
const ubInfo = use('App/Helpers/ub-info.js')
const Env = use('Env')

//const ChannelConfig = use('App/Helpers/channel-config.js')

class OPML {
  async index ({response}) {
    let configs = await this.getConfigs()
    
    // -------------
    
    let output = []
    let opmlTitle = Env.get('title')
    
    output.push(`<?xml version="1.0" encoding="UTF-8" standalone='no' ?>
    <?xml-stylesheet href="${Env.get('APP_URL')}/styles/opml.css" type="text/css"?>
<opml version="2.0">
    <head>
        <title>${opmlTitle}</title>
    </head>
    <body>`)
    
    configs.forEach(({title, feedLink}) => {
      output.push(`<outline text="${title}" xmlUrl="${feedLink}" />`)
    })
    
    output.push(`</body>
</opml>`)
    
    
    response.header('Content-type', 'text/xml')
    response.header('Content-Disposition', `attachment;filename="${opmlTitle}.opml"`)
    
    return output.join('\n')
  }
  
  async getConfigs () {
    let configsMap = ChannelConfig.all()
    
    let keys = Object.keys(configsMap)
    let configs = []
    for (let i = 0; i < keys.length; i++) {
      let config = configsMap[keys[i]]
      let {title, url, feedLink, filters} = config
      
      if (!title) {
        //console.log('load: ' + config.url)
        title = await this.getConfigTitle(config)
      }
      
      configs.push({
        title,
        feedLink
      })
    }
    
    return configs
  }
  
  async getLocalFolders () {
    
    let configs = []
    
    const LocalFolderConfig = use('App/Helpers/local-folder-config')
    LocalFolderConfig.all().forEach(config => {
      let title = config.title
      let feedLink = config.feedLink
      
      configs.push({
        title,
        feedLink
      })
    })
    
    return configs
  }
  
  async list () {
    let configs = await this.getConfigs()
    let localFolders = await this.getLocalFolders()
    
    // --------------------------
    
    let output = []
    let opmlTitle = Env.get('title')
    
    output.push(`<!DOCTYPE html>
<html>
  <head>
    <title>${opmlTitle}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <h1><a href="/">${opmlTitle}</a></h1>
    <h2><a href="/dl" target="_blank">Download</a></h2>
    <form action="/rss" method="get">
      <label>
        RSS URL
        <input type="url" />
      </label>
    </form>
    <hr />
    <ul>`)
    
    configs.forEach(({title, feedLink}) => {
      output.push(`<li><a href="${feedLink}">${title}</a></li>`)
    })
    
    output.push(`</ul>
    <hr />
<ul>`)
    
    localFolders.forEach(({title, feedLink}) => {
      output.push(`<li><a href="${feedLink}">${title}</a></li>`)
    })
    
    output.push(`</ul></body>
</html>
`)
    
    return output.join('\n')
  }
  
  async getConfigTitle (config) {
    if (config.title) {
      return config.title
    }
    
    let title = config.title
    if (!title) {
      //console.log('ub info load: ' + config.url)
      let info = await ubInfo.load(config.url)
      title = info.title
    }
    
    let filterAppend = []
    
    let {filters} = config
    
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
      if (title) {
        title = title + '(' + filterAppend.join(', ') + ')'
      }
      else {
        title = filterAppend.join(', ')
      }
    }
    return title
  }
}

module.exports = OPML
