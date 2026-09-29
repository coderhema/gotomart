import { ChatCircleText, ShieldCheck, Lightning, UsersThree } from '@phosphor-icons/react'

const features = [
  {
    icon: ChatCircleText,
    title: 'No App Needed',
    description: 'Everything happens on WhatsApp. Buyers and vendors just chat naturally.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    description: 'Built-in payment protection with PIN confirmation for handover.',
  },
  {
    icon: Lightning,
    title: 'Quick Setup',
    description: 'Vendors can start selling in minutes with simple onboarding.',
  },
  {
    icon: UsersThree,
    title: 'Verified Vendors',
    description: 'Every vendor is verified to ensure trust and quality.',
  },
]

function Features() {
  return (
    <section className="w-full bg-cream px-4 sm:px-6 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-light text-gray-900 mb-4">
            Why GoToMart?
          </h2>
          <p className="text-gray-text max-w-2xl mx-auto">
            Built for Nigerian markets, designed for ease
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start">
              <div className="w-12 h-12 bg-cream-dark rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-navy" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-text">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
