const mongoose = require('mongoose')

const fishSchema = new mongoose.Schema({
  fishId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['vector', 'image'], default: 'vector' },
  imageUrl: { type: String, default: '' },
  colors: {
    body: String,
    fin: String,
    eye: String
  },
  pattern: { type: Number, default: 0 },
  size: { type: Number, default: 1 },
  speed: { type: Number, default: 0.5 },
  name: { type: String, default: '无名小鱼' },
  author: { type: String, default: '' },
  score: { type: Number, default: 0 },
  fishNo: { type: Number, default: 0 },
  petCount: { type: Number, default: 0 }
}, {
  timestamps: true
})

fishSchema.index({ petCount: -1, createdAt: -1 })

module.exports = mongoose.model('Fish', fishSchema)
