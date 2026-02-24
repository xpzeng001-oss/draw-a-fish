const fishEngine = require('../../utils/fish-engine.js')
const api = require('../../utils/api.js')

Page({
  data: {
    fishCount: 0,
    bubbles: [],
    showFishInfo: false,
    selectedFish: null,
    hasPettedSelected: false,
    loading: false
  },

  canvas: null,
  ctx: null,
  fishes: [],
  fishDataList: [],
  animTimer: null,
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,
  page: 1,
  hasMore: true,

  onLoad() {
    this._generateBubbles()
    this._initCanvas()
  },

  onShow() {
    if (this.canvas && this.fishDataList.length > 0) {
      this._startAnimation()
    }
  },

  onHide() {
    this._stopAnimation()
  },

  onUnload() {
    this._stopAnimation()
  },

  onPullDownRefresh() {
    this.page = 1
    this.hasMore = true
    this.fishDataList = []
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

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#publicCanvas')
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
    if (this.data.loading || !this.hasMore) return
    this.setData({ loading: true })

    api.getFishList(this.page, 30)
      .then(res => {
        const serverList = res.list || []
        if (serverList.length === 0) {
          this.hasMore = false
        }

        // 将服务器数据转换为本地鱼数据格式
        const newFish = serverList.map(f => ({
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

        if (this.page === 1) {
          this.fishDataList = newFish
        } else {
          this.fishDataList = this.fishDataList.concat(newFish)
        }

        this.page++
        this._buildSwimmingFishes()
        this._startAnimation()
        this.setData({ loading: false })
        if (cb) cb()
      })
      .catch(err => {
        console.error('拉取公共池塘失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
        if (cb) cb()
      })
  },

  _buildSwimmingFishes() {
    this.fishes = this.fishDataList.map((data, i) => {
      return fishEngine.createSwimmingFish(data, this.canvasWidth, this.canvasHeight, i)
    })
    this.setData({ fishCount: this.fishes.length })

    // 为有图片的鱼加载远程图片
    this.fishes.forEach(fish => {
      if (fish.imagePath) {
        const img = this.canvas.createImage()
        img.onload = () => {
          fish.imageBitmap = img
        }
        // imagePath 可能是相对路径如 /uploads/xxx.png，需要拼接服务器地址
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
      const pettedIds = wx.getStorageSync('publicPettedIds') || []
      this.setData({
        showFishInfo: true,
        selectedFish: {
          id: closestFish.id,
          fishNo: closestFish.fishNo || 0,
          name: closestFish.name || '无名鱼',
          author: closestFish.author || '',
          score: closestFish.score,
          petCount: closestFish.petCount || 0,
          timeText: this._formatTime(closestFish.createTime)
        },
        hasPettedSelected: pettedIds.includes(closestFish.id)
      })
      return
    }

    // 未点中鱼，逃跑效果
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

    // 调用服务器 API
    api.petFish(fish.id)
      .then(res => {
        // 更新本地游动鱼
        const swimFish = this.fishes.find(f => f.id === fish.id)
        if (swimFish) swimFish.petCount = res.petCount

        // 记录本设备已摸过
        const pettedIds = wx.getStorageSync('publicPettedIds') || []
        if (!pettedIds.includes(fish.id)) {
          pettedIds.push(fish.id)
          wx.setStorageSync('publicPettedIds', pettedIds)
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

  goBack() {
    wx.navigateBack()
  }
})
