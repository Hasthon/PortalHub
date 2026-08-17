import React from 'react';
import { ActiveModule } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useDevice } from '../context/DeviceContext';
import {
  Scan,
  Truck,
  BarChart3,
  MapPin,
  Box,
  LogOut,
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
  activeModule?: ActiveModule;
  onSelectModule?: (module: ActiveModule) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  operatorName?: string;
  operatorRut?: string;
  operatorId?: string;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  activeModule = 'encasillado',
  onSelectModule,
  isAuthenticated = true,
  onLogout,
  operatorName = 'Carlos Mendoza',
  operatorRut = '18.492.105-K',
  operatorId = 'OP-4921',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { toggleMode } = useDevice();

  return (
    <div className="h-screen overflow-hidden bg-[#FAFDFC] dark:bg-hub-base text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Navbar Superior con División Alineada a la Barra Lateral (#303030 en Modo Claro) */}
      <header className={`shrink-0 shadow-xs z-30 transition-colors ${isDark
          ? 'bg-hub-surface border-b border-hub-border'
          : 'bg-[#303030] border-b border-[#404040]'
        }`}>
        <div className="flex items-center">
          {/* Sección del Logo Alineada al Ancho del Menú Lateral (w-72 en #303030) */}
          <button
            type="button"
            onClick={() => onSelectModule?.('home')}
            className={`w-72 shrink-0 px-6 py-3.5 border-r flex items-center gap-3 text-left transition-colors ${isDark
                ? 'bg-hub-surface border-hub-border hover:bg-slate-800/50'
                : 'bg-[#303030] border-[#404040] text-white hover:brightness-110'
              }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${isDark
                ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-400'
                : 'bg-[#009D4E]/25 border border-[#00E676]/50 text-[#00E676]'
              }`}>
              <Scan className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-1 leading-tight">
                <span className={isDark ? 'text-hub-text1' : 'text-white'}>Portal</span>
                <span className={isDark ? 'text-emerald-400' : 'text-[#00E676]'}>Hubs</span>
              </h1>
              <p className={`text-[12px] font-mono font-medium tracking-wide ${isDark ? 'text-hub-text2' : 'text-gray-400'
                }`}>
                Plataforma Mantenedor
              </p>
            </div>
          </button>

          {/* Sección Derecha de la Cabecera */}
          <div className="flex-1 px-6 py-3 flex items-center justify-between min-w-0">
            {/* Título y Ruta del Módulo Activo en la Barra Superior */}
            <div className="truncate pr-4">
              <nav className={`text-[10px] font-mono font-extrabold tracking-wider uppercase flex items-center gap-1 mb-0.5 ${isDark ? 'text-hub-text3' : 'text-gray-400'
                }`}>
                <span>PORTAL HUBS</span>
                <span>/</span>
                <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-[#00E676]'}`}>
                  {activeModule === 'home' ? 'MENÚ PRINCIPAL' : activeModule === 'encasillado' ? 'ENCASILLADO' : activeModule === 'nominacion' ? 'NOMINACIÓN Y DESPACHO' : activeModule === 'escaneo' ? 'LECTURA DE ENCARGOS' : activeModule === 'configuracion' ? 'CONFIGURACIÓN' : activeModule.toUpperCase()}
                </span>
              </nav>
              <h2 className={`text-base sm:text-lg font-bold leading-tight truncate ${isDark ? 'text-hub-text1' : 'text-white'
                }`}>
                {activeModule === 'home'
                  ? 'Menú Principal de Módulos'
                  : activeModule === 'encasillado'
                    ? 'Módulo de Encasillado y Clasificación'
                    : activeModule === 'nominacion'
                      ? 'Módulo de Nominación y Despacho'
                      : activeModule === 'escaneo'
                        ? 'Módulo de Lectura de Encargos'
                        : activeModule === 'configuracion'
                          ? 'Configuración del Sistema'
                          : `Módulo ${activeModule}`}
              </h2>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Left - Fondo #303030 en Modo Claro */}
        <aside className={`w-72 border-r hidden md:flex flex-col justify-between p-4 shrink-0 overflow-hidden h-full font-sans transition-colors duration-300 ${isDark
            ? 'bg-hub-surface border-hub-border'
            : 'bg-[#303030] border-[#404040] text-gray-200 shadow-xl'
          }`}>
          <nav className="space-y-1.5">
            <div className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-hub-text3' : 'text-gray-400'
              }`}>
              Módulos Operativos
            </div>

            {/* Módulo Home / Menú Principal */}
            <button
              type="button"
              onClick={() => onSelectModule?.('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeModule === 'home'
                  ? isDark
                    ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                    : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                  : isDark
                    ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] hover:border-[#03F77C]/30 font-semibold'
                    : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                }`}
            >
              <BarChart3 className={`w-4 h-4 ${isDark
                  ? 'text-[#03F77C]'
                  : activeModule === 'home'
                    ? 'text-white'
                    : 'text-emerald-400'
                }`} />
              <span>Menú Principal</span>
            </button>

            {/* Módulo de Encasillado */}
            <button
              type="button"
              onClick={() => onSelectModule?.('encasillado')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeModule === 'encasillado'
                  ? isDark
                    ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                    : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                  : isDark
                    ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] hover:border-[#03F77C]/30 font-semibold'
                    : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                }`}
            >
              <Box className={`w-4 h-4 ${isDark
                  ? 'text-[#03F77C]'
                  : activeModule === 'encasillado'
                    ? 'text-white'
                    : 'text-emerald-400'
                }`} />
              <span>Encasillado</span>
            </button>

            {/* Módulo de Nominación y Despacho */}
            <button
              type="button"
              onClick={() => onSelectModule?.('nominacion')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeModule === 'nominacion'
                  ? isDark
                    ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                    : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                  : isDark
                    ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] hover:border-[#03F77C]/30 font-semibold'
                    : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                }`}
            >
              <Truck className={`w-4 h-4 ${isDark
                  ? 'text-[#03F77C]'
                  : activeModule === 'nominacion'
                    ? 'text-white'
                    : 'text-emerald-400'
                }`} />
              <span>Nominación y Despacho</span>
            </button>

            <div className={`pt-3 mt-2 border-t ${isDark ? 'border-hub-border' : 'border-[#404040]'}`}>
              <div className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-hub-text3' : 'text-gray-400'
                }`}>
                Sistema
              </div>
              <button
                type="button"
                onClick={() => onSelectModule?.('configuracion')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeModule === 'configuracion'
                    ? isDark
                      ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                      : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                    : isDark
                      ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] hover:border-[#03F77C]/30 font-semibold'
                      : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                  }`}
              >
                <Settings className={`w-4 h-4 ${isDark
                    ? 'text-[#03F77C]'
                    : activeModule === 'configuracion'
                      ? 'text-white'
                      : 'text-emerald-400'
                  }`} />
                <span>Configuración</span>
              </button>
            </div>
          </nav>

          {/* Tarjeta del Operario Adaptada */}
          <div className="space-y-2.5 shrink-0">
            <div className={`p-3 rounded-2xl shadow-xs relative overflow-hidden ${isDark
                ? 'bg-hub-surface border border-hub-border'
                : 'bg-[#242424] border border-[#404040] text-white'
              }`}>
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className={`w-10 h-10 rounded-2xl border font-extrabold flex items-center justify-center text-xs font-mono shadow-xs ${isDark
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                      : 'bg-[#009D4E]/30 border-[#00E676]/60 text-[#00E676]'
                    }`}>
                    {operatorName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-hub-text1' : 'text-white'}`} title={operatorName}>{operatorName}</h4>
                    <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded-full border ${isDark
                        ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80'
                        : 'text-[#00E676] bg-[#009D4E]/30 border-[#00E676]/50'
                      }`}>
                      OP
                    </span>
                  </div>
                  <p className={`text-[10px] font-mono font-semibold truncate ${isDark ? 'text-hub-text2' : 'text-gray-400'
                    }`}>
                    ID: {operatorId} · {operatorRut}
                  </p>
                </div>
              </div>

              <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] mb-2 ${isDark ? 'border-hub-border' : 'border-[#404040]'
                }`}>
                <div className={`flex items-center gap-1 font-semibold truncate ${isDark ? 'text-hub-text2' : 'text-gray-300'
                  }`}>
                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-[#00E676]'}`} />
                  <span className="truncate">CD San Bernardo</span>
                </div>
                {/* Toggle rápido de tema */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${isDark
                      ? 'bg-hub-elevated border-hub-border hover:bg-gray-800'
                      : 'bg-[#1E1E1E] border-[#404040] hover:bg-[#2A2A2A]'
                    }`}
                  title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Botón Cerrar Sesión en la Tarjeta */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs group active:scale-[0.98] cursor-pointer border ${isDark
                      ? 'bg-hub-elevated hover:bg-rose-950/40 border-hub-border hover:border-rose-800 text-hub-text1 hover:text-rose-400'
                      : 'bg-[#1E1E1E] hover:bg-rose-950/80 border-[#404040] hover:border-rose-800 text-gray-300 hover:text-rose-300'
                    }`}
                >
                  <LogOut className={`w-3.5 h-3.5 transition-colors ${isDark
                      ? 'text-gray-400 group-hover:text-rose-400'
                      : 'text-gray-400 group-hover:text-rose-300'
                    }`} />
                  <span>Cerrar Sesión</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area (Costado Derecho con fondo ultra clarito #FAFDFC) */}
        <main className="flex-1 overflow-y-auto p-6 w-full bg-[#FAFDFC] dark:bg-hub-base">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
