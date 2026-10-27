import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  User,
  Clock,
  ArrowLeft,
  Camera,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { useAutorizaciones, SolicitudAutorizacion } from '../context/AutorizacionesContext';
import { useDevice } from '../context/DeviceContext';

// Generador de matriz SVG para código QR decorativo nítido de alta fidelidad
const QrMatrix: React.FC<{ value: string; size?: number }> = ({ size = 180 }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-white p-3 rounded-2xl border-2 border-gray-900 shadow-sm flex flex-col items-center justify-between relative"
    >
      {/* 4 esquinas de posicionamiento QR estándar */}
      <div className="w-full flex justify-between">
        <div className="w-9 h-9 border-4 border-gray-950 rounded-lg flex items-center justify-center p-1">
          <div className="w-4 h-4 bg-gray-950 rounded-xs" />
        </div>
        <div className="w-9 h-9 border-4 border-gray-950 rounded-lg flex items-center justify-center p-1">
          <div className="w-4 h-4 bg-gray-950 rounded-xs" />
        </div>
      </div>

      {/* Núcleo con patrón y logo Starken */}
      <div className="my-auto flex flex-col items-center justify-center gap-1">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-2xs ${
                (i * 7 + 13) % 3 === 0 ? 'bg-gray-950' : (i * 3 + 5) % 2 === 0 ? 'bg-gray-800' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        <div className="px-1.5 py-0.5 rounded-md bg-[#009D4E] text-white text-[8px] font-black tracking-widest uppercase">
          STARKEN
        </div>
      </div>

      <div className="w-full flex justify-between">
        <div className="w-9 h-9 border-4 border-gray-950 rounded-lg flex items-center justify-center p-1">
          <div className="w-4 h-4 bg-gray-950 rounded-xs" />
        </div>
        <div className="flex items-center justify-center pr-1">
          <div className="w-4 h-4 bg-gray-950 rounded-xs" />
        </div>
      </div>
    </div>
  );
};

interface AutorizacionesModuleProps {
  onBackHome?: () => void;
}

