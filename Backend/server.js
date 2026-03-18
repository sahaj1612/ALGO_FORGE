const express = require('express')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()

const User = require('./models/User')
const userRoutes = require('./routes/userRoutes')
const problemRoutes = require('./routes/problemRoutes')
const authMiddleware = require("./middleware/authMiddleware")

const app = express()

app.use(express.json())

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use(passport.initialize())

mongoose.connect("mongodb://127.0.0.1:27017/algoforge")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err))

// GOOGLE STRATEGY
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id })

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                picture: profile.photos[0].value
            })
        }

        return done(null, user)
    } catch (error) {
        return done(error, null)
    }
}
))

// DOCKER

const executeRoute = require("./routes/executeRoute");

app.use("/api/execute", executeRoute);


// LOGIN ROUTE
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
)

// CALLBACK ROUTE (ONLY ONE)
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {

    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.redirect(`http://localhost:5173/dashboard?token=${token}`)
  }
)

// PROTECTED PROFILE ROUTE
app.get('/api/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id)
  res.json(user)
})

app.use('/api', userRoutes)
app.use('/api/problems', problemRoutes)

app.get('/', (req, res) => {
  res.send("AlgoForge Backend Running 🚀")
})

app.listen(5000, () => console.log("Server running on 5000"))