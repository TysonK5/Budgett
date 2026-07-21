import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'budgett-dev-secret-change-me'

/** In-memory user store — replace with a real DB for production */
const users = new Map<string, { id: string; email: string; passwordHash: string }>()

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: 'Email and password (min 6 chars) required' })
      return
    }
    const key = email.toLowerCase()
    if (users.has(key)) {
      res.status(409).json({ error: 'User already exists' })
      return
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const id = `user_${Date.now()}`
    users.set(key, { id, email: key, passwordHash })
    const token = jwt.sign({ sub: id, email: key }, JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, email: key })
  } catch {
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }
    const user = users.get(email.toLowerCase())
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    })
    res.json({ token, email: user.email })
  } catch {
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router
