function Hero() {
  return (
    <section className="w-full bg-cream px-4 sm:px-6 lg:px-20 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        {/* Left Column - Text */}
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl lg:text-7xl font-light text-gray-900 leading-tight">
            Your WhatsApp marketplace for buying & selling
          </h1>
          <p className="text-lg lg:text-xl text-gray-text max-w-xl">
            GoToMart connects vendors with ready buyers on WhatsApp. No app downloads, no complicated setup - just chat, browse, and buy.
          </p>
          <div className="h-4"></div>
          <div className="flex flex-wrap gap-3 items-center">
            <a
              href="https://wa.me/YOUR_WHATSAPP_NUMBER"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-sm px-6 py-4 rounded hover:bg-gray-800 transition-colors"
            >
              Start selling on WhatsApp
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-gray-900 hover:text-navy transition-colors"
            >
              Learn more →
            </a>
          </div>
        </div>

        {/* Right Column - Will be populated by ChatDemo component */}
        <div className="hidden lg:block"></div>
      </div>
    </section>
  )
}

export default Hero
