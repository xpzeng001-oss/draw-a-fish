const app = getApp()
const fishEngine = require('../../utils/fish-engine.js')
const api = require('../../utils/api.js')

Page({
  data: {
    fishCount: 0,
    bubbles: [],
    showFishInfo: false,
    selectedFish: null,
    hasPettedSelected: false,
    loading: false,
    isDark: false
  },

  canvas: null,
  ctx: null,
  fishes: [],
  fishDataList: [],
  animTimer: null,
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,

  onLoad() {
    this._generateBubbles()
    this._generateSeaweeds()
  },

  onShow() {
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
          petCount: f.petCount || 0
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

    this.fishes.forEach(fish => {
      if (fish.imagePath) {
        const img = this.canvas.createImage()
        img.onload = () => {
          fish.imageBitmap = img
        }
        // 服务器返回的相对路径需要拼接地址
        if (fish.imagePath.startsWith('/')) {
          img.src = api.getBaseUrl() + fish.imagePath
        } else {
          img.src = fish.imagePath
        }
      }
    })
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
