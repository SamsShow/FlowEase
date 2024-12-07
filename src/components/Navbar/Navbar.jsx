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
import { motion } from 'framer-motion';

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
    { path: '/milestone-submission', label: 'Milestones' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/escrow', label: 'Escrow' },
    { path: '/invoice', label: 'Invoices' }
  ];

  const navVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 120,
        damping: 20,
        mass: 1
      }
    }
  };

  const itemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.nav
      className="fixed w-full top-0 z-50 bg-gray-900 bg-opacity-80 backdrop-blur-sm shadow-lg"
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="text-xl font-bold text-white">FlowEase</Link>
            </motion.div>
            {isConnected && (
              <div className="hidden md:flex space-x-4">
                {navigationItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      className={`px-3 py-2 rounded-md ${location.pathname === item.path
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
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
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="ghost" className="relative text-gray-300 hover:text-white">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuLabel className="text-gray-300">
                      <span className="font-mono text-sm">{shortAddress}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center text-gray-300 hover:text-white hover:bg-gray-700">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center text-gray-300 hover:text-white hover:bg-gray-700">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                      onClick={() => disconnect()}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

