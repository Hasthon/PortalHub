import React from 'react';
import { UbicacionEncasillado } from '../types';
import { QrCode, Scan, X } from 'lucide-react';

interface LocationQrModalProps {
  isOpen: boolean;
  onSelectLocation: (ubicacion: UbicacionEncasillado) => void;
  onClose?: () => void;
  currentLocationNumber?: string;
}

export const PRESET_UBICACIONES: UbicacionEncasillado[] = [
  {
    id: 'UB-24',
    codeQr: 'UB-RAMPA-24-PMC',
    nombreEstacion: 'Rampa 24 - Puerto Montt',
    pasilloPredeterminado: 'AZUL',
    rampaAsociada: 'Rampa 24 - Salida Sur (Puerto Montt / Chiloé)',
    zonaDestino: 'Los Lagos y Regiones del Sur',
  },
  {
    id: 'UB-01',
    codeQr: 'UB-RAMPA-01-STG',
    nombreEstacion: 'Rampa 01 - Santiago Norte',
    pasilloPredeterminado: 'ROJO',
    rampaAsociada: 'Rampa 01 - Salida Norte (Santiago / V Región)',
    zonaDestino: 'Zona Central y RM',
  },
  {
    id: 'UB-12',
    codeQr: 'UB-RAMPA-12-CCP',
    nombreEstacion: 'Rampa 12 - Concepción',
    pasilloPredeterminado: 'VERDE',
    rampaAsociada: 'Rampa 12 - Salida Centro Sur (Concepción / Temuco)',
    zonaDestino: 'Biobío y Araucanía',
  },
];

export const LocationQrModal: React.FC<LocationQrModalProps> = ({
  isOpen,
  onSelectLocation,
  onClose,
  currentLocationNumber = '24',
}) => {
  if (!isOpen) return null;

  const handleSimulateScanNewLocation = () => {
    // Filtrar ubicaciones diferentes a la rampa actual
    const available = PRESET_UBICACIONES.filter(
      (u) => !u.nombreEstacion.includes(currentLocationNumber)
    );
    const nextLocation =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : PRESET_UBICACIONES[1];

    onSelectLocation(nextLocation);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl relative text-center">
        {/* Botón de Cerrar X en la parte superior derecha */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 dark:text-hub-text2 hover:text-[#009D4E] dark:hover:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 border border-transparent dark:hover:border-[#03F77C]/30 transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        {/* Ícono Grande de QR Escáner */}
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 mx-auto mb-4 shadow-xs">
          <QrCode className="w-10 h-10 stroke-[2.2]" />
        </div>

        {/* Badge ACCIÓN REQUERIDA */}
        <span className="px-3.5 py-1 rounded-full bg-[#EEFBF4] dark:bg-[#03F77C]/15 text-[#009D4E] dark:text-[#03F77C] border border-[#A7F3D0] dark:border-[#03F77C]/40 text-xs font-mono font-bold uppercase mb-3 inline-block">
          ACCIÓN REQUERIDA
        </span>

        {/* Título */}
        <h3 className="text-xl sm:text-2xl font-black text-[#414745] dark:text-hub-text1 font-sans leading-tight mb-2">
          Escanea el QR de la nueva ubicación de la rampa
        </h3>

        {/* Subtítulo */}
        <p className="text-sm text-gray-500 dark:text-hub-text2 font-medium leading-relaxed mb-8 max-w-sm mx-auto">
          Escanea el QR de la rampa para habilitar las acciones de nominación y despacho.
        </p>

        {/* Botón único de Simulación de Escaneo */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSimulateScanNewLocation}
            className="w-full py-4 bg-[#009D4E] hover:bg-[#008743] text-white font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2.5 transition-all font-sans cursor-pointer active:scale-98"
          >
            <Scan className="w-5 h-5" />
            <span>Simular escaner</span>
          </button>

          {/* Botón Secundario Cancelar con Stroke / Borde */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 border-2 border-gray-300 dark:border-hub-border hover:bg-gray-50 dark:hover:bg-slate-800 text-[#414745] dark:text-hub-text1 font-extrabold rounded-2xl text-sm transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
