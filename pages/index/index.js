const app = getApp()
const fishEngine = require('../../utils/fish-engine.js')
const api = require('../../utils/api.js')

const SHARE_QUOTES = [
  '水面刚刚泛起了一圈涟漪',
  '今天没摸到鱼，但养了一条',
  '老板不知道，我在互联网养鱼',
  '它已经替我开始摆烂了',
  '世界很大，它很小',
  '我在现实打工，它在水里自由',
  '我的人生没起色，但它已经下水了',
  '我的生活没有波澜，但水里有',
  '鱼不会说话，但一直在回应水',
  '水很安静，所以鱼显得自由',
  '人在岸上想远方，鱼在水里就是远方',
  '鱼不知道海有多大，却一直向前',
  '鱼的世界没有地图，却不会迷路',
  '鱼记不住过去，所以活得很轻',
  '水带走痕迹，也留下存在',
  '鱼从不停下，但也从不着急',
  '水没有边界，所以鱼没有方向',
  '鱼不需要观众，也在生活。',
  '你看见鱼，其实看见了时间',
  '鱼没有记忆，所以每一刻都是开始',
  '鱼没有目的地，但总在路上',
  '人习惯回头，鱼只会向前',
  '岸上的人很忙，水里的鱼很慢',
  '有些相遇，只是一瞬间的同一片水',
  '水深的地方，更少喧哗',
  '鱼不知道被看见，但仍然游着',
  '它没有目的地，所以到处都是途中'
]

