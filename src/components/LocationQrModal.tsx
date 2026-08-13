import React, { useState } from 'react';
import { UbicacionEncasillado } from '../types';
import { QrCode, MapPin, CheckCircle2, Zap, ArrowRight, ShieldAlert, X } from 'lucide-react';

interface LocationQrModalProps {
  isOpen: boolean;
  onSelectLocation: (ubicacion: UbicacionEncasillado) => void;
  onClose?: () => void;
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

export const LocationQrModal: React.FC<LocationQrModalProps> = ({ isOpen, onSelectLocation, onClose }) => {
  const [inputQr, setInputQr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleQrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputQr.trim().toUpperCase();
    
    const found = PRESET_UBICACIONES.find(
      (u) => u.codeQr === cleanCode || u.id === cleanCode || cleanCode.includes(u.pasilloPredeterminado)
    );

    if (found) {
      onSelectLocation(found);
      setInputQr('');
      setErrorMsg('');
    } else {
      setErrorMsg(`QR de ubicación [${cleanCode}] no reconocido. Usa uno de los predeterminados.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
        
        {/* Botón de Cerrar X en la parte superior derecha */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-[#414745] hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        {/* Encabezado del Modal */}
        <div className="text-center mb-6 pr-6 pl-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3 shadow-xs">
            <QrCode className="w-8 h-8 stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold uppercase mb-2">
            Cambio de Estación
          </span>
          <h3 className="text-xl font-bold text-[#414745] dark:text-hub-text1">
            Cambiar Ubicación de Estación QR
          </h3>
          <p className="text-sm text-gray-500 dark:text-hub-text2 mt-1">
            Escanea el código QR de la rampa para ingresar la ubicación.
          </p>
        </div>

        {/* Formulario de Escaneo QR */}
        <form onSubmit={handleQrSubmit} className="mb-6">
          <div className="relative flex items-center mb-2">
            <input
              type="text"
              value={inputQr}
              onChange={(e) => setInputQr(e.target.value)}
              placeholder="Escanea el QR de ubicación (ej: UB-RAMPA-24-PMC)..."
              className="w-full h-14 bg-gray-50 dark:bg-hub-base border-2 border-gray-300 dark:border-hub-border focus:border-[#303030] dark:focus:border-emerald-500 rounded-2xl pl-12 pr-28 text-sm font-mono text-[#414745] dark:text-hub-text1 placeholder-gray-400 outline-none transition-all"
              autoFocus
            />
            <QrCode className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-2.5 h-9 px-4 bg-[#303030] hover:bg-[#1f1f1f] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Validar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </p>
          )}
        </form>

        {/* Selecciones Rápidas de Prueba */}
        <div className="pt-4 border-t border-gray-100 dark:border-hub-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-hub-text3 mb-3 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> O simula el escaneo de una rampa predeterminada:
          </p>

          <div className="space-y-2">
            {PRESET_UBICACIONES.map((ubicacion) => (
              <button
                key={ubicacion.id}
                type="button"
                onClick={() => onSelectLocation(ubicacion)}
                className="w-full p-3 bg-gray-50 hover:bg-emerald-50/70 dark:bg-hub-elevated dark:hover:bg-slate-800/80 border border-gray-200 dark:border-hub-border hover:border-emerald-300 dark:hover:border-emerald-600 rounded-2xl text-left transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border text-gray-700 dark:text-hub-text2 group-hover:text-emerald-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#414745] dark:text-hub-text1 block group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {ubicacion.nombreEstacion}
                    </strong>
                    <span className="text-xs font-mono text-gray-500 dark:text-hub-text2">
                      {ubicacion.rampaAsociada}
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Cancelar en la parte inferior */}
        {onClose && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-hub-border flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-hub-elevated dark:hover:bg-hub-elevated text-[#414745] dark:text-hub-text1 font-bold rounded-xl text-xs transition-all"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
