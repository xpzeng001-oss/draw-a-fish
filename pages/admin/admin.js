const api = require('../../utils/api.js')

const ADMIN_PWD = '5050'

Page({
  data: {
    authed: false,
    password: '',
    fishList: [],
    total: 0,
    hasMore: true,
    baseUrl: ''
  },

  page: 1,

  onLoad() {
    this.setData({ baseUrl: api.getBaseUrl() })
  },

  onPullDownRefresh() {
    if (!this.data.authed) {
      wx.stopPullDownRefresh()
      return
    }
    this.page = 1
    this.setData({ fishList: [], hasMore: true })
    this._fetchFishes(() => wx.stopPullDownRefresh())
  },

  onPwdInput(e) {
    this.setData({ password: e.detail.value })
  },

  doAuth() {
    if (this.data.password === ADMIN_PWD) {
      this.setData({ authed: true })
      this._fetchFishes()
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  },

  _fetchFishes(cb) {
    api.getFishList(this.page, 30)
      .then(res => {
        const list = res.list || []
        if (list.length === 0) {
          this.setData({ hasMore: false })
        }
        const fishList = this.page === 1 ? list : this.data.fishList.concat(list)
        this.page++
        this.setData({ fishList, total: res.total || fishList.length })
        if (cb) cb()
      })
      .catch(() => {
        wx.showToast({ title: '加载失败', icon: 'none' })
        if (cb) cb()
      })
  },

  loadMore() {
    if (this.data.hasMore) {
      this._fetchFishes()
    }
  },

  deleteFish(e) {
    const fishId = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '删除违规鱼',
      content: `确定要把"${name}"从公共池塘移除吗？`,
      confirmText: '移除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          api.deleteFish(fishId)
            .then(() => {
              wx.showToast({ title: '已移除', icon: 'success' })
              const fishList = this.data.fishList.filter(f => f.fishId !== fishId)
              this.setData({ fishList, total: this.data.total - 1 })
            })
            .catch(() => {
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  }
})
