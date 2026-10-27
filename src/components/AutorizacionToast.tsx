import React from 'react';
import { ShieldAlert, X, MapPin } from 'lucide-react';
import { useAutorizaciones } from '../context/AutorizacionesContext';
import { useDevice } from '../context/DeviceContext';

interface AutorizacionToastProps {
  onNavigate?: (module: import('../types').ActiveModule) => void;
}

export const AutorizacionToast: React.FC<AutorizacionToastProps> = ({ onNavigate }) => {
  const { toastNotification, dismissToast, setSolicitudSeleccionada } = useAutorizaciones();
  const { isPda } = useDevice();

  if (!toastNotification) return null;

  const handleVerSolicitud = () => {
    setSolicitudSeleccionada(toastNotification);
    dismissToast();
    onNavigate?.('autorizaciones');
  };

  return (
    <div
      className={`fixed z-[120] pointer-events-auto animate-bounce-subtle ${
        isPda
          ? 'top-3 inset-x-3'
          : 'top-20 right-6 max-w-sm w-full'
      }`}
    >
      <div
        onClick={handleVerSolicitud}
        className="bg-white dark:bg-hub-surface border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 relative overflow-hidden cursor-pointer hover:border-amber-500 transition-all"
      >
        {/* Barra superior de acento animada */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-[#009D4E] animate-pulse" />

        <div className="flex items-start justify-between gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-700 dark:text-amber-400">
                NUEVA SOLICITUD DE DESBLOQUEO
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <h5 className="text-xs font-black text-[#303030] dark:text-hub-text1 truncate">
              {toastNotification.usuario} ({toastNotification.usuarioId})
            </h5>
            <p className="text-[11px] text-gray-500 dark:text-hub-text2 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#009D4E] shrink-0" />
              <span className="font-bold text-[#009D4E] dark:text-[#03F77C]">{toastNotification.ubicacion}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-hub-text1 transition-colors cursor-pointer"
            title="Descartar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
