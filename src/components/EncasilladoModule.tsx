import React, { useState, useRef, useEffect } from 'react';
import { EncargoEncasillado, UbicacionEncasillado, PasilloType } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useDevice } from '../context/DeviceContext';
import { LocationQrModal, PRESET_UBICACIONES } from './LocationQrModal';
import escaneoImg from '../assets/escaneo.png';
import {
  Scan,
  Truck,
  CheckCircle2,
  Box,
  ShieldAlert,
  AlertCircle,
  X,
} from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'warning';
  codeScanned?: string;
  rampaName?: string;
}

const INITIAL_ENCARGOS: EncargoEncasillado[] = [
  {
    id: 'ENC-3129890',
    codigoEncargo: 'OF-3129890',
    pasilloAsignado: 'ROJO',
    rampaLigada: 'Rampa 02 - Salida Sur (Concepción / Temuco)',
    horaEscaneo: '12:29 p. m.',
  },
  {
    id: 'ENC-4092326',
    codigoEncargo: 'OF-4092326',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 01 - Salida Norte (Santiago / V Región)',
    horaEscaneo: '12:29 p. m.',
  },
  {
    id: 'ENC-6288804',
    codigoEncargo: 'OF-6288804',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 01 - Salida Norte (Santiago / V Región)',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-9075807',
    codigoEncargo: 'OF-9075807',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 01 - Salida Norte (Santiago / V Región)',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-3305338',
    codigoEncargo: 'OF-3305338',
    pasilloAsignado: 'VERDE',
    rampaLigada: 'Rampa 03 - Expreso / Regiones Extremas',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-5008021',
    codigoEncargo: 'OF-5008021',
    pasilloAsignado: 'VERDE',
    rampaLigada: 'Rampa 03 - Expreso / Regiones Extremas',
    horaEscaneo: '12:28 p. m.',
  },
];

