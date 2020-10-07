'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.get('/test/video-info', 'Test.videoInfo')

Route.get('/local-folder/:name', 'LocalFolder.index')

Route.get('/', 'OPML.index')
Route.get('/list', 'OPML.list')

Route.get('/:type/:id', 'Feed.index')
Route.get('/:name', 'Feed.index')
