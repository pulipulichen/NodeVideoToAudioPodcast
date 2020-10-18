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
    if (options.description.startsWith('http') 
            && options.description.indexOf('\n') === -1) {
      options.description = `<a href="${options.description}" target="_blank">${options.description}</a>`
    }
    
    options.description = options.description.trim().split('\\n').join('\n').trim()
  }
  else if (options.link) {
    options.description = `<a href="${options.link}" target="_blank">${options.link}</a>`
  }
  
  if (options.feedURL) {
    options.description = options.description 
            + '<br />\n' 
            + '<br />\n' 
            //+ options.feedURL
            + `<a href="${options.feedURL}" target="_blank">${options.feedURL}</a>`
  }
  
  output.push(`<rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0" xmlns:media="http://www.rssboard.org/media-rss" version="2.0">
  <channel>
    <title><![CDATA[${options.title}]]></title>
    <link>${options.feedLink}</link>
    <language>${options.language}</language>
    <atom:link href="${options.feedLink}" rel="self" type="application/rss+xml"/>
    <copyright><![CDATA[${options.author}]]></copyright>
    <itunes:author><![CDATA[${options.author}]]></itunes:author>
    <itunes:summary>
      <![CDATA[
      ${options.description}
      ]]>
    </itunes:summary>
    <description>
      <![CDATA[
      ${options.description}
      ]]>
    </description>
    <itunes:owner>
      <itunes:name><![CDATA[${options.author}]]></itunes:name>
    </itunes:owner>
    <itunes:image href="${options.thumbnail}"/>
`)
  
  // --------------------------------------------------
  
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
      
      let thumnails
      if (Array.isArray(item.thumbnails) === true && item.thumbnails.length > 0) {
        thumnails = item.thumbnails.map(url => {
          return `<img src="${url}" />`
        }).join('\n')
        if (item.link) {
          thumnails = `<a href="${item.link}">${thumnails}</a>`
        }
      }
      
      let subtitles
      if (Array.isArray(item.subtitles) === true && item.subtitles.length > 0) {
        subtitles = item.subtitles.map(({title, url}) => {
          return `<a href="${url}">${title}</a>`
        })
      }
      
      if (!item.mediaURL && item.audioURL) {
        item.mediaURL = item.audioURL
      }
      
      if (!item.MIMEType && item.mediaURL) {
        if (item.mediaURL.endsWith('.mp3')) {
          item.MIMEType = 'audio/mpeg'
        }
        else if (item.mediaURL.endsWith('.mp4')) {
          item.MIMEType = 'video/mp4'
        }
      }
      
      let description = []
      let descriptionHTML = []
      if (subtitles) {
        description.push(subtitles.join('\n'))
        descriptionHTML.push(subtitles.join('<br />\n'))
      }
      if (item.description) {
        description.push(item.description)
        descriptionHTML.push(linkifyUrls(item.description.split("\n").join("\n<br />")))
      }
      if (thumnails) {
        description.push(thumnails)
        descriptionHTML.push(thumnails)
      }
      
      output.push(`<item>
      <title><![CDATA[${item.title}]]></title>
      <itunes:title><![CDATA[${item.title}]]></itunes:title>
      <itunes:author><![CDATA[${item.author}]]></itunes:author>
      <itunes:summary>
        <![CDATA[${description.join('\n')}]]>
      </itunes:summary>
      <description>
        <![CDATA[${description.join('\n')}]]>
      </description>
      <content:encoded><![CDATA[<pre>${description.join('<br />\n')}</pre>]]></content:encoded>
      <itunes:image href="${item.thumbnail}"/>
      <enclosure url="${item.mediaURL}" type="${item.MIMEType}" length="${item.duration}" />
      <itunes:duration>${item.duration}</itunes:duration>
      <guid isPermaLink="false">${item.mediaURL}</guid>
      <pubDate>${item.date}</pubDate>
    </item>`)
    }
  }
  
  output.push(`</channel>
</rss>`)
  
  return output.join('')
}