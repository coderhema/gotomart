import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { WA, scrollToId } from '../lib/actions'

const productLinks = [
  { label: 'Features', href: '/#how-it-works', hash: 'how-it-works' },
  { label: 'Pricing', href: '/#cta', hash: 'cta' },
  { label: 'Vendors', href: '/#vendors', hash: 'vendors' },
  { label: 'Buyers', href: '/#buyers', hash: 'buyers' },
]

const companyLinks = [
  { label: 'About', to: '/about' },
  { label: 'Blog', href: '/#cta', hash: 'cta' },
]

const supportLinks = [
  { label: 'Help', href: WA.contactSales, external: true },
  { label: 'Contact', href: WA.contactSales, external: true },
  { label: 'Privacy', to: '/about' },
]

function FooterLink({ link }) {
  const location = useLocation()
  const navigate = useNavigate()

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        {link.label}
      </a>
    )
  }

  if (link.to) {
    return (
      <Link to={link.to} className="text-sm text-gray-400 hover:text-white transition-colors">
        {link.label}
      </Link>
    )
  }

  const onClick = (e) => {
    e.preventDefault()
    if (location.pathname === '/') {
      scrollToId(link.hash)
      window.history.replaceState(null, '', `/#${link.hash}`)
    } else {
      navigate(`/#${link.hash}`)
    }
  }

  return (
    <a
      href={link.href}
      onClick={onClick}
      className="text-sm text-gray-400 hover:text-white transition-colors"
    >
      {link.label}
    </a>
  )
}

function Footer() {
  return (
    <footer className="w-full bg-black text-white px-4 sm:px-10 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <Logo className="w-8 h-8" fill="#ffffff" />
              <span className="text-xl font-light">GotoMart</span>
            </Link>
            <p className="text-sm text-gray-400">Your WhatsApp marketplace</p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-sm text-gray-500">© 2026 GotoMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
