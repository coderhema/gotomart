import AnnouncementBanner from './components/AnnouncementBanner'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import ForVendors from './components/ForVendors'
import ForBuyers from './components/ForBuyers'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBanner />
      <Navigation />
      <main id="home">
        <Hero />
        <Features />
        <HowItWorks />
        <ForVendors />
        <ForBuyers />
      </main>
      <Footer />
    </div>
  )
}

export default App
