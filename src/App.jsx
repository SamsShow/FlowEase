import { WagmiProvider, createConfig } from "wagmi";
import { mainnet, goerli } from "wagmi/chains";
import { http } from "viem";
import { injected } from "wagmi/connectors";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar/Navbar";
import LandingPage from "./components/Landing/landing-page";
import Dashboard from "./components/Dashboard";
import Escrow from "./components/Escrow";
import PaymentRequest from "./components/PaymentRequest";
import Profile from './components/Profile';

// Set up wagmi config with v2 syntax
const config = createConfig({
  chains: [mainnet, goerli],
  transports: {
    [mainnet.id]: http(),
    [goerli.id]: http(),
  },
  connectors: [injected({ target: "metaMask" })],
});

// Create a client
const queryClient = new QueryClient();



function App() {
  return (
    <WagmiProvider  config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:address" element={<Profile />} />
              <Route path="/payment-request" element={<PaymentRequest />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider >
  );
}

export default App;
