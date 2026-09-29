import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import VendorsTable from './pages/VendorsTable'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/vendors" element={<VendorsTable />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
