import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  minCodeLength?: number;
  maxKeyIntervalMs?: number; // Maximum time between keystrokes from barcode hardware (default 40ms)
  enableGlobal?: boolean;
}

export function useBarcodeScanner({
  onScan,
  minCodeLength = 3,
  maxKeyIntervalMs = 45,
  enableGlobal = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta', 'CapLock', 'Tab'].includes(e.key)) {
        if (e.key === 'Tab' && bufferRef.current.length >= minCodeLength) {
          e.preventDefault();
          const code = bufferRef.current.trim();
          bufferRef.current = '';
          if (code) onScan(code);
        }
        return;
      }

      // Check if user is typing in a non-scanner input element unless global capture is explicitly active
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      
      const isScanInput = target?.getAttribute('data-scanner-input') === 'true';

      if (isInput && !isScanInput && !enableGlobal) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minCodeLength) {
          e.preventDefault();
          const code = bufferRef.current.trim();
          bufferRef.current = '';
          onScan(code);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Scanner hardware sends characters rapidly (< maxKeyIntervalMs apart)
      // If time interval between keys is too long, reset buffer (user manual typing)
      if (timeDiff > maxKeyIntervalMs && bufferRef.current.length > 0 && !isScanInput) {
        bufferRef.current = '';
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    },
    [onScan, minCodeLength, maxKeyIntervalMs, enableGlobal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const triggerScan = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      if (cleanCode.length >= minCodeLength) {
        onScan(cleanCode);
      }
    },
    [onScan, minCodeLength]
  );

  return { triggerScan };
}
