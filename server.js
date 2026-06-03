import express from 'express'
import cors from 'cors'
import session from 'express-session'
import {meRoutes} from './routes/meRoutes.js'
import {authRoutes} from './routes/authRoutes.js'
import {battleRoutes} from './routes/battleRoutes.js'
import {heroRoutes} from './routes/heroRoutes.js'
import { diceGameRoutes } from './routes/diceGameRoutes.js'
const PORT = 8000
const app = express()

app.use(express.json()) 

app.use(session({
  secret: secret,
  resave: false, 
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}))

app.use(express.static('public'))
app.use(cors)
app.use('/api/auth', meRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/battle', battleRoutes)
app.use('/api', diceGameRoutes)

app.listen(PORT,(req,res)=>{res.status(200).json({message: `server in online on port:${PORT}`})})