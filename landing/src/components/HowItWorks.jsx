function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-cream px-4 sm:px-6 lg:px-20 py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-light text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-text max-w-2xl mx-auto">
            Three simple steps to buy or sell on GoToMart
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute -top-4 -left-2 text-7xl font-light text-navy/10">01</div>
            <div className="relative pt-8">
              <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-lg font-medium mb-4">
                1
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">Message</h3>
              <p className="text-gray-text">
                Simply text GoToMart what you need. "I want a 50kg bag of rice in Ikorodu" 
                or "I want to sell groceries"
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -top-4 -left-2 text-7xl font-light text-navy/10">02</div>
            <div className="relative pt-8">
              <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-lg font-medium mb-4">
                2
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">Match</h3>
              <p className="text-gray-text">
                For buyers: Get a curated list of vendors with prices and ratings. 
                For vendors: Share your product catalog directly from WhatsApp Business
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -top-4 -left-2 text-7xl font-light text-navy/10">03</div>
            <div className="relative pt-8">
              <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-lg font-medium mb-4">
                3
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">Transact</h3>
              <p className="text-gray-text">
                Choose a vendor, pay securely, get a confirmation PIN. 
                Vendors receive payment and buyer details for delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
