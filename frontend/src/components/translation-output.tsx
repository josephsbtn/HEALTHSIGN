import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { MessageSquare, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useState, useEffect } from "react";

interface Translation {
  id: number;
  text: string;
  confidence: number;
  timestamp: Date;
}

export function TranslationOutput() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [currentText, setCurrentText] = useState("");

  // Mock translation updates
  useEffect(() => {
    const mockSigns = [
      "Hello", "How are you?", "I need help", "Pain", "Medication",
      "Doctor", "Nurse", "Emergency", "Thank you", "Yes", "No"
    ];

    const interval = setInterval(() => {
      const randomSign = mockSigns[Math.floor(Math.random() * mockSigns.length)];
      const newTranslation: Translation = {
        id: Date.now(),
        text: randomSign,
        confidence: 0.85 + Math.random() * 0.14, // 85-99%
        timestamp: new Date()
      };

      setCurrentText(randomSign);
      setTranslations(prev => [newTranslation, ...prev].slice(0, 10));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Translation */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Current Translation</h3>
          </div>
          {currentText && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => speakText(currentText)}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Speak
            </Button>
          )}
        </div>

        <div className="min-h-[100px] flex items-center justify-center">
          {currentText ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 mb-2">{currentText}</p>
              <Badge variant="secondary">
                {((translations[0]?.confidence || 0) * 100).toFixed(1)}% confidence
              </Badge>
            </div>
          ) : (
            <p className="text-gray-400 text-center">
              Waiting for sign language input...
            </p>
          )}
        </div>
      </Card>

      {/* Translation History */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Translation History
        </h3>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {translations.length > 0 ? (
              translations.map((translation) => (
                <div
                  key={translation.id}
                  className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{translation.text}</span>
                    <Badge variant="outline" className="text-xs">
                      {(translation.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {translation.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No translations yet
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Stats */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{translations.length}</div>
            <div className="text-xs text-gray-600">Total Signs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {translations.length > 0 
                ? ((translations.reduce((acc, t) => acc + t.confidence, 0) / translations.length) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-600">Avg Confidence</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {translations.length > 0 ? '~30' : '0'}ms
            </div>
            <div className="text-xs text-gray-600">Avg Latency</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
