import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Paperclip } from 'lucide-react';
import { ipfsHelper } from '../../utils/ipfsHelper';

export default function ChatSystem({ projectId, otherParty }) {
  const { address } = useAccount();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (projectId) {
      fetchMessages();
      setupMessageListener();
    }
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const contract = await contractInteractions.getContract();
      const messageCount = await contract.getMessageCount(projectId);
      
      const fetchedMessages = [];
      for (let i = 0; i < messageCount; i++) {
        const msg = await contract.getMessage(projectId, i);
        const ipfsData = await ipfsHelper.getContent(msg.contentHash);
        
        fetchedMessages.push({
          id: i,
          sender: msg.sender,
          content: ipfsData.content,
          attachments: ipfsData.attachments || [],
          timestamp: new Date(msg.timestamp * 1000)
        });
      }
      
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupMessageListener = async () => {
    const contract = await contractInteractions.getContract();
    
    contract.on("MessageSent", async (pId, sender, contentHash) => {
      if (pId.toString() === projectId) {
        const ipfsData = await ipfsHelper.getContent(contentHash);
        const newMsg = {
          id: messages.length,
          sender,
          content: ipfsData.content,
          attachments: ipfsData.attachments || [],
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMsg]);
      }
    });

    return () => {
      contract.removeAllListeners("MessageSent");
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      // Upload message content and attachments to IPFS
      const messageData = {
        content: newMessage,
        attachments: []
      };

      if (attachments.length > 0) {
        const uploadedFiles = await Promise.all(
          attachments.map(file => ipfsHelper.uploadFile(file))
        );
        messageData.attachments = uploadedFiles;
      }

      const contentHash = await ipfsHelper.uploadMetadata(
        messageData,
        `message-${Date.now()}`
      );

      // Send message through smart contract
      const contract = await contractInteractions.getContract();
      const tx = await contract.sendMessage(projectId, contentHash);
      await tx.wait();

      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAttachment = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <h3 className="font-semibold">Chat</h3>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === address ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === address
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <p>{message.content}</p>
                  {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((file, index) => (
                        <a
                          key={index}
                          href={`https://gateway.pinata.cloud/ipfs/${file.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm underline"
                        >
                          {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-xs mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 space-y-4">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="bg-gray-100 rounded px-2 py-1 text-sm flex items-center"
                >
                  <span>{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Paperclip className="h-5 w-5" />
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachment}
              />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 