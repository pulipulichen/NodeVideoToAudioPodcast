/* global __dirname */

'use strict'

/*
|--------------------------------------------------------------------------
| Http server
|--------------------------------------------------------------------------
|
| This file bootstrap Adonisjs to start the HTTP server. You are free to
| customize the process of booting the http server.
|
| """ Loading ace commands """
|     At times you may want to load ace commands when starting the HTTP server.
|     Same can be done by chaining `loadCommands()` method after
|
| """ Preloading files """
|     Also you can preload files by calling `preLoad('path/to/file')` method.
|     Make sure to pass relative path from the project root.
*/

const { Ignitor } = require('@adonisjs/ignitor')

new Ignitor(require('@adonisjs/fold'))
  .appRoot(__dirname)
  .fireHttpServer()
  .catch(console.error)


const autoLoadChannels = require('./autoLoadChannels.js')
autoLoadChannels()


const fs = require('fs')
const path = require('path')

let resolve = fs.readFileSync('/etc/resolv.conf', 'utf-8')
if (resolve.indexOf('nameserver 8.8.8.8') === -1) {
  resolve = resolve + '\nnameserver 8.8.8.8'
  fs.writeFileSync('/etc/resolv.conf', resolve, 'utf-8')
}
