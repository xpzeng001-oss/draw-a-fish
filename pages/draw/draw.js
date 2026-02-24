const app = getApp()
const api = require('../../utils/api.js')
const fishEngine = require('../../utils/fish-engine.js')

Page({
  data: {
    colors: [
      '#FF6B6B', '#FF8A5C', '#FFD93D', '#A8E6CF', 
      '#4ECDC4', '#74B9FF', '#6C5CE7', '#FF77B7',
      '#2C3E50', '#E74C3C', '#F39C12', '#1ABC9C',
      '#FFFFFF', '#333333'
    ],
    currentColor: '#FF6B6B',
    brushSizes: [
      { size: 3, display: 12 },
      { size: 6, display: 20 },
      { size: 10, display: 30 },
      { size: 18, display: 42 }
    ],
    brushSize: 6,
    isEraser: false,
    canSubmit: false,
    showGrid: true,
    showScore: false,
    score: 0,
    scoreColor: '',
    scoreComment: '',
    fishName: '',
    authorName: '',
    fishPreview: '',
    fishNo: 0,
    tipText: '画一条朝右游的鱼 🐟 发挥你的创意吧！',
  },

  canvas: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,
  dpr: 1,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  strokeHistory: [],  // 用于撤销
  currentStroke: [],
  strokeCount: 0,
  offCanvas: null,
  offCtx: null,

  onReady() {
    this._initCanvas()
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#drawCanvas')
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

        // 透明背景（CSS 提供视觉白色背景，导出 PNG 保持透明）
        ctx.clearRect(0, 0, width, height)

        // 创建离屏 canvas 用于撤销
        const offCanvas = wx.createOffscreenCanvas({ type: '2d', width: canvas.width, height: canvas.height })
        this.offCanvas = offCanvas
        this.offCtx = offCanvas.getContext('2d')
      })
  },

  _saveState() {
    if (!this.offCtx || !this.canvas) return
    this.offCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.offCtx.drawImage(this.canvas, 0, 0)
  },

  onTouchStart(e) {
    const touch = e.touches[0]
    this.isDrawing = true
    this.lastX = touch.x
    this.lastY = touch.y
    
    // 保存当前状态用于撤销
    if (this.canvas) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      this.strokeHistory.push(imageData)
      if (this.strokeHistory.length > 30) {
        this.strokeHistory.shift()
      }
    }

    this.ctx.beginPath()
    this.ctx.moveTo(touch.x, touch.y)
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    if (this.data.isEraser) {
      this.ctx.globalCompositeOperation = 'destination-out'
      this.ctx.lineWidth = this.data.brushSize * 3
    } else {
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.strokeStyle = this.data.currentColor
      this.ctx.lineWidth = this.data.brushSize
    }
  },

  onTouchMove(e) {
    if (!this.isDrawing) return
    const touch = e.touches[0]
    
    this.ctx.lineTo(touch.x, touch.y)
    this.ctx.stroke()
    this.ctx.beginPath()
    this.ctx.moveTo(touch.x, touch.y)

    this.lastX = touch.x
    this.lastY = touch.y
    this.strokeCount++
  },

  onTouchEnd() {
    this.isDrawing = false
    this.ctx.globalCompositeOperation = 'source-over'
    
    if (this.strokeCount > 5) {
      this.setData({ 
        canSubmit: true,
        showGrid: false,
        tipText: '继续完善你的鱼，或点击下方按钮提交'
      })
    }
  },

  selectColor(e) {
    this.setData({
      currentColor: e.currentTarget.dataset.color,
      isEraser: false
    })
  },

  selectSize(e) {
    this.setData({
      brushSize: e.currentTarget.dataset.size
    })
  },

  toggleEraser() {
    this.setData({
      isEraser: !this.data.isEraser
    })
  },

  undoStroke() {
    if (this.strokeHistory.length === 0) {
      wx.showToast({ title: '没有可撤销的操作', icon: 'none' })
      return
    }
    const imageData = this.strokeHistory.pop()
    this.ctx.putImageData(imageData, 0, 0)
  },

  clearCanvas() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空画布吗？',
      success: (res) => {
        if (res.confirm) {
          this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
          this.strokeHistory = []
          this.strokeCount = 0
          this.setData({ 
            canSubmit: false, 
            showGrid: true,
            tipText: '画一条朝右游的鱼 🐟 发挥你的创意吧！'
          })
        }
      }
    })
  },

  submitFish() {
    if (!this.data.canSubmit) return

    wx.showLoading({ title: '正在评分...' })

    // 获取下一条鱼的编号
    api.getNextFishNumber().then(res => {
      this.setData({ fishNo: res.nextNo })
    }).catch(() => {})

    // 获取画布数据进行评分
    setTimeout(() => {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const score = fishEngine.evaluateFishScore(
        imageData.data, 
        this.canvas.width, 
        this.canvas.height
      )

      let color, comment
      if (score >= 85) {
        color = '#2ecc71'
        comment = '哇！这条鱼太棒了！大师级画作！'
      } else if (score >= 70) {
        color = '#3498db'
        comment = '很不错的鱼！在鱼缸里会很受欢迎！'
      } else if (score >= 55) {
        color = '#f39c12'
        comment = '还可以哦，这条鱼很有个性！'
      } else {
        color = '#e74c3c'
        comment = '嗯...确定这是一条鱼吗？不过也放进去吧！'
      }

      // 生成鱼的预览图（裁剪到内容区域）
      const prevData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      const prevPx = prevData.data
      const pcw = this.canvas.width, pch = this.canvas.height
      let pMinX = pcw, pMaxX = 0, pMinY = pch, pMaxY = 0
      for (let i = 0; i < prevPx.length; i += 4) {
        if (prevPx[i + 3] > 20) {
          const px = (i / 4) % pcw, py = Math.floor((i / 4) / pcw)
          if (px < pMinX) pMinX = px
          if (px > pMaxX) pMaxX = px
          if (py < pMinY) pMinY = py
          if (py > pMaxY) pMaxY = py
        }
      }
      const pPad = 10 * this.dpr
      pMinX = Math.max(0, pMinX - pPad)
      pMinY = Math.max(0, pMinY - pPad)
      pMaxX = Math.min(pcw - 1, pMaxX + pPad)
      pMaxY = Math.min(pch - 1, pMaxY + pPad)

      wx.canvasToTempFilePath({
        canvas: this.canvas,
        x: pMinX / this.dpr,
        y: pMinY / this.dpr,
        width: (pMaxX - pMinX + 1) / this.dpr,
        height: (pMaxY - pMinY + 1) / this.dpr,
        destWidth: pMaxX - pMinX + 1,
        destHeight: pMaxY - pMinY + 1,
        success: (imgRes) => {
          wx.hideLoading()
          this.setData({
            showScore: true,
            score,
            scoreColor: color,
            scoreComment: comment,
            fishPreview: imgRes.tempFilePath
          })
        },
        fail: () => {
          wx.hideLoading()
          this.setData({
            showScore: true,
            score,
            scoreColor: color,
            scoreComment: comment,
            fishPreview: ''
          })
        }
      })
    }, 800)
  },

  onNameInput(e) {
    this.setData({ fishName: e.detail.value })
  },

  onAuthorInput(e) {
    this.setData({ authorName: e.detail.value })
  },

  confirmFish() {
    const name = this.data.fishName || '无名小鱼'
    const author = this.data.authorName || ''
    const bodyColor = this.data.currentColor

    // 计算鱼的绘制边界，只裁剪有内容的区域
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const pixels = imgData.data
    const cw = this.canvas.width
    const ch = this.canvas.height
    let minX = cw, maxX = 0, minY = ch, maxY = 0

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 20) {
        const px = (i / 4) % cw
        const py = Math.floor((i / 4) / cw)
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }

    // 加一点边距，防止裁太紧
    const pad = 10 * this.dpr
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(cw - 1, maxX + pad)
    maxY = Math.min(ch - 1, maxY + pad)
    const cropW = maxX - minX + 1
    const cropH = maxY - minY + 1

    // 只导出鱼的区域
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      x: minX / this.dpr,
      y: minY / this.dpr,
      width: cropW / this.dpr,
      height: cropH / this.dpr,
      destWidth: cropW,
      destHeight: cropH,
      success: (res) => {
        const fs = wx.getFileSystemManager()
        const savedPath = `${wx.env.USER_DATA_PATH}/fish_${Date.now()}.png`

        fs.saveFile({
          tempFilePath: res.tempFilePath,
          filePath: savedPath,
          success: () => {
            const fishData = {
              id: 'user_' + Date.now(),
              type: 'image',
              imagePath: savedPath,
              colors: {
                body: bodyColor,
                fin: this._darkenColor(bodyColor, 0.15),
                eye: '#333'
              },
              pattern: Math.floor(Math.random() * 4),
              size: 0.7 + Math.random() * 0.5,
              speed: 0.4 + Math.random() * 0.6,
              name: name,
              author: author,
              score: this.data.score,
              createTime: Date.now(),
              petCount: 0
            }
            app.addFish(fishData)
            this._showReleaseAnimation(name, fishData.id)
          },
          fail: () => {
            this._addVectorFishFallback(name, bodyColor)
          }
        })
      },
      fail: () => {
        this._addVectorFishFallback(name, bodyColor)
      }
    })
  },

  _addVectorFishFallback(name, bodyColor) {
    const fishData = {
      id: 'user_' + Date.now(),
      type: 'vector',
      colors: {
        body: bodyColor,
        fin: this._darkenColor(bodyColor, 0.15),
        eye: '#333'
      },
      pattern: Math.floor(Math.random() * 4),
      size: 0.7 + Math.random() * 0.5,
      speed: 0.4 + Math.random() * 0.6,
      name: name,
      author: this.data.authorName || '',
      score: this.data.score,
      createTime: Date.now(),
      petCount: 0
    }
    app.addFish(fishData)
    this._showReleaseAnimation(name, fishData.id)
  },

  redraw() {
    this.setData({ showScore: false, fishPreview: '', fishName: '', authorName: '' })
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.strokeHistory = []
    this.strokeCount = 0
    this.setData({
      canSubmit: false,
      showGrid: true,
      tipText: '画一条朝右游的鱼 🐟 发挥你的创意吧！'
    })
  },

  closeScore() {
    // 点击遮罩不关闭
  },

  goToTank() {
    wx.navigateTo({ url: '/pages/myfish/myfish' })
  },

  _showReleaseAnimation(name, fishId) {
    const noStr = this.data.fishNo > 0 ? `NO.${this.data.fishNo} ` : ''
    app.globalData.releaseInfo = {
      fishId: fishId,
      fishNo: this.data.fishNo,
      fishName: name,
      fishPreview: this.data.fishPreview,
      releaseText: `${noStr}${name} 已游入公共池塘！`
    }
    this.setData({ showScore: false })
    wx.navigateBack()
  },

  _darkenColor(hex, amount) {
    let color = hex.replace('#', '')
    if (color.length === 3) {
      color = color.split('').map(c => c + c).join('')
    }
    const num = parseInt(color, 16)
    let r = (num >> 16) - Math.floor(255 * amount)
    let g = ((num >> 8) & 0x00FF) - Math.floor(255 * amount)
    let b = (num & 0x0000FF) - Math.floor(255 * amount)
    r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b)
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
})