export const AutorizacionesModule: React.FC<AutorizacionesModuleProps> = ({ onBackHome: _onBackHome }) => {
  const { isPda } = useDevice();
  const {
    solicitudes,
    pendingCount,
    autorizarSolicitudPresencial,
    simularNuevaSolicitud,
    solicitudSeleccionada,
  } = useAutorizaciones();

  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [viewMode, setViewMode] = useState<'lista' | 'escaner' | 'pantalla_operario'>('lista');
  const [solicitudEnAccion, setSolicitudEnAccion] = useState<SolicitudAutorizacion | null>(null);
  const [autorizacionExitosa, setAutorizacionExitosa] = useState<SolicitudAutorizacion | null>(null);
  const [isScanningSimulation, setIsScanningSimulation] = useState(false);
  const [showDesktopScanModal, setShowDesktopScanModal] = useState<SolicitudAutorizacion | null>(null);
  const [desbloqueoConfirmado, setDesbloqueoConfirmado] = useState<SolicitudAutorizacion | null>(null);
  const [operarioDesbloqueado, setOperarioDesbloqueado] = useState(false);
  void operarioDesbloqueado;
  void setOperarioDesbloqueado;

  useEffect(() => {
    if (solicitudSeleccionada) {
      if (solicitudSeleccionada.estado === 'pendiente') {
        setActiveTab('pendientes');
      } else {
        setActiveTab('historial');
      }
    }
  }, [solicitudSeleccionada]);

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const historial = solicitudes.filter((s) => s.estado !== 'pendiente');
  const totalAutorizados = historial.filter((s) => s.estado === 'autorizado').length;

  const handleAutorizarClick = (s: SolicitudAutorizacion) => {
    setDesbloqueoConfirmado(null);
    setShowDesktopScanModal(s);
  };

  const handleIniciarEscaneoPresencial = (s: SolicitudAutorizacion) => {
    setSolicitudEnAccion(s);
    setViewMode('escaner');
    setAutorizacionExitosa(null);
  };

  const handleEjecutarEscaneoPresencial = () => {
    if (!solicitudEnAccion || isScanningSimulation) return;
    setIsScanningSimulation(true);

    setTimeout(() => {
      autorizarSolicitudPresencial(solicitudEnAccion.id, 'Byron Guerra (Supervisor)');
      setAutorizacionExitosa(solicitudEnAccion);
      setIsScanningSimulation(false);
    }, 450);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#FAFDFC] dark:bg-hub-base font-sans select-none animate-fadeIn">
      <div className={`w-full font-sans ${isPda ? 'p-3 space-y-3 pb-6' : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6'}`}>
        {/* ========================================================================= */}
        {/* CABECERA / BANNER (EN DESKTOP COMO TARJETA CONTENIDA CON MISMOS MÁRGENES)  */}
        {/* ========================================================================= */}
        {!isPda && (
          <div className="bg-white dark:bg-hub-surface rounded-2xl px-5 py-3.5 border border-gray-200/80 dark:border-hub-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base sm:text-lg font-black text-[#303030] dark:text-hub-text1 font-sans leading-tight">
                    Supervisión Logística
                  </h1>
                  {pendingCount > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black animate-pulse shadow-2xs shrink-0">
                      {pendingCount} PENDIENTE{pendingCount > 1 ? 'S' : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-hub-elevated text-gray-400 text-[10px] font-mono font-bold shrink-0">
                      0 pendientes
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-0.5">
                  Validación física en rampa mediante escaneo presencial de QR en la PDA del operario.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Botón para Simular Solicitud */}
              <button
                type="button"
                onClick={simularNuevaSolicitud}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Simular Solicitud</span>
              </button>
            </div>
          </div>
        )}
        {/* ======================================================================= */}
        {/* ======================================================================= */}
        {/* TARJETAS INTERACTIVAS DE CONTROL Y CAMBIO DE VISTA                     */}
        {/* ======================================================================= */}
        {viewMode === 'lista' && (
          <div className="space-y-2.5">
            {isPda && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-500 dark:text-hub-text2">
                  Selecciona una vista:
                </span>
                <button
                  type="button"
                  onClick={simularNuevaSolicitud}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>+ Simular</span>
                </button>
              </div>
            )}

            {/* ── BARRA SEGMENTADA DE CONTROL (CONSISTENCIA VISUAL CON RECEPCIÓN) ── */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-hub-elevated rounded-2xl border border-gray-200/80 dark:border-hub-border shadow-2xs">
              {/* Tab 1: En espera */}
              <button
                type="button"
                onClick={() => setActiveTab('pendientes')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'pendientes'
                    ? 'bg-white dark:bg-hub-surface text-gray-900 dark:text-hub-text1 shadow-xs font-black'
                    : 'text-gray-500 dark:text-hub-text3 hover:text-gray-800 dark:hover:text-hub-text2'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 stroke-[2.2] ${
                    activeTab === 'pendientes'
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-gray-400 dark:text-hub-text3'
                  }`}
                />
                <span>En espera</span>
                {pendientes.length > 0 ? (
                  <span
                    className={`min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-black font-mono flex items-center justify-center ${
                      activeTab === 'pendientes'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {pendientes.length}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-gray-400 dark:text-hub-text3">
                    (0)
                  </span>
                )}
              </button>

              {/* Tab 2: Autorizadas */}
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'historial'
                    ? 'bg-white dark:bg-hub-surface text-gray-900 dark:text-hub-text1 shadow-xs font-black'
                    : 'text-gray-500 dark:text-hub-text3 hover:text-gray-800 dark:hover:text-hub-text2'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 stroke-[2.2] ${
                    activeTab === 'historial'
                      ? 'text-[#009D4E] dark:text-[#03F77C]'
                      : 'text-gray-400 dark:text-hub-text3'
                  }`}
                />
                <span>Autorizadas</span>
                <span className="font-mono text-[10px] text-gray-400 dark:text-hub-text3">
                  ({totalAutorizados})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VISTA 1: LISTADO DE SOLICITUDES                                         */}
        {/* ======================================================================= */}
        {viewMode === 'lista' && (
          <div className="space-y-3.5">
            {activeTab === 'pendientes' ? (
              pendientes.length === 0 ? (
                <div className="py-16 bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mb-3">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <h4 className="text-base font-extrabold text-[#303030] dark:text-hub-text1 mb-1">
                    No hay solicitudes pendientes en este momento
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 max-w-sm mb-4">
                    Todas las rampas y encasillados se encuentran operando con normalidad.
                  </p>
                  <button
                    type="button"
                    onClick={simularNuevaSolicitud}
                    className="px-4 py-2 rounded-xl bg-[#009D4E] hover:bg-[#008743] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Simular nueva llamada de operario</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendientes.map((sol) => {
                    const isSelected = solicitudSeleccionada?.id === sol.id;
                    return (
                    <div
                      key={sol.id}
                      className={`bg-white dark:bg-hub-surface border ${
                        isSelected
                          ? 'border-[#009D4E] dark:border-[#03F77C] ring-1 ring-[#009D4E]/30 shadow-md'
                          : 'border-gray-200/90 dark:border-hub-border shadow-xs hover:border-gray-300 dark:hover:border-hub-borderHover'
                      } rounded-2xl p-5 hover:shadow-md transition-all space-y-3.5 text-left relative overflow-hidden`}
                    >
                      {/* Cabecera de la Solicitud (En columna: tiempo a la derecha arriba, badge a la izquierda abajo) */}
                      <div className="flex flex-col gap-1.5 pb-2.5 border-b border-gray-100 dark:border-hub-border">
                        {/* Fila 1: Tiempo de espera alineado a la derecha */}
                        <div className="flex justify-end w-full">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{sol.tiempoEspera}</span>
                          </div>
                        </div>

                        {/* Fila 2: Badge del tipo de bloqueo alineado a la izquierda */}
                        <div className="flex flex-wrap items-center justify-start gap-2 w-full">
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black uppercase leading-tight">
                            {sol.tipoBloqueo}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[#009D4E] text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                              Notificación abierta
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Datos del Operario y la Rampa */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-hub-text1">
                          <User className="w-4 h-4 text-[#009D4E] shrink-0" />
                          <div>
                            <span className="text-[10px] text-gray-400 dark:text-hub-text3 block font-mono">
                              Operario solicitante:
                            </span>
                            <span className="font-extrabold text-sm">{sol.usuario}</span>{' '}
                            <span className="text-[10px] font-mono text-gray-400">({sol.usuarioId})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700 dark:text-hub-text1">
                          <MapPin className="w-4 h-4 text-[#009D4E] shrink-0" />
                          <div>
                            <span className="text-[10px] text-gray-400 dark:text-hub-text3 block font-mono">
                              Ubicación a dirigirse:
                            </span>
                            <span className="font-extrabold text-sm text-[#009D4E] dark:text-[#03F77C]">
                              {sol.ubicacion}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botón de Acción Principal: Autorizar */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAutorizarClick(sol)}
                          className="w-full py-3 px-4 rounded-xl sm:rounded-2xl bg-[#009D4E] hover:bg-[#008743] active:bg-[#007037] text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                        >
                          <QrCode className="w-4 h-4 stroke-[2.2]" />
                          <span>Autorizar</span>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* HISTORIAL */
              <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
                {historial.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Aún no se registran autorizaciones completadas en este turno.
                  </div>
                ) : (
                  historial.map((sol) => (
                    <div
                      key={sol.id}
                      className="bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-4 text-left space-y-2.5 shadow-2xs hover:shadow-xs transition-all"
                    >
                      {/* Fila 1: Badge de Estado */}
                      <div className="flex items-center justify-end pb-2 border-b border-gray-100 dark:border-hub-border">
                        {sol.estado === 'autorizado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wide border border-emerald-300 dark:border-emerald-700 shrink-0">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Autorizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wide border border-rose-300 dark:border-rose-700 shrink-0">
                            <X className="w-3 h-3 stroke-[2.5]" />
                            Rechazado
                          </span>
                        )}
                      </div>

                      {/* Fila 2: Operario solicitante (ancho completo sin colapso de texto) */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-sm text-[#303030] dark:text-hub-text1">
                            {sol.usuario}
                          </span>
                          <span className="text-xs font-mono text-gray-400 dark:text-hub-text3 ml-1.5">
                            ({sol.usuarioId})
                          </span>
                        </div>
                      </div>

                      {/* Fila 3: Ubicación y motivo de bloqueo */}
                      <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-hub-text2">
                        <MapPin className="w-4 h-4 text-gray-400 dark:text-hub-text3 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <span className="font-semibold text-gray-800 dark:text-hub-text1">{sol.ubicacion}</span>
                          <span className="text-gray-400 dark:text-hub-text3 mx-1.5">•</span>
                          <span className="text-gray-500 dark:text-hub-text3">{sol.tipoBloqueo}</span>
                        </div>
                      </div>

                      {/* Fila 4: Auditoría de autorización o rechazo */}
                      {sol.autorizadoAt && (
                        <div className="pt-2 border-t border-dashed border-gray-200/90 dark:border-hub-border flex items-center gap-1.5 text-[11px] font-mono text-[#009D4E] dark:text-[#03F77C] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Autorizado a las <strong className="font-bold">{sol.autorizadoAt}</strong> por {sol.autorizadoPor}
                          </span>
                        </div>
                      )}

                      {sol.motivoRechazo && (
                        <div className="pt-2 border-t border-dashed border-rose-200/90 dark:border-hub-border flex items-center gap-1.5 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Motivo: <strong className="font-bold">{sol.motivoRechazo}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VISTA 2: ESCÁNER DE AUTORIZACIÓN PRESENCIAL (SUPERVISOR)                 */}
        {/* ======================================================================= */}
        {viewMode === 'escaner' && solicitudEnAccion && (
          <div className="max-w-md mx-auto bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border">
              <button
                type="button"
                onClick={() => {
                  setViewMode('lista');
                  setAutorizacionExitosa(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-hub-text2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la bandeja</span>
              </button>
              <span className="text-xs font-mono font-bold text-gray-400">
                Paso Presencial
              </span>
            </div>

            {!autorizacionExitosa ? (
              <>
                {/* Resumen de a dónde acudir */}
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Ubicación presencial: {solicitudEnAccion.ubicacion}</span>
                  </div>
                  <div className="text-xs text-amber-800 dark:text-amber-300/80 pl-6 mt-0.5">
                    Operario: <span className="font-extrabold">{solicitudEnAccion.usuario}</span> ({solicitudEnAccion.tipoBloqueo})
                  </div>
                </div>

                {/* Visor de Cámara con Simulación Láser de Escaneo */}
                <div className="w-full aspect-square max-w-[280px] bg-slate-950 rounded-3xl relative border-4 border-[#303030] dark:border-hub-border overflow-hidden shadow-2xl flex items-center justify-center mx-auto">
                  <div className="absolute inset-6 border-2 border-dashed border-[#009D4E]/60 rounded-2xl pointer-events-none" />
                  <div className="absolute inset-x-8 h-1 bg-[#03F77C] shadow-[0_0_12px_#03F77C] animate-pulse top-1/2 -translate-y-1/2" />

                  <div className="flex flex-col items-center justify-center text-gray-500 z-10">
                    <Camera className="w-12 h-12 stroke-[1.8] text-white/40 mb-2" />
                    <span className="text-[11px] font-mono text-white/70">
                      {isScanningSimulation ? 'Validando código QR...' : 'Apunte al QR del operario'}
                    </span>
                  </div>

                  <div className="absolute top-4 left-4 w-5 h-5 border-t-3 border-l-3 border-[#009D4E] rounded-tl-md" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-3 border-r-3 border-[#009D4E] rounded-tr-md" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-3 border-l-3 border-[#009D4E] rounded-bl-md" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-3 border-r-3 border-[#009D4E] rounded-br-md" />
                </div>

                <p className="text-xs text-gray-600 dark:text-hub-text2 leading-relaxed">
                  Apunte la cámara de su PDA al código QR mostrado en la pantalla de{' '}
                  <strong>{solicitudEnAccion.usuario}</strong> en la <strong>{solicitudEnAccion.ubicacion}</strong>.
                </p>

                {/* Botón de Simulación de Escaneo */}
                <div className="w-full space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isScanningSimulation}
                    onClick={handleEjecutarEscaneoPresencial}
                    className="w-full h-12 bg-[#009D4E] hover:bg-[#008743] active:bg-[#007037] text-white font-extrabold rounded-full text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <QrCode className={`w-4 h-4 ${isScanningSimulation ? 'animate-spin' : ''}`} />
                    <span>
                      {isScanningSimulation ? 'Validando QR presencial...' : '⚡ Simular Escaneo Presencial de QR'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('lista')}
                    className="w-full h-10 border border-gray-300 dark:border-hub-border hover:bg-gray-100 text-gray-700 dark:text-hub-text1 font-bold rounded-full text-xs transition-all cursor-pointer"
                  >
                    Cancelar y volver
                  </button>
                </div>
              </>
            ) : (
              /* ESTADO DE ÉXITO */
              <div className="py-6 space-y-4 animate-scale-up">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-[#009D4E] dark:border-[#03F77C] flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto shadow-lg">
                  <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
                </div>

                <div>
                  <h4 className="text-lg font-black text-[#303030] dark:text-hub-text1">
                    ¡Se realizó el desbloqueo con éxito!
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 mt-1">
                    El operario <strong>{solicitudEnAccion.usuario}</strong> ha sido desbloqueado en tiempo real en la{' '}
                    <strong>{solicitudEnAccion.ubicacion}</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-hub-base border border-gray-200 dark:border-hub-border text-left space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Folio:</span>
                    <span className="font-bold text-gray-800 dark:text-hub-text1">{solicitudEnAccion.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Autorizado por:</span>
                    <span className="font-bold text-[#009D4E] dark:text-[#03F77C]">Byron Guerra (Supervisor)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Causal:</span>
                    <span className="font-bold text-gray-800 dark:text-hub-text1">{solicitudEnAccion.tipoBloqueo}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('lista');
                    setAutorizacionExitosa(null);
                  }}
                  className="w-full h-11 bg-[#303030] hover:bg-[#202020] text-white dark:bg-[#03F77C] dark:text-[#303030] font-extrabold rounded-full text-xs shadow-md flex items-center justify-center transition-all cursor-pointer"
                >
                  <span>Volver a la Bandeja de Solicitudes</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* VISTA 3: PANTALLA DE LA PDA DEL OPERARIO (CONTRAPARTE CON QR)           */}
        {/* ======================================================================= */}
        {viewMode === 'pantalla_operario' && solicitudEnAccion && (
          <div className="max-w-md mx-auto bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border">
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-hub-text2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la bandeja</span>
              </button>
              <span className="text-xs font-mono font-bold text-gray-400">
                PDA del Operario
              </span>
            </div>

            {operarioDesbloqueado ? (
              <div className="py-4 space-y-4 animate-scale-up">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-[#009D4E] dark:border-[#03F77C] flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto shadow-md animate-bounce">
                  <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 text-[10px] font-mono font-black uppercase inline-block mb-1.5">
                    DESBLOQUEO EXITOSO
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-[#303030] dark:text-hub-text1">
                    ¡Se realizó el desbloqueo con éxito!
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-hub-text2 mt-1 leading-relaxed">
                    Tu supervisor <strong>Byron Guerra</strong> ha escaneado tu código QR y ha autorizado la operación. El bloqueo ha sido levantado y puedes continuar trabajando.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Folio:</span>
                    <span className="font-bold text-gray-900 dark:text-hub-text1">{solicitudEnAccion.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Operario:</span>
                    <span className="font-bold text-gray-900 dark:text-hub-text1">{solicitudEnAccion.usuario}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estado:</span>
                    <span className="font-bold text-[#009D4E] dark:text-[#03F77C]">OPERACIÓN DESBLOQUEADA</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('lista');
                    setOperarioDesbloqueado(false);
                    setActiveTab('historial');
                  }}
                  className="w-full h-11 bg-[#009D4E] hover:bg-[#008743] text-white font-extrabold rounded-full text-xs shadow-md flex items-center justify-center transition-all cursor-pointer"
                >
                  <span>Continuar Operación</span>
                </button>
              </div>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 text-[10px] font-mono font-black uppercase inline-block">
                  BLOQUEO: AUTORIZACIÓN PRESENCIAL REQUERIDA
                </span>

                <div>
                  <h4 className="text-sm font-extrabold text-[#303030] dark:text-hub-text1">
                    Muestra este código QR a tu supervisor
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-hub-text2 mt-0.5">
                    Operario: <strong>{solicitudEnAccion.usuario}</strong> en <strong>{solicitudEnAccion.ubicacion}</strong>
                  </p>
                </div>

                {/* Código QR Generado */}
                <div className="flex justify-center py-2">
                  <QrMatrix value={solicitudEnAccion.qrPayload} size={190} />
                </div>

                <div className="text-[11px] font-mono text-gray-400 bg-gray-50 dark:bg-hub-base p-2.5 rounded-xl border border-gray-200 dark:border-hub-border break-all">
                  Payload: {solicitudEnAccion.qrPayload}
                </div>

                {/* Botón directo para simular escaneo */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      autorizarSolicitudPresencial(solicitudEnAccion.id, 'Byron Guerra (Supervisor)');
                      setOperarioDesbloqueado(true);
                    }}
                    className="w-full h-11 bg-[#009D4E] hover:bg-[#008743] text-white font-extrabold rounded-full text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Simular escaneo de autorización (Desbloquear)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleIniciarEscaneoPresencial(solicitudEnAccion)}
                    className="w-full h-10 border border-gray-300 dark:border-hub-border hover:bg-gray-100 text-gray-700 dark:text-hub-text1 font-bold rounded-full text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Pasar al Escáner del Supervisor</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* POPUP MODAL EN DESKTOP: ESCANEAR QR DEL OPERARIO PARA DESBLOQUEAR       */}
        {/* ======================================================================= */}
        {showDesktopScanModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-center space-y-4 animate-scale-up relative">
              <button
                type="button"
                onClick={() => {
                  setShowDesktopScanModal(null);
                  setDesbloqueoConfirmado(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-hub-text1 hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>

              {desbloqueoConfirmado ? (
                /* Estado tras simular el escaneo: Mensaje claro de desbloqueo realizado */
                <div className="py-2 space-y-4 animate-scale-up">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-[#009D4E] dark:border-[#03F77C] flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto shadow-md">
                    <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
                  </div>

                  <div>
                    <span className="px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 text-[10px] font-mono font-black uppercase inline-block mb-1.5">
                      OPERACIÓN DESBLOQUEADA
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-[#303030] dark:text-hub-text1">
                      ¡Se realizó el desbloqueo con éxito!
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 text-xs font-mono space-y-2 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-400 w-32 shrink-0">Folio:</span>
                      <span className="font-bold text-gray-800 dark:text-hub-text1">
                        {desbloqueoConfirmado.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-400 w-32 shrink-0">Operario:</span>
                      <span className="font-bold text-gray-800 dark:text-hub-text1">
                        {desbloqueoConfirmado.usuario}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-gray-400 w-32 shrink-0">Ubicación:</span>
                      <span className="font-bold text-[#009D4E] dark:text-[#03F77C] leading-tight">
                        {desbloqueoConfirmado.ubicacion}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-gray-400 w-32 shrink-0">Autorizado por:</span>
                      <span className="font-bold text-[#009D4E] dark:text-[#03F77C] leading-tight">
                        Byron Guerra (Supervisor)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDesktopScanModal(null);
                      setDesbloqueoConfirmado(null);
                      setActiveTab('historial');
                    }}
                    className="w-full py-3 rounded-full bg-[#009D4E] hover:bg-[#008743] active:bg-[#007037] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    Aceptar y ver historial
                  </button>
                </div>
              ) : (
                /* Estado inicial: Explicación de que se debe escanear el QR */
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto shadow-2xs">
                    <QrCode className="w-8 h-8 stroke-[2.2]" />
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#303030] dark:text-hub-text1">
                      Escanea el QR para desbloquear
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-hub-text2 mt-2 leading-relaxed">
                      Para autorizar esta solicitud, acércate presencialmente y escanea con tu PDA el código QR que se visualiza en la pantalla del operario.
                    </p>
                  </div>

                  {/* Ficha rápida de ubicación */}
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-hub-base border border-gray-200/80 dark:border-hub-border text-left space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Operario:</span>
                      <span className="font-extrabold text-gray-800 dark:text-hub-text1">
                        {showDesktopScanModal.usuario} ({showDesktopScanModal.usuarioId})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Ubicación:</span>
                      <span className="font-extrabold text-[#009D4E] dark:text-[#03F77C]">
                        {showDesktopScanModal.ubicacion}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono">Motivo:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {showDesktopScanModal.tipoBloqueo}
                      </span>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        autorizarSolicitudPresencial(showDesktopScanModal.id, 'Byron Guerra (Supervisor)');
                        setDesbloqueoConfirmado(showDesktopScanModal);
                      }}
                      className="w-full py-3 rounded-full bg-[#009D4E] hover:bg-[#008743] active:bg-[#007037] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simular escaneo presencial (Modo Demo)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
