import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { WA, scrollToId } from '../lib/actions'

const navLinks = [
  { label: 'How it works', href: '/#how-it-works', hash: 'how-it-works' },
  { label: 'For Vendors', href: '/#vendors', hash: 'vendors' },
  { label: 'For Buyers', href: '/#buyers', hash: 'buyers' },
  { label: 'Pricing', href: '/#cta', hash: 'cta' },
  { label: 'About', href: '/about', path: '/about' },
  { label: 'Vendors', href: '/vendors', path: '/vendors' },
]

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const goHomeSection = (e, hash) => {
    e.preventDefault()
    setIsMenuOpen(false)
    if (location.pathname === '/') {
      scrollToId(hash)
      window.history.replaceState(null, '', `/#${hash}`)
    } else {
      navigate(`/#${hash}`)
    }
  }

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${
      isActive ? 'text-navy font-medium' : 'text-gray-text hover:text-gray-900'
    }`

  return (
    <nav className="w-full bg-cream py-5 px-4 sm:px-10 lg:px-20 flex justify-between items-center sticky top-0 z-50 relative">
      <Link
        to="/"
        onClick={() => setIsMenuOpen(false)}
        className="flex items-center gap-2"
      >
        <Logo className="w-9 h-9" />
        <span className="text-2xl font-light text-gray-900">GotoMart</span>
      </Link>

      <div className="hidden lg:flex items-center gap-8">
        {navLinks.map((link) =>
          link.path ? (
            <NavLink
              key={link.label}
              to={link.path}
              className={linkClass}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ) : (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => goHomeSection(e, link.hash)}
              className="text-sm text-gray-text hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          )
        )}
      </div>

      <div className="hidden md:flex items-center gap-3">
        <a
          href={WA.contactSales}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-900 hover:text-navy transition-colors"
        >
          Contact us
        </a>
        <a
          href={WA.startChatting}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black text-white text-sm px-4 py-3.5 rounded hover:bg-gray-800 transition-colors"
        >
          Start Chatting
        </a>
      </div>

      <button
        type="button"
        className="lg:hidden p-2"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((v) => !v)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-cream border-t border-light-gray lg:hidden shadow-sm">
          <div className="flex flex-col p-4 gap-4">
            {navLinks.map((link) =>
              link.path ? (
                <NavLink
                  key={link.label}
                  to={link.path}
                  className={linkClass}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => goHomeSection(e, link.hash)}
                  className="text-sm text-gray-text hover:text-gray-900"
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href={WA.contactSales}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900"
            >
              Contact us
            </a>
            <a
              href={WA.startChatting}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-sm px-4 py-3 rounded text-center"
            >
              Start Chatting
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation
