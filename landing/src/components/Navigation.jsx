import { useState } from 'react'
import Logo from './Logo'

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'For Vendors', href: '#vendors' },
    { label: 'For Buyers', href: '#buyers' },
  ]

  const scrollToSection = (e, href) => {
    e.preventDefault()
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMenuOpen(false)
  }

  return (
    <nav className="w-full bg-cream py-5 px-4 sm:px-6 lg:px-20 flex justify-between items-center sticky top-0 z-50">
      <a href="#home" onClick={(e) => scrollToSection(e, '#home')} className="flex items-center gap-2">
        <Logo className="w-9 h-9" />
        <span className="text-2xl font-light text-gray-900">GoToMart</span>
      </a>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(e) => scrollToSection(e, link.href)}
            className="text-sm text-gray-text hover:text-gray-900 transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Desktop CTA */}
      <div className="hidden md:flex items-center gap-3">
        <a href="#contact" className="text-sm text-gray-900">Contact us</a>
        <a
          href="https://wa.me/YOUR_WHATSAPP_NUMBER"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black text-white text-sm px-4 py-3.5 rounded hover:bg-gray-800 transition-colors"
        >
          Start Chatting
        </a>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-cream border-t border-light-gray md:hidden">
          <div className="flex flex-col p-4 gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm text-gray-text hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://wa.me/YOUR_WHATSAPP_NUMBER"
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
