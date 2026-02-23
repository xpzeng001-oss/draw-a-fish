const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const config = require('./config')
const fishRoutes = require('./routes/fish')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/fish', fishRoutes)

mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
