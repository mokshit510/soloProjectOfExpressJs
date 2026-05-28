import express from 'express'

export const authRoutes = express.Router()

authRoutes.post('/register',signUp)
authRoutes.post('/login', logIn)
authRoutes.post('/logout', logOut)