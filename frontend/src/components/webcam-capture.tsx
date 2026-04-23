import { CameraPanel } from "./camera-panel";

interface WebcamCaptureProps {
  onFrame?: (imageData: string) => void;
  onStop?: () => void;
  isConnected?: boolean;
  isProcessing?: boolean;
}

export function WebcamCapture(props: WebcamCaptureProps) {
  return <CameraPanel {...props} />;
}