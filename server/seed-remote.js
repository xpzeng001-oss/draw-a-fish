/**
 * 远程种子脚本：通过 API 上传假鱼数据到服务器
 * 用法：node seed-remote.js
 */
const fs = require('fs')
const path = require('path')
const http = require('https')

const API_URL = 'https://xckjsoft.cn/api/fish'

const fakeFish = [
  { file: 'fake_1.png', name: '靴子金金', author: '小柒', score: 88, petCount: 12 },
  { file: 'fake_2.png', name: '蓝胖子', author: '鱼大师', score: 76, petCount: 8 },
  { file: 'fake_3.png', name: '微笑鲈鱼', author: '阿呆', score: 92, petCount: 21 },
  { file: 'fake_4.png', name: '橘子泡泡', author: '画画的小周', score: 81, petCount: 15 },
  { file: 'fake_5.png', name: '波点大王', author: '芒果鱼', score: 85, petCount: 18 },
  { file: 'fake_6.png', name: '大嘴怪', author: '深海恐惧症', score: 71, petCount: 27 },
  { file: 'fake_7.png', name: '这不是鱼', author: '混进来的', score: 55, petCount: 33 },
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
      size: 0.8 + Math.random() * 0.4,
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

async function main() {
  console.log('开始上传假鱼数据到', API_URL, '\n')
  for (const fish of fakeFish) {
    try {
      const res = await uploadFish(fish)
      console.log(`✓ ${fish.name} (by ${fish.author})`)
    } catch (err) {
      console.log(`✗ ${fish.name} 失败:`, err.message)
    }
  }
  console.log('\n完成!')
}

main()
