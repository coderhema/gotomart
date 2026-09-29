import { WA } from '../lib/actions'

function ForVendors() {
  return (
    <section id="vendors" className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="flex flex-col gap-5 max-w-xl">
          <span className="text-xs font-medium tracking-[0.12em] text-navy uppercase">
            For Vendors
          </span>
          <h2 className="text-3xl lg:text-5xl font-light text-gray-900 leading-tight">
            Reach more buyers without building an app
          </h2>
          <p className="text-base lg:text-lg text-gray-text leading-relaxed">
            List your products, manage orders, and communicate with customers all through
            WhatsApp. No website needed, no commission fees.
          </p>
          <div className="pt-2">
            <a
              href={WA.becomeVendor}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-black text-white text-sm px-6 py-4 rounded hover:bg-gray-800 transition-colors"
            >
              Become a vendor
            </a>
          </div>
        </div>

        <div
          className="w-full h-[280px] lg:h-[320px] rounded bg-center bg-cover bg-no-repeat shadow-sm"
          style={{ backgroundImage: "url('/images/stock-6-d09c126f.jpg')" }}
          role="img"
          aria-label="Vendor marketplace"
        />
      </div>
    </section>
  )
}

export default ForVendors
