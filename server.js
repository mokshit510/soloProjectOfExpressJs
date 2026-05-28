import express from 'express'
import cors from 'cors'
import session from 'express-session'
import {meRoutes} from './routes/meRoutes.js'
const PORT = 8000
const app = express()

app.use(express.static('public'))
app.use(session())
app.use(cors)
app.use('/api/auth', meRoutes)
app.use('/api/battle',)
app.use('/api',)

app.listen(PORT,(req,res)=>{res.status(200).json({message: `server in online on port:${PORT}`})})