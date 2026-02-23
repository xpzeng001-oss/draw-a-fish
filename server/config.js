module.exports = {
  port: 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/draw-a-fish',
  uploadDir: __dirname + '/uploads'
}
