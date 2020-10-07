const {Sequelize, Model, DataTypes, Op} = require('sequelize')
class Cache extends Model {
}

let _this = {}

_this.inited = false

_this.sequelize = null
_this.lastCleanTime = (new Date()).getTime()
//_this.cleanInterval = 3 * 60 * 1000
_this.cleanInterval = 100

let sleep = function (time = 100) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

let isLoading = false

_this.init = async function () {
  if (_this.inited === true) {
    return true
  }

  _this.sequelize = new Sequelize({
    host: 'localhost',
    dialect: 'sqlite',

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    storage: './database/node-cache.sqlite',
    operatorsAliases: 0,
    logging: false,
    transactionType: 'IMMEDIATE'
  })

  Cache.init({
    key: DataTypes.STRING,
    value: DataTypes.STRING,
    type: DataTypes.STRING,
    expire: DataTypes.NUMBER
  }, {
    sequelize: this.sequelize,
    modelName: 'cache',
    timestamps: false,
  });

  await _this.sequelize.sync()

  _this.inited = true
}

/**
 * 
 * @param {type} key
 * @param {type} value
 * @param {type} expire 單位是毫秒
 * @returns {_this.set.originalValue|_this.set.value}
 */
_this.set = async function (key, value, expire = null) {
  await _this.init()
  
  if (typeof (key) !== 'string') {
    if (typeof (key) === 'function') {
      key = await key()
    }
    key = JSON.stringify(key)
  }

  let type = typeof (value)
  if (type === 'function') {
    value = await value()
    type = typeof (value)
  }
  let originalValue = value
  if (type !== 'string') {
    value = JSON.stringify(value)
  }


  while (isLoading === true) {
    //console.log('cache wait while set')
    await sleep()
  }
  //console.log('cache load by set')
  isLoading = true

  const [cache, created] = await Cache.findOrCreate({
    where: {key},
    defaults: {
      value,
      expire,
      type
    }
  })
  
  isLoading = false

  if (created === false) {
    cache.value = value
    cache.expire = _this.calcExpire(expire)
    cache.type = type
    await cache.save()
  }

  await _this.autoClean()

  isLoading = false
  return originalValue
}

_this.autoClean = async function () {
  let time = (new Date()).getTime()

  if (_this.lastCleanTime + _this.cleanInterval > time) {
    return false
  }
  /*
  
  */
  while (isLoading === true) {
    //console.log('cache wait while autoClean')
    await sleep()
  }
  //console.log('cache load by autoClean')
  isLoading = true
  
  await Cache.destroy({
    where: {
      [Op.and]: [
        {expire: {
            [Op.not]: null
          }},
        {expire: {
            [Op.lt]: time
          }}
      ]
    }
  })
  isLoading = false

  _this.lastCleanTime = time
  
  //isLoading = false
  return true
}

/**
 * 
 * @param {Number} expire 單位是毫秒
 * @returns {NodeCacheSqlite.calcExpire.time|Number}
 */
_this.calcExpire = function (expire) {
  let time = (new Date()).getTime()

  time = time + expire

  return time
}

_this.get = async function (key, value, expire) {
  await _this.init()


  if (typeof (key) !== 'string') {
    if (typeof (key) === 'function') {
      key = await key()
    }
    key = JSON.stringify(key)
  }

  await _this.autoClean()

  
  while (isLoading === true) {
    //console.log('cache wait while get')
    await sleep()
  }
  //console.log('cache load by get')
  isLoading = true
  
  let cache = await Cache.findOne({
    where: {
      key
    }
  })
  isLoading = false

  if (cache === null) {
    isLoading = false
    if (value !== undefined) {
      return await _this.set(key, value, expire)
    }
    return undefined
  }

  let cachedValue = cache.value
  if (cache.type !== 'string') {
    cachedValue = JSON.parse(cachedValue)
  }

  return cachedValue
}

module.exports = _this