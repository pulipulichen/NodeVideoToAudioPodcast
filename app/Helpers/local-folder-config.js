let rawConfig = require('./../../local-folders.js')
const path = use('path')

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