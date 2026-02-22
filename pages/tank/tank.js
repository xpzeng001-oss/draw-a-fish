const app = getApp()
const fishEngine = require('../../utils/fish-engine.js')

Page({
  data: {
    fishList: [],
    totalFish: 0,
    avgScore: 0,
    topScore: 0,
    medals: ['🥇', '🥈', '🥉']
  },

  onShow() {
    this._loadFishList()
  },

  _loadFishList() {
    const fishList = app.globalData.fishList.slice()
    
    // 按分数排序
    fishList.sort((a, b) => b.score - a.score)

    // 格式化时间
    fishList.forEach(f => {
      f.timeText = this._formatTime(f.createTime)
    })

    const total = fishList.length
    const avg = total > 0 ? Math.round(fishList.reduce((s, f) => s + f.score, 0) / total) : 0
    const top = total > 0 ? fishList[0].score : 0

    this.setData({
      fishList,
      totalFish: total,
      avgScore: avg,
      topScore: top
    })

    // 延迟渲染鱼预览
    setTimeout(() => this._renderFishPreviews(), 300)
  },

  _renderFishPreviews() {
    const fishList = this.data.fishList
    fishList.forEach((fish, index) => {
      if (index > 15) return // 只渲染可见范围
      
      const query = wx.createSelectorQuery()
      query.select(`#fish-${index}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getWindowInfo().pixelRatio

          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          const w = res[0].width
          const h = res[0].height

          // 绘制小鱼预览
          const swimFish = fishEngine.createSwimmingFish(fish, w, h, index)
          swimFish.x = w / 2
          swimFish.y = h / 2
          swimFish.bodyW = w * 0.7
          swimFish.bodyH = h * 0.65
          swimFish.facingRight = true
          swimFish.tailAngle = 0.15

          fishEngine.drawVectorFish(ctx, swimFish)
        })
    })
  },

  deleteFish(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '放生',
      content: `确定要把"${this.data.fishList[index].name}"放生吗？`,
      confirmText: '放生',
      success: (res) => {
        if (res.confirm) {
          const fish = this.data.fishList[index]
          const globalList = app.globalData.fishList
          const gIndex = globalList.findIndex(f => f.id === fish.id)
          if (gIndex !== -1) {
            globalList.splice(gIndex, 1)
            wx.setStorageSync('fishList', globalList)
          }
          wx.showToast({ title: '已放生', icon: 'success' })
          this._loadFishList()
        }
      }
    })
  },

  _formatTime(timestamp) {
    if (!timestamp) return '很久以前'
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return '很久以前'
  },

  goBack() {
    wx.navigateBack()
  },

  goToDraw() {
    wx.navigateTo({ url: '/pages/draw/draw' })
  }
})
