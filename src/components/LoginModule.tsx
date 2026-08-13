import React, { useState } from 'react';
import { Scan, CheckCircle2, Lock } from 'lucide-react';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface LoginModuleProps {
  onLoginSuccess: (operatorData: { name: string; rut: string; id: string }) => void;
  isPda?: boolean;
}

export const LoginModule: React.FC<LoginModuleProps> = ({ onLoginSuccess, isPda = false }) => {
  const [isScanning, setIsScanning] = useState(false);

  const { playSuccessSound } = useAudioFeedback();

  const handlePerformLogin = (rut: string = '18.492.105-K') => {
    setIsScanning(true);
    playSuccessSound();
    setTimeout(() => {
      onLoginSuccess({
        name: 'Carlos Mendoza',
        rut: rut,
        id: 'OP-4921',
      });
    }, 600);
  };

  // Listen to physical barcode scanner for identity card barcode
  useBarcodeScanner({
    onScan: (code) => {
      handlePerformLogin(code);
    },
    enableGlobal: true,
  });

  if (isPda) {
    // --- VISTA LOGIN PDA (STANDALONE, FONDO OSCURO INDUSTRIAL #1E1E1E) ---
    return (
      <div
        className="flex-1 w-full h-full text-[#414745] flex flex-col justify-center items-center p-4 font-sans select-none overflow-hidden relative animate-fadeIn"
        style={{ backgroundColor: '#1E1E1E' }}
      >
        {/* Caja del Login */}
        <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-[28px] p-5 shadow-lg flex flex-col items-center text-center relative z-10">

          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center text-[#009D4E] mb-2 shadow-xs">
              <Scan className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-center justify-center gap-1 leading-none mb-0.5">
              <span className="text-[#303030]">Portal</span>
              <span className="text-[#009D4E]">Hubs</span>
            </h1>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-400">
              Plataforma Operativa CD
            </span>
          </div>

          {/* Instrucción */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-left flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-[#009D4E] shrink-0">
              <Lock className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-[#414745] leading-tight">
                Control de Acceso Seguro
              </h2>
              <p className="text-[10px] text-gray-500 leading-tight">
                Escanea tu <strong>Cédula de Identidad</strong> para ingresar.
              </p>
            </div>
          </div>

          {/* Animación de escaneo en espera */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-3 relative">
            <Scan className="w-7 h-7 text-[#009D4E] stroke-[2]" />
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30"></span>
          </div>

          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-600 mb-4">
            Esperando lectura...
          </span>

          {/* Botón simular escaneo (solo para demo) */}
          <button
            type="button"
            onClick={() => handlePerformLogin()}
            disabled={isScanning}
            className="w-full h-11 bg-[#303030] active:bg-[#1f1f1f] focus:outline-none font-extrabold rounded-full text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isScanning ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Autenticado. Ingresando...</span>
              </>
            ) : (
              <>
                <Scan className="w-4 h-4 text-emerald-400" />
                <span>Simular Escaneo Cédula</span>
              </>
            )}
          </button>

          <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-between text-[9px] text-gray-400 font-mono">
            <span>Starken · CD San Bernardo</span>
            <span>PDA v1.2</span>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA LOGIN ESCRITORIO (FULLSCREEN STANDALONE) ---
  return (
    <div
      className="w-full h-screen flex flex-col justify-center items-center p-6 text-[#414745] font-sans select-none animate-fadeIn overflow-hidden relative"
      style={{ backgroundColor: '#1E1E1E' }}
    >
      {/* Fondo Decorativo Industrial */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#009D4E]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Caja Exterior del Login */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center relative z-10">
        
        {/* Header Logo & Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center text-[#009D4E] mb-3 shadow-sm">
            <Scan className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center justify-center gap-1.5 leading-none mb-1">
            <span className="text-[#303030]">Portal</span>
            <span className="text-[#009D4E]">Hubs</span>
          </h1>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">
            Plataforma Operativa de Centros de Distribución
          </span>
        </div>

        {/* Instrucción */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-left flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-[#009D4E] shrink-0">
            <Lock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#414745] leading-tight">
              Control de Acceso Seguro
            </h2>
            <p className="text-xs text-gray-500">
              Escanea el código de tu <strong>Cédula de Identidad</strong> para identificarte en el puesto de trabajo.
            </p>
          </div>
        </div>

        {/* Animación de escaneo en espera */}
        <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-4 relative">
          <Scan className="w-11 h-11 text-[#009D4E] stroke-[2]" />
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30"></span>
        </div>

        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 mb-6">
          Esperando lectura de cédula...
        </span>

        {/* Botón simular escaneo (solo para demo) */}
        <button
          type="button"
          onClick={() => handlePerformLogin()}
          disabled={isScanning}
          className="w-full h-14 bg-[#303030] hover:bg-[#1f1f1f] active:bg-black focus:outline-none font-extrabold rounded-full text-sm text-white shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        >
          {isScanning ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>Autenticado. Redirigiendo...</span>
            </>
          ) : (
            <>
              <Scan className="w-5 h-5 text-emerald-400" />
              <span>Simular Escaneo Cédula de Identidad</span>
            </>
          )}
        </button>

        <div className="mt-6 pt-4 border-t border-gray-100 w-full flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>Starken · CD San Bernardo</span>
          <span>Soporte TI Ext: 4402</span>
        </div>
      </div>
    </div>
  );
};
