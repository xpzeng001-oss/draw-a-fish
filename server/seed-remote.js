/**
 * 远程种子脚本：通过 API 上传假鱼数据到服务器
 * 用法：node seed-remote.js
 */
const fs = require('fs')
const path = require('path')
const http = require('https')

const API_URL = 'https://xckjsoft.cn/api/fish'

const fakeFish = [
  { file: 'fake_1.png', name: '小灰鲨', author: '海底探险家', score: 90, petCount: 31 },
  { file: 'fake_2.png', name: '白团子', author: '软糯糯', score: 78, petCount: 18 },
  { file: 'fake_3.png', name: '靴子金金', author: '小柒', score: 88, petCount: 42 },
  { file: 'fake_4.png', name: '蓝胖子', author: '鱼大师', score: 76, petCount: 25 },
  { file: 'fake_5.png', name: '微笑鲈鱼', author: '阿呆', score: 92, petCount: 37 },
  { file: 'fake_6.png', name: '橘子泡泡', author: '画画的小周', score: 81, petCount: 28 },
  { file: 'fake_7.png', name: '波点大王', author: '芒果鱼', score: 85, petCount: 22 },
  { file: 'fake_8.png', name: '大嘴怪', author: '深海恐惧症', score: 71, petCount: 45 },
  { file: 'fake_9.png', name: '站站鱼', author: '混进来的', score: 55, petCount: 33 },
  { file: 'fake_10.png', name: '墨镜酷鱼', author: '摸鱼达人', score: 83, petCount: 15 },
  { file: 'fake_11.png', name: '鳄鱼混子', author: '我不是鱼', score: 60, petCount: 39 },
  { file: 'fake_12.png', name: '涂鸦蓝鱼', author: '灵魂画手', score: 72, petCount: 12 },
  { file: 'fake_13.png', name: '斑点灯笼鱼', author: '深海来客', score: 79, petCount: 20 },
  { file: 'fake_14.png', name: '绿毛怪', author: '画风清奇', score: 65, petCount: 27 },
  { file: 'fake_15.png', name: '虎皮小鱼', author: '条纹控', score: 80, petCount: 16 },
  { file: 'fake_16.png', name: '红胖鸟鱼', author: '愤怒的鱼', score: 74, petCount: 35 },
  { file: 'fake_17.png', name: '礼帽先生', author: '绅士鱼', score: 77, petCount: 23 },
]

function uploadFish(fish) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'uploads', fish.file)
    const fileData = fs.readFileSync(filePath)
    const boundary = '----FishBoundary' + Date.now()

    const fishData = JSON.stringify({
      id: 'fake_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'image',
      colors: { body: '#FF6B6B', fin: '#EE5A5A', eye: '#333' },
      pattern: 0,
      size: 0.95 + Math.random() * 0.1,
      speed: 0.4 + Math.random() * 0.4,
      name: fish.name,
      author: fish.author,
      score: fish.score
    })

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="data"\r\n\r\n`,
      `${fishData}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="image"; filename="${fish.file}"\r\n`,
      `Content-Type: image/png\r\n\r\n`,
    ]

    const bodyEnd = `\r\n--${boundary}--\r\n`
    const bodyStart = Buffer.concat(bodyParts.map(p => Buffer.from(p)))
    const bodyEndBuf = Buffer.from(bodyEnd)
    const body = Buffer.concat([bodyStart, fileData, bodyEndBuf])

    const url = new URL(API_URL)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function petFish(fishId, times) {
  let done = 0
  function next() {
    if (done >= times) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const url = new URL(API_URL + '/' + fishId + '/pet')
      const req = http.request({
        hostname: url.hostname, port: 443, path: url.pathname,
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }, res => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => { done++; resolve() })
      })
      req.on('error', reject)
      req.end()
    }).then(next)
  }
  return next()
}

async function main() {
  console.log('上传假鱼数据到', API_URL, '\n')
  for (const fish of fakeFish) {
    try {
      const res = await uploadFish(fish)
      const fishId = res.fish.fishId
      if (fish.petCount > 0) {
        await petFish(fishId, fish.petCount)
      }
      console.log(`✓ ${fish.name} (by ${fish.author}) - ${fish.petCount}次摸鱼`)
    } catch (err) {
      console.log(`✗ ${fish.name} 失败:`, err.message)
    }
  }
  console.log('\n完成!')
}

main()
