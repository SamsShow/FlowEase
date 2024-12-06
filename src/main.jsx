import { Buffer } from 'buffer';
import './utils/polyfills';  // Import polyfills first
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import App from './App.jsx'

// Ensure Buffer is available globally
window.Buffer = Buffer;
globalThis.Buffer = Buffer;

const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ target: 'metaMask' })
  ]
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
