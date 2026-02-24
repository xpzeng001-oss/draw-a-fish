const BASE_URL = 'https://xckjsoft.cn/api' // TODO: 替换为你的服务器地址

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header || { 'content-type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data.error || '请求失败'))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

function getFishList(page, pageSize) {
  return request('/fish?page=' + (page || 1) + '&pageSize=' + (pageSize || 30))
}

function uploadFish(fishData, imagePath) {
  return new Promise((resolve, reject) => {
    const data = {
      id: fishData.id,
      type: fishData.type,
      colors: fishData.colors,
      pattern: fishData.pattern,
      size: fishData.size,
      speed: fishData.speed,
      name: fishData.name,
      author: fishData.author || '',
      score: fishData.score
    }

    if (imagePath && fishData.type === 'image') {
      wx.uploadFile({
        url: BASE_URL + '/fish',
        filePath: imagePath,
        name: 'image',
        formData: { data: JSON.stringify(data) },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(res.data))
          } else {
            reject(new Error('上传失败'))
          }
        },
        fail: reject
      })
    } else {
      // vector 鱼，无图片，用普通 JSON 请求
      request('/fish', {
        method: 'POST',
        data: { data: JSON.stringify(data) }
      }).then(resolve).catch(reject)
    }
  })
}

function petFish(fishId) {
  return request('/fish/' + fishId + '/pet', { method: 'POST' })
}

function getNextFishNumber() {
  return request('/fish/next-number')
}

function getBaseUrl() {
  return BASE_URL.replace('/api', '')
}

module.exports = { getFishList, uploadFish, petFish, getNextFishNumber, getBaseUrl }
