const app = getApp()
const fishEngine = require('../../utils/fish-engine.js')

Page({
  data: {
    fishCount: 0,
    bubbles: [],
    showFishInfo: false,
    selectedFish: null,
    hasPettedSelected: false
  },

  canvas: null,
  ctx: null,
  fishes: [],
  animTimer: null,
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,

  onLoad() {
    this._generateBubbles()
  },

  onShow() {
    if (!this.canvas) {
      this._initCanvas()
    } else {
      // canvas 已初始化，只需重新加载鱼列表并重启动画
      this._loadFishes()
      this._startAnimation()
    }
  },

  onHide() {
    this._stopAnimation()
  },

  onUnload() {
    this._stopAnimation()
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

        this._loadFishes()
        this._startAnimation()
      })
  },

  _loadFishes() {
    const fishList = app.globalData.fishList
    this.fishes = fishList.map((data, i) => {
      return fishEngine.createSwimmingFish(data, this.canvasWidth, this.canvasHeight, i)
    })
    this.setData({ fishCount: this.fishes.length })

    // 为有画作的鱼加载图片
    this.fishes.forEach(fish => {
      if (fish.imagePath) {
        const img = this.canvas.createImage()
        img.onload = () => {
          fish.imageBitmap = img
        }
        img.src = fish.imagePath
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
  },

  _draw() {
    const ctx = this.ctx
    const w = this.canvasWidth
    const h = this.canvasHeight

    // 清空画布
    ctx.clearRect(0, 0, w, h)

    // 绘制每条鱼
    this.fishes.forEach(fish => {
      fishEngine.drawVectorFish(ctx, fish)
    })
  },

  onTankTap(e) {
    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    // 找到点击位置最近的鱼
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
      // 点中了鱼，弹窗显示信息
      this.setData({
        showFishInfo: true,
        selectedFish: {
          id: closestFish.id,
          name: closestFish.name || '无名鱼',
          score: closestFish.score,
          petCount: closestFish.petCount || 0,
          timeText: this._formatTime(closestFish.createTime)
        },
        hasPettedSelected: app.hasPetted(closestFish.id)
      })
      return
    }

    // 未点中鱼，让附近的鱼逃跑
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

    app.petFish(fish.id)

    // 更新本地游动鱼的 petCount
    const swimFish = this.fishes.find(f => f.id === fish.id)
    if (swimFish) swimFish.petCount = (swimFish.petCount || 0) + 1

    this.setData({
      hasPettedSelected: true,
      'selectedFish.petCount': fish.petCount + 1
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
  }
})
