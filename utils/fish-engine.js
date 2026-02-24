/**
 * 鱼缸引擎 - 矢量鱼绘制与游动物理
 */

function createSwimmingFish(data, canvasW, canvasH, index) {
  // 将 size 压缩到 0.95~1.05，让所有鱼视觉大小接近
  const sizeVal = 0.95 + Math.min(Math.max((data.size || 1) - 0.8, 0), 0.4) * 0.25
  const baseSize = 28 * 1.6 * sizeVal
  return {
    id: data.id || 'fish_' + index,
    x: Math.random() * (canvasW - 80) + 40,
    y: Math.random() * (canvasH - 160) + 60,
    vx: (Math.random() - 0.5) * 1.5 * (data.speed || 1),
    vy: (Math.random() - 0.5) * 0.6,
    bodyW: baseSize * 2,
    bodyH: baseSize * 1.2,
    colors: data.colors || { body: '#FF6B6B', fin: '#EE5A5A', eye: '#333' },
    pattern: data.pattern || 0,
    tailAngle: 0,
    tailSpeed: 0.08 + Math.random() * 0.04,
    tailPhase: Math.random() * Math.PI * 2,
    facingRight: Math.random() > 0.5,
    scared: 0,
    name: data.name || '',
    author: data.author || '',
    score: data.score || 0,
    createTime: data.createTime || 0,
    petCount: data.petCount || 0,
    // 图片鱼相关
    type: data.type || 'vector',
    imagePath: data.imagePath || null,
    imageBitmap: null,
  }
}

function updateFish(fish, canvasW, canvasH) {
  // 受惊加速
  if (fish.scared > 0) {
    fish.scared--
    fish.vx *= 1.02
    fish.vy *= 1.02
  }

  // 速度衰减
  const maxSpeed = fish.scared > 0 ? 4 : 1.5
  const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
  if (speed > maxSpeed) {
    fish.vx = (fish.vx / speed) * maxSpeed
    fish.vy = (fish.vy / speed) * maxSpeed
  }
  fish.vx *= 0.998
  fish.vy *= 0.998

  // 随机游动
  if (Math.random() < 0.02) {
    fish.vx += (Math.random() - 0.5) * 0.5
    fish.vy += (Math.random() - 0.5) * 0.3
  }

  // 边界循环：左右穿越，上下限制不出屏
  const padX = fish.bodyW * 0.3
  const topLimit = 80  // 顶部安全区，避免遮挡UI
  if (fish.x < -padX) { fish.x = canvasW + padX * 0.5; }
  if (fish.x > canvasW + padX) { fish.x = -padX * 0.5; }
  if (fish.y < topLimit) { fish.y = topLimit; fish.vy = Math.abs(fish.vy) * 0.5; }
  if (fish.y > canvasH - 140) { fish.y = canvasH - 140; fish.vy = -Math.abs(fish.vy) * 0.5; }

  // 确保最低速度
  if (Math.abs(fish.vx) < 0.2) {
    fish.vx = fish.facingRight ? 0.3 : -0.3
  }

  fish.x += fish.vx
  fish.y += fish.vy

  // 朝向
  if (Math.abs(fish.vx) > 0.1) {
    fish.facingRight = fish.vx > 0
  }

  // 尾巴摆动
  fish.tailPhase += fish.tailSpeed * (1 + speed * 0.5)
  fish.tailAngle = Math.sin(fish.tailPhase) * 0.4
}

