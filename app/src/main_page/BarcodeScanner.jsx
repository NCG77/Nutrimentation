"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Starting camera...");

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const devices = await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {
          setStatus("No camera found");
          return;
        }

        // Force back camera on mobile
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(200);
            setStatus("✅ Barcode detected!");

            // Flash effect feedback
            document.body.style.background = "#00ffcc";
            setTimeout(() => {
              document.body.style.background = "";
            }, 100);

            stopScanner();
            onScan(decodedText);
          },
          () => {}
        );

        setStatus("Point camera at barcode");
      } catch (err) {
        console.error(err);
        setStatus("Camera error: " + err.message);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
    }
  };

  return (
    <div className="scanner-ui">
      <p>{status}</p>

      <div className="scanner-container">
        <div id="reader"></div>
        
        <div className="overlay">
          <div className="frame"></div>
          <p className="hint">Align barcode inside the box</p>
        </div>
      </div>

      <button onClick={() => { stopScanner(); onClose(); }} className="qr-close-btn">
        Close
      </button>
    </div>
  );
}