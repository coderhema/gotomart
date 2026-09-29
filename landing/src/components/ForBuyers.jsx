import { WA } from '../lib/actions'

function ForBuyers() {
  return (
    <section id="buyers" className="w-full bg-cream px-4 sm:px-10 lg:px-20 py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
        <div
          className="order-2 lg:order-1 w-full h-[220px] sm:h-[260px] lg:h-[320px] rounded bg-center bg-cover bg-no-repeat shadow-sm"
          style={{ backgroundImage: "url('/images/stock-2-ec8fc9d4.jpg')" }}
          role="img"
          aria-label="Local vendors and products"
        />

        <div className="order-1 lg:order-2 flex flex-col gap-4 sm:gap-5 max-w-xl">
          <span className="text-xs font-medium tracking-[0.12em] text-navy uppercase">
            For Buyers
          </span>
          <h2 className="text-[28px] sm:text-3xl lg:text-5xl font-light text-gray-900 leading-tight">
            Shop from trusted local vendors
          </h2>
          <p className="text-base lg:text-lg text-gray-text leading-relaxed">
            Discover quality products from verified sellers near you. Chat directly, compare
            prices, and buy with confidence all in one WhatsApp conversation.
          </p>
          <div className="pt-2">
            <a
              href={WA.startShopping}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-black text-white text-sm px-4 sm:px-6 py-3 sm:py-4 rounded hover:bg-gray-800 transition-colors"
            >
              Start shopping
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ForBuyers
