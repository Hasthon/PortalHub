import React, { useState, useRef, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { TipoCargaNominada, EncargoNominado } from '../types';
import { LocationQrModal } from './LocationQrModal';
import {
  Scan,
  Box,
  Layers,
  Package,
  Truck,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Send,
  AlertTriangle,
  QrCode,
  MapPin,
  Plus,
  Minus,
  UserCheck,
  UserX,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'warning' | 'error';
  codeScanned?: string;
}

export interface RampaInfo {
  id: string;
  numero: string;
  destino: string;
  region: string;
  nominacionesPendientes: number;
}

const PRESET_RAMPAS: RampaInfo[] = [
  { id: 'R-24', numero: '24', destino: 'Puerto Montt', region: 'Chiloé / Los Lagos', nominacionesPendientes: 3 },
  { id: 'R-01', numero: '01', destino: 'Salida Norte', region: 'Santiago / V Región', nominacionesPendientes: 0 },
  { id: 'R-12', numero: '12', destino: 'Concepción', region: 'Biobío / Temuco', nominacionesPendientes: 1 },
];

const INITIAL_NOMINADOS: EncargoNominado[] = [
  { id: 'NOM-101', codigoEncargo: 'JAULA-382910482', tipoCarga: 'CONTENEDORA', horaEscaneo: '16:45:10', codigoBarras26: '78901234567890123456382910', codigoOF9: 'OF-382910482' },
  { id: 'NOM-102948291', codigoEncargo: 'SACA-9918', tipoCarga: 'UTC', horaEscaneo: '16:48:22', cantidadContenedores: 3, cantidadEncargos: 12, codigoBarras26: '98765432109876543210991800', codigoOF9: 'OF-991800123' },
  { id: 'NOM-105829104', codigoEncargo: 'SACA-9919', tipoCarga: 'UTC', horaEscaneo: '16:49:05', cantidadContenedores: 1, cantidadEncargos: 7, codigoBarras26: '45678901234567890123991900', codigoOF9: 'OF-991900456' },
  { id: 'NOM-106481029', codigoEncargo: 'SACA-9920', tipoCarga: 'UTC', horaEscaneo: '16:50:30', cantidadContenedores: 4, cantidadEncargos: 20, codigoBarras26: '12345678901234567890992000', codigoOF9: 'OF-992000789' },
  { id: 'NOM-107482910', codigoEncargo: 'SACA-9921', tipoCarga: 'UTC', horaEscaneo: '16:51:15', cantidadContenedores: 2, cantidadEncargos: 9, codigoBarras26: '65432109876543210987992100', codigoOF9: 'OF-992100321' },
  { id: 'NOM-103', codigoEncargo: 'OF-882103', tipoCarga: 'SUELTO', horaEscaneo: '16:50:01', codigoBarras26: '78901234567890123456882103', codigoOF9: 'OF-882103942' },
  { id: 'NOM-104', codigoEncargo: 'OF-104921', tipoCarga: 'SUELTO', horaEscaneo: '16:52:14', codigoBarras26: '78901234567890123456104921', codigoOF9: 'OF-104921857' },
];

interface NominacionDespachoModuleProps {
  onRegisterBackHandler?: (handler: (() => void) | null) => void;
  onBackHome?: () => void;
}

export const NominacionDespachoModule: React.FC<NominacionDespachoModuleProps> = ({
  onBackHome,
  onRegisterBackHandler,
}) => {
  const { isPda } = useDevice();
  const { playSuccessSound, playErrorSound, playWarningSound } = useAudioFeedback();

  // Scan & Nominación State
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [encargosNominados, setEncargosNominados] = useState<EncargoNominado[]>(INITIAL_NOMINADOS);
  const [activePdaTab, setActivePdaTab] = useState<TipoCargaNominada>('SUELTO');

  // Navigation step state: 'RAMPA_SELECTION', 'NOMINACION_PROCESS', or 'DESPACHO_FLOW'
  const [step, setStep] = useState<'RAMPA_SELECTION' | 'NOMINACION_PROCESS' | 'DESPACHO_FLOW'>('RAMPA_SELECTION');

  // Step y Estados del Flujo de Despacho
  const [stepDespacho, setStepDespacho] = useState<1 | 2 | 3>(1);
  const [isQuitarUtcToggleOn, setIsQuitarUtcToggleOn] = useState(false);
  const [despachoUtcsList, setDespachoUtcsList] = useState<EncargoNominado[]>(INITIAL_NOMINADOS.filter(i => i.tipoCarga === 'UTC'));
  const [transportistaAsignado, setTransportistaAsignado] = useState<{
    nombre: string;
    rut: string;
    tipoVehiculo: string;
    idVehiculo: string;
  } | null>(null);

  const [patenteInput, setPatenteInput] = useState('');

  const handleSimularQrTransportista = () => {
    setTransportistaAsignado({
      nombre: 'Carlos Mendoza Silva',
      rut: '14.892.304-K',
      tipoVehiculo: 'Camión Rampla 28t',
      idVehiculo: 'HJ-9021',
    });
    triggerToast('¡QR Transportista escaneado exitosamente! Datos integrados.', 'success');
    playSuccessSound();
  };

  const handleAsignarPorPatente = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPatente = patenteInput.trim().toUpperCase();
    if (!cleanPatente) {
      triggerToast('⚠️ Ingresa una patente válida para continuar', 'warning');
      playWarningSound();
      return;
    }
    setTransportistaAsignado({
      nombre: 'Conductor Asignado (Ingreso Manual)',
      rut: '14.892.304-K',
      tipoVehiculo: 'Camión Rampla 28t',
      idVehiculo: cleanPatente,
    });
    triggerToast(`¡Patente [${cleanPatente}] asignada correctamente!`, 'success');
    playSuccessSound();
  };

  const [removingUtcId, setRemovingUtcId] = useState<string | null>(null);

  const handleRemoveUtcFromDespacho = (utcId: string) => {
    const item = despachoUtcsList.find((i) => i.id === utcId);
    if (!item) return;

    setRemovingUtcId(utcId);
    playWarningSound();
    triggerToast(`Eliminando UTC [${item.codigoEncargo}]...`, 'warning', item.codigoEncargo);

    const el = document.getElementById(`utc-card-${utcId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setTimeout(() => {
      setDespachoUtcsList((prev) => prev.filter((i) => i.id !== utcId));
      setRemovingUtcId(null);
    }, 650);
  };

  const handleSimulateScanUtcRemoval = () => {
    if (despachoUtcsList.length > 0) {
      const itemToRemove = despachoUtcsList[despachoUtcsList.length - 1];
      handleRemoveUtcFromDespacho(itemToRemove.id);
    } else {
      triggerToast('No hay más UTCs en la nómina para eliminar', 'warning');
      playErrorSound();
    }
  };

  // Location Scan State (Obligatorio como primera acción)
  const [isLocationScanned, setIsLocationScanned] = useState(false);
  const [activeRampa, setActiveRampa] = useState<RampaInfo>(PRESET_RAMPAS[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDespachoModalOpen, setIsDespachoModalOpen] = useState(false);
  const [isDespachoSuccessModalOpen, setIsDespachoSuccessModalOpen] = useState(false);
  const [isExitConfirmationModalOpen, setIsExitConfirmationModalOpen] = useState(false);

  // Dynamic back navigation handler for header back arrow button
  useEffect(() => {
    const handleBack = () => {
      if ((step === 'NOMINACION_PROCESS' || step === 'DESPACHO_FLOW') && encargosNominados.length > 0) {
        setIsExitConfirmationModalOpen(true);
      } else if (step === 'DESPACHO_FLOW') {
        if (stepDespacho > 1) {
          setStepDespacho((prev) => (prev - 1) as 1 | 2 | 3);
        } else {
          setStep('NOMINACION_PROCESS');
        }
      } else if (step === 'NOMINACION_PROCESS') {
        setStep('RAMPA_SELECTION');
      } else if (isLocationScanned) {
        setIsLocationScanned(false);
      } else if (onBackHome) {
        onBackHome();
      }
    };

    if (onRegisterBackHandler) {
      onRegisterBackHandler(handleBack);
    }
    return () => {
      if (onRegisterBackHandler) {
        onRegisterBackHandler(null);
      }
    };
  }, [step, isLocationScanned, encargosNominados, onBackHome, onRegisterBackHandler]);

  const handlePerformScanLocation = () => {
    setIsLocationScanned(true);
    triggerToast(`Ubicación escaneada con éxito: Rampa ${activeRampa.numero} - ${activeRampa.destino}`, 'success');
    playSuccessSound();
  };



  // State for visual scan reaction (stroke, count animation, highlight)
  const [recentlyScannedType, setRecentlyScannedType] = useState<TipoCargaNominada | null>(null);
  const [recentlyScannedCode, setRecentlyScannedCode] = useState<string | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for visual REMOVAL reaction (red stroke flash)
  const [recentlyRemovedType, setRecentlyRemovedType] = useState<TipoCargaNominada | null>(null);
  const removeFlashTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for Insumos Modal & Success Screen on Continuar
  const [isInsumosModalOpen, setIsInsumosModalOpen] = useState(false);
  const [insumosModalStep, setInsumosModalStep] = useState<'INSUMOS_FORM' | 'SUCCESS_SCREEN'>('INSUMOS_FORM');
  const [insumosCounts, setInsumosCounts] = useState({
    pallets: 0,
    bins: 0,
    jaula: 0,
    valija: 0,
  });

  const handleUpdateInsumo = (key: keyof typeof insumosCounts, delta: number) => {
    setInsumosCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const handleOpenContinuarModal = () => {
    setInsumosModalStep('INSUMOS_FORM');
    setInsumosCounts({ pallets: 0, bins: 0, jaula: 0, valija: 0 });
    setIsInsumosModalOpen(true);
  };

  const renderModals = () => (
    <>
      {/* Modal Popup de Cambio de Rampa */}
      <LocationQrModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={(loc) => {
          const matched = PRESET_RAMPAS.find((r) => loc.nombreEstacion.includes(r.numero) || loc.rampaAsociada.includes(r.numero)) || {
            id: loc.id,
            numero: '24',
            destino: loc.zonaDestino,
            region: 'Zona Centro-Sur',
            nominacionesPendientes: 1,
          };
          setActiveRampa(matched);
          setIsLocationScanned(true);
          setIsLocationModalOpen(false);
          triggerToast(`Ubicación escaneada / cambiada a ${loc.nombreEstacion}`, 'success');
          playSuccessSound();
        }}
      />

      {/* Modal Popup Alerta de Despacho */}
      {isDespachoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              <h3 className="text-lg font-bold text-[#414745] dark:text-hub-text1 font-sans">
                Alerta de Despacho de Rampa
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-hub-text2 font-sans leading-relaxed">
              Existen <strong className="text-amber-600 dark:text-amber-400 font-bold">{activeRampa.nominacionesPendientes} nóminas pendientes por despachar</strong> en Rampa {activeRampa.numero} ({activeRampa.destino}).
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-mono">
              ¿Quieres autorizar el cierre de manifiesto y despachar la carga ahora?
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDespachoModalOpen(false);
                  const currentUtcs = encargosNominados.filter((i) => i.tipoCarga === 'UTC');
                  setDespachoUtcsList(currentUtcs.length >= 4 ? currentUtcs : INITIAL_NOMINADOS.filter((i) => i.tipoCarga === 'UTC'));
                  setStepDespacho(1);
                  setStep('DESPACHO_FLOW');
                }}
                className={`${
                  isPda
                    ? 'w-full h-12 rounded-full text-sm'
                    : 'w-full py-3 rounded-xl text-xs'
                } bg-amber-600 dark:bg-[#03F77C] hover:bg-amber-700 hover:dark:bg-[#02D66B] active:bg-amber-800 dark:active:bg-[#02B55A] text-white dark:text-[#303030] font-black shadow-md flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer`}
              >
                Confirmar Despacho
              </button>
              <button
                type="button"
                onClick={() => setIsDespachoModalOpen(false)}
                className={`${
                  isPda
                    ? 'w-full h-12 rounded-full text-sm'
                    : 'w-full py-3 rounded-xl text-xs'
                } border-2 border-gray-300 dark:border-[#03F77C] text-gray-700 dark:text-[#03F77C] hover:bg-gray-100 dark:hover:bg-[#03F77C]/10 font-black flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Insumos / Confirmación de Nómina Creada con Éxito */}
      {isInsumosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">

            {/* Botón X de Cierre Arriba a la Derecha */}
            <button
              type="button"
              onClick={() => setIsInsumosModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 dark:text-hub-text2 hover:text-[#009D4E] dark:hover:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 border border-transparent dark:hover:border-[#03F77C]/30 transition-all cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {insumosModalStep === 'INSUMOS_FORM' ? (
              /* ── PASO 1: FORMULARIO DE INSUMOS ── */
              <div className="space-y-5">
                <div className="pr-6">
                  <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 leading-tight">
                    Ingresa la cantidad de suministros necesarios para esta nominación
                  </h3>
                </div>

                {/* 4 Filas de Insumos: Pallets, Bins, Jaula, Valija */}
                <div className="space-y-3 pt-1">
                  {[
                    { key: 'pallets' as const, label: 'Pallets' },
                    { key: 'bins' as const, label: 'Bins' },
                    { key: 'jaula' as const, label: 'Jaula' },
                    { key: 'valija' as const, label: 'Valija' },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-hub-elevated border border-gray-100 dark:border-slate-700/80 rounded-2xl"
                    >
                      <span className="text-sm font-bold text-[#414745] dark:text-hub-text1">
                        {label}
                      </span>

                      {/* Contadores Menos / Más */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleUpdateInsumo(key, -1)}
                          disabled={insumosCounts[key] <= 0}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-hub-surface border border-gray-300 dark:border-[#03F77C]/40 flex items-center justify-center text-gray-700 dark:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/15 hover:border-[#009D4E]/30 dark:hover:border-[#03F77C]/60 active:bg-emerald-100 dark:active:bg-[#03F77C]/30 disabled:opacity-30 disabled:pointer-events-none shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Minus className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        <span className="w-7 text-center font-mono font-extrabold text-sm text-[#414745] dark:text-hub-text1">
                          {insumosCounts[key]}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpdateInsumo(key, 1)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-hub-surface border border-gray-300 dark:border-[#03F77C]/40 flex items-center justify-center text-gray-700 dark:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/15 hover:border-[#009D4E]/30 dark:hover:border-[#03F77C]/60 active:bg-emerald-100 dark:active:bg-[#03F77C]/30 shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botones inferiores: Confirmar Insumos & Cancelar en una sola fila (Secundario Izquierda | Primario Derecha) */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsInsumosModalOpen(false)}
                    className="w-full sm:w-1/2 h-11 border-2 border-[#303030] dark:border-[#03F77C] text-[#303030] dark:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 font-extrabold rounded-2xl text-xs flex items-center justify-center transition-all cursor-pointer order-2 sm:order-1"
                  >
                    <span>Cancelar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInsumosModalStep('SUCCESS_SCREEN');
                      playSuccessSound();
                    }}
                    className="w-full sm:w-1/2 h-11 bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black text-white dark:text-[#303030] font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer order-1 sm:order-2"
                  >
                    <span>Confirmar Insumos</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── PASO 2: PANTALLA DE ÉXITO ── */
              <div className="flex flex-col items-center text-center space-y-4 pt-2 pb-1">
                {/* Ícono Éxito */}
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#414745] dark:text-hub-text1 tracking-tight">
                    Nómina creada con éxito
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-1">
                    ¿Qué deseas hacer ahora?
                  </p>
                </div>

                {/* Botones de Acción en Fila (Secundario Izquierda | Primario Derecha) */}
                <div className="w-full space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Botón Secundario (Izquierda): Crear otra nómina */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsInsumosModalOpen(false);
                        setEncargosNominados([]);
                        triggerToast('Nueva nómina iniciada', 'success');
                      }}
                      className="w-full sm:w-1/2 h-11 border-2 border-[#303030] dark:border-[#03F77C] text-[#303030] dark:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 font-extrabold rounded-2xl text-xs shadow-xs flex items-center justify-center transition-all cursor-pointer order-2 sm:order-1"
                    >
                      <span>Crear otra nómina</span>
                    </button>

                    {/* Botón Primario (Derecha): Despachar */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsInsumosModalOpen(false);
                        const currentUtcs = encargosNominados.filter((i) => i.tipoCarga === 'UTC');
                        setDespachoUtcsList(currentUtcs.length >= 4 ? currentUtcs : INITIAL_NOMINADOS.filter((i) => i.tipoCarga === 'UTC'));
                        setStepDespacho(1);
                        setStep('DESPACHO_FLOW');
                      }}
                      className="w-full sm:w-1/2 h-11 bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black text-white dark:text-[#303030] font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center transition-all cursor-pointer order-1 sm:order-2"
                    >
                      <span>Despachar</span>
                    </button>
                  </div>

                  {/* Volver al inicio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsInsumosModalOpen(false);
                      if (onBackHome) onBackHome();
                    }}
                    className="w-full pt-1 pb-1 text-[#414745] hover:text-[#303030] dark:text-hub-text2 dark:hover:text-slate-200 font-bold underline underline-offset-4 text-xs flex items-center justify-center transition-all cursor-pointer bg-transparent border-0"
                  >
                    <span>Volver al inicio</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Despacho Creado con Éxito */}
      {isDespachoSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            
            {/* Botón X de Cierre Arriba a la Derecha */}
            <button
              type="button"
              onClick={() => setIsDespachoSuccessModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 dark:text-hub-text2 hover:text-[#009D4E] dark:hover:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 border border-transparent dark:hover:border-[#03F77C]/30 transition-all cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 pt-2 pb-1">
              {/* Ícono Éxito */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#414745] dark:text-hub-text1 tracking-tight">
                  Despacho creado con éxito
                </h3>
                <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-1">
                  ¿Qué deseas hacer ahora?
                </p>
              </div>

              {/* Botones de Acción en Fila (Secundario Izquierda | Primario Derecha) */}
              <div className="w-full pt-2">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Botón Secundario (Izquierda): Salir */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDespachoSuccessModalOpen(false);
                      setEncargosNominados([]);
                      setDespachoUtcsList([]);
                      setStep('RAMPA_SELECTION');
                    }}
                    className="w-full sm:w-1/2 h-11 border-2 border-[#303030] dark:border-[#03F77C] text-[#303030] dark:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 font-extrabold rounded-2xl text-xs shadow-xs flex items-center justify-center transition-all cursor-pointer order-2 sm:order-1"
                  >
                    <span>Salir</span>
                  </button>

                  {/* Botón Primario (Derecha): Crear otra nómina */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDespachoSuccessModalOpen(false);
                      setEncargosNominados([]);
                      setDespachoUtcsList([]);
                      setStep('NOMINACION_PROCESS');
                    }}
                    className="w-full sm:w-1/2 h-11 bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black dark:active:bg-[#02B55A] text-white dark:text-[#303030] font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center transition-all cursor-pointer order-1 sm:order-2"
                  >
                    <span>Crear otra nómina</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Confirmación de Salida */}
      {isExitConfirmationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            
            {/* Botón X de Cierre Arriba a la Derecha */}
            <button
              type="button"
              onClick={() => setIsExitConfirmationModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 dark:text-hub-text2 hover:text-[#009D4E] dark:hover:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 border border-transparent dark:hover:border-[#03F77C]/30 transition-all cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 pt-2 pb-1">
              {/* Ícono Advertencia */}
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertCircle className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#414745] dark:text-hub-text1 tracking-tight">
                  ¿Seguro que deseas salir?
                </h3>
                <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-1">
                  Aún no has finalizado el despacho. Si sales ahora, perderás todo el progreso acumulado en esta nómina.
                </p>
              </div>

              {/* Botones de Acción en Fila (Secundario Izquierda | Primario Derecha) */}
              <div className="w-full pt-2">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Botón Secundario (Izquierda): Salir ahora */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsExitConfirmationModalOpen(false);
                      setEncargosNominados([]);
                      setDespachoUtcsList([]);
                      setStep('RAMPA_SELECTION');
                    }}
                    className="w-full sm:w-1/2 h-11 border-2 border-[#303030] dark:border-rose-500 text-[#303030] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-extrabold rounded-2xl text-xs shadow-xs flex items-center justify-center transition-all cursor-pointer order-2 sm:order-1"
                  >
                    <span>Salir ahora</span>
                  </button>

                  {/* Botón Primario (Derecha): Mantenerme aquí */}
                  <button
                    type="button"
                    onClick={() => setIsExitConfirmationModalOpen(false)}
                    className="w-full sm:w-1/2 h-11 bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black text-white dark:text-[#303030] font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center transition-all cursor-pointer order-1 sm:order-2"
                  >
                    <span>Mantenerme aquí</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );

  // Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isToastLeaving, setIsToastLeaving] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismissToast = () => {
    setIsToastLeaving(true);
    setTimeout(() => {
      setToast(null);
      setIsToastLeaving(false);
    }, 280);
  };

  const triggerToast = (text: string, type: 'success' | 'warning' | 'error', codeScanned?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setIsToastLeaving(false);
    setToast({ id: Date.now(), text, type, codeScanned });

    toastTimerRef.current = setTimeout(() => {
      handleDismissToast();
    }, 4000);
  };

  // Process scan handler
  const handleProcessScan = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (isRemoveMode) {
      const existing = encargosNominados.find((item) => item.codigoEncargo === uppercaseCode);
      if (existing) {
        setEncargosNominados((prev) => prev.filter((item) => item.codigoEncargo !== uppercaseCode));

        // Flash visual removal reaction (red stroke)
        setRecentlyRemovedType(existing.tipoCarga);
        setActivePdaTab(existing.tipoCarga); // Auto switch tab in PDA view
        if (removeFlashTimerRef.current) clearTimeout(removeFlashTimerRef.current);
        removeFlashTimerRef.current = setTimeout(() => {
          setRecentlyRemovedType(null);
        }, 2200);

        triggerToast(`Encargo [${uppercaseCode}] removido.`, 'warning', uppercaseCode);
        playWarningSound();
      } else {
        triggerToast(`El código [${uppercaseCode}] no se encuentra en la nómina`, 'error', uppercaseCode);
        playErrorSound();
      }
      return;
    }

    // Intentar escanear una UTC/Nómina manualmente no está permitido (se cargan automáticamente)
    if (uppercaseCode.startsWith('UTC') || uppercaseCode.startsWith('NOM')) {
      triggerToast(`ℹ️ Las nóminas pendientes se cargan automáticamente desde el sistema.`, 'warning', uppercaseCode);
      playWarningSound();
      return;
    }

    // Add encargo mode
    const isDuplicate = encargosNominados.some((item) => item.codigoEncargo === uppercaseCode);
    if (isDuplicate) {
      triggerToast(`⚠️ Encargo [${uppercaseCode}] ya está en la nómina`, 'warning', uppercaseCode);
      playWarningSound();
      return;
    }

    // Escaneos manuales asignan únicamente a CONTENEDORA o SUELTO
    let tipoCarga: TipoCargaNominada = 'SUELTO';
    if (uppercaseCode.startsWith('JAULA') || uppercaseCode.startsWith('CONT') || uppercaseCode.startsWith('SACA')) {
      tipoCarga = 'CONTENEDORA';
    }

    const numDigitsOnly = uppercaseCode.replace(/[^0-9]/g, '');
    const codigoBarras26 = (numDigitsOnly + '78901234567890123456882103').slice(0, 26);
    const codigoOF9 = `OF-${(numDigitsOnly + '882103942').slice(0, 9)}`;

    const newItem: EncargoNominado = {
      id: `NOM-${Date.now().toString().slice(-6)}`,
      codigoEncargo: uppercaseCode,
      tipoCarga,
      horaEscaneo: timestamp,
      codigoBarras26,
      codigoOF9,
    };

    setEncargosNominados((prev) => [newItem, ...prev]);

    // Flash visual reaction state
    setRecentlyScannedType(tipoCarga);
    setRecentlyScannedCode(uppercaseCode);
    setActivePdaTab(tipoCarga); // Auto switch tab in PDA view

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setRecentlyScannedType(null);
      setRecentlyScannedCode(null);
    }, 2200);

    triggerToast(`Encargo [${uppercaseCode}] agregado a ${tipoCarga === 'CONTENEDORA' ? 'Contenedoras' : 'Encargos'}`, 'success', uppercaseCode);
    playSuccessSound();
  };

  // Register scanner hook
  const { triggerScan } = useBarcodeScanner({
    onScan: (code) => {
      if (step === 'RAMPA_SELECTION') {
        if (!isLocationScanned) {
          const uppercase = code.toUpperCase();
          const matched = PRESET_RAMPAS.find((r) => uppercase.includes(r.numero) || uppercase.includes(r.id)) || PRESET_RAMPAS[0];
          setActiveRampa(matched);
          setIsLocationScanned(true);
          triggerToast(`Ubicación escaneada con éxito: Rampa ${matched.numero} - ${matched.destino}`, 'success');
          playSuccessSound();
        }
      } else if (step === 'NOMINACION_PROCESS') {
        handleProcessScan(code);
      }
    },
    enableGlobal: true,
  });

  const contenedorasList = encargosNominados.filter((item) => item.tipoCarga === 'CONTENEDORA');
  const utcsList = encargosNominados.filter((item) => item.tipoCarga === 'UTC');
  const sueltosList = encargosNominados.filter((item) => item.tipoCarga === 'SUELTO');

  // ── RENDER PANTALLA FLUJO DE DESPACHO (ESTILO REFERENCIA ESTRUCTURA IMAGEN) ──
  const renderDespachoFlowContent = () => (
    <div className="flex-1 flex flex-col space-y-4 overflow-hidden animate-fadeIn h-full">
      {/* Header del Flujo de Despacho (Barra Superior) */}
      <div className="flex items-center justify-between px-1 shrink-0">
        {!isPda ? (
          <button
            type="button"
            onClick={() => {
              if (stepDespacho > 1) {
                setStepDespacho((prev) => (prev - 1) as 1 | 2 | 3);
              } else {
                if (encargosNominados.length > 0) {
                  setIsExitConfirmationModalOpen(true);
                } else {
                  setStep('RAMPA_SELECTION');
                }
              }
            }}
            className="text-xs font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 flex items-center gap-1.5 transition-colors font-sans cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{stepDespacho === 1 ? 'Volver a Selección' : 'Paso Anterior'}</span>
          </button>
        ) : (
          <div />
        )}

        <span className="text-[10px] sm:text-xs font-mono font-bold text-[#009D4E] bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full shadow-2xs">
          Rampa {activeRampa.numero} - {activeRampa.destino}
        </span>
      </div>

      {/* Stepper de Círculos FUERA DE LA CARD COMPONENTE */}
      <div className="flex flex-col items-center w-full pt-1 shrink-0">
        <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm px-2 relative">
          {[
            { num: 1, label: 'Resumen' },
            { num: 2, label: 'QR' },
            { num: 3, label: 'Confirmación' },
          ].map((s, idx) => {
            const isActive = stepDespacho === s.num;
            const isPassed = stepDespacho > s.num;

            return (
              <React.Fragment key={s.num}>
                {/* Línea conectora entre círculos */}
                {idx > 0 && (
                  <div
                    className={`flex-1 h-[2px] mx-2 transition-colors duration-300 ${
                      stepDespacho >= s.num
                        ? 'bg-[#303030] dark:bg-emerald-500'
                        : 'bg-gray-300 dark:bg-slate-700'
                    }`}
                  />
                )}

                {/* Círculo del Step */}
                <div className="flex flex-col items-center relative group">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPassed || isActive) setStepDespacho(s.num as 1 | 2 | 3);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-bold text-xs ${
                      isActive
                        ? 'bg-[#303030] text-white ring-4 ring-[#303030]/20 dark:ring-emerald-500/30 dark:bg-emerald-500'
                        : isPassed
                        ? 'bg-[#009D4E] text-white border-2 border-[#009D4E]'
                        : 'bg-white dark:bg-hub-elevated border-2 border-gray-300 dark:border-hub-border text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    {isActive ? (
                      /* Anillo doble / punto interior como en la imagen */
                      <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#303030] dark:bg-emerald-600" />
                      </div>
                    ) : isPassed ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{`0${s.num}`}</span>
                    )}
                  </button>

                  <span
                    className={`text-xs font-bold mt-2 font-sans transition-colors ${
                      isActive
                        ? 'text-[#303030] dark:text-hub-text1 font-extrabold'
                        : isPassed
                        ? 'text-[#009D4E]'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Componente de Cabecera con Título, Subtítulo y Control (Quitar UTC) */}
      <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-4 sm:p-5 shadow-2xs shrink-0 w-full space-y-1.5 transition-all">
        {/* Fila Principal: Título (Despacho) + Control (Quitar UTC en la misma fila) */}
        <div className="flex items-center justify-between gap-3 w-full">
          <h2 className="text-lg sm:text-xl font-black text-[#303030] dark:text-hub-text1 font-sans tracking-tight">
            {stepDespacho === 1 && 'Despacho'}
            {stepDespacho === 2 && 'Asigna un transportista'}
            {stepDespacho === 3 && 'Confirmación de Despacho'}
          </h2>

          {/* Control Switch: Quitar UTC (En la misma fila del título) */}
          {stepDespacho === 1 && (
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-semibold text-gray-600 dark:text-hub-text2 font-sans">
                Quitar UTC
              </span>

              {/* Pill Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isQuitarUtcToggleOn;
                  setIsQuitarUtcToggleOn(nextState);
                  if (nextState) {
                    triggerToast('Modo Quitar UTC activado. Escanea una UTC para eliminarla de la nómina.', 'warning');
                    playWarningSound();
                  } else {
                    triggerToast('Modo Quitar UTC desactivado', 'warning');
                  }
                }}
                className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${
                  isQuitarUtcToggleOn ? 'bg-rose-600' : 'bg-gray-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    isQuitarUtcToggleOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Subtítulo debajo de la fila principal */}
        <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium leading-normal text-left">
          {stepDespacho === 1 && 'Revisa las UTC cargadas para este despacho.'}
          {stepDespacho === 2 && 'Escanea el código QR del transportista para incorporar sus datos.'}
          {stepDespacho === 3 && 'Revisión final de cantidades, insumos y transportista.'}
        </p>

        {/* Helper Rosado/Rojo Quitar UTC DENTRO DE LA CARD */}
        {stepDespacho === 1 && isQuitarUtcToggleOn && (
          <div className="p-3 mt-2 bg-[#FFF0F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fadeIn w-full">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
              <p className="text-xs text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
                <strong className="font-bold">Quitar UTC activo:</strong> Al escanear las UTC, estas se eliminarán de la nómina de despacho.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSimulateScanUtcRemoval}
              className="px-3 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] active:scale-[0.97] text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all self-end sm:self-auto"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Simular Escaneo</span>
            </button>
          </div>
        )}
      </div>

      {/* Tarjeta Principal Centrada (Optimizada para PDA y Escritorio) */}
      <div className="flex-1 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-3xl p-4 sm:p-6 shadow-sm overflow-y-auto no-scrollbar space-y-4 w-full">
        
        {/* ── STEP 1: RESUMEN DE UTCS ── */}
        {stepDespacho === 1 && (
          <div className="space-y-3">
            {/* Header del bloque de UTCs */}
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-[11px] font-bold text-gray-400 dark:text-hub-text2 uppercase tracking-wider">
                Contenido de la Nómina
              </span>
              <span className="text-xs font-extrabold text-gray-600 dark:text-hub-text2 font-sans">
                Nóminas Agregadas ({despachoUtcsList.length})
              </span>
            </div>

            {/* Contenedor de Tarjetas de UTC con Alto Ajustado para Mostrar 2.5 Tarjetas */}
            <div className="max-h-[290px] sm:max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {despachoUtcsList.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-hub-border rounded-3xl">
                  <p className="text-xs text-gray-400 font-medium">
                    No quedan nóminas en este despacho.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {despachoUtcsList.map((utc, index) => {
                    const isBeingRemoved = removingUtcId === utc.id;
                    return (
                      <div
                        key={utc.id}
                        id={`utc-card-${utc.id}`}
                        className={`border rounded-2xl p-3.5 shadow-2xs font-sans transition-all duration-300 flex flex-col justify-between ${
                          isBeingRemoved
                            ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-800 scale-[0.98] ring-2 ring-rose-400/80 animate-pulse'
                            : 'bg-white dark:bg-slate-800/90 border-gray-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-600'
                        }`}
                      >
                        {/* Cabecera Tarjeta (Fila 1): Título, ID Carga y Badge */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-slate-700/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                              isBeingRemoved ? 'bg-rose-600 animate-ping' : 'bg-purple-600'
                            }`} />
                            <h4 className="text-sm font-extrabold text-[#303030] dark:text-hub-text1 font-sans shrink-0">
                              Nómina {String(index + 1).padStart(2, '0')}
                            </h4>
                          </div>

                          {isBeingRemoved ? (
                            <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[11px] font-extrabold rounded-full flex items-center gap-1 shadow-2xs shrink-0 animate-bounce">
                              Eliminando... <Trash2 className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#009D4E] dark:text-emerald-300 text-[11px] font-extrabold rounded-full flex items-center gap-1 shadow-2xs shrink-0">
                              Asignada <Check className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          )}
                        </div>

                      {/* Cuerpo Tarjeta: Fila 2 (Cargas) y Fila 3 (Insumos) */}
                      <div className="pt-2.5 space-y-2 text-xs text-gray-700 dark:text-hub-text2 font-medium">
                        {/* Fila 2: Contenedoras y Encargos */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            20 Contenedoras
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            50 Encargos
                          </span>
                        </div>

                        {/* Fila 3: Todos los Insumos agrupados */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-hub-text2 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            {insumosCounts.bins || 5} Bins
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-hub-text2 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            {insumosCounts.jaula || 8} Jaulas
                          </span>
                          {insumosCounts.valija > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-hub-text2 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                              {insumosCounts.valija} Valijas
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-hub-text2 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            {insumosCounts.pallets || 3} Pallets
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: ASIGNACIÓN DE TRANSPORTISTA (QR O PATENTE) ── */}
        {stepDespacho === 2 && (
          <div className="space-y-4 py-2 font-sans">
            {!transportistaAsignado ? (
              <div className="p-6 sm:p-8 border-2 border-dashed border-gray-200 dark:border-hub-border rounded-3xl bg-gray-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center space-y-4">
                {/* Ícono representativo de sin transportista */}
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shadow-2xs">
                  <UserX className="w-7 h-7 stroke-[1.8]" />
                </div>

                <div className="space-y-1 text-center max-w-xs mx-auto">
                  <h4 className="text-base font-extrabold text-[#303030] dark:text-hub-text1">
                    Sin transportista asignado
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium leading-relaxed">
                    Escanea el código QR del conductor o digita manualmente la patente del vehículo.
                  </p>
                </div>

                {/* Opción 1: Botón Simular Escaneo QR */}
                <button
                  type="button"
                  onClick={handleSimularQrTransportista}
                  className="py-3 px-5 bg-[#EEFBF4] dark:bg-emerald-950/60 border border-[#A7F3D0] dark:border-emerald-800 text-[#009D4E] dark:text-emerald-300 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-100/80 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Simular Escaneo QR Transportista</span>
                </button>

                {/* Divisor Visual */}
                <div className="relative flex items-center justify-center w-full max-w-md my-1">
                  <div className="border-t border-gray-200 dark:border-hub-border w-full"></div>
                  <span className="bg-gray-100 dark:bg-slate-800 px-3 text-[10px] font-extrabold text-gray-400 dark:text-hub-text3 uppercase tracking-wider rounded-full shrink-0">
                    Digita patente
                  </span>
                  <div className="border-t border-gray-200 dark:border-hub-border w-full"></div>
                </div>

                {/* Formulario Integrado: Input Patente (Izquierda) + Botón Asignar (Derecha) en cápsula unificada */}
                <form onSubmit={handleAsignarPorPatente} className="flex flex-row items-center w-full max-w-md mx-auto rounded-xl border border-gray-300 dark:border-hub-border overflow-hidden bg-white dark:bg-hub-surface shadow-2xs focus-within:ring-2 focus-within:ring-[#009D4E]">
                  {/* Input en el lado izquierdo */}
                  <div className="relative flex-1 min-w-0 flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-hub-text3">
                      <Truck className="w-3.5 h-3.5 text-[#009D4E] dark:text-emerald-400 shrink-0" />
                    </div>
                    <input
                      type="text"
                      value={patenteInput}
                      onChange={(e) => setPatenteInput(e.target.value.toUpperCase())}
                      placeholder="Ej: ABCD-12"
                      maxLength={10}
                      className="w-full pl-8 pr-3 py-2 bg-transparent border-0 text-xs font-mono font-bold text-[#303030] dark:text-hub-text1 placeholder-gray-400 focus:outline-none uppercase"
                    />
                  </div>

                  {/* Botón Asignar en el lado derecho sin border-radius interno pegado al input */}
                  <button
                    type="submit"
                    className="px-3.5 py-2.5 bg-[#303030] dark:bg-[#03F77C] text-white dark:text-[#303030] hover:bg-[#1f1f1f] dark:hover:bg-[#03F77C]/90 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap border-l border-gray-200 dark:border-hub-border"
                  >
                    <span>Asignar</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn font-sans">
                {/* Bar de Cambio Rápido de Patente en la parte superior (Cápsula unificada) */}
                <div className="p-2.5 sm:p-3 bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl shadow-xs">
                  <div className="text-[10px] font-extrabold text-gray-400 dark:text-hub-text3 uppercase tracking-wider mb-1.5">
                    <span>Cambiar Patente</span>
                  </div>
                  <form onSubmit={handleAsignarPorPatente} className="flex flex-row items-center w-full rounded-xl border border-gray-300 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-[#009D4E]">
                    {/* Input en el lado izquierdo */}
                    <div className="relative flex-1 min-w-0 flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 dark:text-hub-text3">
                        <Truck className="w-3.5 h-3.5 text-[#009D4E] dark:text-emerald-400 shrink-0" />
                      </div>
                      <input
                        type="text"
                        value={patenteInput}
                        onChange={(e) => setPatenteInput(e.target.value.toUpperCase())}
                        placeholder={`Ej: ${transportistaAsignado.idVehiculo}`}
                        maxLength={10}
                        className="w-full pl-7 pr-2 py-1.5 bg-transparent border-0 text-xs font-mono font-bold text-[#303030] dark:text-hub-text1 placeholder-gray-400 focus:outline-none uppercase"
                      />
                    </div>

                    {/* Botón Cambiar en el lado derecho */}
                    <button
                      type="submit"
                      className="px-3 py-2 bg-[#303030] dark:bg-[#03F77C] text-white dark:text-[#303030] hover:bg-[#1f1f1f] dark:hover:bg-[#03F77C]/90 font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 whitespace-nowrap border-l border-gray-300 dark:border-slate-700"
                    >
                      <span>Cambiar</span>
                    </button>
                  </form>
                </div>

                {/* Tarjeta de Información del Transportista Asignado (En una sola fila limpia) */}
                <div className="p-3.5 bg-emerald-50/50 dark:bg-hub-elevated border-2 border-[#009D4E] rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs font-sans shadow-xs">
                  {/* Ícono y Título */}
                  <div className="flex items-center gap-2 shrink-0">
                    <UserCheck className="w-5 h-5 text-[#009D4E] dark:text-emerald-400 stroke-[2.2] shrink-0" />
                    <span className="font-extrabold text-[#009D4E] dark:text-emerald-400 uppercase tracking-wider text-xs whitespace-nowrap">
                      Transportista Asignado:
                    </span>
                  </div>

                  {/* Nombre */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <strong className="text-sm text-[#414745] dark:text-hub-text1 font-extrabold truncate">
                      {transportistaAsignado.nombre}
                    </strong>
                  </div>

                  {/* RUT */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-xs text-gray-600 dark:text-hub-text2">
                      RUT: {transportistaAsignado.rut}
                    </span>
                  </div>

                  {/* Patente Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-extrabold text-xs text-[#009D4E] dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                      {transportistaAsignado.idVehiculo}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: CONFIRMACIÓN DEL DESPACHO ── */}
        {stepDespacho === 3 && (
          <div className="space-y-3 font-sans">
            {/* COMPONENTE DE RESUMEN DE CARGA Y SUMINISTROS (SPLIT CARDS EQUILIBRADO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Bloque Carga */}
              <div className="bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-2.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-hub-border pb-1.5">
                  <span className="text-xs font-extrabold text-[#303030] dark:text-hub-text1 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-sky-400 stroke-[2.2]" /> Resumen Carga
                  </span>
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 px-2.5 py-0.5 rounded-full">
                    {despachoUtcsList.length > 0 ? despachoUtcsList.length : 10} UTCs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-0.5">
                  <div className="p-1.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl flex flex-col justify-center">
                    <span className="text-[10px] text-[#009D4E] dark:text-emerald-400 font-extrabold block uppercase tracking-wider">Contenedoras</span>
                    <strong className="text-base font-mono font-black text-[#009D4E] dark:text-emerald-400">
                      {contenedorasList.length > 0 ? contenedorasList.length : 500}
                    </strong>
                  </div>
                  <div className="p-1.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 rounded-xl flex flex-col justify-center">
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold block uppercase tracking-wider">Encargos</span>
                    <strong className="text-base font-mono font-black text-purple-600 dark:text-purple-400">
                      {sueltosList.length > 0 ? sueltosList.length : 1540}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bloque Suministros */}
              <div className="bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-2.5 space-y-1.5 shadow-2xs">
                <div className="border-b border-gray-100 dark:border-hub-border pb-1.5 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#303030] dark:text-hub-text1 uppercase tracking-wider">
                    Suministros
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    Totales
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-0.5">
                  <div className="p-1 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/60 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold block">Bins</span>
                    <strong className="text-xs font-mono font-extrabold text-amber-900 dark:text-amber-200">{insumosCounts.bins || 5}</strong>
                  </div>
                  <div className="p-1 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-100/80 dark:border-teal-900/60 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-teal-700 dark:text-teal-400 font-bold block">Jaulas</span>
                    <strong className="text-xs font-mono font-extrabold text-teal-900 dark:text-teal-200">{insumosCounts.jaula || 8}</strong>
                  </div>
                  <div className="p-1 bg-gray-100 dark:bg-hub-elevated border border-gray-200/60 dark:border-hub-border rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 dark:text-hub-text2 font-bold block">Valijas</span>
                    <strong className="text-xs font-mono font-extrabold text-gray-700 dark:text-hub-text2">{insumosCounts.valija || 0}</strong>
                  </div>
                  <div className="p-1 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-100/80 dark:border-orange-900/60 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] text-orange-700 dark:text-orange-400 font-bold block">Pallets</span>
                    <strong className="text-xs font-mono font-extrabold text-orange-900 dark:text-orange-200">{insumosCounts.pallets || 3}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPONENTE 2: INFORMACIÓN DEL TRANSPORTISTA (SEPARADO ABAJO) */}
            {transportistaAsignado ? (
              <div className="bg-emerald-50/40 dark:bg-hub-elevated border border-emerald-200 dark:border-hub-border rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-slate-700/80 pb-2">
                  <span className="text-xs font-extrabold text-[#009D4E] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2 font-sans">
                    <UserCheck className="w-4 h-4 stroke-[2.2]" /> Transportista Asignado
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                    Confirmado ✓
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase leading-tight">Nombre</span>
                    <strong className="text-xs sm:text-sm text-[#414745] dark:text-hub-text1 font-extrabold block truncate">
                      {transportistaAsignado.nombre}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase leading-tight">RUT</span>
                    <span className="font-mono font-bold text-xs text-[#414745] dark:text-hub-text1">
                      {transportistaAsignado.rut}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold leading-tight">Vehículo</span>
                    <span className="font-semibold text-xs text-gray-700 dark:text-hub-text2">
                      {transportistaAsignado.tipoVehiculo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold leading-tight">ID Patente</span>
                    <span className="font-mono font-extrabold text-xs text-[#009D4E] dark:text-emerald-400 bg-white dark:bg-hub-surface border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md inline-block">
                      {transportistaAsignado.idVehiculo}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-hub-elevated border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-bold font-sans">
                  Sin transportista asignado
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. BOTÓN PRINCIPAL CONTINUAR / DESPACHAR FUERA DE LA CARD COMPONENTE */}
      <div className={`pt-0 pb-1 shrink-0 ${!isPda ? 'flex justify-end' : ''}`}>
        {stepDespacho === 1 && (
          <button
            type="button"
            onClick={() => setStepDespacho(2)}
            className={`${
              isPda
                ? 'w-full h-14 rounded-full text-base'
                : 'px-8 py-3.5 rounded-2xl text-sm'
            } bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black dark:active:bg-[#02B55A] text-white dark:text-[#303030] font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-sans`}
          >
            <span>Continuar</span>
          </button>
        )}

        {stepDespacho === 2 && (
          <button
            type="button"
            disabled={!transportistaAsignado}
            onClick={() => setStepDespacho(3)}
            className={`${
              isPda
                ? 'w-full h-14 rounded-full text-base'
                : 'px-8 py-3.5 rounded-2xl text-sm'
            } font-black shadow-md flex items-center justify-center transition-all font-sans ${
              transportistaAsignado
                ? 'bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black dark:active:bg-[#02B55A] text-white dark:text-[#303030] cursor-pointer active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-hub-elevated text-gray-400 dark:text-slate-600 cursor-not-allowed shadow-none'
            }`}
          >
            <span>Continuar</span>
          </button>
        )}

        {stepDespacho === 3 && (
          <button
            type="button"
            onClick={() => {
              setIsDespachoSuccessModalOpen(true);
              triggerToast(`¡Despacho de Rampa ${activeRampa.numero} confirmado con éxito! Manifiesto generado.`, 'success');
              playSuccessSound();
            }}
            className={`${
              isPda
                ? 'w-full h-14 rounded-full text-base'
                : 'px-8 py-3.5 rounded-2xl text-sm'
            } bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black dark:active:bg-[#02B55A] text-white dark:text-[#303030] font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-sans`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Confirmar y Despachar</span>
          </button>
        )}
      </div>
    </div>
  );

  // --- RENDER VISTA PDA (MOBILE) ---
  if (isPda) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#FAFDFC] dark:bg-hub-base text-[#414745] dark:text-hub-text1 p-2.5 select-none relative font-sans">
        {/* Toast Notification Mobile (Flotante en el TOP - Sin desplazar contenido) */}
        {toast && (
          <div
            key={toast.id}
            onClick={handleDismissToast}
            className={`fixed top-3 left-3 right-3 z-[9999] shadow-2xl rounded-2xl p-3.5 flex items-center justify-between gap-2.5 border font-mono cursor-pointer transition-all ${isToastLeaving ? 'animate-toast-slide-up' : 'animate-toast-slide-down'
              } ${toast.type === 'success'
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
              <p className="text-xs font-bold font-mono leading-snug whitespace-normal break-words">{toast.text}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismissToast();
              }}
              className="p-1 rounded-lg shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 1: UBICACIÓN EN RAMPA (PDA) */}
        {step === 'DESPACHO_FLOW' ? (
          renderDespachoFlowContent()
        ) : step === 'RAMPA_SELECTION' ? (
          <div className="flex-1 flex flex-col justify-start space-y-4">
            {!isLocationScanned ? (
              /* PRIMERA ACCIÓN: ESCANEAR UBICACIÓN DE RAMPA */
              <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-3xl p-6 text-center mt-2 shadow-xs flex flex-col items-center animate-fadeIn">
                <div className="w-24 h-24 mb-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shadow-2xs">
                  <QrCode className="w-12 h-12 stroke-[2.2]" />
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase mb-2">
                  PRIMERA ACCIÓN REQUERIDA
                </span>

                <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 mb-1.5 leading-snug">
                  Escanea el QR de la ubicación de la rampa
                </h3>

                <p className="text-xs text-gray-500 dark:text-hub-text2 mb-5 max-w-xs">
                  Escanea el QR de la rampa para habilitar las acciones de nominación y despacho.
                </p>

                <div className="w-full">
                  <button
                    type="button"
                    onClick={handlePerformScanLocation}
                    className="w-full h-12 bg-[#009D4E] hover:bg-[#008743] font-bold rounded-full text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all font-sans active:scale-[0.98]"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Escanear Ubicación</span>
                  </button>
                </div>
              </div>
            ) : (
              /* DESPUÉS DE ESCANEAR: COMPONENTE UBICACIÓN Y BOTONES ALINEADOS ARRIBA (PDA) */
              <div className="flex-1 flex flex-col justify-start space-y-4 animate-fadeIn w-full">
                {/* Componente Aparte 1: Card Info Rampa Ubicada (ARRIBA COMPACTO) */}
                <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl py-3 px-4 shadow-xs w-full shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shrink-0">
                      <MapPin className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 leading-tight font-sans">
                        Rampa {activeRampa.numero}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium">{activeRampa.destino} ({activeRampa.region})</p>
                    </div>
                  </div>
                </div>

                {/* Label sutil para las acciones operativas (Alineado a la izquierda) */}
                <div className="px-1">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block">
                    Acciones Operativas
                  </span>
                </div>

                {/* Lista de Botones de Acciones Operativas (#303030 rounded-full idénticos a Home) */}
                <div className="space-y-3 w-full">
                  {/* Action 1: Nominar */}
                  <button
                    type="button"
                    onClick={() => setStep('NOMINACION_PROCESS')}
                    className="w-full h-14 rounded-full px-5 flex items-center justify-between shadow-md transition-all font-sans bg-[#303030] dark:bg-[#252525] border border-transparent dark:border-emerald-500/30 dark:shadow-lg dark:shadow-black/40 active:bg-[#1f1f1f] dark:active:bg-[#1E1E1E] focus:outline-none text-white dark:text-hub-text1 active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 dark:bg-emerald-500/20 text-[#009D4E] dark:text-[#00C45A] border border-emerald-500/30 dark:border-emerald-500/50">
                        <Box className="w-5 h-5 stroke-[2.2] text-[#009D4E] dark:text-[#00C45A]" />
                      </div>
                      <div className="flex flex-col text-left min-w-0 leading-tight">
                        <span className="text-sm font-extrabold text-white dark:text-hub-text1 truncate tracking-tight">
                          Nominar Encargos
                        </span>
                        <span className="text-[11px] text-gray-300 dark:text-hub-text2 font-medium truncate">
                          Clasificación y Nómina
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-hub-text2 shrink-0" />
                  </button>

                  {/* Action 2: Despachar */}
                  <button
                    type="button"
                    onClick={() => setIsDespachoModalOpen(true)}
                    className="w-full h-14 rounded-full px-5 flex items-center justify-between shadow-md transition-all font-sans bg-[#303030] dark:bg-[#252525] border border-transparent dark:border-emerald-500/30 dark:shadow-lg dark:shadow-black/40 active:bg-[#1f1f1f] dark:active:bg-[#1E1E1E] focus:outline-none text-white dark:text-hub-text1 active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 dark:bg-emerald-500/20 text-[#009D4E] dark:text-[#00C45A] border border-emerald-500/30 dark:border-emerald-500/50">
                        <Send className="w-5 h-5 stroke-[2.2] text-[#009D4E] dark:text-[#00C45A]" />
                      </div>
                      <div className="flex flex-col text-left min-w-0 leading-tight">
                        <span className="text-sm font-extrabold text-white dark:text-hub-text1 truncate tracking-tight">
                          Despachar Rampa
                        </span>
                        <span className="text-[11px] text-gray-300 dark:text-hub-text2 font-medium truncate">
                          Emisión de Manifiesto
                        </span>
                      </div>
                    </div>
                    {activeRampa.nominacionesPendientes > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-2xs shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        {activeRampa.nominacionesPendientes}
                      </span>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-hub-text2 shrink-0" />
                    )}
                  </button>

                  {/* Action 3: Reubicar */}
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="w-full h-14 rounded-full px-5 flex items-center justify-between shadow-md transition-all font-sans bg-[#303030] dark:bg-[#252525] border border-transparent dark:border-emerald-500/30 dark:shadow-lg dark:shadow-black/40 active:bg-[#1f1f1f] dark:active:bg-[#1E1E1E] focus:outline-none text-white dark:text-hub-text1 active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 dark:bg-emerald-500/20 text-[#009D4E] dark:text-[#00C45A] border border-emerald-500/30 dark:border-emerald-500/50">
                        <RefreshCw className="w-5 h-5 stroke-[2.2] text-[#009D4E] dark:text-[#00C45A]" />
                      </div>
                      <div className="flex flex-col text-left min-w-0 leading-tight">
                        <span className="text-sm font-extrabold text-white dark:text-hub-text1 truncate tracking-tight">
                          Reubicar Encargo
                        </span>
                        <span className="text-[11px] text-gray-300 dark:text-hub-text2 font-medium truncate">
                          Cambiar Estación QR
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-hub-text2 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: PROCESO DE NOMINACIÓN (PDA) */
          <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
            {/* Header / Subtítulo con Badge fuera del componente (Arriba a la derecha - Visible) */}
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-[11px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block">
                Proceso de Nominación
              </span>
              <span className="text-[10px] font-mono font-bold text-[#009D4E] dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                Rampa {activeRampa.numero} - {activeRampa.destino}
              </span>
            </div>

            {/* Scan Control Card & Helper */}
            <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-2.5 shadow-xs shrink-0">
              <div className="flex items-center justify-between mb-2">
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
                    if (encargosNominados.length > 0) {
                      const randomIndex = Math.floor(Math.random() * encargosNominados.length);
                      triggerScan(encargosNominados[randomIndex].codigoEncargo);
                    } else {
                      triggerToast('No hay encargos en la nómina para eliminar', 'warning');
                      playWarningSound();
                    }
                  } else {
                    const types: TipoCargaNominada[] = ['CONTENEDORA', 'UTC', 'SUELTO'];
                    const chosenType = types[Math.floor(Math.random() * types.length)];
                    const prefix = chosenType === 'CONTENEDORA' ? 'JAULA' : chosenType === 'UTC' ? 'SACA' : 'OF';
                    const randomNum = chosenType === 'CONTENEDORA'
                      ? Math.floor(100000000 + Math.random() * 900000000)
                      : Math.floor(100000 + Math.random() * 900000);
                    triggerScan(`${prefix}-${randomNum}`);
                  }
                }}
                className={`w-full h-10 font-bold rounded-full text-xs transition-all shadow-xs flex items-center justify-center gap-2 text-white ${isRemoveMode ? 'bg-[#E11D48] hover:bg-[#BE123C]' : 'bg-[#009D4E] hover:bg-[#008743]'
                  }`}
              >
                <Scan className="w-4 h-4" />
                <span>Simular Escaneo PDA</span>
              </button>

              {/* Helper Rosado/Rojo */}
              {isRemoveMode && (
                <div className="mt-2.5 p-2.5 bg-[#FFF0F2] dark:bg-rose-950/50 border border-[#FECDD3] dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
                  <p className="text-[11px] text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
                    <strong className="font-bold">Quitar encargo activo:</strong> Al escanear los encargos, estos se eliminarán de la vista.
                  </p>
                </div>
              )}
            </div>

            {/* 3 Tabs de Clasificación Abreviados (ENC | CONT | UTC - 14px Text) */}
            <div className="grid grid-cols-3 gap-1.5 bg-gray-200/70 dark:bg-hub-elevated p-1 rounded-2xl shrink-0">
              {/* Tab 1: ENC */}
              <button
                type="button"
                onClick={() => setActivePdaTab('SUELTO')}
                className={`py-2 px-1.5 rounded-xl text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${recentlyRemovedType === 'SUELTO'
                    ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-700 scale-[1.02] shadow-md border border-rose-300 animate-pulse'
                    : recentlyScannedType === 'SUELTO'
                      ? 'ring-2 ring-blue-500 bg-sky-100 text-blue-700 scale-[1.02] shadow-md border border-sky-300'
                      : activePdaTab === 'SUELTO'
                        ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-sky-300 shadow-sm border border-sky-200/80 dark:border-sky-800'
                        : 'text-gray-600 dark:text-hub-text2 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
              >
                <span>ENC</span>
                <span
                  className={`font-mono text-xs px-1.5 py-0.2 rounded-full font-bold transition-transform shrink-0 ${recentlyScannedType === 'SUELTO'
                      ? 'bg-blue-600 text-white font-extrabold scale-110'
                      : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                    }`}
                >
                  {sueltosList.length}
                </span>
              </button>

              {/* Tab 2: CONT */}
              <button
                type="button"
                onClick={() => setActivePdaTab('CONTENEDORA')}
                className={`py-2 px-1.5 rounded-xl text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${recentlyRemovedType === 'CONTENEDORA'
                    ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-700 scale-[1.02] shadow-md border border-rose-300 animate-pulse'
                    : recentlyScannedType === 'CONTENEDORA'
                      ? 'ring-2 ring-[#009D4E] bg-emerald-100 text-[#009D4E] scale-[1.02] shadow-md border border-[#A7F3D0]'
                      : activePdaTab === 'CONTENEDORA'
                        ? 'bg-white dark:bg-slate-700 text-[#009D4E] dark:text-emerald-400 shadow-sm border border-emerald-200/80 dark:border-emerald-800'
                        : 'text-gray-600 dark:text-hub-text2 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
              >
                <span>CONT</span>
                <span
                  className={`font-mono text-xs px-1.5 py-0.2 rounded-full font-bold transition-transform shrink-0 ${recentlyScannedType === 'CONTENEDORA'
                      ? 'bg-[#009D4E] text-white font-extrabold scale-110'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    }`}
                >
                  {contenedorasList.length}
                </span>
              </button>

              {/* Tab 3: NÓMINAS (Cargadas automáticamente) */}
              <button
                type="button"
                onClick={() => setActivePdaTab('UTC')}
                className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center justify-center gap-1 ${recentlyRemovedType === 'UTC'
                    ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-700 scale-[1.02] shadow-md border border-rose-300 animate-pulse'
                    : activePdaTab === 'UTC'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200/80 dark:border-purple-800'
                      : 'text-gray-600 dark:text-hub-text2 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
              >
                <span>NÓMINAS</span>
                <span
                  className="font-mono text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 shrink-0"
                >
                  {utcsList.length}
                </span>
              </button>
            </div>

            {/* List Content for PDA */}
            <div className="flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 shadow-xs overflow-y-auto space-y-2 [scrollbar-width:none]">
              {(() => {
                if (activePdaTab === 'UTC') {
                  const totalNominasPendientes = utcsList.length;
                  const totalEncargosPendientes = utcsList.reduce((acc, curr) => acc + (curr.cantidadEncargos ?? 0), 0);
                  const totalContenedorasPendientes = utcsList.reduce((acc, curr) => acc + (curr.cantidadContenedores ?? 0), 0);
                  const totalSuministrosPendientes = (insumosCounts.bins || 5) + (insumosCounts.jaula || 8) + (insumosCounts.valija || 0) + (insumosCounts.pallets || 3);

                  if (totalNominasPendientes === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-2xs">
                          <Layers className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2 max-w-[220px]">
                          No hay nóminas pendientes para esta rampa
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 font-sans animate-fadeIn">
                      {/* BLOQUE 1: PENDIENTES DE DESPACHO (Encargos + Contenedoras) */}
                      <div className="bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/90 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 shadow-2xs">
                        <div className="border-b border-gray-200/80 dark:border-slate-700/60 pb-1.5">
                          <span className="text-xs font-black text-[#414745] dark:text-hub-text1 uppercase tracking-wider block">
                            Contenido de las Nóminas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs pt-0.5">
                          {/* 1. Total Contenedoras */}
                          <div className="p-2 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-slate-700/80 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold block uppercase tracking-tight">Contenedoras</span>
                            <strong className="text-base font-mono font-black text-[#009D4E] dark:text-emerald-300">
                              {totalContenedorasPendientes}
                            </strong>
                          </div>
                          {/* 2. Total Encargos */}
                          <div className="p-2 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-slate-700/80 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-blue-700 dark:text-sky-400 font-extrabold block uppercase tracking-tight">Encargos</span>
                            <strong className="text-base font-mono font-black text-[#2563EB] dark:text-sky-300">
                              {totalEncargosPendientes}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* BLOQUE 2: RESUMEN DE SUMINISTROS (Bins, Jaulas, Valijas, Pallets) */}
                      <div className="bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/90 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 shadow-2xs">
                        <div className="border-b border-gray-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                          <span className="text-xs font-black text-[#414745] dark:text-hub-text1 uppercase tracking-wider">
                            Suministros Consolidados
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-hub-text2">
                            Total: {totalSuministrosPendientes}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs pt-0.5">
                          <div className="p-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold block">Bins</span>
                            <strong className="text-xs font-mono font-extrabold text-amber-900 dark:text-amber-200">{insumosCounts.bins || 5}</strong>
                          </div>
                          <div className="p-1.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-teal-700 dark:text-teal-400 font-bold block">Jaulas</span>
                            <strong className="text-xs font-mono font-extrabold text-teal-900 dark:text-teal-200">{insumosCounts.jaula || 8}</strong>
                          </div>
                          <div className="p-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-slate-700 dark:text-slate-300 font-bold block">Valijas</span>
                            <strong className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100">{insumosCounts.valija || 0}</strong>
                          </div>
                          <div className="p-1.5 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-orange-700 dark:text-orange-400 font-bold block">Pallets</span>
                            <strong className="text-xs font-mono font-extrabold text-orange-900 dark:text-orange-200">{insumosCounts.pallets || 3}</strong>
                          </div>
                        </div>
                      </div>

                      {/* FOOTER INFORMATIVO */}
                      <div className="flex items-center justify-between text-[10px] text-purple-800 dark:text-purple-300 px-1 pt-0.5">
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Carga lista para despachar
                        </span>
                        <span className="font-mono text-purple-700 dark:text-purple-300 font-extrabold">
                          Rampa {activeRampa.numero} 🚚
                        </span>
                      </div>
                    </div>
                  );
                }

                const currentList = activePdaTab === 'CONTENEDORA' ? contenedorasList : sueltosList;
                if (currentList.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center text-gray-400 dark:text-hub-text3 mb-3 shadow-2xs">
                        <Scan className="w-6 h-6 stroke-[1.8]" />
                      </div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2 max-w-[220px]">
                        Escanea un encargo para agregar a la pre-nómina
                      </p>
                    </div>
                  );
                }

                return currentList.map((item) => {
                  const isNew = item.codigoEncargo === recentlyScannedCode;

                  let rowStyle = 'border-gray-200 dark:border-hub-border bg-gray-50/80 dark:bg-hub-elevated text-[#414745] dark:text-hub-text1';
                  let newBadgeBg = 'bg-[#009D4E]';
                  let textPrimaryStyle = 'text-[#414745] dark:text-hub-text1';

                  if (item.tipoCarga === 'CONTENEDORA') {
                    newBadgeBg = 'bg-[#009D4E]';
                    if (isNew) {
                      rowStyle = 'bg-[#EEFBF4] dark:bg-emerald-950/60 border-[#A7F3D0] dark:border-emerald-800 border-l-4 border-l-[#009D4E] shadow-sm animate-toast-slide-down';
                      textPrimaryStyle = 'text-[#065F46] dark:text-emerald-300';
                    } else {
                      rowStyle = 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200';
                      textPrimaryStyle = 'text-emerald-950 dark:text-emerald-200';
                    }
                  } else if (item.tipoCarga === 'SUELTO') {
                    newBadgeBg = 'bg-blue-600';
                    if (isNew) {
                      rowStyle = 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 border-l-4 border-l-blue-600 shadow-sm animate-toast-slide-down';
                      textPrimaryStyle = 'text-blue-950 dark:text-sky-200';
                    } else {
                      rowStyle = 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/60 text-sky-950 dark:text-sky-200';
                      textPrimaryStyle = 'text-sky-950 dark:text-sky-200';
                    }
                  }

                  // Tarjeta especial para Nóminas pendientes (cargadas automáticamente por el sistema)
                  if (item.tipoCarga === 'UTC') {
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border transition-all duration-300 text-xs font-sans bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/80 shadow-2xs space-y-1.5"
                      >
                        {/* Fila 1: ID de Nómina + Badge de Sistema Auto-Importado */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                            <strong className="block font-black text-xs text-purple-950 dark:text-purple-200 truncate">
                              Nómina #{item.id.replace(/^(NOM-|NOM)/i, '')}
                            </strong>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/70 shrink-0 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-300" />
                            AUTO-IMPORTADO
                          </span>
                        </div>

                        {/* Fila 2: Sub-conteos (Contenedoras y Encargos) */}
                        <div className="flex items-center gap-2 text-[11px] font-bold pt-0.5">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-[#009D4E] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {item.cantidadContenedores ?? 0} Contenedoras
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100/70 dark:bg-sky-950/60 text-[#2563EB] dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {item.cantidadEncargos ?? 0} Encargos
                          </span>
                        </div>

                        {/* Fila 3: Tag indicativo + Hora de origen */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-hub-text2 pt-1 border-t border-purple-100 dark:border-purple-900/40">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            Se agregará a la nómina de despacho 🚚
                          </span>
                          <span className="font-mono text-gray-400">
                            {item.horaEscaneo}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition-all duration-300 font-mono space-y-1 ${rowStyle}`}
                    >
                      {/* Fila 1: Código de Barras de 26 dígitos y Badge ¡NUEVO! */}
                      <div className="flex items-center justify-between gap-2">
                        <strong className={`block font-black text-xs font-mono tracking-tight truncate ${textPrimaryStyle}`}>
                          {item.codigoBarras26 || '78901234567890123456882103'}
                        </strong>
                        {isNew && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${newBadgeBg} text-white shadow-2xs animate-pulse shrink-0`}>
                            ¡NUEVO!
                          </span>
                        )}
                      </div>

                      {/* Fila 2: OF-XXXXXXXXX (izquierda) y Hora (derecha) en la misma fila */}
                      <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                        <span className="font-bold text-gray-600 dark:text-hub-text2">
                          {item.codigoOF9 || 'OF-882103942'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-hub-text3 font-semibold">
                          {item.horaEscaneo}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Botón Crear Nómina PDA (#303030 en claro, verde neón #03F77C con texto #303030 en dark mode) */}
            <button
              type="button"
              onClick={handleOpenContinuarModal}
              className="w-full h-14 bg-[#303030] dark:bg-[#03F77C] hover:dark:bg-[#02D66B] border border-transparent dark:border-emerald-300/50 dark:shadow-lg dark:shadow-emerald-950/60 active:bg-[#1f1f1f] dark:active:bg-[#02B55A] focus:outline-none font-black rounded-full text-base text-white dark:text-[#303030] shadow-md flex items-center justify-center gap-2 transition-all font-sans active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <span>Crear Nómina</span>
            </button>
          </div>
        )}

        {renderModals()}
      </div>
    );
  }

  // --- RENDER VISTA ESCRITORIO (PC) ---
  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Toast Notification Desktop */}
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
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 stroke-[2.2]" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 stroke-[2.2]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0 stroke-[2.2]" />
            )}
            <p className="text-xs font-bold font-mono leading-snug whitespace-normal break-words">{toast.text}</p>
          </div>
          <button onClick={() => setToast(null)} className="p-1 rounded-lg shrink-0">
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      )}

      {/* STEP 1: SELECCIÓN / UBICACIÓN EN RAMPA (ESCRITORIO) */}
      {step === 'DESPACHO_FLOW' ? (
        renderDespachoFlowContent()
      ) : step === 'RAMPA_SELECTION' ? (
        <div className="space-y-6">
          {!isLocationScanned ? (
            /* PRIMERA ACCIÓN: ESCANEAR UBICACIÓN DE RAMPA (CENTRADAS EN PANTALLA) */
            <div className="min-h-[calc(100vh-220px)] flex flex-col items-center justify-center">
              <div className="bg-white dark:bg-hub-surface rounded-3xl p-10 sm:p-12 shadow-sm border border-gray-200/80 dark:border-hub-border text-center flex flex-col items-center justify-center animate-fadeIn max-w-lg w-full">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 mb-4 shadow-xs">
                  <QrCode className="w-10 h-10 stroke-[2.2]" />
                </div>

                <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold uppercase mb-3 border border-emerald-300 dark:border-emerald-800">
                  PRIMERA ACCIÓN REQUERIDA
                </span>

                <h2 className="text-2xl font-black text-[#414745] dark:text-hub-text1 font-sans mb-2">
                  Escanea el QR de la ubicación de la rampa
                </h2>

                <p className="text-sm text-gray-500 dark:text-hub-text2 font-medium max-w-md mb-6">
                  Escanea el QR de la rampa para habilitar las acciones de nominación y despacho.
                </p>

                <div className="flex items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={handlePerformScanLocation}
                    className="w-full sm:w-auto px-8 py-4 bg-[#009D4E] hover:bg-[#008743] text-white font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-3 transition-all font-sans"
                  >
                    <Scan className="w-5 h-5" />
                    <span>Escanear Ubicación</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* DESPUÉS DE ESCANEAR: MOSTRAR RAMPA ACTIVA Y BOTONES EN COMPONENTES SEPARADOS (ESCRITORIO) */
            <div className="space-y-6 animate-fadeIn">
              {/* Componente Aparte 1: Ubicación de Rampa Activa */}
              <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] shrink-0 shadow-xs">
                    <MapPin className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#414745] dark:text-hub-text1 font-sans">
                      Rampa {activeRampa.numero} — {activeRampa.destino}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-0.5">
                      Región: {activeRampa.region}
                    </p>
                  </div>
                </div>
              </div>

              {/* Componente Aparte 2: Panel de Acciones Operativas (Los 3 Botones) */}
              <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border">
                  <h3 className="text-xs font-extrabold text-gray-400 dark:text-hub-text2 font-sans uppercase tracking-wider">
                    Acciones Operativas Disponibles
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">Selecciona una acción para continuar</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Botón 1: Nominar */}
                  <button
                    type="button"
                    onClick={() => setStep('NOMINACION_PROCESS')}
                    className="p-5 bg-[#F4FCF7] dark:bg-emerald-950/30 border border-[#A7F3D0] dark:border-emerald-800/60 hover:bg-[#EEFBF4] font-extrabold rounded-2xl shadow-xs flex flex-col justify-between items-start gap-4 transition-all font-sans text-left min-h-[120px]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#009D4E]/10 dark:bg-emerald-900/40 flex items-center justify-center text-[#009D4E] dark:text-emerald-300">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-base font-extrabold block leading-tight text-[#009D4E] dark:text-emerald-300">Nominar Encargos</span>
                      <span className="text-xs text-gray-500 dark:text-hub-text2 font-medium font-sans">Escaneo y clasificación de carga</span>
                    </div>
                  </button>

                  {/* Botón 2: Despachar */}
                  <button
                    type="button"
                    onClick={() => setIsDespachoModalOpen(true)}
                    className="p-5 bg-[#F4FCF7] dark:bg-emerald-950/30 border border-[#A7F3D0] dark:border-emerald-800/60 hover:bg-[#EEFBF4] font-extrabold rounded-2xl shadow-xs flex flex-col justify-between items-start gap-4 transition-all font-sans text-left min-h-[120px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-10 h-10 rounded-xl bg-[#009D4E]/10 dark:bg-emerald-900/40 flex items-center justify-center text-[#009D4E] dark:text-emerald-300">
                        <Send className="w-5 h-5" />
                      </div>
                      {activeRampa.nominacionesPendientes > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {activeRampa.nominacionesPendientes} pendientes
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-base font-extrabold block leading-tight text-[#009D4E] dark:text-emerald-300">Despachar Rampa</span>
                      <span className="text-xs text-gray-500 dark:text-hub-text2 font-medium font-sans">Cierre de manifiesto y salida</span>
                    </div>
                  </button>

                  {/* Botón 3: Reubicar */}
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="p-5 bg-[#F4FCF7] dark:bg-emerald-950/30 border border-[#A7F3D0] dark:border-emerald-800/60 hover:bg-[#EEFBF4] font-bold rounded-2xl shadow-xs flex flex-col justify-between items-start gap-4 transition-all font-sans text-left min-h-[120px]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#009D4E]/10 dark:bg-emerald-900/40 flex items-center justify-center text-[#009D4E] dark:text-emerald-300">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-base font-extrabold block leading-tight text-[#009D4E] dark:text-emerald-300">Reubicar Encargo</span>
                      <span className="text-xs text-gray-500 dark:text-hub-text2 font-normal font-sans">Cambiar o re-escanear ubicación</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: PROCESO DE NOMINACIÓN (ESCRITORIO) */
        <div className="space-y-6">
          {/* Top Bar back button and active rampa tag */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('RAMPA_SELECTION')}
              className="text-sm font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 flex items-center gap-2 transition-colors font-sans"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Selección de Rampa
            </button>
            <div className="px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold">
              Ubicación Activa: Rampa {activeRampa.numero} ({activeRampa.destino})
            </div>
          </div>

          {/* Card Control Bar: Escanea los encargos + Quitar Switch + Simular */}
          <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-hub-border flex flex-col gap-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Scan className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                <div>
                  <h3 className="text-base font-bold text-[#414745] dark:text-hub-text1 font-sans">
                    Proceso de Nominación
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 font-sans">
                    Escanea los encargos que quieres agregar a la nómina
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 dark:text-hub-text2">Quitar encargo</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRemoveMode}
                      onChange={(e) => setIsRemoveMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-hub-elevated peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isRemoveMode) {
                      if (encargosNominados.length > 0) {
                        const randomIndex = Math.floor(Math.random() * encargosNominados.length);
                        triggerScan(encargosNominados[randomIndex].codigoEncargo);
                      } else {
                        triggerToast('No hay encargos en la nómina para eliminar', 'warning');
                        playWarningSound();
                      }
                    } else {
                      const types: TipoCargaNominada[] = ['CONTENEDORA', 'UTC', 'SUELTO'];
                      const chosenType = types[Math.floor(Math.random() * types.length)];
                      const prefix = chosenType === 'CONTENEDORA' ? 'JAULA' : chosenType === 'UTC' ? 'SACA' : 'OF';
                      const randomNum = chosenType === 'CONTENEDORA'
                        ? Math.floor(100000000 + Math.random() * 900000000)
                        : Math.floor(100000 + Math.random() * 900000);
                      triggerScan(`${prefix}-${randomNum}`);
                    }
                  }}
                  className={`px-4 py-2.5 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 font-sans ${isRemoveMode ? 'bg-[#E11D48] hover:bg-[#BE123C]' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                  <Scan className="w-4 h-4" />
                  <span>Simular Escaneo PDA</span>
                </button>
              </div>
            </div>

            {/* Helper Rosado/Rojo */}
            {isRemoveMode && (
              <div className="mt-3.5 p-3 bg-[#FFF0F2] dark:bg-rose-950/40 border border-[#FECDD3] dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-[#E11D48] dark:text-rose-400 shrink-0 stroke-[2.2]" />
                <p className="text-xs text-[#E11D48] dark:text-rose-300 font-sans font-medium leading-tight">
                  <strong className="font-bold">Quitar encargo activo:</strong> Al escanear los encargos, estos se eliminarán de la vista.
                </p>
              </div>
            )}
          </div>

          {/* 3 COLUMNAS DE CLASIFICACIÓN (ENCARGOS SUELTOS | CONTENEDORAS | UTC) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna 1: Encargos Sueltos (ENC) */}
            <div
              className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-300 flex flex-col h-[380px] ${recentlyRemovedType === 'SUELTO'
                  ? 'ring-2 ring-rose-500 dark:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 animate-pulse'
                  : recentlyScannedType === 'SUELTO'
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-sky-50/30 dark:bg-sky-950/20 border-sky-300'
                    : 'border-gray-200/80 dark:border-hub-border'
                }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-extrabold text-[#414745] dark:text-hub-text1 font-sans">Encargos</span>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full transition-transform ${recentlyScannedType === 'SUELTO'
                      ? 'bg-blue-600 text-white font-extrabold scale-110 shadow-xs'
                      : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200'
                    }`}
                >
                  {sueltosList.length} bultos
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
                {sueltosList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center text-gray-400 dark:text-hub-text3 mb-2 shadow-2xs">
                      <Scan className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2 max-w-[200px]">
                      Escanea un encargo para agregar a la pre-nómina
                    </p>
                  </div>
                ) : (
                  sueltosList.map((item) => {
                    const isNew = item.codigoEncargo === recentlyScannedCode;
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all duration-300 font-mono space-y-1 ${isNew
                            ? 'bg-sky-50/80 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 border-l-4 border-l-blue-600 shadow-sm animate-toast-slide-down'
                            : 'border-gray-200/80 dark:border-hub-border bg-gray-50/60 dark:bg-slate-800/40'
                          }`}
                      >
                        {/* Fila 1: Código de Barras de 26 dígitos y Badge ¡NUEVO! */}
                        <div className="flex items-center justify-between gap-2">
                          <strong
                            className={`block font-black text-xs font-mono tracking-tight truncate ${isNew ? 'text-blue-900 dark:text-sky-200' : 'text-[#414745] dark:text-slate-200'
                              }`}
                          >
                            {item.codigoBarras26 || '78901234567890123456882103'}
                          </strong>
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-600 text-white shadow-2xs animate-pulse shrink-0">
                              ¡NUEVO!
                            </span>
                          )}
                        </div>

                        {/* Fila 2: OF-XXXXXXXXX (izquierda) y Hora (derecha) en la misma fila */}
                        <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                          <span className="font-bold text-gray-600 dark:text-hub-text2">
                            {item.codigoOF9 || 'OF-882103942'}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-hub-text3 font-semibold">
                            {item.horaEscaneo}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna 2: Contenedoras (CONT) */}
            <div
              className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-300 flex flex-col h-[380px] ${recentlyRemovedType === 'CONTENEDORA'
                  ? 'ring-2 ring-rose-500 dark:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 animate-pulse'
                  : recentlyScannedType === 'CONTENEDORA'
                    ? 'ring-2 ring-[#009D4E] dark:ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 border-[#A7F3D0]'
                    : 'border-gray-200/80 dark:border-hub-border'
                }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border mb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#009D4E]" />
                  <span className="text-sm font-extrabold text-[#414745] dark:text-hub-text1 font-sans">Contenedoras</span>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full transition-transform ${recentlyScannedType === 'CONTENEDORA'
                      ? 'bg-[#009D4E] text-white font-extrabold scale-110 shadow-xs'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                    }`}
                >
                  {contenedorasList.length} bultos
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
                {contenedorasList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center text-gray-400 dark:text-hub-text3 mb-2 shadow-2xs">
                      <Scan className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2 max-w-[200px]">
                      Escanea un encargo para agregar a la pre-nómina
                    </p>
                  </div>
                ) : (
                  contenedorasList.map((item) => {
                    const isNew = item.codigoEncargo === recentlyScannedCode;
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all duration-300 font-mono space-y-1 ${isNew
                            ? 'bg-[#EEFBF4] dark:bg-emerald-950/70 border-[#A7F3D0] dark:border-emerald-700 border-l-4 border-l-[#009D4E] shadow-sm animate-toast-slide-down'
                            : 'border-gray-200/80 dark:border-hub-border bg-gray-50/60 dark:bg-slate-800/40'
                          }`}
                      >
                        {/* Fila 1: Código de Barras de 26 dígitos y Badge ¡NUEVO! */}
                        <div className="flex items-center justify-between gap-2">
                          <strong
                            className={`block font-black text-xs font-mono tracking-tight truncate ${isNew ? 'text-[#065F46] dark:text-emerald-200' : 'text-[#414745] dark:text-slate-200'
                              }`}
                          >
                            {item.codigoBarras26 || '78901234567890123456382910'}
                          </strong>
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#009D4E] text-white shadow-2xs animate-pulse shrink-0">
                              ¡NUEVO!
                            </span>
                          )}
                        </div>

                        {/* Fila 2: OF-XXXXXXXXX (izquierda) y Hora (derecha) en la misma fila */}
                        <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                          <span className="font-bold text-gray-600 dark:text-hub-text2">
                            {item.codigoOF9 || 'OF-382910482'}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-hub-text3 font-semibold">
                            {item.horaEscaneo}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna 3: Nóminas pendientes de despacho (Cargadas automáticamente por el sistema) */}
            <div
              className={`bg-white dark:bg-hub-surface rounded-3xl p-5 shadow-sm border transition-all duration-300 flex flex-col h-[380px] ${recentlyRemovedType === 'UTC'
                  ? 'ring-2 ring-rose-500 dark:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 animate-pulse'
                  : 'border-gray-200/80 dark:border-hub-border'
                }`}
            >
              {/* Header Columna 3 */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-hub-border mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-sm font-extrabold text-[#414745] dark:text-hub-text1 font-sans truncate" title="Pendientes de despacho">
                    Pendientes de despacho
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                  {utcsList.length} {utcsList.length === 1 ? 'Nómina' : 'Nóminas'}
                </span>
              </div>

              {/* Banner informativo sutil del sistema */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-2.5 bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/60 rounded-xl text-[10px] text-gray-600 dark:text-hub-text2 font-sans font-medium shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-gray-500 dark:text-hub-text2 shrink-0 stroke-[2]" />
                <span>Cargadas automáticamente por el sistema para este despacho.</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
                {(() => {
                  const totalNominasPendientes = utcsList.length;
                  const totalEncargosPendientes = utcsList.reduce((acc, curr) => acc + (curr.cantidadEncargos ?? 0), 0);
                  const totalContenedorasPendientes = utcsList.reduce((acc, curr) => acc + (curr.cantidadContenedores ?? 0), 0);
                  const totalSuministrosPendientes = (insumosCounts.bins || 5) + (insumosCounts.jaula || 8) + (insumosCounts.valija || 0) + (insumosCounts.pallets || 3);

                  if (totalNominasPendientes === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center text-gray-400 dark:text-hub-text3 mb-2 shadow-2xs">
                          <Layers className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2 max-w-[200px]">
                          No hay nóminas pendientes para esta rampa
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 font-sans animate-fadeIn">
                      {/* BLOQUE 1: PENDIENTES DE DESPACHO (Encargos + Contenedoras) */}
                      <div className="bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/90 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 shadow-2xs">
                        <div className="border-b border-gray-200/80 dark:border-slate-700/60 pb-1.5">
                          <span className="text-xs font-black text-[#414745] dark:text-hub-text1 uppercase tracking-wider block">
                            Contenido de las Nóminas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs pt-0.5">
                          {/* 1. Total Contenedoras */}
                          <div className="p-2 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-slate-700/80 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold block uppercase tracking-tight">Contenedoras</span>
                            <strong className="text-base font-mono font-black text-[#009D4E] dark:text-emerald-300">
                              {totalContenedorasPendientes}
                            </strong>
                          </div>
                          {/* 2. Total Encargos */}
                          <div className="p-2 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-slate-700/80 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-blue-700 dark:text-sky-400 font-extrabold block uppercase tracking-tight">Encargos</span>
                            <strong className="text-base font-mono font-black text-[#2563EB] dark:text-sky-300">
                              {totalEncargosPendientes}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* BLOQUE 2: RESUMEN DE SUMINISTROS (Bins, Jaulas, Valijas, Pallets) */}
                      <div className="bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/90 dark:border-slate-700/80 rounded-2xl p-3 space-y-2 shadow-2xs">
                        <div className="border-b border-gray-200/80 dark:border-slate-700/60 pb-1.5 flex items-center justify-between">
                          <span className="text-xs font-black text-[#414745] dark:text-hub-text1 uppercase tracking-wider">
                            Suministros Consolidados
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-hub-text2">
                            Total: {totalSuministrosPendientes}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs pt-0.5">
                          <div className="p-1.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold block">Bins</span>
                            <strong className="text-xs font-mono font-extrabold text-amber-900 dark:text-amber-200">{insumosCounts.bins || 5}</strong>
                          </div>
                          <div className="p-1.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-teal-700 dark:text-teal-400 font-bold block">Jaulas</span>
                            <strong className="text-xs font-mono font-extrabold text-teal-900 dark:text-teal-200">{insumosCounts.jaula || 8}</strong>
                          </div>
                          <div className="p-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-slate-700 dark:text-slate-300 font-bold block">Valijas</span>
                            <strong className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100">{insumosCounts.valija || 0}</strong>
                          </div>
                          <div className="p-1.5 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 rounded-xl flex flex-col justify-center">
                            <span className="text-[9px] text-orange-700 dark:text-orange-400 font-bold block">Pallets</span>
                            <strong className="text-xs font-mono font-extrabold text-orange-900 dark:text-orange-200">{insumosCounts.pallets || 3}</strong>
                          </div>
                        </div>
                      </div>

                      {/* FOOTER INFORMATIVO */}
                      <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-hub-text2 px-1 pt-0.5">
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Carga lista para despachar
                        </span>
                        <span className="font-mono text-gray-700 dark:text-hub-text1 font-extrabold">
                          Rampa {activeRampa.numero} 🚚
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Botón de Crear Nómina en Escritorio */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleOpenContinuarModal}
              className="px-8 py-3.5 bg-[#303030] hover:bg-[#1f1f1f] active:bg-black dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:text-[#303030] text-white font-extrabold rounded-2xl text-sm shadow-md flex items-center gap-3 transition-all font-sans active:scale-[0.98] cursor-pointer"
            >
              <span>Crear Nómina</span>
            </button>
          </div>
        </div>
      )}

      {renderModals()}
    </div>
  );
};
