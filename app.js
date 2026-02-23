const api = require('./utils/api.js')

App({
  globalData: {
    fishList: [],
    maxFish: 30
  },

  onLaunch() {
    // 从本地存储加载鱼
    const saved = wx.getStorageSync('fishList')
    if (saved && saved.length) {
      // 兼容旧数据：确保每条鱼都有 petCount
      saved.forEach(f => {
        if (f.petCount === undefined) f.petCount = 0
      })
      this.globalData.fishList = saved
    } else {
      // 初始化一些示例鱼
      this.globalData.fishList = this._generateSampleFish()
      wx.setStorageSync('fishList', this.globalData.fishList)
    }

    // 加载已摸过的鱼 ID 列表
    this.globalData.pettedFishIds = wx.getStorageSync('pettedFishIds') || []
  },

  petFish(fishId) {
    const list = this.globalData.fishList
    const fish = list.find(f => f.id === fishId)
    if (!fish) return
    fish.petCount = (fish.petCount || 0) + 1
    wx.setStorageSync('fishList', list)

    const petted = this.globalData.pettedFishIds
    if (!petted.includes(fishId)) {
      petted.push(fishId)
      wx.setStorageSync('pettedFishIds', petted)
    }

    // 同步到服务器
    api.petFish(fishId).catch(() => {})
  },

  hasPetted(fishId) {
    return this.globalData.pettedFishIds.includes(fishId)
  },

  addFish(fishData) {
    const list = this.globalData.fishList
    list.unshift(fishData)
    if (list.length > this.globalData.maxFish) {
      // 淘汰规则：
      // 1. 被摸次数 Top 3（至少1次）永久保护
      // 2. 新鱼（< 24h）有保护期
      // 3. 剩余鱼中，被摸最少的优先淘汰，同次数淘汰最老的
      const now = Date.now()
      const protectMs = 24 * 3600000
      // 找出被摸次数 Top 3 的鱼 ID
      const topIds = new Set(
        list.filter(f => (f.petCount || 0) >= 1)
          .sort((a, b) => (b.petCount || 0) - (a.petCount || 0))
          .slice(0, 3)
          .map(f => f.id)
      )
      // 跳过刚加入的新鱼（index 0），排除 Top 3，排除新鱼保护期
      let candidates = list.slice(1).filter(f =>
        !topIds.has(f.id) && now - (f.createTime || 0) >= protectMs
      )
      if (candidates.length === 0) {
        // 放宽：去掉新鱼保护期，但仍保留 Top 3
        candidates = list.slice(1).filter(f => !topIds.has(f.id))
      }
      if (candidates.length === 0) {
        // 全部都是 Top 3，回退淘汰最老的（排除新鱼）
        candidates = list.slice(1)
      }
      // 被摸最少 → 最老
      candidates.sort((a, b) => (a.petCount || 0) - (b.petCount || 0) || (a.createTime || 0) - (b.createTime || 0))
      const victim = candidates[0]
      const idx = list.indexOf(victim)
      if (idx !== -1) list.splice(idx, 1)
    }
    wx.setStorageSync('fishList', list)

    // 同步到服务器
    api.uploadFish(fishData, fishData.imagePath).catch(() => {})
  },

  _generateSampleFish() {
    const colors = [
      { body: '#FF6B6B', fin: '#EE5A5A', eye: '#333' },
      { body: '#4ECDC4', fin: '#3DBDB5', eye: '#333' },
      { body: '#FFD93D', fin: '#F0CA2D', eye: '#333' },
      { body: '#6C5CE7', fin: '#5B4BD5', eye: '#fff' },
      { body: '#FF8A5C', fin: '#EE794B', eye: '#333' },
      { body: '#A8E6CF', fin: '#97D5BE', eye: '#333' },
      { body: '#FF77B7', fin: '#EE66A6', eye: '#333' },
      { body: '#74B9FF', fin: '#63A8EE', eye: '#333' },
    ]
    return colors.map((c, i) => ({
      id: 'sample_' + i,
      type: 'vector',
      colors: c,
      pattern: i % 4, // 0=plain, 1=stripes, 2=dots, 3=gradient
      size: 0.6 + Math.random() * 0.6,
      speed: 0.3 + Math.random() * 0.7,
      name: ['小红', '小蓝', '小黄', '小紫', '小橙', '小绿', '小粉', '小天'][i],
      score: Math.floor(60 + Math.random() * 40),
      createTime: Date.now() - i * 3600000,
      petCount: 0
    }))
  }
})
