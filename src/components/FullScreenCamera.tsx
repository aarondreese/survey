"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface FullScreenCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export default function FullScreenCamera({ onCapture, onClose }: FullScreenCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    setMounted(true);
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      
      // Stop camera and return image
      stopCamera();
      onCapture(imageDataUrl);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  if (!mounted) return null;

  const modalContent = (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "#000",
      zIndex: 999999,
      display: "flex",
      flexDirection: "column",
    }}>
      {error ? (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: "20px",
          textAlign: "center",
        }}>
          <div>
            <p>{error}</p>
            <button
              onClick={handleClose}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: "0 20px",
            zIndex: 100000,
          }}>
            <button
              onClick={handleClose}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "rgba(102, 102, 102, 0.9)",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
            <button
              onClick={switchCamera}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "rgba(51, 51, 51, 0.9)",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔄 Flip
            </button>
            <button
              onClick={capturePhoto}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "rgba(0, 123, 255, 0.9)",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📷 Capture
            </button>
          </div>
        </>
      )}
    </div>
  );
  return createPortal(modalContent, document.body);}