function drawVectorFish(ctx, fish) {
  // 如果有用户画的图片，绘制图片鱼
  if (fish.imageBitmap) {
    _drawImageFish(ctx, fish)
    return
  }

  ctx.save()
  ctx.translate(fish.x, fish.y)

  if (!fish.facingRight) {
    ctx.scale(-1, 1)
  }

  const w = fish.bodyW
  const h = fish.bodyH
  const tailSwing = fish.tailAngle

  // ===== 尾巴 =====
  ctx.save()
  ctx.translate(-w * 0.45, 0)
  ctx.rotate(tailSwing)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-w * 0.35, -h * 0.4)
  ctx.quadraticCurveTo(-w * 0.2, 0, -w * 0.35, h * 0.4)
  ctx.closePath()
  ctx.fillStyle = fish.colors.fin
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.restore()

  // ===== 身体 =====
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.ellipse(0, 0, w * 0.48, h * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = fish.colors.body
  ctx.fill()

  // 身体高光
  ctx.beginPath()
  ctx.ellipse(w * 0.05, -h * 0.12, w * 0.32, h * 0.2, -0.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()

  // ===== 花纹 =====
  _drawPattern(ctx, fish, w, h)

  // ===== 背鳍 =====
  ctx.beginPath()
  ctx.moveTo(w * 0.1, -h * 0.42)
  ctx.quadraticCurveTo(0, -h * 0.7, -w * 0.15, -h * 0.42)
  ctx.fillStyle = fish.colors.fin
  ctx.globalAlpha = 0.75
  ctx.fill()

  // ===== 腹鳍 =====
  ctx.beginPath()
  ctx.moveTo(w * 0.05, h * 0.4)
  ctx.quadraticCurveTo(w * 0.0, h * 0.65, -w * 0.1, h * 0.4)
  ctx.fillStyle = fish.colors.fin
  ctx.globalAlpha = 0.7
  ctx.fill()

  // ===== 胸鳍 =====
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.ellipse(w * 0.08, h * 0.1, w * 0.12, h * 0.22, 0.5, 0, Math.PI * 2)
  ctx.fillStyle = fish.colors.fin
  ctx.fill()

  // ===== 眼睛 =====
  ctx.globalAlpha = 1
  const eyeX = w * 0.22
  const eyeY = -h * 0.08
  const eyeR = h * 0.14

  // 眼白
  ctx.beginPath()
  ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  // 瞳孔
  ctx.beginPath()
  ctx.arc(eyeX + eyeR * 0.15, eyeY, eyeR * 0.6, 0, Math.PI * 2)
  ctx.fillStyle = fish.colors.eye
  ctx.fill()

  // 眼睛高光
  ctx.beginPath()
  ctx.arc(eyeX + eyeR * 0.3, eyeY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  // ===== 嘴巴 =====
  ctx.beginPath()
  ctx.arc(w * 0.42, h * 0.06, h * 0.06, 0.2, Math.PI - 0.2)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()
}

function _drawImageFish(ctx, fish) {
  ctx.save()
  ctx.translate(fish.x, fish.y)

  // 服务器假鱼图片朝左，游向右时翻转；用户画的鱼不翻转
  const isServerFish = fish.imagePath && fish.imagePath.startsWith('/')
  if (isServerFish) {
    if (fish.facingRight) {
      ctx.scale(-1, 1)
    }
  }

  const w = fish.bodyW
  const h = fish.bodyH
  const img = fish.imageBitmap
  const imgAspect = img.width / img.height
  let drawW = w
  let drawH = w / imgAspect
  if (drawH > h) {
    drawH = h
    drawW = h * imgAspect
  }

  // 分段绘制：将鱼图片切成竖条，从头到尾施加递增的正弦波偏移
  // 图片默认朝左，左侧=头，右侧=尾
  const segs = 8
  const segW = drawW / segs
  const srcSegW = img.width / segs

  for (let i = 0; i < segs; i++) {
    // t: 0=头部, 1=尾部
    const t = i / (segs - 1)
    // 振幅从头到尾二次方递增，头部几乎不动，尾部摆幅最大
    const amp = t * t * drawH * 0.08
    const wave = Math.sin(fish.tailPhase + t * 2.5) * amp

    ctx.drawImage(
      img,
      i * srcSegW, 0, srcSegW, img.height,
      -drawW / 2 + i * segW, -drawH / 2 + wave, segW + 1, drawH
    )
  }

  ctx.restore()
}

function _drawPattern(ctx, fish, w, h) {
  ctx.save()
  // 裁剪到鱼身体内
  ctx.beginPath()
  ctx.ellipse(0, 0, w * 0.46, h * 0.43, 0, 0, Math.PI * 2)
  ctx.clip()

  ctx.globalAlpha = 0.25

  switch (fish.pattern) {
    case 1: // 条纹
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2.5
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(i * w * 0.12, -h * 0.5)
        ctx.lineTo(i * w * 0.12 - w * 0.05, h * 0.5)
        ctx.stroke()
      }
      break
    case 2: // 圆点
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 8; i++) {
        const dx = (Math.random() - 0.5) * w * 0.7
        const dy = (Math.random() - 0.5) * h * 0.6
        ctx.beginPath()
        ctx.arc(dx, dy, 3 + Math.random() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 3: // 渐变带
      const gradient = ctx.createLinearGradient(0, -h * 0.45, 0, h * 0.45)
      gradient.addColorStop(0, 'rgba(255,255,255,0.3)')
      gradient.addColorStop(0.5, 'transparent')
      gradient.addColorStop(1, 'rgba(0,0,0,0.15)')
      ctx.fillStyle = gradient
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h)
      break
    default: // 素色
      break
  }
  ctx.restore()
}

/**
 * 评估画作的"鱼"程度分数 (简化版本)
 * 基于像素覆盖率和形状分析
 */
function evaluateFishScore(imageData, width, height) {
  if (!imageData) return 50

  let filledPixels = 0
  let totalPixels = width * height
  let minX = width, maxX = 0, minY = height, maxY = 0
  let colorVariety = new Set()

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]
    const a = imageData[i + 3]

    if (a > 30) {
      filledPixels++
      const px = (i / 4) % width
      const py = Math.floor((i / 4) / width)
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      // 量化颜色
      const colorKey = (Math.floor(r / 64) << 4) | (Math.floor(g / 64) << 2) | Math.floor(b / 64)
      colorVariety.add(colorKey)
    }
  }

  const coverage = filledPixels / totalPixels
  const boundW = maxX - minX
  const boundH = maxY - minY
  const aspectRatio = boundW > 0 && boundH > 0 ? boundW / boundH : 0
  const colors = colorVariety.size

  let score = 30

  // 覆盖率 (10-30% 最佳)
  if (coverage > 0.08 && coverage < 0.5) score += 20
  else if (coverage > 0.03) score += 10

  // 横向形状 (鱼通常宽大于高)
  if (aspectRatio > 1.2 && aspectRatio < 3.5) score += 20
  else if (aspectRatio > 0.8) score += 10

  // 颜色丰富度
  if (colors >= 4) score += 15
  else if (colors >= 2) score += 8

  // 大小适中
  if (boundW > width * 0.3 && boundH > height * 0.2) score += 10

  return Math.min(99, Math.max(10, score + Math.floor(Math.random() * 10)))
}

/**
 * 保底检查：确保池塘里始终有足够可见的鱼
 * 在每帧 updateFish 循环之后调用一次
 */
function ensureVisibleFish(fishes, canvasW, canvasH, minVisible) {
  minVisible = minVisible || Math.max(2, Math.ceil(fishes.length * 0.4))
  let visibleCount = 0
  const offscreen = []

  for (let i = 0; i < fishes.length; i++) {
    const f = fishes[i]
    if (f.x > 0 && f.x < canvasW && f.y > 0 && f.y < canvasH - 140) {
      visibleCount++
    } else {
      offscreen.push(f)
    }
  }

  // 可见鱼不够时，把屏幕外的鱼拉回来
  while (visibleCount < minVisible && offscreen.length > 0) {
    const f = offscreen.pop()
    f.x = Math.random() * (canvasW * 0.6) + canvasW * 0.2
    f.y = Math.random() * (canvasH * 0.5) + canvasH * 0.1
    visibleCount++
  }
}

module.exports = {
  createSwimmingFish,
  updateFish,
  drawVectorFish,
  evaluateFishScore,
  ensureVisibleFish
}
