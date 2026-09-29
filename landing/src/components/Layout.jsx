import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AnnouncementBanner from './AnnouncementBanner'
import Navigation from './Navigation'
import Footer from './Footer'
import { scrollToId } from '../lib/actions'

function Layout() {
  const location = useLocation()

  // Support /#section links from other pages
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      // Wait a tick for page content to mount
      const t = window.setTimeout(() => scrollToId(id), 50)
      return () => window.clearTimeout(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
    return undefined
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-screen bg-cream font-inter">
      <AnnouncementBanner />
      <Navigation />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
