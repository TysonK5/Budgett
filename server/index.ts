/**
 * Optional Express backend for cloud sync.
 * Local-first app works fully without this server.
 */
import express from 'express'
import authRoutes from './routes/auth'
import syncRoutes from './routes/sync'

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(express.json({ limit: '5mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'budgett-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/sync', syncRoutes)

app.listen(PORT, () => {
  console.log(`Budgett optional API listening on http://localhost:${PORT}`)
})
