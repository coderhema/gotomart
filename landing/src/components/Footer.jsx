import Logo from './Logo'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer id="contact" className="w-full bg-gray-900 text-white px-4 sm:px-6 lg:px-20 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Logo className="w-8 h-8" />
              <span className="text-2xl font-light">GoToMart</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Nigeria's WhatsApp-native marketplace. Connecting buyers with trusted local vendors 
              through simple, secure conversations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#vendors" className="hover:text-white transition-colors">For Vendors</a></li>
              <li><a href="#buyers" className="hover:text-white transition-colors">For Buyers</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a 
                  href="https://wa.me/YOUR_WHATSAPP_NUMBER" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@gotomart.ng" 
                  className="hover:text-white transition-colors"
                >
                  support@gotomart.ng
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} GoToMart. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Built with ❤️ in Lagos, Nigeria
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
