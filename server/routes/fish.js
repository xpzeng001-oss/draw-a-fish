const express = require('express')
const multer = require('multer')
const path = require('path')
const Fish = require('../models/Fish')
const Counter = require('../models/Counter')
const config = require('../config')

const router = express.Router()

// 图片存储配置
const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, 'fish_' + Date.now() + ext)
  }
})
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } })

// GET /api/fish — 获取公共池塘鱼列表
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 30))
    const skip = (page - 1) * pageSize

    const [list, total] = await Promise.all([
      Fish.find()
        .sort({ petCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Fish.countDocuments()
    ])

    res.json({ list, total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/fish/next-number — 获取下一条鱼的编号
router.get('/next-number', async (req, res) => {
  try {
    let counter = await Counter.findById('fishNo')
    if (!counter) {
      // 首次运行，用当前鱼数量初始化计数器
      const total = await Fish.countDocuments()
      counter = await Counter.findByIdAndUpdate(
        'fishNo',
        { $set: { seq: total } },
        { new: true, upsert: true }
      )
    }
    res.json({ nextNo: counter.seq + 1 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/fish — 上传一条新鱼
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const raw = req.body.data
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    const fishDoc = {
      fishId: data.id || 'srv_' + Date.now(),
      type: data.type || 'vector',
      colors: data.colors,
      pattern: data.pattern,
      size: data.size,
      speed: data.speed,
      name: data.name || '无名小鱼',
      author: data.author || '',
      score: data.score || 0,
      petCount: 0
    }

    // 自增编号
    const counter = await Counter.findByIdAndUpdate(
      'fishNo',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    fishDoc.fishNo = counter.seq

    if (req.file) {
      fishDoc.imageUrl = '/uploads/' + req.file.filename
    }

    const fish = await Fish.create(fishDoc)
    res.json({ fish })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/fish/:fishId/pet — 摸一条鱼
router.post('/:fishId/pet', async (req, res) => {
  try {
    const fish = await Fish.findOneAndUpdate(
      { fishId: req.params.fishId },
      { $inc: { petCount: 1 } },
      { new: true }
    )
    if (!fish) {
      return res.status(404).json({ error: '鱼不存在' })
    }
    res.json({ petCount: fish.petCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/fish/:fishId — 删除一条鱼
router.delete('/:fishId', async (req, res) => {
  try {
    const fish = await Fish.findOneAndDelete({ fishId: req.params.fishId })
    if (!fish) {
      return res.status(404).json({ error: '鱼不存在' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/fish/clear — 清空所有鱼
router.post('/clear', async (req, res) => {
  try {
    const result = await Fish.deleteMany({})
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
