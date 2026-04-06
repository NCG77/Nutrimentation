"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        console.log("Scanned barcode:", decodedText);
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        console.warn("Scanner error:", error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="qr-scanner-wrapper">
      <div id="qr-reader" style={{ width: "100%" }}></div>
      <button onClick={onClose} className="btn btn-close qr-close-btn">
        ✕ Close Scanner
      </button>
      <p className="qr-instructions">Position barcode/QR code in the frame</p>
    </div>
  );
}
