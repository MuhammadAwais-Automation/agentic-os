import { redirect } from 'next/navigation'

export default async function RootPage() {
  try {
    const res = await fetch('http://localhost:3001/api/config/status', { cache: 'no-store' })
    const data = await res.json() as { configured: boolean }
    if (data.configured) redirect('/home')
    else redirect('/setup')
  } catch {
    redirect('/setup')
  }
}
