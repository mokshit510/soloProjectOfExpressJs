import express from 'express'
import {hero} from '../controllers/heroController.js'

export const heroRoutes = express.Router()

heroRoutes.get('/heroes',hero)