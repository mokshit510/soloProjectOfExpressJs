import express from 'express'
import {start,round,reset} from '../controllers/battleController.js'

export const battleRoutes = express.Router()

battleRoutes.post('/start', start)
battleRoutes.post('/round', round)
battleRoutes.get('/reset', reset)