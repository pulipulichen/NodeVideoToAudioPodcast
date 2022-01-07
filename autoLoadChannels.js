const axios = require("axios");

let intervalHour = 6
let intervalMS = intervalHour * 60 * 60 * 1000

const autoLoadChannels = async function () {
  let req = await axios.get('http://127.0.0.1/rss-list')
  let list = req.data
  console.log(list)
  
  execLoad(list)
  setInterval(() => {
    execLoad(list)
  }, intervalMS)
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


const execLoad = async function (list) {
  list = [].concat(list)
  shuffle(list)
  for (let i = 0; i < list.length; i++) {
    let uri = list[i]
    let url = 'http://127.0.0.1' + uri
    console.log('self loading: ' + uri)
    await axios(url)
  }
}

module.exports = autoLoadChannels