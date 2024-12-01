import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { address, isConnected } = useAccount();
  const { connect, isLoading, error } = useConnect();
  const { disconnect } = useDisconnect();
  const location = useLocation();
  
  const [shortAddress, setShortAddress] = useState('');

  useEffect(() => {
    if (address) {
      setShortAddress(`${address.slice(0, 6)}...${address.slice(-4)}`);
    }
  }, [address]);

  const handleConnect = async () => {
    try {
      console.log('Attempting to connect...');
      await connect({ connector: injected({ target: 'metaMask' }) });
    } catch (err) {
      console.error('Connection error:', err);
    }
  };

  // Log any connection errors
  useEffect(() => {
    if (error) {
      console.error('Wallet connection error:', error);
    }
  }, [error]);

  // Log connection status changes
  useEffect(() => {
    console.log('Connection status:', isConnected);
    console.log('Current address:', address);
  }, [isConnected, address]);

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">FlowEase</Link>
            {isConnected && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`px-3 py-2 rounded-md ${
                    location.pathname === '/dashboard' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/profile" 
                  className={`px-3 py-2 rounded-md ${
                    location.pathname === '/profile' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Profile
                </Link>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-gray-700">{shortAddress}</span>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 