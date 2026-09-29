import { WA } from '../lib/actions'

const steps = [
  {
    number: '01',
    title: 'Find vendors',
    description: 'Browse verified vendors selling what you need',
    cta: 'Browse Vendors',
    href: WA.browseVendors,
  },
  {
    number: '02',
    title: 'Chat on WhatsApp',
    description: 'Message vendors directly and negotiate',
    cta: 'Start Chat',
    href: WA.startChat,
  },
  {
    number: '03',
    title: 'Buy & Deliver',
    description: 'Safe payments and reliable delivery',
    cta: 'Shop Now',
    href: WA.shopNow,
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 sm:gap-12">
        <h2 className="text-[28px] sm:text-3xl lg:text-4xl font-light text-gray-900">
          Connect in three simple steps
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-4 items-start">
              <span className="text-sm font-medium text-navy tracking-wide">{step.number}</span>
              <h3 className="text-xl font-medium text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-text leading-relaxed">{step.description}</p>
              <a
                href={step.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-gray-900 underline underline-offset-4 hover:text-navy transition-colors"
              >
                {step.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