export const EncasilladoModule: React.FC = () => {
  const { isPda } = useDevice();
  const { playSuccessSound, playErrorSound, playWarningSound } = useAudioFeedback();

  // Active Location State (Rampa 24 por defecto)
  const [activeLocation, setActiveLocation] = useState<UbicacionEncasillado>(PRESET_UBICACIONES[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Scan & Enlistment State
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [encargosList, setEncargosList] = useState<EncargoEncasillado[]>(INITIAL_ENCARGOS);
  const [latestScannedId, setLatestScannedId] = useState<string | null>(null);
  const [activeFlashPasillo, setActiveFlashPasillo] = useState<PasilloType | null>(null);

  // Floating Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pasilloTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [isToastLeaving, setIsToastLeaving] = useState(false);

  const handleDismissToast = () => {
    setIsToastLeaving(true);
    setTimeout(() => {
      setToast(null);
      setIsToastLeaving(false);
    }, 280);
  };

  const triggerToast = (text: string, type: 'success' | 'error' | 'warning', codeScanned?: string, rampaName?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setIsToastLeaving(false);

    setToast({
      id: Date.now(),
      text,
      type,
      codeScanned,
      rampaName,
    });

    toastTimerRef.current = setTimeout(() => {
      handleDismissToast();
    }, 3600);
  };

  // Keep focus on input for seamless scanning
  useEffect(() => {
    const timer = setTimeout(() => scanInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [activeLocation, encargosList]);



  // Calculate live counts per aisle
  const countsByPasillo = {
    AZUL: encargosList.filter((item) => item.pasilloAsignado === 'AZUL').length,
    ROJO: encargosList.filter((item) => item.pasilloAsignado === 'ROJO').length,
    VERDE: encargosList.filter((item) => item.pasilloAsignado === 'VERDE').length,
  };

  // Process encargo scan
  const handleProcessScan = (code: string) => {
    if (!activeLocation) return;
    const uppercaseCode = code.toUpperCase().trim();
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (isRemoveMode) {
      // Remove package mode
      const existing = encargosList.find((item) => item.codigoEncargo === uppercaseCode);
      if (existing) {
        setEncargosList((prev) => prev.filter((item) => item.codigoEncargo !== uppercaseCode));
        triggerToast(`Encargo [${uppercaseCode}] removido.`, 'warning', uppercaseCode);
        playWarningSound();
      } else {
        triggerToast(`El código [${uppercaseCode}] no se encuentra en la lista`, 'error', uppercaseCode);
        playErrorSound();
      }
      return;
    }

    // Add package mode
    const isDuplicate = encargosList.some((item) => item.codigoEncargo === uppercaseCode);
    if (isDuplicate) {
      triggerToast(`⚠️ Encargo [${uppercaseCode}] ya está en la lista de encasillado`, 'warning', uppercaseCode);
      playWarningSound();
      return;
    }

    // Auto assign pasillo based on code hash or active location fallback
    let assignedPasillo: PasilloType = activeLocation.pasilloPredeterminado || 'AZUL';
    if (uppercaseCode.endsWith('1') || uppercaseCode.endsWith('4') || uppercaseCode.endsWith('7')) {
      assignedPasillo = 'AZUL';
    } else if (uppercaseCode.endsWith('2') || uppercaseCode.endsWith('5') || uppercaseCode.endsWith('8')) {
      assignedPasillo = 'ROJO';
    } else if (uppercaseCode.endsWith('3') || uppercaseCode.endsWith('6') || uppercaseCode.endsWith('9')) {
      assignedPasillo = 'VERDE';
    }

    const rampaName =
      assignedPasillo === 'AZUL'
        ? 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)'
        : assignedPasillo === 'ROJO'
          ? 'Rampa 01 - Salida Norte (Santiago / V Región)'
          : 'Rampa 12 - Concepción (Biobío / Temuco)';

    const newItem: EncargoEncasillado = {
      id: `ENC-${Date.now().toString().slice(-6)}`,
      codigoEncargo: uppercaseCode,
      pasilloAsignado: assignedPasillo,
      rampaLigada: rampaName,
      horaEscaneo: timestamp,
    };

    setEncargosList((prev) => [newItem, ...prev]);
    setLatestScannedId(newItem.id);
    setActiveFlashPasillo(assignedPasillo);

    // Resaltado verde de escaneo y stroke de tarjeta duran exactamente 1 segundo (1000ms)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setLatestScannedId(null);
    }, 1000);

    if (pasilloTimerRef.current) clearTimeout(pasilloTimerRef.current);
    pasilloTimerRef.current = setTimeout(() => {
      setActiveFlashPasillo(null);
    }, 1000);

    triggerToast(
      `Encargo clasificado en ${assignedPasillo === 'AZUL' ? 'Rampa 24' : assignedPasillo === 'ROJO' ? 'Rampa 01' : 'Rampa 12'}`,
      'success',
      uppercaseCode,
      rampaName
    );
    playSuccessSound();
  };

  // Register universal barcode scanner hook
  const { triggerScan } = useBarcodeScanner({
    onScan: (code) => {
      handleProcessScan(code);
    },
    enableGlobal: true,
  });



  // --- RENDER PDA MOBILE VIEW (MODO CLARO IGUAL A ESCRITORIO) ---
  if (isPda) {
    return (
      <div className="flex flex-col h-full bg-[#FAFDFC] dark:bg-hub-base text-[#414745] dark:text-hub-text1 p-3 select-none relative font-sans">
        {/* Floating Toast Notification for PDA (Flotante en el TOP - Sin desplazar contenido) */}
        {toast && (
          <div
            key={toast.id}
            onClick={handleDismissToast}
            className={`fixed top-3 left-3 right-3 z-[9999] shadow-2xl rounded-2xl p-3.5 flex items-center justify-between gap-2.5 border font-mono cursor-pointer transition-all ${
              isToastLeaving ? 'animate-toast-slide-up' : 'animate-toast-slide-down'
            } ${
              toast.type === 'success'
                ? 'bg-[#EEFBF4] dark:bg-emerald-950/90 border-[#A7F3D0] dark:border-emerald-700/80 text-[#065F46] dark:text-emerald-200'
                : toast.type === 'warning'
                ? 'bg-[#FFFBEB] dark:bg-amber-950/90 border-[#FDE68A] dark:border-amber-700/80 text-[#92400E] dark:text-amber-200'
                : 'bg-[#FEF2F2] dark:bg-rose-950/90 border-[#FCA5A5] dark:border-rose-700/80 text-[#991B1B] dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 stroke-[2.2]" />
              ) : toast.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 stroke-[2.2]" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 stroke-[2.2]" />
              )}
              <p className="text-xs font-bold font-mono leading-snug whitespace-normal break-words">
                {toast.text}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismissToast();
              }}
              className="p-1 rounded-lg shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
              title="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>
        )}

        {/* PDA Main Content Body */}
        {encargosList.length === 0 ? (
          <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-3xl p-6 text-center my-auto shadow-xs flex flex-col items-center animate-fadeIn">
            <div className="w-36 h-36 mb-4 flex items-center justify-center p-2 bg-emerald-50/60 dark:bg-emerald-950/60 rounded-2xl border border-emerald-100/80 dark:border-emerald-800/80 shadow-2xs">
              <img src={escaneoImg} alt="Escaneo de Encargo" className="max-h-full max-w-full object-contain" />
            </div>

            <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 mb-1.5 leading-snug">
              Escanea los encargos
            </h3>

            <p className="text-xs text-gray-500 dark:text-hub-text2 mb-5 max-w-xs">
              Dispara el láser del lector PDA o presiona el botón para comenzar el proceso de encasillado.
            </p>

            <div className="w-full">
              <button
                type="button"
                onClick={() => {
                  const randomNum = Math.floor(1000000 + Math.random() * 9000000);
                  triggerScan(`OF-${randomNum}`);
                }}
                className="w-full h-11 bg-[#009D4E] hover:bg-[#008743] font-bold rounded-xl text-xs text-white shadow-xs flex items-center justify-center gap-2 transition-all font-sans"
              >
                <Scan className="w-4 h-4" />
                <span>Simular Escaneo PDA</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Pasillo Counters Grid for PDA in Light Mode */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-[#EFF6FF] dark:bg-sky-950/70 border border-[#BFDBFE] dark:border-sky-800 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9px] uppercase font-mono font-bold text-[#2563EB] dark:text-sky-300 block">P. AZUL</span>
                <span className="text-xl font-mono font-black text-[#2563EB] dark:text-sky-300">{countsByPasillo.AZUL}</span>
              </div>
              <div className="bg-[#FFF0F2] dark:bg-rose-950/70 border border-[#FECDD3] dark:border-rose-800 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9px] uppercase font-mono font-bold text-[#E11D48] dark:text-rose-300 block">P. ROJO</span>
                <span className="text-xl font-mono font-black text-[#E11D48] dark:text-rose-300">{countsByPasillo.ROJO}</span>
              </div>
              <div className="bg-[#ECFDF5] dark:bg-emerald-950/70 border border-[#A7F3D0] dark:border-emerald-800 rounded-2xl p-2 text-center shadow-2xs">
                <span className="text-[9px] uppercase font-mono font-bold text-[#059669] dark:text-emerald-300 block">P. VERDE</span>
                <span className="text-xl font-mono font-black text-[#059669] dark:text-emerald-300">{countsByPasillo.VERDE}</span>
              </div>
            </div>

            {/* Scan Bar & Quitar Switch for PDA in Light Mode */}
            <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-[#009D4E]" /> Escanea los encargos
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[13px] text-gray-500 dark:text-hub-text2 font-semibold">Quitar encargo</span>
                  <input
                    type="checkbox"
                    checked={isRemoveMode}
                    onChange={(e) => setIsRemoveMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 relative"></div>
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isRemoveMode) {
                    if (encargosList.length > 0) {
                      const randomIndex = Math.floor(Math.random() * encargosList.length);
                      const codeToRemove = encargosList[randomIndex].codigoEncargo;
                      triggerScan(codeToRemove);
                    } else {
                      triggerToast('No hay encargos en la lista para eliminar', 'warning');
                      playWarningSound();
                    }
                  } else {
                    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
                    const dynamicCode = `OF-${randomNum}`;
                    triggerScan(dynamicCode);
                  }
                }}
                className={`w-full h-10 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 font-sans text-white ${isRemoveMode ? 'bg-[#E11D48] hover:bg-[#BE123C]' : 'bg-[#009D4E] hover:bg-[#008743]'
                  }`}
              >
                <Scan className="w-4 h-4" />
                <span>Simular Escaneo PDA</span>
              </button>

              {/* Helper al activar Quitar encargo en PDA */}
              {isRemoveMode && (
                <div className="mt-2.5 p-2.5 bg-[#FFF0F2] dark:bg-rose-950/50 border border-[#FECDD3] dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
                  <p className="text-[11px] text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
                    <strong className="font-bold">Quitar encargo activo:</strong> Al escanear los encargos, estos se eliminarán de la vista.
                  </p>
                </div>
              )}
            </div>

            {/* Enlisted Packages List for PDA in Light Mode */}
            <div className="flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 shadow-xs flex flex-col">
              {/* Header Fijo */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100/90 dark:border-hub-border shrink-0">
                <span className="text-xs font-bold text-[#414745] dark:text-hub-text1">Lista de encargos</span>
                <span className="text-[10px] font-mono font-bold text-[#414745] dark:text-hub-text2">
                  {encargosList.length} bultos
                </span>
              </div>

              {/* Scrollable Data Rows */}
              <div className="flex-1 overflow-y-auto space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {encargosList.map((item) => {
                  const isLatest = item.id === latestScannedId;
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all duration-500 ${isLatest
                        ? 'bg-[#EEFBF4] dark:bg-emerald-950/70 border-[#A7F3D0] dark:border-emerald-700 border-l-4 border-l-[#009D4E] font-bold'
                        : 'bg-gray-50/80 dark:bg-hub-elevated/80 border-gray-200/80 dark:border-hub-border'
                        }`}
                    >
                      <div>
                        <strong className="text-[#414745] dark:text-hub-text1 block font-bold">
                          {item.codigoEncargo}
                        </strong>
                        <span className="text-[10px] text-gray-400">{item.horaEscaneo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${item.pasilloAsignado === 'AZUL'
                          ? 'bg-[#EFF6FF] dark:bg-sky-950 text-[#2563EB] dark:text-sky-300 border-[#BFDBFE] dark:border-sky-800'
                          : item.pasilloAsignado === 'ROJO'
                            ? 'bg-[#FFF0F2] dark:bg-rose-950 text-[#E11D48] dark:text-rose-300 border-[#FECDD3] dark:border-rose-800'
                            : 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#059669] dark:text-emerald-300 border-[#A7F3D0] dark:border-emerald-800'
                          }`}>
                          {item.pasilloAsignado === 'AZUL' ? 'P. AZUL' : item.pasilloAsignado === 'ROJO' ? 'P. ROJO' : 'P. VERDE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- RENDER DESKTOP (PC) VIEW ---
  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Floating Toast Notification (Estilo Imagen 2 con Botón X) */}
      {toast && (
        <div
          key={toast.id}
          className={`fixed top-4 right-6 z-50 max-w-md w-full animate-toast-pop shadow-xl rounded-2xl p-4 flex items-center justify-between gap-3 border font-mono transition-all ${toast.type === 'success'
            ? 'bg-[#EEFBF4] dark:bg-emerald-950/90 border-[#A7F3D0] dark:border-emerald-700/80 text-[#065F46] dark:text-emerald-200'
            : toast.type === 'warning'
              ? 'bg-[#FFFBEB] dark:bg-amber-950/90 border-[#FDE68A] dark:border-amber-700/80 text-[#92400E] dark:text-amber-200'
              : 'bg-[#FEF2F2] dark:bg-rose-950/90 border-[#FCA5A5] dark:border-rose-700/80 text-[#991B1B] dark:text-rose-200'
            }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 stroke-[2.2]" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-[#D97706] dark:text-amber-400 shrink-0 stroke-[2.2]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#DC2626] dark:text-rose-400 shrink-0 stroke-[2.2]" />
            )}

            <p className="text-xs font-bold leading-snug tracking-tight font-mono whitespace-normal break-words">
              {toast.text}
            </p>
          </div>

          <button
            onClick={() => setToast(null)}
            className={`p-1 rounded-lg transition-colors shrink-0 ${toast.type === 'success'
              ? 'text-[#059669]/70 hover:text-[#065F46] dark:text-emerald-400/70 dark:hover:text-emerald-200'
              : toast.type === 'warning'
                ? 'text-[#D97706]/70 hover:text-[#92400E] dark:text-amber-400/70 dark:hover:text-amber-200'
                : 'text-[#DC2626]/70 hover:text-[#991B1B] dark:text-rose-400/70 dark:hover:text-rose-200'
              }`}
            title="Cerrar notificación"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      )}

      {/* Card 1: Main Scan Control Bar */}
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border flex flex-col gap-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Scan className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            <h3 className="text-base font-bold text-[#414745] dark:text-hub-text1 font-sans">
              Escanea los encargos para agregarlos a la lista de encasillado
            </h3>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600 dark:text-hub-text2">Quitar encargo</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRemoveMode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsRemoveMode(checked);
                    if (checked) {
                      triggerToast(
                        'Quitar encargo activado.',
                        'warning'
                      );
                      playWarningSound();
                    } else {
                      triggerToast('Agregar encargo activado.', 'success');
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-hub-elevated peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Simular Escaneo PDA Button */}
            <button
              type="button"
              onClick={() => {
                if (isRemoveMode) {
                  if (encargosList.length > 0) {
                    // Selecciona un encargo existente de la lista para simular su eliminación real
                    const randomIndex = Math.floor(Math.random() * encargosList.length);
                    const codeToRemove = encargosList[randomIndex].codigoEncargo;
                    triggerScan(codeToRemove);
                  } else {
                    triggerToast('No hay encargos en la lista para eliminar', 'warning');
                    playWarningSound();
                  }
                } else {
                  const randomNum = Math.floor(1000000 + Math.random() * 9000000);
                  const dynamicCode = `OF-${randomNum}`;
                  triggerScan(dynamicCode);
                }
              }}
              className={`px-4 py-2.5 text-white font-bold rounded-full text-xs transition-all shadow-xs flex items-center gap-2 font-sans ${isRemoveMode
                ? 'bg-[#E11D48] hover:bg-[#BE123C]'
                : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
            >
              <Scan className="w-4 h-4" />
              <span>Simular Escaneo PDA</span>
            </button>
          </div>
        </div>

        {/* Helper informativo al activar Quitar encargo en Escritorio */}
        {isRemoveMode && (
          <div className="mt-3.5 p-3 bg-[#FFF0F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
            <p className="text-xs text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
              <strong className="font-bold">
                Quitar encargo activo:</strong> Al escanear los encargos, estos se eliminarán de la vista.
            </p>
          </div>
        )}
      </div>

      {/* Grid of 3 Pasillo Conteo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pasillo Azul Card */}
        <div
          className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-500 flex flex-col justify-between ${activeFlashPasillo === 'AZUL'
            ? 'border-[#2563EB] shadow-md shadow-blue-500/20 bg-blue-50/20 dark:bg-sky-950/40'
            : 'border-gray-200/80 dark:border-hub-border'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="px-3.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-extrabold uppercase border border-sky-200 dark:border-sky-800 font-sans">
              Pasillo Azul
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-extrabold text-[#414745] dark:text-hub-text1 font-mono">{countsByPasillo.AZUL}</span>
              <span className="text-xs text-gray-400 dark:text-hub-text3 font-sans font-medium">un.</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-hub-text2 font-sans flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-hub-border">
            <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">Rampa 24 - Puerto Montt (Chiloé / Los Lagos)</span>
          </div>
        </div>

        {/* Pasillo Rojo Card */}
        <div
          className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-500 flex flex-col justify-between ${activeFlashPasillo === 'ROJO'
            ? 'border-[#E11D48] shadow-md shadow-rose-500/20 bg-rose-50/20 dark:bg-rose-950/40'
            : 'border-gray-200/80 dark:border-hub-border'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-extrabold uppercase border border-rose-200 dark:border-rose-800 font-sans">
              Pasillo Rojo
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-extrabold text-[#414745] dark:text-hub-text1 font-mono">{countsByPasillo.ROJO}</span>
              <span className="text-xs text-gray-400 dark:text-hub-text3 font-sans font-medium">un.</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-hub-text2 font-sans flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-hub-border">
            <Truck className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="truncate">Rampa 01 - Salida Norte (Santiago / V Región)</span>
          </div>
        </div>

        {/* Pasillo Verde Card */}
        <div
          className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-500 flex flex-col justify-between ${activeFlashPasillo === 'VERDE'
            ? 'border-[#059669] shadow-md shadow-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/40'
            : 'border-gray-200/80 dark:border-hub-border'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold uppercase border border-emerald-200 dark:border-emerald-800 font-sans">
              Pasillo Verde
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-extrabold text-[#414745] dark:text-hub-text1 font-mono">{countsByPasillo.VERDE}</span>
              <span className="text-xs text-gray-400 dark:text-hub-text3 font-sans font-medium">un.</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-hub-text2 font-sans flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-hub-border">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Rampa 12 - Concepción (Biobío / Temuco)</span>
          </div>
        </div>
      </div>

      {/* Main Table Card: Lista de encargos a encasillar */}
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Box className="w-5 h-5 text-[#009D4E] stroke-[2.2]" />
            <h3 className="text-base font-bold text-[#414745] dark:text-hub-text1 font-sans">
              Lista de encargos
            </h3>
          </div>

          <span className="text-xs font-mono font-bold text-[#414745] dark:text-hub-text2">
            {encargosList.length} bultos escaneados
          </span>
        </div>

        {/* Table Content Container */}
        {encargosList.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-gray-100 dark:border-hub-border rounded-2xl bg-gray-50/50 dark:bg-hub-base/40">
            <Box className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
            <p className="text-sm font-semibold font-sans text-gray-500 dark:text-hub-text2">
              No hay encargos en la lista aún. Escanea un código para agregar.
            </p>
          </div>
        ) : (
          <div className="border border-gray-200/80 dark:border-hub-border rounded-2xl overflow-hidden shadow-2xs">
            {/* Fixed Header Row - Outside Scroll Container */}
            <div className="bg-[#F3F6FA] dark:bg-hub-elevated border-b border-gray-200/80 dark:border-hub-border">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-hub-text2 font-bold font-sans">
                  <tr>
                    <th className="w-[26%] pl-6 pr-4 py-3.5">CÓDIGO ENCARGO</th>
                    <th className="w-[24%] px-4 py-3.5">PASILLO ASIGNADO</th>
                    <th className="w-[32%] px-4 py-3.5">RAMPA LIGADA</th>
                    <th className="w-[18%] pr-6 pl-4 py-3.5 text-right">HORA ESCANEO</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Scrollable Data Rows Container - Scrollbar starts below header at the first row */}
            <div className="max-h-[250px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 bg-white dark:bg-hub-surface">
                  {encargosList.map((item) => {
                    const isLatest = item.id === latestScannedId;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-all duration-500 text-xs ${isLatest
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/70 border-l-4 border-l-[#009D4E] font-bold'
                          : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <td className="w-[26%] pl-6 pr-4 py-3.5 font-bold text-[#414745] dark:text-hub-text1 text-xs font-mono">
                          {item.codigoEncargo}
                        </td>
                        <td className="w-[24%] px-4 py-3.5">
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-sans font-semibold inline-flex items-center justify-center border ${item.pasilloAsignado === 'AZUL'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                              : item.pasilloAsignado === 'ROJO'
                                ? 'bg-[#FFF0F2] text-[#E11D48] border-[#FECDD3] dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              }`}
                          >
                            {item.pasilloAsignado === 'AZUL'
                              ? 'Pasillo Azul'
                              : item.pasilloAsignado === 'ROJO'
                                ? 'Pasillo Rojo'
                                : 'Pasillo Verde'}
                          </span>
                        </td>
                        <td className="w-[32%] px-4 py-3.5 text-gray-600 dark:text-hub-text2 font-sans text-xs truncate">
                          {item.rampaLigada}
                        </td>
                        <td className="w-[18%] pr-6 pl-4 py-3.5 text-gray-400 dark:text-hub-text3 font-mono text-xs text-right">
                          {item.horaEscaneo}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup de Cambio de Ubicación QR */}
      <LocationQrModal
        isOpen={isLocationModalOpen}
        onSelectLocation={(ubicacion) => {
          setActiveLocation(ubicacion);
          setIsLocationModalOpen(false);
          triggerToast(`Ubicación cambiada a ${ubicacion.nombreEstacion}`, 'success');
          playSuccessSound();
        }}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
