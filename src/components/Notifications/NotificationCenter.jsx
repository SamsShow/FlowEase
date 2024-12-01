import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { contractInteractions } from '../../utils/contractInteractions';
import { useAccount } from 'wagmi';

export const NotificationCenter = () => {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (address) {
      fetchNotifications();
      setupEventListeners();
    }
  }, [address]);

  const fetchNotifications = async () => {
    try {
      const contract = await contractInteractions.getContract();
      
      // Get user's notifications from events
      const filter = contract.filters.NotificationCreated(address);
      const events = await contract.queryFilter(filter);
      
      const formattedNotifications = events.map(event => ({
        id: event.transactionHash,
        title: event.args.title,
        message: event.args.message,
        timestamp: new Date(event.args.timestamp * 1000),
        read: event.args.read,
        type: event.args.notificationType
      }));

      setNotifications(formattedNotifications);
      updateUnreadCount(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupEventListeners = async () => {
    const contract = await contractInteractions.getContract();
    
    contract.on("NotificationCreated", (user, title, message, timestamp, type) => {
      if (user === address) {
        const newNotification = {
          id: Date.now(),
          title,
          message,
          timestamp: new Date(timestamp * 1000),
          read: false,
          type
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      contract.removeAllListeners("NotificationCreated");
    };
  };

  const updateUnreadCount = (notifs) => {
    const unread = notifs.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const markAsRead = async (notificationId) => {
    try {
      const contract = await contractInteractions.getContract();
      await contract.markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    // Add icons based on notification type
    const icons = {
      milestone: '🎯',
      payment: '💰',
      dispute: '⚠️',
      review: '⭐',
      message: '✉️'
    };
    return icons[type] || '📌';
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-400">
                          {notification.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No notifications
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
} 