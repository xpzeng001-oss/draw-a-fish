const mongoose = require('mongoose')
const config = require('./config')
const Fish = require('./models/Fish')

const fakeFish = [
  {
    fishId: 'fake_1',
    type: 'image',
    imageUrl: '/uploads/fake_1.png',
    colors: { body: '#F39C12', fin: '#E67E22', eye: '#333' },
    pattern: 0,
    size: 0.9,
    speed: 0.6,
    name: '靴子金金',
    author: '小柒',
    score: 88,
    petCount: 12
  },
  {
    fishId: 'fake_2',
    type: 'image',
    imageUrl: '/uploads/fake_2.png',
    colors: { body: '#3498DB', fin: '#2980B9', eye: '#333' },
    pattern: 0,
    size: 0.8,
    speed: 0.7,
    name: '蓝胖子',
    author: '鱼大师',
    score: 76,
    petCount: 8
  },
  {
    fishId: 'fake_3',
    type: 'image',
    imageUrl: '/uploads/fake_3.png',
    colors: { body: '#ECF0F1', fin: '#E67E22', eye: '#333' },
    pattern: 1,
    size: 1.0,
    speed: 0.5,
    name: '微笑鲈鱼',
    author: '阿呆',
    score: 92,
    petCount: 21
  },
  {
    fishId: 'fake_4',
    type: 'image',
    imageUrl: '/uploads/fake_4.png',
    colors: { body: '#E67E22', fin: '#D35400', eye: '#333' },
    pattern: 3,
    size: 0.85,
    speed: 0.4,
    name: '橘子泡泡',
    author: '画画的小周',
    score: 81,
    petCount: 15
  },
  {
    fishId: 'fake_5',
    type: 'image',
    imageUrl: '/uploads/fake_5.png',
    colors: { body: '#A8E6CF', fin: '#3498DB', eye: '#333' },
    pattern: 2,
    size: 1.1,
    speed: 0.5,
    name: '波点大王',
    author: '芒果鱼',
    score: 85,
    petCount: 18
  },
  {
    fishId: 'fake_6',
    type: 'image',
    imageUrl: '/uploads/fake_6.png',
    colors: { body: '#F1C40F', fin: '#333', eye: '#fff' },
    pattern: 0,
    size: 0.95,
    speed: 0.8,
    name: '大嘴怪',
    author: '深海恐惧症',
    score: 71,
    petCount: 27
  },
  {
    fishId: 'fake_7',
    type: 'image',
    imageUrl: '/uploads/fake_7.png',
    colors: { body: '#27AE60', fin: '#1E8449', eye: '#333' },
    pattern: 0,
    size: 1.2,
    speed: 0.3,
    name: '这不是鱼',
    author: '混进来的',
    score: 55,
    petCount: 33
  }
]

mongoose.connect(config.mongoUri)
  .then(async () => {
    console.log('MongoDB connected')
    for (const fish of fakeFish) {
      await Fish.findOneAndUpdate(
        { fishId: fish.fishId },
        fish,
        { upsert: true, new: true }
      )
      console.log(`+ ${fish.name} (by ${fish.author})`)
    }
    console.log('\nDone! Inserted', fakeFish.length, 'fake fish')
    process.exit(0)
  })
  .catch(err => {
    console.error('Failed:', err.message)
    process.exit(1)
  })
