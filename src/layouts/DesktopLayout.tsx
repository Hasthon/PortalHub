import React from 'react';
import { ActiveModule } from '../types';
import { useTheme } from '../context/ThemeContext';
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

  return (
    <div className="h-screen overflow-hidden bg-[#FAFDFC] dark:bg-hub-base text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Navbar Superior con División Alineada a la Barra Lateral */}
      <header className="bg-white dark:bg-hub-surface border-b border-gray-200 dark:border-hub-border shrink-0 shadow-xs z-30">
        <div className="flex items-center">
          {/* Sección del Logo Alineada al Ancho del Menú Lateral (w-72 con borde derecho) */}
          <button
            type="button"
            onClick={() => onSelectModule?.('home')}
            className="w-72 shrink-0 px-6 py-3.5 border-r border-gray-200 dark:border-hub-border flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Scan className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-1 leading-tight">
                <span className="text-[#303030] dark:text-hub-text1">Portal</span>
                <span className="text-emerald-600 dark:text-emerald-400">Hubs</span>
              </h1>
              <p className="text-[12px] font-mono text-slate-500 dark:text-hub-text2 font-medium tracking-wide">
                Plataforma Mantenedor
              </p>
            </div>
          </button>

          {/* Sección Derecha de la Cabecera */}
          <div className="flex-1 px-6 py-3 flex items-center justify-between min-w-0">
            {/* Título y Ruta del Módulo Activo en la Barra Superior */}
            <div className="truncate pr-4">
              <nav className="text-[10px] font-mono font-extrabold tracking-wider uppercase flex items-center gap-1 text-gray-400 dark:text-hub-text3 mb-0.5">
                <span>PORTAL HUBS</span>
                <span>/</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {activeModule === 'home' ? 'MENÚ PRINCIPAL' : activeModule === 'encasillado' ? 'ENCASILLADO' : activeModule === 'nominacion' ? 'NOMINACIÓN Y DESPACHO' : activeModule === 'escaneo' ? 'LECTURA DE ENCARGOS' : activeModule === 'configuracion' ? 'CONFIGURACIÓN' : activeModule.toUpperCase()}
                </span>
              </nav>
              <h2 className="text-base sm:text-lg font-bold text-[#414745] dark:text-hub-text1 leading-tight truncate">
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
        {/* Sidebar Left - Limpio e Higiénico */}
        <aside className="w-72 bg-white dark:bg-hub-surface border-r border-gray-200/80 dark:border-hub-border hidden md:flex flex-col justify-between p-4 shrink-0 overflow-hidden h-full">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-hub-text3">
              Módulos Operativos
            </div>

            {/* Módulo Home / Menú Principal */}
            <button
              onClick={() => onSelectModule?.('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                activeModule === 'home'
                  ? 'bg-[#EEFBF4] text-[#009D4E] border border-[#A7F3D0] dark:bg-[#03F77C]/15 dark:text-[#03F77C] dark:border-[#03F77C]/40 font-bold shadow-xs'
                  : 'text-[#414745] dark:text-gray-300 border border-transparent hover:bg-emerald-50/80 hover:text-[#009D4E] dark:hover:bg-[#03F77C]/10 dark:hover:text-[#03F77C] dark:hover:border-[#03F77C]/30 font-semibold'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              <span>Menú Principal</span>
            </button>

            {/* Módulo de Encasillado */}
            <button
              onClick={() => onSelectModule?.('encasillado')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                activeModule === 'encasillado'
                  ? 'bg-[#EEFBF4] text-[#009D4E] border border-[#A7F3D0] dark:bg-[#03F77C]/15 dark:text-[#03F77C] dark:border-[#03F77C]/40 font-bold shadow-xs'
                  : 'text-[#414745] dark:text-gray-300 border border-transparent hover:bg-emerald-50/80 hover:text-[#009D4E] dark:hover:bg-[#03F77C]/10 dark:hover:text-[#03F77C] dark:hover:border-[#03F77C]/30 font-semibold'
              }`}
            >
              <Box className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              <span>Encasillado</span>
            </button>

            {/* Módulo de Nominación y Despacho */}
            <button
              onClick={() => onSelectModule?.('nominacion')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                activeModule === 'nominacion'
                  ? 'bg-[#EEFBF4] text-[#009D4E] border border-[#A7F3D0] dark:bg-[#03F77C]/15 dark:text-[#03F77C] dark:border-[#03F77C]/40 font-bold shadow-xs'
                  : 'text-[#414745] dark:text-gray-300 border border-transparent hover:bg-emerald-50/80 hover:text-[#009D4E] dark:hover:bg-[#03F77C]/10 dark:hover:text-[#03F77C] dark:hover:border-[#03F77C]/30 font-semibold'
              }`}
            >
              <Truck className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              <span>Nominación y Despacho</span>
            </button>

            <div className="pt-3 mt-2 border-t border-gray-200/80 dark:border-hub-border">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-hub-text3">
                Sistema
              </div>
              <button
                onClick={() => onSelectModule?.('configuracion')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  activeModule === 'configuracion'
                    ? 'bg-[#EEFBF4] text-[#009D4E] border border-[#A7F3D0] dark:bg-[#03F77C]/15 dark:text-[#03F77C] dark:border-[#03F77C]/40 font-bold shadow-xs'
                    : 'text-[#414745] dark:text-gray-300 border border-transparent hover:bg-emerald-50/80 hover:text-[#009D4E] dark:hover:bg-[#03F77C]/10 dark:hover:text-[#03F77C] dark:hover:border-[#03F77C]/30 font-semibold'
                }`}
              >
                <Settings className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
                <span>Configuración</span>
              </button>
            </div>
          </nav>

          {/* Tarjeta del Operario Tecnológica */}
          <div className="space-y-2.5 shrink-0">
            <div className="bg-gray-50 dark:bg-hub-surface border border-gray-200 dark:border-hub-border p-3 rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs font-mono shadow-xs">
                    {operatorName.split(' ').map(n => n[0]).join('').substring(0,2)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#414745] dark:text-hub-text1 truncate" title={operatorName}>{operatorName}</h4>
                    <span className="text-[8px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 px-1.5 py-0.5 rounded-full">
                      OP
                    </span>
                  </div>
                  <p className="text-[10px] font-mono font-semibold text-gray-500 dark:text-hub-text2 truncate">
                    ID: {operatorId} · {operatorRut}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-hub-border flex items-center justify-between text-[10px] mb-2">
                <div className="flex items-center gap-1 text-[#414745] dark:text-hub-text2 font-semibold truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">CD San Bernardo</span>
                </div>
                {/* Toggle rápido de tema */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center transition-all active:scale-95"
                  title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {isDark ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </div>

              {/* Botón Cerrar Sesión en la Tarjeta */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2 px-3 bg-white hover:bg-rose-50 dark:bg-hub-elevated dark:hover:bg-rose-950/40 border border-gray-200 hover:border-rose-300 dark:border-hub-border dark:hover:border-rose-800 text-[#414745] hover:text-rose-700 dark:text-hub-text1 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs group active:scale-[0.98]"
                >
                  <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
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
