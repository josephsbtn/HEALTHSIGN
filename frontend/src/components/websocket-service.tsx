import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Wifi, WifiOff, Signal } from "lucide-react";

interface WebSocketServiceProps {
  onKeypointsReceived?: (keypoints: any) => void;
  onTranslationReceived?: (translation: string) => void;
}

export function WebSocketService({ onKeypointsReceived, onTranslationReceived }: WebSocketServiceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Mock WebSocket connection (in production, this would connect to your backend)
    // const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    // Simulate connection
    const simulateConnection = () => {
      setIsConnected(true);
      setLatency(Math.floor(Math.random() * 30) + 20); // Mock 20-50ms latency
      
      // Simulate receiving data periodically
      const interval = setInterval(() => {
        if (onKeypointsReceived) {
          // Mock keypoint data
          const mockKeypoints = Array.from({ length: 21 }, (_, i) => ({
            x: Math.random() * 1280,
            y: Math.random() * 720,
            label: `Point ${i}`
          }));
          onKeypointsReceived(mockKeypoints);
        }
        
        setMessagesReceived(prev => prev + 1);
        setLatency(Math.floor(Math.random() * 30) + 20);
      }, 100);

      return interval;
    };

    const interval = simulateConnection();

    // Cleanup
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onKeypointsReceived]);

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">WebSocket Connection</h3>
          {isConnected ? (
            <Badge className="bg-green-500">
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <WifiOff className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Signal className="w-4 h-4" />
              <span>Latency</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {latency !== null ? `${latency}ms` : '-'}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 mb-1">Messages</div>
            <div className="text-2xl font-bold text-gray-900">{messagesReceived}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
    