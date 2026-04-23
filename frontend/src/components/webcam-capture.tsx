import { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, CameraOff, Activity } from "lucide-react";
import { Badge } from "./ui/badge";

interface WebcamCaptureProps {
  onFrame?: (imageData: string) => void;
  showKeypoints?: boolean;
  keypoints?: Array<{ x: number; y: number; label: string }>;
}

export function WebcamCapture({ onFrame, showKeypoints = true, keypoints = [] }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Video constraints for optimal performance
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
    frameRate: { ideal: 30, max: 30 }
  };

  // Handle successful camera access
  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  // Handle camera access errors
  const handleUserMediaError = useCallback((error: DOMException) => {
    console.error("Camera error:", error);
    let errorMessage = "Unable to access camera";
    
    if (error.name === "NotAllowedError") {
      errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
    } else if (error.name === "NotFoundError") {
      errorMessage = "No camera device found. Please check your hardware.";
    } else if (error.name === "NotReadableError") {
      errorMessage = "Camera is in use by another application. Please close it and try again.";
    } else if (error.name === "OverconstrainedError") {
      errorMessage = "Camera doesn't support the required settings. Try a different camera.";
    }
    
    setCameraError(errorMessage);
    setCameraReady(false);
  }, []);

  // Capture and process frames
  const captureFrame = useCallback(() => {
    if (webcamRef.current && isActive && cameraReady && !cameraError) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && onFrame) {
        onFrame(imageSrc);
        
        // Calculate FPS
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }
      }
    }
  }, [isActive, onFrame, cameraReady, cameraError]);

  // Draw keypoints overlay
  useEffect(() => {
    if (canvasRef.current && showKeypoints && keypoints.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw keypoints
      keypoints.forEach((point) => {
        // Draw point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        if (point.label) {
          ctx.font = '12px Arial';
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(point.label, point.x + 10, point.y - 10);
          ctx.fillText(point.label, point.x + 10, point.y - 10);
        }
      });

      // Draw connections between points (skeleton)
      if (keypoints.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        // Draw lines connecting keypoints
        for (let i = 0; i < keypoints.length - 1; i++) {
          ctx.moveTo(keypoints[i].x, keypoints[i].y);
          ctx.lineTo(keypoints[i + 1].x, keypoints[i + 1].y);
        }
        ctx.stroke();
      }
    }
  }, [keypoints, showKeypoints]);

  // Frame capture loop
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(captureFrame, 1000 / 30); // 30 FPS
    return () => clearInterval(interval);
  }, [isActive, captureFrame]);

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-gray-900 aspect-video">
        {/* Webcam */}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="w-full h-full object-cover"
          mirrored={true}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
        />

        {/* Keypoint overlay canvas */}
        {showKeypoints && (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        )}

        {/* Status overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            {cameraError && (
              <Badge className="bg-red-500 text-white text-xs py-1 px-2">
                {cameraError}
              </Badge>
            )}
            {!cameraError && !cameraReady && (
              <Badge variant="secondary" className="text-xs py-1 px-2">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Initializing camera...
              </Badge>
            )}
            {isActive ? (
              <Badge className="bg-green-500 text-white">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Live
              </Badge>
            ) : (
              cameraReady && <Badge variant="secondary">
                <CameraOff className="w-3 h-3 mr-1" />
                Inactive
              </Badge>
            )}
            {isActive && (
              <Badge variant="secondary">
                {fps} FPS
              </Badge>
            )}
          </div>

          {keypoints.length > 0 && (
            <Badge className="bg-blue-500 text-white">
              {keypoints.length} keypoints detected
            </Badge>
          )}
        </div>

        {/* Center guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white/30 border-dashed rounded-lg w-3/4 h-3/4 flex items-center justify-center">
            {!isActive && (
              <div className="text-white text-center">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">Position your hands within the frame</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {cameraError ? (
              <span className="text-red-600 font-medium">Camera Error: {cameraError}</span>
            ) : !cameraReady ? (
              <span className="text-yellow-600">Initializing camera...</span>
            ) : isActive ? (
              "Camera is capturing frames"
            ) : (
              "Camera is ready"
            )}
          </div>
          <Button
            onClick={() => setIsActive(!isActive)}
            variant={isActive ? "destructive" : "default"}
            disabled={cameraError !== null || !cameraReady}
          >
            {isActive ? (
              <>
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Capture
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Start Capture
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
