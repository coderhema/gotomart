import { ArrowRight } from '@phosphor-icons/react'
import ChatDemo from './ChatDemo'
import { WA, onNavClick } from '../lib/actions'

function Hero() {
  return (
    <section
      id="home"
      className="w-full bg-cream px-4 sm:px-10 lg:px-20 py-16 lg:py-24"
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div className="flex flex-col gap-6 pt-2">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-light text-gray-900 leading-[1.1] tracking-tight">
            Your WhatsApp marketplace for buying &amp; selling
          </h1>
          <p className="text-base lg:text-lg text-gray-text max-w-xl leading-relaxed">
            GotoMart connects vendors with ready buyers on WhatsApp. No app downloads, no
            complicated setup - just chat, browse, and buy.
          </p>
          <div className="h-2" />
          <div className="flex flex-wrap gap-3 items-center">
            <a
              href={WA.startSelling}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-sm px-6 py-4 rounded hover:bg-gray-800 transition-colors"
            >
              Start selling on WhatsApp
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => onNavClick(e, '#how-it-works')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-900 hover:text-navy transition-colors px-2 py-4"
            >
              Learn more
              <ArrowRight weight="duotone" className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="w-full flex justify-center lg:justify-end">
          <ChatDemo />
        </div>
      </div>
    </section>
  )
}

export default Hero
