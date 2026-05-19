import { Request, Response, NextFunction } from 'express'
import { loadConfig } from './config'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }
  const token = header.slice(7)
  try {
    const config = loadConfig()
    if (token !== config.authToken) {
      res.status(403).json({ error: 'Invalid token' })
      return
    }
    next()
  } catch {
    res.status(503).json({ error: 'Config not loaded' })
  }
}
