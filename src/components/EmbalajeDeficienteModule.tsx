import React, { useState, useRef, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  X,
  Box,
  Check,
  ChevronDown,
  Scan,
  Save,
  UploadCloud,
  Trash2,
} from 'lucide-react';

interface EmbalajeDeficienteModuleProps {
  onRegisterBackHandler?: (handler: (() => void) | null) => void;
  onBackHome?: () => void;
  onCameraToggle?: (isOpen: boolean) => void;
}

// Motivos válidos para embalaje deficiente (Idénticos a Redimensión)
const MOTIVOS_DEFICIENCIA = [
  'Sin embalaje',
  'Peso excede embalaje',
  'Sobredimensionamiento',
  'Cinta insuficiente',
  'Embalaje sin refuerzo',
] as const;

type MotivoDeficiencia = typeof MOTIVOS_DEFICIENCIA[number];

// Ejemplos de fotos simuladas de cajas con etiquetas Starken (para simulación rápida o fallback)
const FALLBACK_BOX_PHOTOS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=600&q=80',
];

export const EmbalajeDeficienteModule: React.FC<EmbalajeDeficienteModuleProps> = ({
  onRegisterBackHandler,
  onBackHome,
  onCameraToggle,
}) => {
  const { isPda } = useDevice();
  const { playSuccessSound } = useAudioFeedback();

  // ─── Estados de Encargo ──────────────────────────────────────────────────────────
  const [encargoEscaneado, setEncargoEscaneado] = useState<{
    codigoBarras26: string;
    codigoOF9: string;
  } | null>(null);

  // ─── Estado de Motivo de Deficiencia ─────────────────────────────────────────
  const [motivoDeficiencia, setMotivoDeficiencia] = useState<MotivoDeficiencia | ''>('Sin embalaje');
  const [isMotivosExpanded, setIsMotivosExpanded] = useState<boolean>(true);

  // ─── Estados de Fotografías (Máx 3) y Modo de Cámara ────────────────────────
  const [fotos, setFotos] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'evidence' | 'scanBarcode'>('scanBarcode');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // ─── Estados de Guardar y Notificaciones ────────────────────────────────────
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Referencias para video, canvas y file input
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // ─── Control de Navegación Atrás (Back Handler) ──────────────────────────────
  useEffect(() => {
    if (!onRegisterBackHandler) return;

    if (isCameraOpen) {
      onRegisterBackHandler(() => {
        handleCloseCamera();
      });
    } else if (encargoEscaneado) {
      onRegisterBackHandler(() => {
        setEncargoEscaneado(null);
      });
    } else {
      onRegisterBackHandler(() => {
        onBackHome?.();
      });
    }

    return () => {
      onRegisterBackHandler(null);
    };
  }, [isCameraOpen, encargoEscaneado, onBackHome, onRegisterBackHandler]);

  // Limpieza de streams de cámara al desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [cameraStream]);

  // ─── Escaneo de Código de Barras (Hook de hardware) ──────────────────────────
  useBarcodeScanner({
    onScan: (code) => {
      if (!encargoEscaneado) {
        handleProcessScan(code);
      }
    },
    enableGlobal: !isCameraOpen,
  });

  // Procesar código escaneado o ingresado
  const handleProcessScan = (rawCode: string) => {
    const cleaned = rawCode.trim().replace(/[^0-9]/g, '');

    let codigo26 = '';
    let of9 = '';

    if (cleaned.length >= 26) {
      codigo26 = cleaned.slice(0, 26);
      of9 = cleaned.slice(17, 26);
    } else if (cleaned.length === 9) {
      of9 = cleaned;
      codigo26 = `982001${cleaned.padStart(20, '0')}`.slice(0, 26);
    } else {
      codigo26 = (cleaned.padEnd(26, '0') + '98200192837482910293847291').slice(0, 26);
      of9 = codigo26.slice(-9);
    }

    setEncargoEscaneado({
      codigoBarras26: codigo26,
      codigoOF9: of9,
    });
    setMotivoDeficiencia('Sin embalaje');
    setIsMotivosExpanded(true);
    setFotos([]);
    playSuccessSound();
  };

  const handleSimularScan = () => {
    const randomOf = Math.floor(100000000 + Math.random() * 900000000).toString();
    const barcode26 = `98200192${randomOf}82910293`.slice(0, 26);

    setEncargoEscaneado({
      codigoBarras26: barcode26,
      codigoOF9: randomOf,
    });
    setMotivoDeficiencia('Sin embalaje');
    setIsMotivosExpanded(true);
    setFotos([]);
    playSuccessSound();
  };

  // ─── Manejo de Cámara ────────────────────────────────────────────────────────
  const handleOpenCamera = async (mode: 'evidence' | 'scanBarcode' = 'scanBarcode') => {
    setCameraMode(mode);
    setIsCameraOpen(true);
    onCameraToggle?.(true);
    setCameraError(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setCameraError('Cámara no disponible en este dispositivo. Usando modo simulación rápida.');
      }
    } catch (err) {
      console.warn('No se pudo acceder a la cámara WebRTC:', err);
      setCameraError('Permiso de cámara no concedido o no disponible. Puedes escanear de prueba.');
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    onCameraToggle?.(false);
    setCameraError(null);
  };

  // Auto-detección del código de barras al encuadrar en la cámara
  useEffect(() => {
    if (isCameraOpen && cameraMode === 'scanBarcode') {
      const timer = setTimeout(() => {
        handleCloseCamera();
        handleSimularScan();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [isCameraOpen, cameraMode]);

  // Capturar foto desde la cámara activa o simulación
  const handleCapturePhoto = () => {
    if (fotos.length >= 3) return;

    if (videoRef.current && cameraStream && !cameraError) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFotos((prev) => [...prev, dataUrl]);
        playSuccessSound();
        return;
      }
    }

    // Fallback: foto simulada realista de caja
    const fallbackPhoto = FALLBACK_BOX_PHOTOS[fotos.length % FALLBACK_BOX_PHOTOS.length];
    setFotos((prev) => [...prev, fallbackPhoto]);
    playSuccessSound();
  };

  const handleDeletePhoto = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - fotos.length;
    if (remainingSlots <= 0) return;

    const filesToRead = Array.from(files).slice(0, remainingSlots);

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotos((prev) => {
            if (prev.length >= 3) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    playSuccessSound();
    e.target.value = '';
  };

  // ─── Validación y Guardado (Mínimo 1 fotografía requerida) ────────────────────
  const isFormValid = Boolean(motivoDeficiencia) && fotos.length >= 1;

  const handleGuardar = () => {
    if (!isFormValid || isSaving) return;

    setIsSaving(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setTimeout(() => {
      setIsSaving(false);
      setShowSuccessToast(true);
      playSuccessSound();

      // Resetear para volver a escanear el siguiente encargo
      setEncargoEscaneado(null);
      setMotivoDeficiencia('Sin embalaje');
      setIsMotivosExpanded(true);
      setFotos([]);

      toastTimeoutRef.current = window.setTimeout(() => {
        setShowSuccessToast(false);
      }, 3500);
    }, 600);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // PANTALLA: MODAL / VISTA DE CÁMARA A PANTALLA COMPLETA (IDÉNTICA A REDIMENSIÓN)
  // ══════════════════════════════════════════════════════════════════════════════
  if (isCameraOpen) {
    if (cameraMode === 'scanBarcode') {
      return (
        <div className="flex-1 flex flex-col h-full bg-[#1A1A1A] text-white relative overflow-hidden select-none animate-fadeIn font-sans">
          {/* Header de Cámara: Volver atrás + Título */}
          <div className="h-[52px] bg-[#303030] border-b border-gray-800 px-3.5 py-2 flex items-center justify-between shrink-0 z-20 shadow-md">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
                title="Volver atrás"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
              </button>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#00E676]" />
                <span>Escanear con Cámara</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={handleCloseCamera}
              className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Cerrar cámara"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewport de Cámara con mira de código de barras a pantalla completa */}
          <div
            onClick={() => {
              handleCloseCamera();
              handleSimularScan();
            }}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            title="Toca para escanear de inmediato"
          >
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Pill superior: Visor de escáner activo */}
            <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none z-10">
              <span className="bg-black/80 backdrop-blur-md text-[11px] font-sans text-gray-300 px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Visor de escáner activo
              </span>
            </div>

            {/* Retícula visual / Marco de escaneo de código de barras ampliado */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3 sm:px-4 z-20">
              <div className="w-[94%] max-w-md h-[460px] sm:h-[520px] max-h-[76vh] border-2 border-[#00E676] rounded-3xl relative flex items-center justify-center bg-emerald-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_35px_rgba(0,230,118,0.3)]">
                <div className="absolute -top-1.5 -left-1.5 w-8 h-8 border-t-4 border-l-4 border-[#00E676] rounded-tl-2xl" />
                <div className="absolute -top-1.5 -right-1.5 w-8 h-8 border-t-4 border-r-4 border-[#00E676] rounded-tr-2xl" />
                <div className="absolute -bottom-1.5 -left-1.5 w-8 h-8 border-b-4 border-l-4 border-[#00E676] rounded-bl-2xl" />
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 border-b-4 border-r-4 border-[#00E676] rounded-br-2xl" />
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
              </div>

              <div className="mt-5">
                <span className="bg-black/80 backdrop-blur-md text-xs font-semibold text-white px-4 py-1.5 rounded-full border border-white/15 shadow-md flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5 text-[#00E676]" />
                  <span>Centra el código de barras en el recuadro</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Modo evidence: Captura de fotos de la caja
    return (
      <div className="flex-1 flex flex-col h-full bg-[#1A1A1A] text-white relative overflow-hidden select-none animate-fadeIn font-sans">
        {/* Header de Cámara: Volver atrás + Título "Tomar foto" + Contador */}
        <div className="h-[52px] bg-[#303030] border-b border-gray-800 px-3.5 py-2 flex items-center justify-between shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseCamera}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              title="Volver atrás"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Tomar foto
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00E676] border border-emerald-500/30 text-xs font-mono font-bold">
              {fotos.length}/3
            </span>
          </div>
        </div>

        {/* Viewport de Cámara */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-gray-900 via-gray-950 to-black">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-emerald-400">
                <Box className="w-8 h-8 stroke-[1.8]" />
              </div>
              <p className="text-xs text-gray-300 max-w-xs mb-2">
                Simulador de captura de paquete activo. Presiona el botón obturador para capturar las fotografías requeridas.
              </p>
              <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Encargo: {encargoEscaneado?.codigoOF9 || 'OF-Activa'}
              </span>
            </div>
          )}

          <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-2 border-l-2 border-[#00E676] rounded-tl" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-[#00E676] rounded-tr" />
            </div>
            <div className="text-center">
              <span className="bg-black/60 backdrop-blur-xs text-[11px] font-medium text-gray-200 px-3 py-1 rounded-full border border-white/10">
                Encuadra la caja completa del encargo
              </span>
            </div>
            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-2 border-l-2 border-[#00E676] rounded-bl" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-[#00E676] rounded-br" />
            </div>
          </div>
        </div>

        {/* Barra Inferior: Miniaturas y Botón Obturador */}
        <div className="bg-[#242424] border-t border-gray-800 p-3 shrink-0 flex flex-col gap-2.5 z-20">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2].map((slotIdx) => {
              const foto = fotos[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="w-16 h-16 rounded-xl border border-gray-700 bg-black/40 relative overflow-hidden flex items-center justify-center shadow-xs"
                >
                  {foto ? (
                    <>
                      <img
                        src={foto}
                        alt={`Foto ${slotIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(slotIdx, e)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2.2]" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] font-mono text-white px-1 rounded">
                        #{slotIdx + 1}
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Camera className="w-4 h-4 opacity-40" />
                      <span className="text-[9px] font-mono mt-0.5">{slotIdx + 1}/3</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 items-center px-2 pt-1 w-full">
            <div />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={fotos.length >= 3}
                className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all ${
                  fotos.length >= 3
                    ? 'border-gray-600 bg-gray-700 opacity-40 cursor-not-allowed'
                    : 'border-white bg-[#009D4E] hover:bg-[#008743] active:scale-95 shadow-lg shadow-black/50 cursor-pointer'
                }`}
                title={fotos.length >= 3 ? 'Límite de 3 fotos alcanzado' : 'Capturar foto'}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PANTALLA PRINCIPAL: MÓDULO DE EMBALAJE DEFICIENTE
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFDFC] dark:bg-hub-base relative overflow-x-hidden font-sans select-none">
      {/* Toast Notificación de Éxito alineada al estándar de diseño Starken (costado derecho en Desktop) */}
      {showSuccessToast && (
        <div
          className={`${
            isPda
              ? 'fixed top-3 left-3 right-3 z-50'
              : 'fixed top-4 right-6 z-50 max-w-md w-full'
          } bg-[#EEFBF4] dark:bg-emerald-950/90 border border-[#A7F3D0] dark:border-emerald-700/80 text-[#065F46] dark:text-emerald-200 shadow-xl rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-slide-left transition-all`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#A7F3D0]/60 dark:bg-emerald-800/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#03F77C] stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-mono font-extrabold leading-tight text-[#065F46] dark:text-emerald-200">
                ¡Validación guardada con éxito!
              </h4>
              <p className="text-[11px] font-sans font-medium text-[#047857] dark:text-emerald-300/90 leading-tight mt-0.5">
                Registro de embalaje deficiente sincronizado en el sistema.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="p-1 rounded-lg text-[#065F46]/70 dark:text-emerald-300 hover:text-[#065F46] hover:bg-[#A7F3D0]/40 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
        {!encargoEscaneado ? (
          // ─── ESTADO 1: PANTALLA INICIAL DE ESCANEO ──────────────────────────────
          isPda ? (
            /* VISTA PDA: Card centrada compacta */
            <div className="flex-1 flex flex-col justify-start p-2 animate-fadeIn w-full">
              <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-3xl p-6 text-center mt-2 shadow-xs flex flex-col items-center animate-fadeIn w-full">
                <div className="w-20 h-20 mb-4 rounded-3xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                  <AlertTriangle className="w-10 h-10 stroke-[2.2]" />
                </div>

                <span className="px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold uppercase mb-3">
                  PRIMERA ACCIÓN REQUERIDA
                </span>

                <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 mb-1.5 leading-snug font-sans">
                  Escanee el encargo para ingresar el embalaje deficiente
                </h3>

                <p className="text-xs text-gray-500 dark:text-hub-text2 mb-5 max-w-xs leading-relaxed">
                  Escanea el código de barras del encargo. Si no dispones de escáner, puedes utilizar la cámara para escanearlo.
                </p>

                <div className="w-full space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenCamera('scanBarcode')}
                    className="w-full h-12 bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:text-[#303030] font-bold rounded-full text-xs shadow-md flex items-center justify-center gap-2 transition-all font-sans active:scale-[0.98] cursor-pointer"
                  >
                    <Camera className="w-4 h-4 stroke-[2.2]" />
                    <span>Utilizar Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimularScan}
                    className="w-full h-11 border-2 border-gray-300 dark:border-hub-border bg-white dark:bg-hub-surface hover:bg-gray-50 dark:hover:bg-hub-elevated active:bg-gray-100 text-gray-700 dark:text-hub-text1 font-bold rounded-full text-xs shadow-2xs flex items-center justify-center gap-2 transition-all font-sans active:scale-[0.98] cursor-pointer"
                  >
                    <Scan className="w-4 h-4 stroke-[2.2] text-[#009D4E] dark:text-[#03F77C]" />
                    <span>Simular Escaneo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA DESKTOP: Card amplia */
            <div className="min-h-[calc(100vh-220px)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
              <div className="bg-white dark:bg-hub-surface rounded-3xl p-10 sm:p-12 shadow-sm border border-gray-200/80 dark:border-hub-border text-center flex flex-col items-center justify-center animate-fadeIn max-w-lg w-full">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-xs">
                  <AlertTriangle className="w-10 h-10 stroke-[2.2]" />
                </div>

                <span className="px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold uppercase mb-3">
                  PRIMERA ACCIÓN REQUERIDA
                </span>

                <h2 className="text-xl sm:text-2xl font-black text-[#414745] dark:text-hub-text1 font-sans mb-2 leading-snug">
                  Escanee el encargo para ingresar el embalaje deficiente
                </h2>

                <p className="text-xs sm:text-sm text-gray-500 dark:text-hub-text2 font-medium max-w-md mb-6 leading-relaxed">
                  Escanea el código de barras del encargo. Si no dispones de escáner, puedes utilizar la cámara para escanearlo.
                </p>

                <div className="flex flex-col items-center gap-3 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => handleOpenCamera('scanBarcode')}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:text-[#303030] font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-3 transition-all font-sans cursor-pointer active:scale-[0.98]"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                    <span>Utilizar Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimularScan}
                    className="w-full sm:w-auto px-8 py-3 border-2 border-gray-300 dark:border-hub-border bg-white dark:bg-hub-surface hover:bg-gray-50 dark:hover:bg-hub-elevated active:bg-gray-100 text-gray-700 dark:text-hub-text1 font-extrabold rounded-2xl text-sm shadow-2xs flex items-center justify-center gap-3 transition-all font-sans cursor-pointer active:scale-[0.98]"
                  >
                    <Scan className="w-4 h-4 stroke-[2.2] text-[#009D4E] dark:text-[#03F77C]" />
                    <span>Simular Escaneo</span>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          // ─── ESTADO 2: ENCARGO ESCANEADO (COMPONENTES DE LA IMAGEN) ─────────────
          <div className="max-w-5xl mx-auto w-full space-y-4 animate-fadeIn">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* TARJETA 1: ENCARGO ESCANEADO */}
            <div className={`bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border shadow-xs flex items-center justify-between gap-3 ${
              isPda ? 'rounded-xl p-3' : 'rounded-2xl p-4 sm:p-5'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#009D4E]/10 dark:bg-emerald-950/70 border border-[#009D4E]/30 dark:border-emerald-600/40 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] shrink-0">
                  <Box className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-hub-text3">
                      {isPda ? 'Encargo' : 'Encargo Escaneado'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#009D4E] dark:text-emerald-300 font-mono text-[10px] font-extrabold border border-emerald-300 dark:border-emerald-800">
                      OF: {encargoEscaneado.codigoOF9}
                    </span>
                  </div>
                  <p className={`${isPda ? 'text-xs' : 'text-sm md:text-base'} font-mono font-black text-[#303030] dark:text-hub-text1 tracking-tight truncate mt-0.5`}>
                    {encargoEscaneado.codigoBarras26}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEncargoEscaneado(null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-hub-border text-xs font-bold text-gray-500 dark:text-hub-text2 hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Cambiar encargo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cambiar</span>
              </button>
            </div>

            {/* MOTIVO DE EMBALAJE DEFICIENTE (IDÉNTICO A REDIMENSIÓN) */}
            <div className={`rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 animate-fadeIn ${
              isPda ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
            }`}>
              {/* Cabecera */}
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Motivo de deficiencia:
                </span>
              </div>

              {/* Pastilla / Chip colapsable */}
              {!isMotivosExpanded ? (
                /* Estado colapsado: Muestra solo el motivo seleccionado y botón Cambiar */
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-hub-surface border border-amber-300 dark:border-amber-700/60 rounded-lg px-2.5 py-1.5 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-100 truncate">
                      {motivoDeficiencia || 'Sin embalaje'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMotivosExpanded(true)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 hover:bg-amber-200/90 dark:bg-amber-900/50 hover:dark:bg-amber-900/80 px-2 py-0.5 rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cambiar</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                /* Estado expandido: Muestra las 5 opciones para elegir */
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-[10px] text-amber-700/80 dark:text-amber-400 font-semibold px-0.5">
                    <span>Selecciona un motivo:</span>
                    <button
                      type="button"
                      onClick={() => setIsMotivosExpanded(false)}
                      className="text-amber-600 hover:text-amber-800 dark:text-amber-300 font-bold underline cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className={`grid ${isPda ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'}`}>
                    {MOTIVOS_DEFICIENCIA.map((motivo) => {
                      const isSelected = motivoDeficiencia === motivo;
                      return (
                        <button
                          key={motivo}
                          type="button"
                          onClick={() => {
                            setMotivoDeficiencia(motivo);
                            setIsMotivosExpanded(false);
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-white font-bold shadow-xs'
                              : 'bg-white dark:bg-hub-surface text-gray-700 dark:text-hub-text2 border border-amber-200/70 dark:border-hub-border hover:bg-amber-100/50'
                          }`}
                        >
                          <span className="truncate">{motivo}</span>
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* TARJETA: FOTOGRAFÍAS DE LA CAJA (COMPONENTE DE LA IMAGEN) */}
            <div className={`bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border shadow-xs flex flex-col justify-between ${
              isPda ? 'rounded-xl p-3 space-y-2.5' : 'rounded-2xl p-4 sm:p-5'
            }`}>
                <div>
                  {/* Encabezado con Icono Nube, Título en Mayúsculas y Contador 0/3 */}
                  <div className={`flex items-center justify-between border-b border-gray-100 dark:border-hub-border ${isPda ? 'pb-2' : 'pb-2.5'}`}>
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-hub-text3">
                        Fotografías de la Caja
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#009D4E] dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                      {fotos.length}/3
                    </span>
                  </div>

                  {/* Subtítulo literal de la imagen */}
                  <p className="text-xs text-gray-500 dark:text-hub-text2 mt-2.5 mb-3.5 leading-tight">
                    Adjunta hasta 3 archivos de imágenes de la caja para respaldar las medidas.
                  </p>

                  {/* Grid de 3 Slots de Imágenes: Slot 1 Requerida, Slots 2 y 3 Opcionales */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {[0, 1, 2].map((idx) => {
                      const fotoUrl = fotos[idx];
                      return (
                        <div
                          key={idx}
                          className={`${isPda ? 'h-[64px]' : 'h-[74px]'} rounded-xl border border-gray-200 dark:border-hub-border bg-gray-50/80 dark:bg-hub-base relative overflow-hidden flex flex-col items-center justify-center group`}
                        >
                          {fotoUrl ? (
                            <>
                              <img
                                src={fotoUrl}
                                alt={`Caja foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => handleDeletePhoto(idx, e)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer"
                                title="Eliminar fotografía"
                              >
                                <Trash2 className="w-3 h-3 stroke-[2.2]" />
                              </button>
                              <span className="absolute bottom-1 left-1 bg-black/75 backdrop-blur-xs text-[9px] font-mono text-white px-1 rounded">
                                #{idx + 1}
                              </span>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (isPda) {
                                  handleOpenCamera('evidence');
                                } else {
                                  fileInputRef.current?.click();
                                }
                              }}
                              className="w-full h-full flex flex-col items-center justify-center p-1 text-gray-400 hover:text-[#009D4E] hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                            >
                              <UploadCloud className="w-4 h-4 mb-1 stroke-[1.8] text-gray-400 group-hover:text-[#009D4E]" />
                              <span className="text-[11px] font-bold leading-none text-gray-700 dark:text-hub-text2">
                                Adjuntar {idx + 1}
                              </span>
                              <span className="text-[9px] font-mono opacity-70 leading-none mt-1">
                                {idx === 0 ? 'Requerida' : 'Opcional'}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón de Acción y Formatos */}
                <div className="pt-3 mt-3 space-y-2 border-t border-gray-100 dark:border-hub-border/60">
                  {isPda ? (
                    <button
                      type="button"
                      onClick={() => handleOpenCamera('evidence')}
                      disabled={fotos.length >= 3}
                      className={`w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        fotos.length >= 3
                          ? 'bg-gray-100 dark:bg-hub-elevated text-gray-400 border border-gray-200 dark:border-hub-border cursor-not-allowed'
                          : 'bg-white dark:bg-hub-surface text-gray-700 dark:text-hub-text1 border border-gray-300 dark:border-hub-border hover:bg-gray-50 dark:hover:bg-hub-elevated hover:border-[#009D4E] dark:hover:border-emerald-500 hover:text-[#009D4E] dark:hover:text-emerald-400 active:scale-[0.99] shadow-2xs cursor-pointer'
                      }`}
                    >
                      <Camera className={`w-4 h-4 ${fotos.length >= 3 ? 'text-gray-400' : 'text-[#009D4E] dark:text-emerald-400'}`} />
                      <span>
                        {fotos.length >= 3 ? '3 Fotos tomadas' : 'Tomar Fotografías'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={fotos.length >= 3}
                      className={`w-full h-11 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                        fotos.length >= 3
                          ? 'bg-gray-100 dark:bg-hub-base text-gray-400 border border-gray-200 dark:border-hub-border cursor-not-allowed'
                          : 'bg-white dark:bg-hub-surface text-gray-700 dark:text-hub-text1 border border-gray-300 dark:border-hub-border hover:bg-gray-50 dark:hover:bg-hub-elevated hover:border-[#009D4E] dark:hover:border-emerald-500 hover:text-[#009D4E] dark:hover:text-emerald-400 active:scale-[0.99] shadow-2xs cursor-pointer'
                      }`}
                    >
                      <UploadCloud className={`w-4 h-4 ${fotos.length >= 3 ? 'text-gray-400' : 'text-[#009D4E] dark:text-emerald-400'}`} />
                      <span>
                        {fotos.length >= 3 ? '3 Archivos adjuntados' : 'Adjuntar Fotografías'}
                      </span>
                    </button>
                  )}

                  <div className="text-[10px] font-mono text-gray-400 dark:text-hub-text3 text-center">
                    Formatos: JPG, PNG, WEBP (hasta 3 imágenes)
                  </div>
                </div>
              </div>

            {/* BOTÓN GUARDAR */}
            <div className={`${isPda ? 'pt-2 pb-3' : 'pt-3 flex justify-end'}`}>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={!isFormValid || isSaving}
                className={`w-full ${isPda ? 'h-12 rounded-full text-sm' : 'md:w-auto md:min-w-[220px] px-8 h-12 rounded-xl text-sm md:text-base'} font-extrabold flex items-center justify-center gap-2.5 transition-all font-sans ${
                  !isFormValid || isSaving
                    ? 'bg-gray-200 dark:bg-hub-elevated text-gray-400 dark:text-hub-text3 cursor-not-allowed opacity-60 border border-gray-300/40 dark:border-hub-border shadow-none'
                    : 'bg-[#009D4E] hover:bg-[#008743] active:bg-[#007037] text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:active:bg-[#02B55A] dark:text-[#303030] cursor-pointer active:scale-[0.99] shadow-md dark:shadow-emerald-500/20'
                }`}
                title={
                  !motivoDeficiencia
                    ? 'Selecciona un motivo de deficiencia para continuar'
                    : fotos.length < 1
                    ? 'Adjunta al menos una fotografía de la caja'
                    : 'Guardar validación'
                }
              >
                <Save className={`w-4 h-4 stroke-[2.5] ${isSaving ? 'animate-spin' : ''} ${
                  !isFormValid || isSaving ? 'text-gray-400 dark:text-hub-text3' : 'text-white dark:text-[#303030]'
                }`} />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
