import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Keyboard, Square } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeScanner({ onScan, placeholder = 'Enter barcode manually...' }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`barcode-reader-${Math.random().toString(36).slice(2)}`);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const scanningRef = useRef(false);
  const lastDecodedRef = useRef<{ value: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);

  // Always keep the latest callback
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    try {
      await scanner?.stop();
    } catch {
      // no-op
    }

    try {
      scanner?.clear();
    } catch {
      // no-op
    }

    scannerRef.current = null;
    scanningRef.current = false;
    setScanning(false);
  }, []);

  const handleDecoded = useCallback(
    (decodedText: string) => {
      const value = decodedText.trim();
      if (!value) return;

      const now = Date.now();
      const last = lastDecodedRef.current;
      if (last && last.value === value && now - last.at < 1500) return;

      lastDecodedRef.current = { value, at: now };
      onScanRef.current(value);
      void stopScanner();
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    if (scanningRef.current) return;

    // IMPORTANT (mobile): avoid delaying before calling camera start, otherwise the
    // browser may consider it not user-initiated and block camera permissions.
    scanningRef.current = true;
    setScanning(true);

    const formatsToSupport = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.QR_CODE,
    ];

    try {
      if (scannerRef.current) {
        // Rare case: stale instance
        void stopScanner();
      }

      const scanner = new Html5Qrcode(containerId.current, {
        formatsToSupport,
        verbose: false,
        experimentalFeatures: {
          // Uses native BarcodeDetector where available (best on mobile Chrome)
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = scanner;

      const container = containerElRef.current;
      const width = Math.max(320, Math.floor(container?.clientWidth ?? 0));

      // Wider scan box improves 1D barcode detection
      const boxWidth = Math.floor(Math.min(width * 0.95, 520));
      const boxHeight = Math.floor(Math.max(200, boxWidth * 0.45));

      const config = {
        fps: 12,
        qrbox: { width: boxWidth, height: boxHeight },
        disableFlip: false,
      };

      // Prefer back camera with near/macro lens for barcode scanning
      try {
        await scanner.start({ facingMode: { exact: 'environment' } }, config, handleDecoded, () => {});
      } catch {
        const cameras = await Html5Qrcode.getCameras();
        // Prefer macro/near-vision camera for close-up barcode scanning, then back camera
        const macroCamera = cameras.find((c) => /macro|near|close/i.test(c.label));
        const backCamera = cameras.find((c) => /back|rear|environment/i.test(c.label));
        const preferredCamera = macroCamera?.id ?? backCamera?.id ?? cameras[0]?.id;
        if (!preferredCamera) throw new Error('No camera found');
        await scanner.start(preferredCamera, config, handleDecoded, () => {});
      }
    } catch (error) {
      scanningRef.current = false;
      setScanning(false);
      const msg = (error as { message?: string })?.message || String(error);
      toast.error(`Unable to start scanner. ${msg}`);
      console.error('Barcode scanner start failed:', error);
      try {
        await stopScanner();
      } catch {
        // no-op
      }
    }
  }, [handleDecoded, stopScanner]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={scanning ? 'destructive' : 'default'}
          onClick={scanning ? () => void stopScanner() : () => void startScanner()}
          className="gap-2"
        >
          {scanning ? <Square className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {scanning ? 'Stop Camera' : 'Scan Barcode'}
        </Button>
      </div>

      {/* Keep container mounted for better mobile camera permission behavior */}
      <div className="relative">
        <div
          id={containerId.current}
          ref={containerElRef}
          style={{ width: '100%', minHeight: scanning ? '280px' : '140px' }}
          className="rounded-lg overflow-hidden border border-border"
        />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-card/60">
            Tap “Scan Barcode” to open camera
          </div>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" className="gap-2">
          <Keyboard className="h-4 w-4" />
          Enter
        </Button>
      </form>
    </div>
  );
}
