const app = getApp()
const api = require('../../utils/api.js')

Page({
  data: {
    fishList: []
  },

  onShow() {
    this._loadMyFish()
  },

  _loadMyFish() {
    const myFish = (app.globalData.fishList || []).map(f => ({
      ...f,
      timeText: this._formatTime(f.createTime)
    }))
    myFish.sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
    this.setData({ fishList: myFish })
  },

  deleteFish(e) {
    const index = e.currentTarget.dataset.index
    const fish = this.data.fishList[index]
    wx.showModal({
      title: '删除',
      content: `确定要把"${fish.name || '无名小鱼'}"删除吗？`,
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          const globalList = app.globalData.fishList
          const gIndex = globalList.findIndex(f => f.id === fish.id)
          if (gIndex !== -1) {
            globalList.splice(gIndex, 1)
            wx.setStorageSync('fishList', globalList)
          }
          api.deleteFish(fish.id).catch(err => console.error('服务器删除失败:', err))
          wx.showToast({ title: '已删除', icon: 'success' })
          this._loadMyFish()
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
