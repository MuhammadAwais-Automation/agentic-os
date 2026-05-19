const fs = require('fs')
const net = require('net')
const path = require('path')

const nextDir = path.join(__dirname, '..', 'apps', 'dashboard', '.next')

const probe = net.createServer()

probe.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('[clean] dashboard dev server is already using port 3000; refusing to remove live .next cache')
    process.exit(1)
  }
  console.error(`[clean] could not check port 3000: ${error.message}`)
  process.exit(1)
})

probe.once('listening', () => {
  probe.close(() => {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log('[clean] removed apps/dashboard/.next')
    } catch (error) {
      console.warn('[clean] could not remove apps/dashboard/.next:', error.message)
    }
  })
})

probe.listen(3000, '127.0.0.1')
