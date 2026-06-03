import express from 'express'
import {signUp,logIn,logOut} from '../controllers/authController.js'

export const authRoutes = express.Router()

authRoutes.post('/register',signUp)
authRoutes.post('/login', logIn)
authRoutes.post('/logout', logOut)