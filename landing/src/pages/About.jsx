import { Link } from 'react-router-dom'
import { ArrowRight, ChatCircleText, MapPin, ShieldCheck } from '@phosphor-icons/react'
import { WA } from '../lib/actions'

const values = [
  {
    icon: ChatCircleText,
    title: 'WhatsApp-first',
    description:
      'Commerce should meet people where they already talk. No new app installs, no friction.',
  },
  {
    icon: MapPin,
    title: 'Local by design',
    description:
      'We match buyers with trusted vendors nearby so delivery is faster and communities stay connected.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & clarity',
    description:
      'Verified sellers, clear pricing, secure payments, and a simple handover PIN for peace of mind.',
  },
]

function About() {
  return (
    <div className="w-full">
      <section className="w-full bg-cream px-4 sm:px-10 lg:px-20 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <p className="text-xs font-medium tracking-[0.12em] text-navy uppercase">About</p>
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-light text-gray-900 leading-[1.1] tracking-tight">
            Building Nigeria&apos;s WhatsApp marketplace
          </h1>
          <p className="text-base lg:text-lg text-gray-text leading-relaxed">
            GotoMart connects everyday buyers with local vendors through simple WhatsApp
            conversations. We help people find what they need, pay securely, and complete
            handovers without downloading another app.
          </p>
        </div>
      </section>

      <section className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl lg:text-4xl font-light text-gray-900">Our mission</h2>
            <p className="text-base text-gray-text leading-relaxed">
              Markets already run on chat. GotoMart turns those chats into a reliable
              marketplace: search, match, pay, and deliver powered by AI routing and
              real vendors on the ground.
            </p>
            <p className="text-base text-gray-text leading-relaxed">
              We started in Lagos and are growing city by city, putting local sellers in
              front of ready buyers while keeping the experience familiar and fast.
            </p>
          </div>
          <div className="grid sm:grid-cols-1 gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 p-5 bg-cream rounded border border-light-gray/60"
              >
                <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-navy" weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-text leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-cream px-4 sm:px-10 lg:px-20 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto flex flex-col items-start gap-6">
          <h2 className="text-3xl lg:text-4xl font-light text-gray-900">How we work</h2>
          <p className="text-base text-gray-text leading-relaxed">
            Buyers message GotoMart on WhatsApp. We find matching vendors, share options,
            and open a secure checkout. After payment, both sides get a PIN so handover is
            clear. Vendors can list products the same way right from chat.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/#how-it-works"
              className="inline-flex items-center gap-1.5 bg-black text-white text-sm px-6 py-4 rounded hover:bg-gray-800 transition-colors"
            >
              See how it works
              <ArrowRight weight="duotone" className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href={WA.contactSales}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-900 hover:text-navy transition-colors px-2 py-4"
            >
              Talk to us
              <ArrowRight weight="duotone" className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
