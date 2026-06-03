import express from 'express'
import {me} from '../controllers/meController'

export const meRoutes = express.Router()

meRoutes.get('/me',me)

