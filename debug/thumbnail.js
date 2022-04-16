const requestImageSize = require('request-image-size');
 
requestImageSize('http://nodejs.org/images/logo.png')
.then(size => console.log(size))
.catch(err => console.error(err));