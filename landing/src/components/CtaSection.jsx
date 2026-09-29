import { ArrowRight } from '@phosphor-icons/react'
import { WA } from '../lib/actions'

function CtaSection() {
  return (
    <section id="cta" className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-6">
        <h2 className="text-3xl lg:text-5xl font-light text-gray-900">Ready to sell or shop?</h2>
        <p className="text-base lg:text-lg text-gray-text max-w-2xl">
          Join thousands of Nigerians buying and selling on WhatsApp with GotoMart.
        </p>
        <div className="flex flex-wrap justify-center gap-3 items-center pt-2">
          <a
            href={WA.getStarted}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black text-white text-sm px-6 py-4 rounded hover:bg-gray-800 transition-colors"
          >
            Get Started Free
          </a>
          <a
            href={WA.contactSales}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-900 hover:text-navy transition-colors px-2 py-4"
          >
            Contact sales
            <ArrowRight weight="duotone" className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
