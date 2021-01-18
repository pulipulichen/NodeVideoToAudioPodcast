const {Sequelize, Model, DataTypes, Op} = require('sequelize')

const EXPIRE_RANGE_MINUTE = 60

class Cache extends Model {
}

let _this = {}
let enableCache = true

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
    createdTime: DataTypes.NUMBER,
    expireTime: DataTypes.NUMBER
  }, {
    sequelize: this.sequelize,
    modelName: 'cache',
    timestamps: false,
  });

  await _this.sequelize.sync()

  _this.inited = true
}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

_this.adjustExpire = function (expire) {
  if (typeof(expire) === 'number') {
    expire = expire + randomIntFromInterval(0, EXPIRE_RANGE_MINUTE * 60 * 1000)
  }
  
  return expire
}

/**
 * 
 * @param {type} key
 * @param {type} value
 * @param {type} expire 單位是毫秒
 * @returns {_this.set.originalValue|_this.set.value}
 */
_this.set = async function (key, value, expire = null) {
  //console.log(expire)
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
  if (enableCache === false) {
    return originalValue
  }
  if (type !== 'string') {
    value = JSON.stringify(value)
  }

  while (isLoading === true) {
    //console.log('cache wait while set')
    await sleep()
  }
  //console.log('cache load by set')
  isLoading = true

  expire = _this.adjustExpire(expire)

  const [cache, created] = await Cache.findOrCreate({
    where: {key},
    defaults: {
      value,
      createdTime: (new Date()).getTime(),
      expireTime: _this.calcExpire(expire),
      type
    }
  })
  
  //console.log(cache)
  
  isLoading = false

  if (created === false) {
    cache.value = value
    //cache.createdTime = _this.calcExpire(expire)
    cache.createdTime = (new Date()).getTime()
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
        {expireTime: {
            [Op.not]: null
          }},
        {expireTime: {
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

_this.getExists = async function (key, value, expire) {
  let result = await _this.get(key, value, expire)
  
  if (!result) {
    //console.log('[CACHE] getExists 準備刪除')
    await this.clear(key)
    //return await _this.get(key, value, expire)
  }
  return result
}

_this.get = async function (key, value, expire) {
  await _this.init()


//  if (expire === 0) {
//    expire = undefined
//  }

  if (typeof (key) !== 'string') {
    if (typeof (key) === 'function') {
      key = await key()
    }
    key = JSON.stringify(key)
  }
  
  //console.log(expire)
  
  await _this.autoClean()

  
  while (isLoading === true) {
    //console.log('cache wait while get')
    await sleep()
  }
  //console.log('cache load by get')
  isLoading = true
  let cache = null
  if (enableCache === true) {
    cache = await Cache.findOne({
      where: {
        key
      }
    })
  }
  isLoading = false
  /*
  if (key === '["LocalFolder","harry-potter-and-the-sorcerers-stone","items"]') {
    console.log([
      (cache === null),
      expire,
      cache.expire,
      (new Date()).getTime(),
      (cache.expire < (new Date()).getTime())
    ])
  }
  */
 
  expire = _this.adjustExpire(expire)
 
//  if (cache !== null) {
//    console.log(key)
//    console.log(cache.createdTime, expire, ((new Date()).getTime()) - cache.createdTime
//      , (cache === null),  (expire === null || expire === undefined)
//      , (!cache.createdTime || ((new Date()).getTime()) - cache.createdTime > expire))
//  }
  if ( (cache === null) 
          || ( (expire !== null && expire !== undefined) && (!cache.createdTime || ((new Date()).getTime()) - cache.createdTime > expire) ) ) {
//    console.log('要確認了嗎？', value)
    if (value !== undefined) {
//      console.log('要讀取了嗎？', value)
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

_this.clear = async function (key) {
  await _this.init()


  if (typeof (key) !== 'string') {
    if (typeof (key) === 'function') {
      key = await key()
    }
    key = JSON.stringify(key)
  }

  while (isLoading === true) {
    //console.log('cache wait while get')
    await sleep()
  }
  //console.log('cache load by get')
  isLoading = true
  
  await Cache.destroy({
    where: {
      key
    }
  })
  isLoading = false
  
  console.log('[CACHE] clear cache: ' + key)
  return true
}

module.exports = _this