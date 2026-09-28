import Atalanta from './Atalanta'

function ChatDemo() {
  return (
    <section className="w-full bg-cream px-4 sm:px-6 lg:px-20 pb-16">
      <div className="max-w-7xl mx-auto flex justify-end">
        <div className="w-full lg:w-[520px] bg-cream-dark rounded p-8 relative">
          {/* Chat Header */}
          <Atalanta className="mb-4" />

          <div className="w-full h-px bg-light-gray mb-4"></div>

          {/* Chat Messages */}
          <div className="space-y-2">
            {/* Vendor Message */}
            <div className="flex justify-start">
              <div className="bg-white rounded p-2.5 px-3.5">
                <p className="text-sm text-gray-900">Hi! I sell fresh organic tomatoes. Interested? 🍅</p>
              </div>
            </div>

            {/* Buyer Message */}
            <div className="flex justify-end">
              <div className="bg-navy rounded p-2.5 px-3.5">
                <p className="text-sm text-white">Yes! How much per kg?</p>
              </div>
            </div>

            {/* Vendor Message */}
            <div className="flex justify-start">
              <div className="bg-white rounded p-2.5 px-3.5">
                <p className="text-sm text-gray-900">₦1,500 per kg. Delivery within Lagos.</p>
              </div>
            </div>

            {/* Buyer Message */}
            <div className="flex justify-end">
              <div className="bg-navy rounded p-2.5 px-3.5">
                <p className="text-sm text-white">I'll take 2kg. My address...</p>
              </div>
            </div>
          </div>

          {/* Paid Tag */}
          <div className="absolute right-10 top-44 bg-navy text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="currentColor">
              <path d="M9.73438 5.35938q0.10938 0.16406 0.10937 0.35546 0 0.19141-0.10937 0.30079l-3.22657 3.0625q-0.10938 0.10938-0.30078 0.10937-0.19141 0-0.30078-0.10937l-1.58594-1.53125q-0.21875-0.16406-0.16406-0.4375 0.05469-0.27344 0.30078-0.32813 0.24609-0.05469 0.41016 0.10938l1.3125 1.25781 2.95312-2.78906q0.10938-0.10938 0.30078-0.10938 0.19141 0 0.30078 0.16406l0-0.05468z" />
            </svg>
            Paid
          </div>

          {/* Receipt */}
          <div className="absolute right-6 top-56 w-45 bg-white rounded p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-900">FreshMart</div>
            <div className="text-xs text-gray-500 mb-2">Jan 15, 2025</div>
            <div className="w-full h-px bg-light-gray mb-2"></div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-text">Tomatoes 2kg</span>
                <span className="text-gray-text">₦3,000</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-text">Plantains</span>
                <span className="text-gray-text">₦3,200</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-text">Delivery</span>
                <span className="text-gray-text">₦500</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-light-gray my-2"></div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-navy font-medium">₦6,700</span>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-8 left-6 w-28 opacity-80">
            <svg viewBox="0 0 44 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M29.6704 26.0416c-0.8704-1.4976-1.91361-2.592-3.1296-3.296-1.088-0.6336-2.04159-0.7808-2.848-0.448l-0.2752 0.1344c-0.864 0.4928-1.2992 1.44-1.2992 2.8352 0 1.3952..." fill="#0007cb" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChatDemo
