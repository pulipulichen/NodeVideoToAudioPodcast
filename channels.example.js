module.exports = [
  /**
   * Playlist example
   */
  {
    url: 'https://www.youtube.com/playlist?list=PLKnvkZ00-pHrmEr4FbvzMueT5p7bdc18-',
    //title: '自訂的播放清單',
    //description: '自訂的說明',
    thumbnail: 'https://pic4.zhimg.com/v2-9eb3918e243e78030304362518c7fba2_1440w.jpg?source=172ae18b',
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
]