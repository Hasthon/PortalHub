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
    rampaLigada: 'Rampa 01 - Salida Norte (Santiago / V Región)',
    horaEscaneo: '12:29 p. m.',
  },
  {
    id: 'ENC-4092326',
    codigoEncargo: 'OF-4092326',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
    horaEscaneo: '12:29 p. m.',
  },
  {
    id: 'ENC-6288804',
    codigoEncargo: 'OF-6288804',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-9075807',
    codigoEncargo: 'OF-9075807',
    pasilloAsignado: 'AZUL',
    rampaLigada: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-3305338',
    codigoEncargo: 'OF-3305338',
    pasilloAsignado: 'VERDE',
    rampaLigada: 'Rampa 12 - Concepción (Biobío / Temuco)',
    horaEscaneo: '12:28 p. m.',
  },
  {
    id: 'ENC-5008021',
    codigoEncargo: 'OF-5008021',
    pasilloAsignado: 'VERDE',
    rampaLigada: 'Rampa 12 - Concepción (Biobío / Temuco)',
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

  // PDA Tab selection state
  const [activePdaTab, setActivePdaTab] = useState<PasilloType | 'TODOS'>('AZUL');

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
      `Encargo clasificado en ${assignedPasillo === 'AZUL' ? 'Pasillo Azul (Rampa 24)' : assignedPasillo === 'ROJO' ? 'Pasillo Rojo (Rampa 01)' : 'Pasillo Verde (Rampa 12)'}`,
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

  // Render individual package item inside pasillo card
  const renderPackageItem = (item: EncargoEncasillado) => {
    const isLatest = item.id === latestScannedId;
    return (
      <div
        key={item.id}
        className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 text-xs font-mono shadow-2xs ${
          isLatest
            ? 'bg-[#EEFBF4] dark:bg-emerald-950/80 border-[#A7F3D0] dark:border-emerald-700/80 ring-2 ring-emerald-500/40 border-l-4 border-l-[#009D4E] font-bold animate-fadeIn'
            : 'bg-white dark:bg-hub-elevated/90 border-gray-200/80 dark:border-hub-border hover:border-gray-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#414745] dark:text-hub-text1 text-xs truncate">
              {item.codigoEncargo}
            </span>
            {isLatest && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#009D4E] text-white font-sans font-bold animate-pulse">
                NUEVO
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-hub-text3 font-sans block mt-0.5">
            Escaneado: {item.horaEscaneo}
          </span>
        </div>
      </div>
    );
  };

  // Render Pasillo Card Component
  const renderPasilloCard = (
    pasillo: PasilloType,
    title: string,
    rampaInfo: string,
    theme: {
      bgCard: string;
      borderNormal: string;
      borderFlash: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      rampBg: string;
      rampText: string;
      rampBorder: string;
      iconColor: string;
      emptyBg: string;
      emptyBorder: string;
      emptyText: string;
    }
  ) => {
    const items = encargosList.filter((item) => item.pasilloAsignado === pasillo);
    const count = items.length;
    const isFlashing = activeFlashPasillo === pasillo;

    return (
      <div
        className={`rounded-3xl p-5 shadow-sm border transition-all duration-500 flex flex-col justify-between ${
          isFlashing ? theme.borderFlash : theme.borderNormal
        }`}
      >
        <div>
          {/* Card Header: Pasillo Badge + Count Badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-extrabold uppercase border font-sans ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              {title}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-hub-text1">
                {count} {count === 1 ? 'bulto' : 'bultos'}
              </span>
            </div>
          </div>

          {/* Ramp Info Banner */}
          <div
            className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-sans mb-4 ${theme.rampBg} ${theme.rampText} ${theme.rampBorder}`}
          >
            <Truck className={`w-4 h-4 shrink-0 stroke-[2.2] ${theme.iconColor}`} />
            <span className="font-semibold truncate leading-tight">{rampaInfo}</span>
          </div>

          {/* List Section Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100 dark:border-hub-border">
            <span className="text-xs font-bold text-gray-600 dark:text-hub-text2 flex items-center gap-1.5 font-sans">
              <Box className="w-3.5 h-3.5 text-gray-400" /> Encargos clasificados
            </span>
            <span className="text-[10px] font-mono text-gray-400 font-bold">
              {count} items
            </span>
          </div>

          {/* Package List Container */}
          {count === 0 ? (
            <div
              className={`py-12 text-center border-2 border-dashed rounded-2xl ${theme.emptyBg} ${theme.emptyBorder}`}
            >
              <Box className={`w-10 h-10 mx-auto mb-2 opacity-50 ${theme.iconColor}`} />
              <p className={`text-xs font-medium font-sans ${theme.emptyText}`}>
                Sin encargos en {title}
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {items.map(renderPackageItem)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- RENDER PDA MOBILE VIEW ---
  if (isPda) {
    const activeItems =
      activePdaTab === 'TODOS'
        ? encargosList
        : encargosList.filter((item) => item.pasilloAsignado === activePdaTab);

    return (
      <div className="flex flex-col h-full bg-[#FAFDFC] dark:bg-hub-base text-[#414745] dark:text-hub-text1 p-3 select-none relative font-sans">
        {/* Floating Toast Notification for PDA */}
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
            {/* Pasillo Tabs Filter for PDA */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setActivePdaTab('AZUL')}
                className={`border rounded-2xl p-2 text-center transition-all ${
                  activePdaTab === 'AZUL'
                    ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-blue-400/40 text-[#2563EB] dark:bg-sky-950 dark:border-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2'
                }`}
              >
                <span className="text-[9px] uppercase font-mono font-bold block">P. AZUL</span>
                <span className="text-lg font-mono font-black">{countsByPasillo.AZUL}</span>
              </button>

              <button
                onClick={() => setActivePdaTab('ROJO')}
                className={`border rounded-2xl p-2 text-center transition-all ${
                  activePdaTab === 'ROJO'
                    ? 'bg-[#FFF0F2] border-[#E11D48] ring-2 ring-rose-400/40 text-[#E11D48] dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2'
                }`}
              >
                <span className="text-[9px] uppercase font-mono font-bold block">P. ROJO</span>
                <span className="text-lg font-mono font-black">{countsByPasillo.ROJO}</span>
              </button>

              <button
                onClick={() => setActivePdaTab('VERDE')}
                className={`border rounded-2xl p-2 text-center transition-all ${
                  activePdaTab === 'VERDE'
                    ? 'bg-[#ECFDF5] border-[#059669] ring-2 ring-emerald-400/40 text-[#059669] dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 font-bold'
                    : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2'
                }`}
              >
                <span className="text-[9px] uppercase font-mono font-bold block">P. VERDE</span>
                <span className="text-lg font-mono font-black">{countsByPasillo.VERDE}</span>
              </button>
            </div>

            {/* Scan Bar & Switch for PDA */}
            <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-1.5 font-sans">
                  <Scan className="w-4 h-4 text-[#009D4E]" /> Escanear encargo
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[11px] text-gray-500 dark:text-hub-text2 font-semibold">Quitar encargo</span>
                  <input
                    type="checkbox"
                    checked={isRemoveMode}
                    onChange={(e) => setIsRemoveMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-600 relative"></div>
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
                className={`w-full h-10 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 font-sans text-white ${
                  isRemoveMode ? 'bg-[#E11D48] hover:bg-[#BE123C]' : 'bg-[#009D4E] hover:bg-[#008743]'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>Simular Escaneo PDA</span>
              </button>
            </div>

            {/* Selected Pasillo Ramp Info & Package List Container for PDA */}
            <div className="flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 shadow-xs flex flex-col">
              {/* Ramp Banner in PDA */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-hub-elevated border border-gray-100 dark:border-hub-border text-xs font-sans mb-2.5">
                <Truck className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                <span className="font-semibold text-gray-700 dark:text-hub-text2 truncate leading-tight">
                  {activePdaTab === 'AZUL'
                    ? 'Rampa 24 - Puerto Montt'
                    : activePdaTab === 'ROJO'
                    ? 'Rampa 01 - Salida Norte'
                    : 'Rampa 12 - Concepción'}
                </span>
              </div>

              {/* Header Fijo */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-hub-border shrink-0">
                <span className="text-xs font-bold text-[#414745] dark:text-hub-text1">
                  Pasillo {activePdaTab}
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-hub-text2">
                  {activeItems.length} bultos
                </span>
              </div>

              {/* Scrollable Data Rows */}
              <div className="flex-1 overflow-y-auto space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {activeItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No hay encargos en este pasillo.
                  </div>
                ) : (
                  activeItems.map(renderPackageItem)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- RENDER DESKTOP (PC) VIEW ---
  return (
    <div className="space-y-6 animate-fadeIn relative font-sans">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          key={toast.id}
          className={`fixed top-4 right-6 z-50 max-w-md w-full animate-toast-pop shadow-xl rounded-2xl p-4 flex items-center justify-between gap-3 border font-mono transition-all ${
            toast.type === 'success'
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
            className={`p-1 rounded-lg transition-colors shrink-0 ${
              toast.type === 'success'
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

      {/* Main Scan Control Bar */}
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border flex flex-col gap-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Scan className="w-5 h-5 text-[#009D4E] dark:text-emerald-400 stroke-[2.2]" />
            <h3 className="text-base font-bold text-[#414745] dark:text-hub-text1 font-sans">
              Escanea los encargos para clasificarlos automáticamente por pasillo
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
                      triggerToast('Quitar encargo activado.', 'warning');
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
              className={`px-4 py-2.5 text-white font-bold rounded-full text-xs transition-all shadow-xs flex items-center gap-2 font-sans ${
                isRemoveMode
                  ? 'bg-[#E11D48] hover:bg-[#BE123C]'
                  : 'bg-[#009D4E] hover:bg-[#008743]'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Simular Escaneo PDA</span>
            </button>
          </div>
        </div>

        {/* Helper informativo al activar Quitar encargo */}
        {isRemoveMode && (
          <div className="mt-2 p-3 bg-[#FFF0F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
            <p className="text-xs text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
              <strong className="font-bold">Quitar encargo activo:</strong> Al escanear los encargos, estos se eliminarán de la lista del pasillo.
            </p>
          </div>
        )}
      </div>

      {/* Grid of 3 Pasillo Classification Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pasillo Azul Classification Card */}
        {renderPasilloCard(
          'AZUL',
          'Pasillo Azul',
          'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
          {
            bgCard: 'bg-white dark:bg-hub-surface',
            borderNormal: 'border-sky-200/80 dark:border-sky-900/60 bg-white dark:bg-hub-surface',
            borderFlash: 'border-[#2563EB] ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20 bg-blue-50/30 dark:bg-sky-950/50',
            badgeBg: 'bg-sky-100 dark:bg-sky-950',
            badgeText: 'text-[#2563EB] dark:text-sky-300',
            badgeBorder: 'border-sky-200 dark:border-sky-800',
            rampBg: 'bg-sky-50/80 dark:bg-sky-950/40',
            rampText: 'text-sky-900 dark:text-sky-200',
            rampBorder: 'border-sky-100 dark:border-sky-900/60',
            iconColor: 'text-[#2563EB] dark:text-sky-400',
            emptyBg: 'bg-sky-50/30 dark:bg-sky-950/20',
            emptyBorder: 'border-sky-100 dark:border-sky-900/40',
            emptyText: 'text-sky-600 dark:text-sky-400',
          }
        )}

        {/* Pasillo Rojo Classification Card */}
        {renderPasilloCard(
          'ROJO',
          'Pasillo Rojo',
          'Rampa 01 - Salida Norte (Santiago / V Región)',
          {
            bgCard: 'bg-white dark:bg-hub-surface',
            borderNormal: 'border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-hub-surface',
            borderFlash: 'border-[#E11D48] ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/20 bg-rose-50/30 dark:bg-rose-950/50',
            badgeBg: 'bg-rose-100 dark:bg-rose-950',
            badgeText: 'text-[#E11D48] dark:text-rose-300',
            badgeBorder: 'border-rose-200 dark:border-rose-800',
            rampBg: 'bg-rose-50/80 dark:bg-rose-950/40',
            rampText: 'text-rose-900 dark:text-rose-200',
            rampBorder: 'border-rose-100 dark:border-rose-900/60',
            iconColor: 'text-[#E11D48] dark:text-rose-400',
            emptyBg: 'bg-rose-50/30 dark:bg-rose-950/20',
            emptyBorder: 'border-rose-100 dark:border-rose-900/40',
            emptyText: 'text-rose-600 dark:text-rose-400',
          }
        )}

        {/* Pasillo Verde Classification Card */}
        {renderPasilloCard(
          'VERDE',
          'Pasillo Verde',
          'Rampa 12 - Concepción (Biobío / Temuco)',
          {
            bgCard: 'bg-white dark:bg-hub-surface',
            borderNormal: 'border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-hub-surface',
            borderFlash: 'border-[#059669] ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/50',
            badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
            badgeText: 'text-[#059669] dark:text-emerald-300',
            badgeBorder: 'border-emerald-200 dark:border-emerald-800',
            rampBg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
            rampText: 'text-emerald-900 dark:text-emerald-200',
            rampBorder: 'border-emerald-100 dark:border-emerald-900/60',
            iconColor: 'text-[#059669] dark:text-emerald-400',
            emptyBg: 'bg-emerald-50/30 dark:bg-emerald-950/20',
            emptyBorder: 'border-emerald-100 dark:border-emerald-900/40',
            emptyText: 'text-emerald-600 dark:text-emerald-400',
          }
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
