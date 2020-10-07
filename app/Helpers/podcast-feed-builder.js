const { http, https } = require('follow-redirects')
const linkifyUrls = require('linkify-urls');

const getRedirectedURL = function (url) {
  return new Promise((resolve, reject) => {
    let protocal = http
    if (url.startsWith('https://')) {
      protocal = https
    }
    
    protocal.get(url, response => {
      resolve(response.responseUrl)
    }).on('error', err => {
      reject(err);
    });
  })
}

module.exports = async function (options) {
  let output = []
  
  if (!options.author) {
    options.author = options.title
  }
  
  if (!options.language) {
    options.language = 'en-us'
  }
  
  if (!options.thumbnail) {
    // https://unsplash.it/800/800?random
    options.thumbnail = await getRedirectedURL('https://unsplash.it/800/800?random')
  }
  
  if (!options.link) {
    options.link = options.feedLink
  }
  
  if (options.description) {
    options.description = options.description.trim().split('\\n').join('\n').trim()
  }
  else if (options.link) {
    options.description = options.link
  }
  
  output.push(`<rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0" xmlns:media="http://www.rssboard.org/media-rss" version="2.0">
  <channel>
    <title>${options.title}</title>
    <link>${options.feedLink}</link>
    <language>${options.language}</language>
    <atom:link href="${options.feedLink}" rel="self" type="application/rss+xml"/>
    <copyright>${options.author}</copyright>
    <itunes:author>${options.author}</itunes:author>
    <itunes:summary>
      ${options.description}
    </itunes:summary>
    <description>
      ${options.description}
    </description>
    <itunes:owner>
      <itunes:name>${options.author}</itunes:name>
    </itunes:owner>
    <itunes:image href="${options.thumbnail}"/>
`)
  
  let channelDescription = options.link + '\n' + options.title
  if (options.title !== options.author) {
    channelDescription = channelDescription + '\n' + options.author
  }
  
  if (Array.isArray(options.items)) {
    for (let i = 0; i < options.items.length; i++) {
      let item = options.items[i]
      
      if (!item.thumbnail) {
        // https://unsplash.it/800/800?random
        item.thumbnail = await getRedirectedURL('https://unsplash.it/800/800?random')
      }
      
      if (!item.author) {
        item.author = options.author
      }
      
      if (!item.description) {
        item.description = `${item.title}

${channelDescription}`
      }
      else if (item.link && item.description.startsWith(item.link) === false) {
        item.description = item.link + '\n' + item.description
      }
      
      if (item.description) {
        item.description = item.description.trim().split('\\n').join('\n').trim()
      }
      
      output.push(`<item>
      <title>${item.title}</title>
      <itunes:title>${item.title}</itunes:title>
      <itunes:author>${item.author}</itunes:author>
      <itunes:summary>
        <![CDATA[
        ${item.description}
        ]]>
      </itunes:summary>
      <description>
        <![CDATA[
        ${item.description}
        ]]>
      </description>
      <content:encoded><![CDATA[<pre>${linkifyUrls(item.description.split("\n").join("\n<br />"))}</pre>]]></content:encoded>
      <itunes:image href="${item.thumbnail}"/>
      <enclosure url="${item.audioURL}" length="LENGTH" type="audio/mpeg"/>
      <itunes:duration>${item.duration}</itunes:duration>
      <guid isPermaLink="false">
        ${item.audioURL}
      </guid>
      <pubDate>${item.date}</pubDate>
    </item>`)
    }
  }
  
  output.push(`</channel>
</rss>`)
  
  return output.join('')
}