"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { Camera, CameraOff, Activity, Zap, Loader2 } from "lucide-react";

interface CameraPanelProps {
  onFrame?: (imageData: string) => void;
  onStop?: () => void;
  isConnected?: boolean;
  isProcessing?: boolean;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CameraPanel({
  onFrame,
  onStop,
  isConnected = false,
  isProcessing = false,
}: CameraPanelProps) {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.2,
    y: 0.2,
    width: 0.55,
    height: 0.55,
  });
  const [isDragging, setIsDragging] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const captureIntervalMs = 120;

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
    frameRate: { ideal: 30, max: 30 },
  };

  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    const errorName = typeof error === "string" ? error : error.name;
    let errorMessage = "Unable to access camera";
    if (errorName === "NotAllowedError")
      errorMessage = "Camera permission denied";
    else if (errorName === "NotFoundError")
      errorMessage = "No camera found";
    else if (errorName === "NotReadableError")
      errorMessage = "Camera in use";
    setCameraError(errorMessage);
    setCameraReady(false);
  }, []);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const cropScreenshot = useCallback(
    async (imageSrc: string, crop: CropBox) => {
      const image = new Image();
      image.src = imageSrc;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load image for cropping"));
      });

      const sx = Math.round(image.naturalWidth * crop.x);
      const sy = Math.round(image.naturalHeight * crop.y);
      const width = Math.round(image.naturalWidth * crop.width);
      const height = Math.round(image.naturalHeight * crop.height);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }
      ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.8);
    },
    [],
  );

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: cropBox.x,
        y: cropBox.y,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [cropBox],
  );

  const handleDragMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (event.clientX - dragStartRef.current.pointerX) / rect.width;
      const dy = (event.clientY - dragStartRef.current.pointerY) / rect.height;
      const nextX = clamp(dragStartRef.current.x + dx, 0, 1 - cropBox.width);
      const nextY = clamp(dragStartRef.current.y + dy, 0, 1 - cropBox.height);
      setCropBox((prev) => ({ ...prev, x: nextX, y: nextY }));
    },
    [cropBox.height, cropBox.width, isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!webcamRef.current || !isActive || !cameraReady || cameraError) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc && onFrame) {
      cropScreenshot(imageSrc, cropBox)
        .then((croppedImage) => onFrame(croppedImage))
        .catch((cropError) => {
          console.error("Frame crop failed, sending full frame:", cropError);
          onFrame(imageSrc);
        });
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
    }
  }, [isActive, onFrame, cameraReady, cameraError, cropBox, cropScreenshot]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(captureFrame, captureIntervalMs);
    return () => clearInterval(interval);
  }, [isActive, captureFrame]);

  useEffect(() => {
    if (!isConnected && isActive) {
      setIsActive(false);
    }
  }, [isActive, isConnected]);

  const handleToggle = () => {
    if (isActive) {
      setIsActive(false);
      onStop?.();
    } else {
      setIsActive(true);
    }
  };

  const canStart = cameraReady && !cameraError && isConnected && !isProcessing;

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl glow-teal">
      <div className="absolute inset-0 gradient-mint-teal opacity-30" />
      
      <div className="relative bg-card m-[2px] rounded-[22px] overflow-hidden">
        <div className="relative bg-foreground/5 aspect-video">
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

          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex flex-col gap-2">
              {isActive ? (
                <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-sm font-medium text-foreground">LIVE</span>
                </div>
              ) : cameraReady && (
                <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                  <CameraOff className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Idle</span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full shadow-lg text-amber-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-sm font-medium">Processing result</span>
                </div>
              )}

              {isActive && (
                <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{fps} FPS</span>
                </div>
              )}
            </div>

            {isActive && (
              <div className="flex items-center gap-2 bg-primary/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                <Activity className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                <span className="text-sm font-medium text-primary-foreground">Detecting</span>
              </div>
            )}
          </div>

          <div
            ref={containerRef}
            className="absolute inset-0 pointer-events-none"
          >
            <div
              className="absolute pointer-events-auto rounded-3xl border-2 border-primary/80 bg-primary/10 transition-all duration-200"
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`,
              }}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <div className="absolute inset-0 border border-primary/60 rounded-3xl" />
              <div className="absolute top-2 left-2 text-xs font-medium text-white/90">
                Drag to focus your hand
              </div>
            </div>

            {!isActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6">
                  <Camera className="w-16 h-16 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground/70 text-sm font-medium">
                    Position your hands within the box
                  </p>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6">
                  <CameraOff className="w-16 h-16 mx-auto mb-3 text-destructive/50" />
                  <p className="text-destructive text-sm font-medium">
                    {cameraError}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 bg-card border-t border-border/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {cameraError ? (
                <span className="text-destructive font-medium">{cameraError}</span>
              ) : isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Waiting for final result...
                </span>
              ) : !cameraReady ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Initializing camera...
                </span>
              ) : !isConnected ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Waiting for connection...
                </span>
              ) : isActive ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Streaming to backend
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Ready to detect
                </span>
              )}
            </div>

            <button
              onClick={handleToggle}
              disabled={!canStart && !isActive}
              className={`
                relative px-6 py-3 rounded-xl font-semibold text-sm
                transition-all duration-300 transform
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${isActive 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 shadow-lg" 
                  : "gradient-mint-teal text-primary-foreground hover:scale-105 shadow-lg glow-mint"
                }
              `}
            >
              {isActive ? (
                <span className="flex items-center gap-2">
                  <CameraOff className="w-4 h-4" />
                  Stop Detection
                </span>
              ) : isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Start Detection
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
