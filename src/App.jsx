import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { ParallaxProvider } from 'react-scroll-parallax'
import LandingPage from './components/Landing/landing-page'
import Dashboard from './components/Dashboard'
import PaymentRequest from './components/PaymentRequest'
import Milestones from './components/Milestones'
import Escrow from './components/Escrow'
import Transactions from './components/Transactions'
import { ipfsHelper } from '../utils/ipfsHelper'

function App() {
  return (
    <ParallaxProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Protected Routes - TODO: Add authentication wrapper */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment-request" element={<PaymentRequest />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/escrow" element={<Escrow />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </Router>
    </ParallaxProvider>
  )
}

export default App
