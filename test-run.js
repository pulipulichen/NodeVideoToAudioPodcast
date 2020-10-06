let YouTubeFeedParser = require('./youtube-feed-parser.js');

(async () => {
  console.log(await YouTubeFeedParser('https://www.youtube.com/playlist?list=PLKnvkZ00-pHrmEr4FbvzMueT5p7bdc18-'))
  
  console.log(await YouTubeFeedParser('https://www.youtube.com/channel/UCLzWMcpNlhHo0c0yOyWksvQ'))
})()
