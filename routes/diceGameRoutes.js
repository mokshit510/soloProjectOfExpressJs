import express from 'express'
import { createDiceGameEngine } from '../domain/diceGameEngine.js'

export const diceGameRoutes = express.Router()

diceGameRoutes.get('/heroes',createDiceGameEngine)



