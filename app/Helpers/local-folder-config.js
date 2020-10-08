let rawConfig = require('./../../local-folders.js')
const path = use('path')
const Env = use('Env')

class LocalFolderConfig {
  constructor () {
    this.initConfig()
  }
  
  initConfig () {
    this.config = {}
    
    rawConfig.forEach((c, i) => {
      let name = path.basename(c.dirpath)
      c.name = name
      
      if (c.dirpath.startsWith('./') === false) {
        c.dirpath = './' + c.dirpath
      }
      if (c.dirpath.endsWith('./') === false) {
        c.dirpath = c.dirpath + '/'
      }
      
      if (!c.title) {
        c.title = name
      }
      
      if (!c.order) {
        c.order = 'desc'
      }
      c.order = c.order.toLowerCase()
      
      c.feed_link = Env.get('APP_URL') + '/local-folder/' + name + '.xml'
      c.feedLink = Env.get('APP_URL') + '/local-folder/' + name + '.xml'
      
      // ---------------
      
      this.config[name] = c
    })
    
    //console.log(this.config)
  }
  
  get (name) {
    return this.config[name]
  }
  
  all () {
    return rawConfig
  }
}

module.exports = new LocalFolderConfig()