Page({
  data: {
    fishCount: 0,
    bubbles: [],
    showFishInfo: false,
    selectedFish: null,
    hasPettedSelected: false,
    loading: false,
    isDark: false,
    releaseMode: false,
    releasePreview: '',
    releaseText: '',
    showShareCard: false,
    shareFishName: '',
    shareFishNo: 0,
    shareFishPreview: '',
    shareQuote: '',
    statusBarHeight: 0
  },

  canvas: null,
  ctx: null,
  fishes: [],
  fishDataList: [],
  animTimer: null,
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,
  _adminTapCount: 0,
  _adminTapTimer: null,

  onLoad() {
    const sysInfo = wx.getWindowInfo()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 44 })
    this._generateBubbles()
    this._generateSeaweeds()
  },

  onShow() {
    this._checkRelease()
    if (!this.canvas) {
      this._initCanvas()
    } else {
      this._fetchFishes()
    }
  },

  onHide() {
    this._stopAnimation()
  },

  onUnload() {
    this._stopAnimation()
  },

  onPullDownRefresh() {
    this._fetchFishes(() => {
      wx.stopPullDownRefresh()
    })
  },

  _stopAnimation() {
    if (this.animTimer && this.canvas) {
      this.canvas.cancelAnimationFrame(this.animTimer)
      this.animTimer = null
    }
  },

  _generateBubbles() {
    const bubbles = []
    for (let i = 0; i < 12; i++) {
      bubbles.push({
        id: i,
        x: Math.random() * 90 + 5,
        size: 12 + Math.random() * 24,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 5
      })
    }
    this.setData({ bubbles })
  },

  _generateSeaweeds() {
    const types = ['thin', 'mid', 'wide']
    const seaweeds = []
    for (let i = 0; i < 10; i++) {
      seaweeds.push({
        id: i,
        x: i * 10 + 2 + Math.random() * 5,
        h: 60 + Math.random() * 80,
        delay: Math.random() * 2,
        dur: 2.5 + Math.random() * 2,
        type: types[Math.floor(Math.random() * 3)]
      })
    }
    this.setData({ seaweeds })
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#tankCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio
        const width = res[0].width
        const height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        this.canvas = canvas
        this.ctx = ctx
        this.canvasWidth = width
        this.canvasHeight = height
        this.dpr = dpr

        this._fetchFishes()
      })
  },

  _fetchFishes(cb) {
    if (this.data.loading) return
    this.setData({ loading: true })

    api.getFishList(1, 30)
      .then(res => {
        const serverList = res.list || []
        this.fishDataList = serverList.map(f => ({
          id: f.fishId,
          type: f.type || 'vector',
          imagePath: f.imageUrl || null,
          colors: f.colors || { body: '#FF6B6B', fin: '#EE5A5A', eye: '#333' },
          pattern: f.pattern || 0,
          size: f.size || 1,
          speed: f.speed || 0.5,
          name: f.name || '无名小鱼',
          author: f.author || '',
          score: f.score || 0,
          createTime: new Date(f.createdAt).getTime(),
          petCount: f.petCount || 0,
          fishNo: f.fishNo || 0
        }))
        this._buildSwimmingFishes()
        this._startAnimation()
        this.setData({ loading: false })
        if (cb) cb()
      })
      .catch((err) => {
        console.error('拉取鱼列表失败:', err)
        // 服务器不可用时回退到本地数据
        this.fishDataList = app.globalData.fishList
        this._buildSwimmingFishes()
        this._startAnimation()
        this.setData({ loading: false })
        if (cb) cb()
      })
  },

  _buildSwimmingFishes() {
    this.fishes = this.fishDataList.map((data, i) => {
      return fishEngine.createSwimmingFish(data, this.canvasWidth, this.canvasHeight, i)
    })
    this.setData({ fishCount: this.fishes.length })

    // 先给所有鱼加载图片
    this.fishes.forEach(fish => {
      if (fish.imagePath) {
        const img = this.canvas.createImage()
        img.onload = () => {
          fish.imageBitmap = img
        }
        if (fish.imagePath.startsWith('/')) {
          img.src = api.getBaseUrl() + fish.imagePath
        } else {
          img.src = fish.imagePath
        }
      }
    })

    // 放生的鱼：先从池塘里摘出来，等动画结束再放入
    if (this._releaseFishId) {
      const idx = this.fishes.findIndex(f => f.id === this._releaseFishId)
      if (idx !== -1) {
        const rf = this.fishes.splice(idx, 1)[0]
        rf.x = this.canvasWidth / 2
        rf.y = this.canvasHeight / 2
        setTimeout(() => {
          this.fishes.push(rf)
        }, 500)
      }
      this._releaseFishId = null
    }
  },

  _startAnimation() {
    this._stopAnimation()
    const animate = () => {
      this._update()
      this._draw()
      this.animTimer = this.canvas.requestAnimationFrame(animate)
    }
    animate()
  },

  _update() {
    const w = this.canvasWidth
    const h = this.canvasHeight
    this.fishes.forEach(fish => {
      fishEngine.updateFish(fish, w, h)
    })
    fishEngine.ensureVisibleFish(this.fishes, w, h)
  },

  _draw() {
    const ctx = this.ctx
    const w = this.canvasWidth
    const h = this.canvasHeight
    ctx.clearRect(0, 0, w, h)
    this.fishes.forEach(fish => {
      fishEngine.drawVectorFish(ctx, fish)
    })
  },

  onTankTap(e) {
    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    let closestFish = null
    let closestDist = Infinity
    this.fishes.forEach(fish => {
      const dx = fish.x - x
      const dy = fish.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitRadius = Math.max(fish.bodyW, fish.bodyH) * 0.5
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist
        closestFish = fish
      }
    })

    if (closestFish) {
      const pettedIds = wx.getStorageSync('pettedFishIds') || []
      this.setData({
        showFishInfo: true,
        selectedFish: {
          id: closestFish.id,
          fishNo: closestFish.fishNo || 0,
          name: closestFish.name || '无名鱼',
          author: closestFish.author || '',
          score: closestFish.score,
          petCount: closestFish.petCount || 0,
          timeText: this._formatTime(closestFish.createTime),
          imageUrl: closestFish.imagePath ? (closestFish.imagePath.startsWith('/') ? api.getBaseUrl() + closestFish.imagePath : closestFish.imagePath) : ''
        },
        hasPettedSelected: pettedIds.includes(closestFish.id)
      })
      return
    }

    this.fishes.forEach(fish => {
      const dx = fish.x - x
      const dy = fish.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 80) {
        fish.vx += (dx / dist) * 3
        fish.vy += (dy / dist) * 3
        fish.scared = 30
      }
    })
  },

  closeFishInfo() {
    this.setData({ showFishInfo: false, selectedFish: null })
  },

  petSelectedFish() {
    const fish = this.data.selectedFish
    if (!fish || this.data.hasPettedSelected) return

    api.petFish(fish.id)
      .then(res => {
        const swimFish = this.fishes.find(f => f.id === fish.id)
        if (swimFish) swimFish.petCount = res.petCount

        const pettedIds = wx.getStorageSync('pettedFishIds') || []
        if (!pettedIds.includes(fish.id)) {
          pettedIds.push(fish.id)
          wx.setStorageSync('pettedFishIds', pettedIds)
        }

        this.setData({
          hasPettedSelected: true,
          'selectedFish.petCount': res.petCount
        })
      })
      .catch(() => {
        wx.showToast({ title: '网络错误', icon: 'none' })
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

  _checkRelease() {
    const info = app.globalData.releaseInfo
    if (!info) return
    delete app.globalData.releaseInfo
    this._releaseFishId = info.fishId || null
    this.setData({
      releaseMode: true,
      releasePreview: info.fishPreview || '',
      releaseText: info.releaseText || ''
    })
    setTimeout(() => {
      this.setData({ releaseMode: false })
    }, 3000)
    // 鱼开始游 3s 后弹出分享卡片
    setTimeout(() => {
      this.setData({
        showShareCard: true,
        shareFishName: info.fishName || '无名小鱼',
        shareFishNo: info.fishNo || 0,
        shareFishPreview: info.fishPreview || '',
        shareQuote: SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)]
      })
    }, 3500)
  },

  closeShareCard() {
    this.setData({ showShareCard: false })
  },

  noop() {},

  switchQuote() {
    const current = this.data.shareQuote
    let next
    do {
      next = SHARE_QUOTES[Math.floor(Math.random() * SHARE_QUOTES.length)]
    } while (next === current && SHARE_QUOTES.length > 1)
    this.setData({ shareQuote: next })
  },

  onCountTap() {
    this._adminTapCount++
    clearTimeout(this._adminTapTimer)
    if (this._adminTapCount >= 5) {
      this._adminTapCount = 0
      wx.navigateTo({ url: '/pages/admin/admin' })
      return
    }
    this._adminTapTimer = setTimeout(() => {
      this._adminTapCount = 0
    }, 2000)
  },

  goToDraw() {
    wx.navigateTo({ url: '/pages/draw/draw' })
  },

  goToTank() {
    wx.navigateTo({ url: '/pages/tank/tank' })
  },

  toggleTheme() {
    const isDark = !this.data.isDark
    this.setData({ isDark })
    app.globalData.isDark = isDark
  }
})
