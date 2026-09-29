import { Check, ArrowRight, Receipt, Wallet, ChartLineUp, Shield } from '@phosphor-icons/react'
import { WA } from '../lib/actions'

const transactionTiers = [
  {
    name: 'Starter',
    description: 'For small vendors getting started',
    monthlyVolume: 'Up to ₦500,000',
    percentageFee: '2.5%',
    flatFee: '₦0',
    features: [
      'Unlimited product listings',
      'WhatsApp order management',
      'Basic analytics dashboard',
      'Standard support',
      'Secure checkout',
    ],
    highlighted: false,
  },
  {
    name: 'Growth',
    description: 'For growing businesses',
    monthlyVolume: 'Up to ₦2,000,000',
    percentageFee: '2.0%',
    flatFee: '₦0',
    features: [
      'Everything in Starter',
      'Priority order matching',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'Multi-location support',
    ],
    highlighted: true,
  },
  {
    name: 'Scale',
    description: 'For established vendors',
    monthlyVolume: 'Above ₦2,000,000',
    percentageFee: '1.5%',
    flatFee: '₦0',
    features: [
      'Everything in Growth',
      'Dedicated account manager',
      'API access',
      'Bulk order tools',
      'Custom integrations',
      'White-glove onboarding',
    ],
    highlighted: false,
  },
]

const additionalFees = [
  {
    name: 'Instant Payout',
    description: 'Withdraw funds to your bank account instantly',
    fee: '₦50 per transaction',
    icon: Wallet,
  },
  {
    name: 'Chargeback Protection',
    description: 'Protection against fraudulent chargebacks',
    fee: '0.5% per transaction',
    icon: Shield,
  },
  {
    name: 'Analytics Reports',
    description: 'Detailed business insights and reports',
    fee: 'Free',
    icon: ChartLineUp,
  },
  {
    name: 'SMS Notifications',
    description: 'Order status updates to customers',
    fee: '₦2 per SMS',
    icon: Receipt,
  },
]

function Pricing() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <section className="w-full bg-navy text-white px-4 sm:px-10 lg:px-20 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-medium tracking-[0.12em] text-blue-200 uppercase mb-4">Pricing</p>
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-light leading-[1.1] tracking-tight mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            No monthly fees, no hidden charges. Only pay when you make a sale.
            Scale your business with transaction rates that decrease as you grow.
          </p>
        </div>
      </section>

      {/* Transaction Tiers Section */}
      <section className="w-full px-4 sm:px-10 lg:px-20 py-16 lg:py-20 -mt-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {transactionTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? 'bg-navy text-white shadow-xl scale-105'
                    : 'bg-white border border-light-gray'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-2xl font-semibold mb-2 ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {tier.name}
                  </h3>
                  <p className={`text-sm ${tier.highlighted ? 'text-blue-100' : 'text-gray-text'}`}>
                    {tier.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {tier.percentageFee}
                    </span>
                    <span className={`text-lg ${tier.highlighted ? 'text-blue-100' : 'text-gray-text'}`}>
                      per transaction
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${tier.highlighted ? 'text-blue-100' : 'text-gray-text'}`}>
                    {tier.monthlyVolume} monthly volume
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          tier.highlighted ? 'text-green-300' : 'text-green-500'
                        }`}
                        weight="bold"
                      />
                      <span className={`text-sm ${tier.highlighted ? 'text-blue-50' : 'text-gray-text'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={WA.startChatting}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full text-center py-4 rounded-lg font-medium transition-colors ${
                    tier.highlighted
                      ? 'bg-white text-navy hover:bg-blue-50'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Fees Section */}
      <section className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-gray-900 mb-4">
              Additional Services
            </h2>
            <p className="text-base text-gray-text max-w-2xl mx-auto">
              Optional add-ons to enhance your selling experience on GotoMart.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {additionalFees.map((fee, index) => (
              <div
                key={fee.name}
                className={`flex flex-col sm:flex-row sm:items-center p-6 gap-4 ${
                  index !== additionalFees.length - 1 ? 'border-b border-light-gray' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                    <fee.icon className="w-6 h-6 text-navy" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{fee.name}</h3>
                    <p className="text-sm text-gray-text">{fee.description}</p>
                  </div>
                </div>
                <div className="text-lg font-semibold text-navy whitespace-nowrap">
                  {fee.fee}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full px-4 sm:px-10 lg:px-20 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-light text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                When do I get paid?
              </h3>
              <p className="text-sm text-gray-text leading-relaxed">
                Payments are deposited to your linked bank account within 1-2 business days after order completion. 
                Instant payouts are available for ₦50 per transaction.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Are there any hidden fees?
              </h3>
              <p className="text-sm text-gray-text leading-relaxed">
                No hidden fees. You only pay the transaction percentage on successful sales. 
                There are no monthly fees, setup costs, or cancellation charges.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                How is the transaction tier determined?
              </h3>
              <p className="text-sm text-gray-text leading-relaxed">
                Your tier is automatically calculated based on your rolling 30-day sales volume. 
                As your sales grow, your transaction rate automatically decreases.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                What payment methods are supported?
              </h3>
              <p className="text-sm text-gray-text leading-relaxed">
                GotoMart supports all major Nigerian banks, cards (VISA, Mastercard, Verve), 
                USSD, and mobile money payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-cream-dark px-4 sm:px-10 lg:px-20 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-light text-gray-900 mb-4">
            Ready to start selling?
          </h2>
          <p className="text-base text-gray-text mb-8 max-w-xl mx-auto">
            Join thousands of vendors already growing their business on GotoMart. 
            No setup required, start selling in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WA.startChatting}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-black text-white text-sm px-8 py-4 rounded hover:bg-gray-800 transition-colors"
            >
              Start Selling Now
              <ArrowRight weight="duotone" className="w-4 h-4" />
            </a>
            <a
              href={WA.contactSales}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-sm text-gray-900 hover:text-navy transition-colors px-4 py-4"
            >
              Talk to Sales
              <ArrowRight weight="duotone" className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Pricing