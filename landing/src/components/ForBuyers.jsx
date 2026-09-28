import { MagnifyingGlass, Faders, CreditCard, MapPin } from '@phosphor-icons/react'

const buyerFeatures = [
  {
    icon: MagnifyingGlass,
    title: 'Natural Language Search',
    description: 'Just say what you need in plain text. "50kg rice in Ikorodu" or "fresh tomatoes near me"',
  },
  {
    icon: Faders,
    title: 'Curated Vendor Lists',
    description: 'Get top 3 options sorted by price, distance, and vendor rating.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Pay securely and receive a PIN to confirm handover with your vendor.',
  },
  {
    icon: MapPin,
    title: 'Local First',
    description: 'Priority matching with vendors in your area for faster delivery.',
  },
]

function ForBuyers() {
  return (
    <section id="buyers" className="w-full bg-cream px-4 sm:px-6 lg:px-20 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Mock Vendor List */}
          <div className="order-2 lg:order-1 bg-cream-dark rounded-lg p-6 shadow-sm">
            <div className="bg-white rounded p-4 mb-3">
              <p className="text-sm text-gray-text mb-4">Here's what I found for <strong>50kg bag rice in Ikorodu</strong>:</p>
              
              {/* Vendor Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-light-gray rounded cursor-pointer hover:border-navy transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Iya Basira Foods</p>
                    <p className="text-xs text-gray-text">₦45,000 • ★4.8 • Verified</p>
                  </div>
                  <div className="text-navy text-sm">Select</div>
                </div>
                
                <div className="flex items-center justify-between p-3 border border-light-gray rounded cursor-pointer hover:border-navy transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Ikorodu Grains Hub</p>
                    <p className="text-xs text-gray-text">₦46,500 • ★4.5 • Verified</p>
                  </div>
                  <div className="text-navy text-sm">Select</div>
                </div>
                
                <div className="flex items-center justify-between p-3 border border-light-gray rounded cursor-pointer hover:border-navy transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Quick Rice Depot</p>
                    <p className="text-xs text-gray-text">₦44,000 • ★4.0</p>
                  </div>
                  <div className="text-navy text-sm">Select</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="order-1 lg:order-2">
            <span className="text-sm font-medium text-navy uppercase tracking-wide">For Buyers</span>
            <h2 className="text-3xl lg:text-5xl font-light text-gray-900 mt-3 mb-6">
              Shop from trusted vendors
            </h2>
            <p className="text-lg text-gray-text mb-8">
              No more hunting through multiple WhatsApp groups. Tell GoToMart what you need 
              and get matched with verified vendors ready to deliver.
            </p>

            <div className="space-y-6">
              {buyerFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-text">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/YOUR_WHATSAPP_NUMBER"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white px-6 py-4 rounded hover:bg-gray-800 transition-colors inline-block"
              >
                Start Shopping
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForBuyers
