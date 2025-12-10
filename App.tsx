import React, { useState, useEffect, useRef } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { SplitScreen } from './components/SplitScreen';
import { RecordButton } from './components/RecordButton';
import { Overlay } from './components/Overlay';
import { DualCameraRecorder, downloadBlob, generateTimestamp } from './utils/recorderUtils';

function App() {
  const [frontCameraMode, setFrontCameraMode] = useState<'user' | 'environment'>('user');
  const [backCameraMode, setBackCameraMode] = useState<'user' | 'environment'>('environment');
  const [frontStream, setFrontStream] = useState<MediaStream | null>(null);
  const [backStream, setBackStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [overlay, setOverlay] = useState<{ type: 'recording' | 'error' | 'permission'; message?: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const recorderRef = useRef<DualCameraRecorder | null>(null);

  useEffect(() => {
    // Check for camera support on mount
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setOverlay({ type: 'error', message: 'Camera API not supported in this browser' });
      return;
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Initialize recorder when both streams are ready
    if (frontStream && backStream && !recorderRef.current) {
      try {
        recorderRef.current = new DualCameraRecorder(frontStream, backStream);
      } catch (error) {
        console.error('Failed to initialize recorder:', error);
        setOverlay({ type: 'error', message: 'Failed to initialize recorder' });
      }
    }

    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
        recorderRef.current = null;
      }
    };
  }, [frontStream, backStream]);

  const handleRecord = async () => {
    if (!recorderRef.current) {
      setOverlay({ type: 'error', message: 'Recorder not ready' });
      return;
    }

    if (!isRecording) {
      try {
        recorderRef.current.start();
        setIsRecording(true);
        setOverlay({ type: 'recording' });
      } catch (error) {
        console.error('Failed to start recording:', error);
        setOverlay({ type: 'error', message: 'Failed to start recording' });
      }
    } else {
      try {
        setOverlay(null);
        const blob = await recorderRef.current.stop();
        const filename = `DualCam_${generateTimestamp()}.webm`;
        downloadBlob(blob, filename);
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
        setOverlay({ type: 'error', message: 'Failed to save recording' });
        setIsRecording(false);
      }
    }
  };

  const handleRetry = () => {
    setOverlay(null);
    window.location.reload();
  };

  if (!isInitialized) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <SplitScreen
        leftChild={
          <CameraFeed
            facingMode={frontCameraMode}
            isActive={true}
            label="Front Camera"
            onStreamReady={setFrontStream}
            onCameraSwitch={setFrontCameraMode}
          />
        }
        rightChild={
          <CameraFeed
            facingMode={backCameraMode}
            isActive={true}
            label="Back Camera"
            onStreamReady={setBackStream}
            onCameraSwitch={setBackCameraMode}
          />
        }
      />
      
      <RecordButton
        isRecording={isRecording}
        onToggle={handleRecord}
        disabled={!frontStream || !backStream}
      />
      
      <Overlay
        isVisible={!!overlay}
        type={overlay?.type || 'error'}
        message={overlay?.message}
        onRetry={handleRetry}
      />
    </div>
  );
}

export default App;