module.exports = [
  /**
   * Playlist example
   */
  {
    url: 'https://www.youtube.com/playlist?list=PLKnvkZ00-pHrmEr4FbvzMueT5p7bdc18-',
    //title: '自訂的播放清單',
    //description: '自訂的說明',
    maxItems: 10, // default 10
    //filters: [
      //{ 'titlePrefix': 'cwise' },
      //{ 'titleSuffix': '示範' },
      // 'titleInclude': '操作' },
      //{ 'durationMinSec': 120 },
      //{ 'durationMaxSec': 120 },
    //]
  },
  /**
   * Channel example
   */
  {
    url: 'https://www.youtube.com/channel/UCGSfK5HeiIhuFfXoKE47TzA',
    //title: '自訂的播放清單',
    //description: '自訂的說明',
    maxItems: 10, // default 10
    filters: [
      //{ 'titlePrefix': 'cwise' },
      //{ 'titleSuffix': '示範' },
      //{ 'titleInclude': 'HTC' },
      //{ 'durationMinSec': 120 },
      //{ 'durationMaxSec': 120 },
    ]
  },
  { 
    title: '迷走大學 怎麽養出肥的象',
    thumbnailBorderColor: '#f1c40f',
    url: 'https://www.youtube.com/playlist?list=PLzYeVcpzcibbb44lqtqkPEtPQ7W1J8hdc',
  }
]