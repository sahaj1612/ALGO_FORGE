const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const User = require('../models/User')

router.get('/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id)
  res.json(user)
})

module.exports = router