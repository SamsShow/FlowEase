import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Link, useLocation } from 'react-router-dom';
import { NotificationCenter } from '../Notifications/NotificationCenter';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { User, Settings, LogOut, Menu } from 'lucide-react';

export default function Navbar() {
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

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/explore', label: 'Explore' },
    { path: '/client/projects', label: 'My Projects' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/escrow', label: 'Escrow' },
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">FlowEase</Link>
            {isConnected && (
              <div className="hidden md:flex space-x-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md ${
                      location.pathname === item.path
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <NotificationCenter />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <span className="font-mono text-sm">{shortAddress}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => disconnect()}
                      className="text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 