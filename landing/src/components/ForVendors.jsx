import { Storefront, TrendUp, ShieldCheck, CurrencyNgn } from '@phosphor-icons/react'

const vendorBenefits = [
  {
    icon: Storefront,
    title: 'Zero Setup Cost',
    description: 'No need to build a website or app. Just your WhatsApp Business account.',
  },
  {
    icon: TrendUp,
    title: 'Reach More Customers',
    description: 'Get discovered by buyers actively searching for what you sell.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Status',
    description: 'Build trust with verified vendor badges and customer reviews.',
  },
  {
    icon: CurrencyNgn,
    title: 'Fast Payouts',
    description: 'Receive payments directly to your bank account.',
  },
]

function ForVendors() {
  return (
    <section id="vendors" className="w-full bg-cream-dark px-4 sm:px-6 lg:px-20 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-sm font-medium text-navy uppercase tracking-wide">For Vendors</span>
            <h2 className="text-3xl lg:text-5xl font-light text-gray-900 mt-3 mb-6">
              Start selling on WhatsApp
            </h2>
            <p className="text-lg text-gray-text mb-8">
              Turn your WhatsApp Business into a storefront. No coding, no complex setup — 
              just forward your product catalog and start receiving orders.
            </p>

            <div className="space-y-6">
              {vendorBenefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{benefit.title}</h3>
                    <p className="text-sm text-gray-text">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <a
                href="https://wa.me/YOUR_WHATSAPP_NUMBER?text=I%20want%20to%20sell%20on%20GoToMart"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white px-6 py-4 rounded hover:bg-gray-800 transition-colors inline-block"
              >
                Register as a Vendor
              </a>
            </div>
          </div>

          {/* Right - Mock Chat */}
          <div className="bg-cream rounded-lg p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="bg-white rounded p-3 text-sm text-gray-900 max-w-[80%]">
                  Want to list your business on GoToMart? Reply <strong>YES</strong> to get started.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-navy text-white rounded p-3 text-sm max-w-[60%]">
                  YES
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white rounded p-3 text-sm text-gray-900 max-w-[90%]">
                  Great! Where would you like to receive your money? Send your bank name, account number, and account name.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-navy text-white rounded p-3 text-sm max-w-[80%]">
                  GTBank, 0123456789, Iya Basira Foods
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white rounded p-3 text-sm text-gray-900 max-w-[95%]">
                  Got it! Now forward any product from your WhatsApp Business Catalog to add it to your store.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForVendors
