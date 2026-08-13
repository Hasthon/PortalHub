import React, { useState, useRef, useEffect } from 'react';
import { Encargo, ScanResult, ShiftStats } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useDevice } from '../context/DeviceContext';
import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  RotateCcw,
  Volume2,
  VolumeX,
  Keyboard,
  Zap,
  Clock,
  UserCheck,
  Search,
} from 'lucide-react';

// Mock database of pre-registered packages for validation demo
const MOCK_ENCARGOS_DB: Record<string, Partial<Encargo>> = {
  'STK-908123-CL': { cliente: 'Falabella Retail', destino: 'Sucursal Concepción', pesoKg: 4.2, piezas: 1, status: 'INGRESO' },
  'STK-908124-CL': { cliente: 'Mercado Libre', destino: 'CD San Bernardo', pesoKg: 1.8, piezas: 2, status: 'INGRESO' },
  'STK-908125-CL': { cliente: 'Ripley Chile', destino: 'Sucursal Antofagasta', pesoKg: 12.5, piezas: 1, status: 'INGRESO' },
  'STK-908126-CL': { cliente: 'Sodimac Homecenter', destino: 'Sucursal Temuco', pesoKg: 8.9, piezas: 3, status: 'INGRESO' },
  'STK-908127-CL': { cliente: 'Paris Cencosud', destino: 'Sucursal Viña del Mar', pesoKg: 2.1, piezas: 1, status: 'INGRESO' },
};

export const ScanModule: React.FC = () => {
  const { isPda } = useDevice();
  const { playSuccessSound, playErrorSound, playWarningSound } = useAudioFeedback();

  const [inputCode, setInputCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState<ShiftStats>({
    totalScanned: 0,
    successful: 0,
    errors: 0,
    duplicates: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input for seamless desktop & PDA scanning
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [lastScanResult]);

  const processScanCode = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check if code was already scanned in this session
    const isDuplicate = scanHistory.some(
      (item) => item.codeScanned === uppercaseCode && item.status === 'SUCCESS'
    );

    if (isDuplicate) {
      const result: ScanResult = {
        status: 'DUPLICATE',
        message: `⚠️ Encargo [${uppercaseCode}] YA fue escaneado anteriormente en este lote.`,
        codeScanned: uppercaseCode,
        timestamp,
      };
      setLastScanResult(result);
      setScanHistory((prev) => [result, ...prev]);
      setStats((prev) => ({
        ...prev,
        totalScanned: prev.totalScanned + 1,
        duplicates: prev.duplicates + 1,
        lastScanTime: timestamp,
      }));
      if (soundEnabled) playWarningSound();
      setInputCode('');
      return;
    }

    // Check mock database or validate format
    const mockData = MOCK_ENCARGOS_DB[uppercaseCode];

    if (mockData || uppercaseCode.startsWith('STK-') || uppercaseCode.length >= 6) {
      const newEncargo: Encargo = {
        id: `ENC-${Date.now().toString().slice(-6)}`,
        trackingCode: uppercaseCode,
        cliente: mockData?.cliente || 'Cliente General Starken',
        destino: mockData?.destino || 'Sucursal Centro Distribución',
        pesoKg: mockData?.pesoKg || Math.round((Math.random() * 10 + 0.5) * 10) / 10,
        piezas: mockData?.piezas || 1,
        status: 'CLASIFICADO',
        scannedAt: timestamp,
        scannedBy: 'Operario Hub #402',
      };

      const result: ScanResult = {
        status: 'SUCCESS',
        message: `¡Encargo ${uppercaseCode} escaneado correctamente!`,
        codeScanned: uppercaseCode,
        timestamp,
        encargo: newEncargo,
      };

      setLastScanResult(result);
      setScanHistory((prev) => [result, ...prev]);
      setStats((prev) => ({
        ...prev,
        totalScanned: prev.totalScanned + 1,
        successful: prev.successful + 1,
        lastScanTime: timestamp,
      }));
      if (soundEnabled) playSuccessSound();
    } else {
      const result: ScanResult = {
        status: 'ERROR',
        message: `❌ Código [${uppercaseCode}] no válido o no registrado en sistema.`,
        codeScanned: uppercaseCode,
        timestamp,
      };

      setLastScanResult(result);
      setScanHistory((prev) => [result, ...prev]);
      setStats((prev) => ({
        ...prev,
        totalScanned: prev.totalScanned + 1,
        errors: prev.errors + 1,
        lastScanTime: timestamp,
      }));
      if (soundEnabled) playErrorSound();
    }

    setInputCode('');
  };

  // Register universal barcode scanner hook
  const { triggerScan } = useBarcodeScanner({
    onScan: (code) => {
      processScanCode(code);
    },
    enableGlobal: true,
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      triggerScan(inputCode.trim());
    }
  };

  const handleResetSession = () => {
    if (window.confirm('¿Quieres reiniciar el conteo y la lista de escaneos del turno?')) {
      setScanHistory([]);
      setLastScanResult(null);
      setStats({
        totalScanned: 0,
        successful: 0,
        errors: 0,
        duplicates: 0,
      });
    }
  };

  // --- RENDER FOR PDA ---
  if (isPda) {
    return (
      <div className="flex flex-col h-full bg-industrial-pdaBg dark:bg-hub-base text-slate-100 p-3 select-none">
        {/* Banner de Estado del Último Escaneo (GIGANTE para PDA) */}
        <div
          className={`rounded-2xl p-4 mb-3 border flex flex-col justify-between transition-all duration-300 ${
            !lastScanResult
              ? 'bg-slate-900 border-slate-700 text-slate-400'
              : lastScanResult.status === 'SUCCESS'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100 animate-scan-flash-success'
              : lastScanResult.status === 'DUPLICATE'
              ? 'bg-amber-950/90 border-amber-500 text-amber-100'
              : 'bg-rose-950/90 border-rose-500 text-rose-100 animate-scan-flash-error'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/40">
              {!lastScanResult ? 'Esperando lectura...' : lastScanResult.status}
            </span>
            {lastScanResult && (
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {lastScanResult.timestamp}
              </span>
            )}
          </div>

          {!lastScanResult ? (
            <div className="py-6 text-center">
              <Barcode className="w-16 h-16 mx-auto mb-2 text-slate-600 animate-pulse" />
              <p className="text-lg font-bold text-slate-300">DISPARA EL LÁSER</p>
              <p className="text-xs text-slate-500">Escanea el código de barras del paquete</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-1">
                {lastScanResult.status === 'SUCCESS' && <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />}
                {lastScanResult.status === 'DUPLICATE' && <AlertTriangle className="w-10 h-10 text-amber-400 shrink-0" />}
                {lastScanResult.status === 'ERROR' && <XCircle className="w-10 h-10 text-rose-400 shrink-0" />}
                <div>
                  <p className="text-pda-val font-mono tracking-tight">{lastScanResult.codeScanned}</p>
                  <p className="text-sm font-medium opacity-90">{lastScanResult.message}</p>
                </div>
              </div>

              {lastScanResult.encargo && (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-slate-400 block">Cliente:</span>
                    <strong className="text-slate-100 text-sm truncate block">{lastScanResult.encargo.cliente}</strong>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-slate-400 block">Destino:</span>
                    <strong className="text-slate-100 text-sm truncate block">{lastScanResult.encargo.destino}</strong>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-slate-400 block">Peso:</span>
                    <strong className="text-slate-100 text-sm">{lastScanResult.encargo.pesoKg} Kg</strong>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg">
                    <span className="text-slate-400 block">Piezas:</span>
                    <strong className="text-slate-100 text-sm">{lastScanResult.encargo.piezas} Bulto(s)</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tarjetas de Métricas Rápidas PDA */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Correctos</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.successful}</span>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duplicados</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{stats.duplicates}</span>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Errores</span>
            <span className="text-2xl font-black text-rose-400 font-mono">{stats.errors}</span>
          </div>
        </div>

        {/* Entrada Manual de Respaldo PDA */}
        <form onSubmit={handleManualSubmit} className="mb-3">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              data-scanner-input="true"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Escribir o escanear..."
              className="w-full h-14 bg-slate-900 border-2 border-slate-700 focus:border-starken-primary rounded-xl px-4 pl-11 text-lg font-mono text-white placeholder-slate-500 outline-none transition-all"
            />
            <Barcode className="w-6 h-6 text-slate-400 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 bg-starken-primary hover:bg-starken-primaryHover text-white font-bold rounded-lg text-sm transition-all"
            >
              OK
            </button>
          </div>
        </form>

        {/* Botones Rápidos de Prueba (Demo) */}
        <div className="mt-auto pt-2 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Simulador de Escaneo PDA</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              {soundEnabled ? 'Sonido ON' : 'Silencio'}
            </button>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerScan('STK-908123-CL')}
              className="btn-pda-secondary text-xs"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              Escanear Válido 1
            </button>
            <button
              onClick={() => triggerScan('STK-908124-CL')}
              className="btn-pda-secondary text-xs"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              Escanear Válido 2
            </button>
            <button
              onClick={() => triggerScan('STK-ERROR-888')}
              className="btn-pda-secondary text-xs text-rose-300"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              Escanear Error
            </button>
            <button
              onClick={handleResetSession}
              className="btn-pda-secondary text-xs text-slate-400"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Lote
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER FOR DESKTOP (PC) ---
  return (
    <div className="space-y-6">
      {/* Top Banner & Main Scan Input Bar */}
      <div className="bg-white dark:bg-hub-surface rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-hub-border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-hub-border">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-starken-primary/10 text-starken-primary dark:text-hub-text1">
                <Barcode className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-hub-text1">Módulo de Escaneo Operativo</h2>
                <p className="text-sm text-gray-500 dark:text-hub-text2">
                  Listo para recibir lecturas por pistola de escaneo USB/Bluetooth o teclado
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-gray-100 text-gray-600 dark:bg-hub-elevated dark:text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Beep Sonoro Activo' : 'Sonido Silenciado'}
            </button>
            <button
              onClick={handleResetSession}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-hub-elevated dark:hover:bg-hub-elevated dark:text-hub-text2 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Turno
            </button>
          </div>
        </div>

        {/* Big Input Bar for Desktop Scanner Gun */}
        <form onSubmit={handleManualSubmit} className="relative">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              data-scanner-input="true"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Escanea el paquete con la pistola lectora o ingresa el código..."
              className="w-full h-16 bg-gray-50 dark:bg-hub-base border-2 border-gray-300 dark:border-hub-border focus:border-starken-primary rounded-xl pl-14 pr-36 text-xl font-mono text-gray-900 dark:text-hub-text1 placeholder-gray-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner"
            />
            <Barcode className="w-7 h-7 text-gray-400 dark:text-hub-text3 absolute left-4 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-3 h-11 px-6 bg-starken-primary hover:bg-starken-primaryHover text-white font-bold rounded-lg text-sm transition-all shadow-md flex items-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              Ingresar
            </button>
          </div>
        </form>

        {/* Quick Demo Scan Buttons for Testing on PC */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-hub-border text-xs">
          <span className="font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1 mr-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Simular Pistola:
          </span>
          <button
            onClick={() => triggerScan('STK-908123-CL')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-hub-elevated dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-mono rounded-lg transition-all"
          >
            + STK-908123-CL (Falabella)
          </button>
          <button
            onClick={() => triggerScan('STK-908124-CL')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-hub-elevated dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-mono rounded-lg transition-all"
          >
            + STK-908124-CL (MercadoLibre)
          </button>
          <button
            onClick={() => triggerScan('STK-908125-CL')}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-hub-elevated dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-mono rounded-lg transition-all"
          >
            + STK-908125-CL (Ripley)
          </button>
          <button
            onClick={() => triggerScan('STK-INVALID-000')}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono rounded-lg transition-all"
          >
            + Error Test
          </button>
        </div>
      </div>

      {/* Main Grid: Live Last Scan Result Banner + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Last Scan Status & Details */}
        <div className="lg:col-span-2 bg-white dark:bg-hub-surface rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-hub-border">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-hub-text2 mb-4 flex items-center justify-between">
            <span>Última Lectura Registrada</span>
            {lastScanResult && (
              <span className="text-xs font-mono text-gray-400 dark:text-hub-text3">
                Hora: {lastScanResult.timestamp}
              </span>
            )}
          </h3>

          {!lastScanResult ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-hub-border rounded-xl">
              <Package className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-slate-700 animate-pulse" />
              <p className="text-base font-semibold text-gray-600 dark:text-hub-text2">
                Pistola lista. Escanea cualquier paquete para iniciar.
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">
                La aplicación capturará el código y emitirá el tono correspondiente.
              </p>
            </div>
          ) : (
            <div
              className={`rounded-xl p-5 border transition-all ${
                lastScanResult.status === 'SUCCESS'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 animate-scan-flash-success'
                  : lastScanResult.status === 'DUPLICATE'
                  ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                  : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 animate-scan-flash-error'
              }`}
            >
              <div className="flex items-start gap-4">
                {lastScanResult.status === 'SUCCESS' && <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {lastScanResult.status === 'DUPLICATE' && <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400 shrink-0" />}
                {lastScanResult.status === 'ERROR' && <XCircle className="w-12 h-12 text-rose-600 dark:text-rose-400 shrink-0" />}
                
                <div className="flex-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase mb-1 ${
                    lastScanResult.status === 'SUCCESS'
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                      : lastScanResult.status === 'DUPLICATE'
                      ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                      : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                  }`}>
                    {lastScanResult.status}
                  </span>
                  <h4 className="text-2xl font-mono font-extrabold text-gray-900 dark:text-hub-text1 tracking-tight">
                    {lastScanResult.codeScanned}
                  </h4>
                  <p className="text-sm font-medium text-gray-700 dark:text-hub-text2 mt-1">
                    {lastScanResult.message}
                  </p>

                  {lastScanResult.encargo && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-hub-text2 block">Cliente:</span>
                        <strong className="text-sm text-gray-900 dark:text-hub-text1 font-semibold">{lastScanResult.encargo.cliente}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-hub-text2 block">Destino:</span>
                        <strong className="text-sm text-gray-900 dark:text-hub-text1 font-semibold">{lastScanResult.encargo.destino}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-hub-text2 block">Peso Estimado:</span>
                        <strong className="text-sm text-gray-900 dark:text-hub-text1 font-semibold">{lastScanResult.encargo.pesoKg} Kg</strong>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-hub-text2 block">N° Bultos:</span>
                        <strong className="text-sm text-gray-900 dark:text-hub-text1 font-semibold">{lastScanResult.encargo.piezas} Pieza(s)</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Shift Summary Cards */}
        <div className="bg-white dark:bg-hub-surface rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-hub-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-hub-text2 mb-4">
              Métricas del Turno
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-hub-elevated p-4 rounded-xl border border-gray-100 dark:border-hub-border">
                <span className="text-xs text-gray-500 dark:text-hub-text2 block font-medium">Escaneados</span>
                <span className="text-3xl font-black font-mono text-gray-900 dark:text-hub-text1">{stats.totalScanned}</span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">Correctos</span>
                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.successful}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <span className="text-xs text-amber-700 dark:text-amber-400 block font-medium">Duplicados</span>
                <span className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">{stats.duplicates}</span>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/50 p-4 rounded-xl border border-rose-100 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-400 block font-medium">Errores</span>
                <span className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">{stats.errors}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-hub-border text-xs text-gray-500 dark:text-hub-text2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-gray-400" /> Operario: Hub #402
            </span>
            <span className="font-mono">Pistola USB / BT Ready</span>
          </div>
        </div>
      </div>

      {/* History Data Table for PC Desktop */}
      <div className="bg-white dark:bg-hub-surface rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-hub-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-hub-text1 flex items-center gap-2">
            <Search className="w-4 h-4 text-starken-primary dark:text-hub-text2" /> Historial de Escaneos de la Sesión ({scanHistory.length})
          </h3>
        </div>

        {scanHistory.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-hub-text3 py-6 text-center italic">
            No se han registrado lecturas en esta sesión aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-hub-elevated text-xs uppercase text-gray-500 dark:text-hub-text2 font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Hora</th>
                  <th className="px-4 py-3">Código Encargo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Estado Lectura</th>
                  <th className="px-4 py-3 rounded-r-lg">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {scanHistory.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors font-mono text-xs">
                    <td className="px-4 py-3 text-gray-500 dark:text-hub-text2">{item.timestamp}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-hub-text1">{item.codeScanned}</td>
                    <td className="px-4 py-3 font-sans text-gray-700 dark:text-hub-text2">{item.encargo?.cliente || '-'}</td>
                    <td className="px-4 py-3 font-sans text-gray-700 dark:text-hub-text2">{item.encargo?.destino || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        item.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'DUPLICATE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-gray-500 dark:text-hub-text2 truncate max-w-xs">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
