import { useState } from "react";
import { WebcamCapture } from "./components/webcam-capture";
import { WebSocketService } from "./components/websocket-service";
import { TranslationOutput } from "./components/translation-output";
import { Card } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Hand, Brain, Zap } from "lucide-react";

export default function App() {
  const [keypoints, setKeypoints] = useState<Array<{ x: number; y: number; label: string }>>([]);
  const [translation, setTranslation] = useState<string>("");

  const handleFrame = (imageData: string) => {
    // In production, this would send the frame to your backend via WebSocket
    // For now, this is handled by the mock WebSocket service
    console.log("Frame captured, length:", imageData.length);
  };

  const handleKeypointsReceived = (receivedKeypoints: any) => {
    setKeypoints(receivedKeypoints);
  };

  const handleTranslationReceived = (receivedTranslation: string) => {
    setTranslation(receivedTranslation);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Hand className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HealthSign</h1>
                <p className="text-xs text-gray-500">Real-Time Sign Language Translation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Camera Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Hand className="w-5 h-5 text-blue-600" />
                Camera Feed
              </h2>
              <WebcamCapture
                onFrame={handleFrame}
                showKeypoints={true}
                keypoints={[]}
              />
            </div>

            {/* Processing Pipeline Info */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Processing Pipeline</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">Capture</h4>
                  <p className="text-xs text-gray-600">Webcam frames at 30 FPS</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">Process</h4>
                  <p className="text-xs text-gray-600">AI extracts keypoints</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">Translate</h4>
                  <p className="text-xs text-gray-600">TensorFlow inference</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Translation & Status */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Translation Output</h2>
              <TranslationOutput />
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
              <WebSocketService
                onKeypointsReceived={handleKeypointsReceived}
                onTranslationReceived={handleTranslationReceived}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
