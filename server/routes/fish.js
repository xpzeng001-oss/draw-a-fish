const express = require('express')
const multer = require('multer')
const path = require('path')
const Fish = require('../models/Fish')
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

module.exports = router
