import express from 'express'
import {me} from '../controllers/meController'

export const meRoutes = express.Routers()

meRoutes.get('/me',me)

