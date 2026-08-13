import React, { useState } from 'react';
import { ActiveModule } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Scan, MapPin, ArrowLeft, ChevronRight, Menu, User, LockKeyholeOpen, Settings, LogOut, X, Sun, Moon } from 'lucide-react';

interface PDALayoutProps {
  children: React.ReactNode;
  activeModule?: ActiveModule;
  onSelectModule?: (module: ActiveModule) => void;
  onBack?: () => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  operatorName?: string;
  operatorRut?: string;
  operatorId?: string;
}

export const PDALayout: React.FC<PDALayoutProps> = ({
  children,
  activeModule = 'encasillado',
  onSelectModule,
  onBack,
  isAuthenticated = true,
  onLogout,
  operatorName = 'Carlos Mendoza',
  operatorRut = '18.492.105-K',
  operatorId = 'OP-4921',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onSelectModule?.('encasillado');
    }
  };

  return (
    <div className="w-full h-full min-h-[100dvh] md:min-h-screen bg-[#FAFDFC] dark:bg-hub-base md:bg-[#F3F6FA] md:dark:bg-hub-base text-[#414745] dark:text-hub-text1 flex items-center justify-center p-0 md:p-4 select-none font-sans overflow-hidden">
      {/* Outer frame container */}
      <div className="w-full h-[100dvh] md:max-w-[440px] md:h-[840px] bg-[#FAFDFC] dark:bg-hub-base border-0 md:border-8 md:border-slate-800 rounded-none md:rounded-[36px] shadow-none md:shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Top Status Bar (Fondo #303030) */}
        <header className="bg-[#303030] dark:bg-hub-surface border-b border-gray-800 dark:border-hub-border px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/20 dark:bg-emerald-500/15 border border-emerald-500/30 dark:border-emerald-500/40 rounded-xl flex items-center justify-center text-[#009D4E] dark:text-hub-accent">
              <Scan className="w-4 h-4 text-[#009D4E] dark:text-hub-accent stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1 leading-none">
                <span className="text-white">Portal</span>
                <span className="text-[#009D4E] dark:text-hub-accent">Hubs</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400 dark:text-hub-text3 block leading-tight">Plataforma Mantenedor</span>
            </div>
          </div>

          {/* Botones a la Derecha: Toggle Tema Rápido + Menú Hamburguesa */}
          {isAuthenticated && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-200 stroke-[2.2]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Menú de Opciones"
              >
                <Menu className="w-4.5 h-4.5 text-white stroke-[2.2]" />
              </button>
            </div>
          )}
        </header>

        {/* Sub-Header: Flecha Atrás + Migajas de Pan (Fondo Blanco) */}
        {activeModule !== 'home' && (
          <div className="bg-white dark:bg-hub-surface border-b border-gray-200 dark:border-hub-border px-3 py-2 flex items-center gap-2.5 shrink-0 shadow-2xs">
            <button
              onClick={handleBack}
              className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-hub-elevated flex items-center justify-center text-[#414745] dark:text-hub-text1 transition-all active:scale-95 shrink-0"
              title="Volver atrás"
            >
              <ArrowLeft className="w-4 h-4 text-[#414745] dark:text-hub-text1 stroke-[2.2]" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-xs font-sans">
              <button
                onClick={() => onSelectModule?.('home')}
                className="text-gray-400 dark:text-hub-text3 hover:text-gray-600 dark:hover:text-slate-300 font-medium shrink-0 transition-colors"
              >
                Inicio
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0 stroke-[2.2]" />
              <span className="font-bold text-[#414745] dark:text-hub-text1 truncate tracking-tight">
                {activeModule === 'encasillado'
                  ? 'Encasillado y Clasificación'
                  : activeModule === 'nominacion'
                  ? 'Nominación y Despacho'
                  : activeModule === 'escaneo'
                  ? 'Escaneo General'
                  : 'Módulo Operativo'}
              </span>
            </nav>
          </div>
        )}

        {/* Main Content View for PDA */}
        <main className={`flex-1 min-h-0 overflow-hidden flex flex-col ${!isAuthenticated ? 'bg-[#1E1E1E]' : 'bg-[#FAFDFC] dark:bg-hub-base'} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
          {children}
        </main>

        {/* Footer Tecnológico Operario PDA in Light Mode */}
        <footer className="bg-white dark:bg-hub-surface border-t border-gray-200 dark:border-hub-border px-3 py-2 shrink-0 flex items-center justify-between text-[10px] font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#009D4E]"></span>
            <span className="text-[#414745] dark:text-hub-text1 font-bold">Carlos Mendoza</span>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <span className="text-gray-500 dark:text-hub-text2">ID: OP-4921</span>
          </div>
          <div className="flex items-center gap-1 text-[#414745] dark:text-hub-text2">
            <MapPin className="w-3 h-3 text-[#009D4E]" />
            <span>CD San Bernardo</span>
          </div>
        </footer>

        {/* Slide-over Hamburger Drawer Menu for PDA */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-fadeIn">
            {/* Backdrop click to close */}
            <div className="flex-1" onClick={() => setIsMenuOpen(false)} />

            {/* Menu panel */}
            <div className="w-64 bg-white dark:bg-hub-surface h-full shadow-2xl flex flex-col p-4 border-l border-gray-200 dark:border-hub-border animate-slide-left font-sans">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-[#009D4E] font-bold text-xs">
                    CM
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#414745] dark:text-hub-text1 leading-tight">{operatorName}</h4>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-hub-text3 block">{operatorId} · {operatorRut}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-500 dark:text-hub-text2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu Options List */}
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                <span className="text-[10px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block px-2 mb-1">
                  Opciones Operativas
                </span>

                {/* Option 1: Mi Perfil */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    alert(`Perfil del Operario:\nNombre: ${operatorName}\nRUT: ${operatorRut}\nID: ${operatorId}\nRol: Operador de Hub\nCentro: CD San Bernardo`);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-3 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[#009D4E] shrink-0" />
                  <span>Mi Perfil</span>
                </button>

                {/* Option 2: Desbloqueo de Operarios */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    alert('Desbloqueo de Operarios:\nNo hay operarios bloqueados en la estación.');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-3 transition-colors text-left"
                >
                  <LockKeyholeOpen className="w-4 h-4 text-[#009D4E] shrink-0" />
                  <span>Desbloqueo de Operarios</span>
                </button>

                {/* Option 3: Configuración */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    alert('Configuración PDA:\nLector: Integrado (Honeywell/Zebra)\nSonido: Activado (100%)\nRed: WiFi CD San Bernardo (Excelente)');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-3 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-[#009D4E] shrink-0" />
                  <span>Configuración</span>
                </button>

                <div className="pt-3 border-t border-gray-100 dark:border-hub-border my-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block px-2 mb-1">
                    Apariencia
                  </span>

                  {/* Toggle Modo Oscuro */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isDark ? (
                        <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span>{isDark ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors duration-300 relative ${
                      isDark ? 'bg-[#009D4E]' : 'bg-gray-300'
                    }`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                        isDark ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-hub-border my-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block px-2 mb-1">
                    Sesión
                  </span>

                  {/* Option 4: Cerrar Sesión */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-hub-elevated text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-3 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-[#414745] shrink-0" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-hub-border text-center shrink-0">
                <span className="text-[10px] font-mono text-gray-400 dark:text-hub-text3">Portal Hubs v1.2.0 · Starken</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

