import { WagmiProvider, createConfig } from "wagmi";
import { mainnet, goerli } from "wagmi/chains";
import { http } from "viem";
import { injected } from "wagmi/connectors";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";

// Components
import Navbar from "./components/Navbar/Navbar";
import LandingPage from "./components/Landing/landing-page";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import PaymentRequest from "./components/PaymentRequest";
import Milestones from "./components/Milestones";
import Escrow from "./components/Escrow";
import TransactionHistory from "./components/Transactions/TransactionHistory";
import AnalyticsDashboard from "./components/Analytics/AnalyticsDashboard";
import ChatSystem from "./components/Chat/ChatSystem";
import Settings from './components/Settings/Settings';
import ExplorePage from './components/Explore/ExplorePage';
import ClientProjectsPage from './components/Client/ClientProjectsPage';

// Set up wagmi config
const config = createConfig({
  chains: [mainnet, goerli],
  transports: {
    [mainnet.id]: http(),
    [goerli.id]: http(),
  },
  connectors: [injected({ target: "metaMask" })],
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:address" element={<Profile />} />
              <Route path="/payment-request" element={<PaymentRequest />} />
              <Route path="/milestones/:projectId" element={<Milestones />} />
              <Route path="/escrow" element={<Escrow />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/chat/:projectId" element={<ChatSystem />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/client/projects" element={<ClientProjectsPage />} />
            </Routes>
            <Toaster />
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
