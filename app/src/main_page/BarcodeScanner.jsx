"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Initializing camera...");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // Check camera permission first
        const devices = await Html5QrcodeScanner.getCameras();
        if (!devices || devices.length === 0) {
          setStatus("No camera found. Please enable camera access.");
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            facingMode: "environment",
          },
          false
        );

        scanner.render(
          (decodedText) => {
            console.log("Scanned barcode:", decodedText);
            // Vibrate if available
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            setStatus("✓ Barcode detected!");
            setTimeout(() => {
              onScan(decodedText);
              scanner.clear().catch(() => {});
            }, 300);
          },
          (error) => {
            console.warn("Scanner error:", error);
          }
        );

        scannerRef.current = scanner;
        setCameraReady(true);
        setStatus("Camera ready - Point at barcode");
      } catch (err) {
        console.error("Camera initialization error:", err);
        setStatus(`Camera access denied: ${err.message}`);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScan]);

  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Error clearing scanner:", err);
      }
    }
    onClose();
  };

  return (
    <div className="qr-scanner-wrapper">
      <div className="qr-status-bar">
        <span className="qr-status-text">{status}</span>
      </div>
      
      <div id="qr-reader" className="qr-reader-container"></div>
      
      <div className="qr-frame-overlay">
        <div className="qr-frame"></div>
        <p className="qr-instructions">Align barcode within the frame</p>
      </div>

      <div className="qr-controls">
        <button onClick={handleClose} className="btn btn-close qr-close-btn">
          ✕ Close Scanner
        </button>
      </div>
    </div>
  );
}
