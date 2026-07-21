import { Router, type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'budgett-dev-secret-change-me'

/** Encrypted blobs keyed by user id — clients encrypt before upload */
const store = new Map<string, { payload: string; updatedAt: string }>()

interface AuthRequest extends Request {
  userId?: string
}

function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

router.get('/', auth, (req: AuthRequest, res) => {
  const data = store.get(req.userId!)
  if (!data) {
    res.json({ payload: null, updatedAt: null })
    return
  }
  res.json(data)
})

router.put('/', auth, (req: AuthRequest, res) => {
  const { payload } = req.body as { payload?: string }
  if (typeof payload !== 'string') {
    res.status(400).json({ error: 'Encrypted payload string required' })
    return
  }
  const record = { payload, updatedAt: new Date().toISOString() }
  store.set(req.userId!, record)
  res.json({ ok: true, updatedAt: record.updatedAt })
})

router.delete('/', auth, (req: AuthRequest, res) => {
  store.delete(req.userId!)
  res.json({ ok: true })
})

export default router
