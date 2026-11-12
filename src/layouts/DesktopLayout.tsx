import React from 'react';
import { ActiveModule } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAutorizaciones } from '../context/AutorizacionesContext';
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
  PackageCheck,
  Ruler,
  Search,
  Bell,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
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
  onOpenSeguimiento?: () => void;
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
  onOpenSeguimiento,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { pendingCount } = useAutorizaciones();

  // Limpiar cualquier residuo de colapso previo en almacenamiento local
  React.useEffect(() => {
    try {
      localStorage.removeItem('portal_hubs_sidebar_collapsed');
    } catch {}
  }, []);

  // Módulos Operativos Principales
  const navModules: {
    id: ActiveModule;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlightColor?: 'amber' | 'emerald';
  }[] = [
    { id: 'home', label: 'Menú Principal', icon: BarChart3 },
    { id: 'encasillado', label: 'Encasillado', icon: Box },
    { id: 'nominacion', label: 'Nominación y Despacho', icon: Truck },
    { id: 'recepcion', label: 'Recepción', icon: PackageCheck },
    { id: 'rendicion', label: 'Rendición', icon: ClipboardCheck },
    { id: 'redimension', label: 'Redimensión', icon: Ruler },
    { id: 'embalaje-deficiente', label: 'Embalaje Deficiente', icon: AlertTriangle, highlightColor: 'amber' },
    { id: 'autorizaciones', label: 'Supervisión Logística', icon: ShieldCheck, badge: pendingCount, highlightColor: 'amber' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#FAFDFC] dark:bg-hub-base text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* ── HEADER SUPERIOR ADAPTATIVO ───────────────────────────── */}
      <header
        className={`shrink-0 shadow-xs z-30 transition-colors ${
          isDark ? 'bg-hub-surface border-b border-hub-border' : 'bg-[#303030] border-b border-[#404040]'
        }`}
      >
        <div className="flex items-center h-14">
          {/* Logo Principal (Alineado con el menú lateral de 256px / w-64) */}
          <div
            className={`w-64 shrink-0 border-r h-full flex items-center px-4 transition-colors ${
              isDark ? 'bg-hub-surface border-hub-border' : 'bg-[#303030] border-[#404040]'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectModule?.('home')}
              className={`flex items-center gap-2.5 text-left h-full transition-colors w-full ${
                isDark ? 'hover:bg-slate-800/50' : 'hover:brightness-110'
              }`}
              title="Ir al Menú Principal"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isDark
                    ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-400'
                    : 'bg-[#009D4E]/25 border border-[#00E676]/50 text-[#00E676]'
                }`}
              >
                <Scan className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1 leading-tight truncate">
                  <span className={isDark ? 'text-hub-text1' : 'text-white'}>Portal</span>
                  <span className={isDark ? 'text-emerald-400' : 'text-[#00E676]'}>Hubs</span>
                </h1>
                <p className={`text-[10px] font-mono font-medium tracking-wide truncate ${isDark ? 'text-hub-text2' : 'text-gray-400'}`}>
                  Plataforma Mantenedor
                </p>
              </div>
            </button>
          </div>

          {/* Sección Derecha de la Cabecera */}
          <div className="flex-1 px-4 sm:px-6 py-2 flex items-center justify-between min-w-0">
            {/* Título y Ruta del Módulo Activo */}
            <div className="flex items-center gap-3 truncate pr-3">
              <div className="truncate">
                <nav
                  className={`text-[9px] font-mono font-extrabold tracking-wider uppercase flex items-center gap-1 mb-0.5 ${
                    isDark ? 'text-hub-text3' : 'text-gray-400'
                  }`}
                >
                  <span>PORTAL HUBS</span>
                  <span>/</span>
                  <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-[#00E676]'}`}>
                    {activeModule === 'home'
                      ? 'MENÚ PRINCIPAL'
                      : activeModule === 'encasillado'
                      ? 'ENCASILLADO'
                      : activeModule === 'nominacion'
                      ? 'NOMINACIÓN Y DESPACHO'
                      : activeModule === 'recepcion'
                      ? 'RECEPCIÓN'
                      : activeModule === 'rendicion'
                      ? 'RENDICIÓN'
                      : activeModule === 'redimension'
                      ? 'REDIMENSIÓN'
                      : activeModule === 'embalaje-deficiente'
                      ? 'EMBALAJE DEFICIENTE'
                      : activeModule === 'autorizaciones'
                      ? 'SUPERVISIÓN LOGÍSTICA'
                      : activeModule === 'escaneo'
                      ? 'LECTURA DE ENCARGOS'
                      : activeModule === 'configuracion'
                      ? 'CONFIGURACIÓN'
                      : activeModule.toUpperCase()}
                  </span>
                </nav>
                <h2 className={`text-sm sm:text-base font-bold leading-tight truncate ${isDark ? 'text-hub-text1' : 'text-white'}`}>
                  {activeModule === 'home'
                    ? 'Menú Principal de Módulos'
                    : activeModule === 'encasillado'
                    ? 'Módulo de Encasillado y Clasificación'
                    : activeModule === 'nominacion'
                    ? 'Módulo de Nominación y Despacho'
                    : activeModule === 'recepcion'
                    ? 'Módulo de Recepción'
                    : activeModule === 'rendicion'
                    ? 'Módulo de rendición de móviles'
                    : activeModule === 'redimension'
                    ? 'Módulo de Redimensión'
                    : activeModule === 'embalaje-deficiente'
                    ? 'Módulo de Embalaje Deficiente'
                    : activeModule === 'autorizaciones'
                    ? 'Supervisión Logística'
                    : activeModule === 'escaneo'
                    ? 'Módulo de Lectura de Encargos'
                    : activeModule === 'configuracion'
                    ? 'Configuración del Sistema'
                    : `Módulo ${activeModule}`}
                </h2>
              </div>
            </div>

            {/* Acciones Globales: Autorizaciones + Seguimiento */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectModule?.('autorizaciones')}
                className={`relative px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-2 border shadow-xs transition-all cursor-pointer group ${
                  activeModule === 'autorizaciones'
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400/60 ring-2 ring-amber-400/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-amber-400/50'
                }`}
                title="Centro de Autorizaciones de Supervisor"
              >
                <div className="relative flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform stroke-[2.5]" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black font-mono flex items-center justify-center animate-pulse shadow-sm">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Autorizaciones</span>
              </button>

              <button
                type="button"
                onClick={onOpenSeguimiento}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-2 border border-white/10 shadow-xs transition-all cursor-pointer hover:border-[#00E676]/40 group"
                title="Rastrear y consultar estado de un encargo"
              >
                <Search className="w-3.5 h-3.5 text-[#00E676] group-hover:scale-110 transition-transform stroke-[2.5]" />
                <span className="hidden sm:inline">Seguimiento de Encargo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENEDOR PRINCIPAL: SIDEBAR + ÁREA DE CONTENIDO ────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menú Lateral Sólido y Elegante (Scroll interno para adaptarse a cualquier altura de pantalla) */}
        <aside
          className={`w-64 p-3 border-r flex flex-col justify-between shrink-0 h-full font-sans select-none transition-colors ${
            isDark ? 'bg-hub-surface border-hub-border text-gray-200' : 'bg-[#303030] border-[#404040] text-gray-200 shadow-xl'
          }`}
        >
          {/* Navegación con Scroll Vertical Interno (garantiza que NUNCA se corte el contenido) */}
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar min-h-0">
            <div className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${isDark ? 'text-hub-text3' : 'text-gray-400'}`}>
              Módulos Operativos
            </div>

            {navModules.map((item) => {
              const IconComp = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule?.(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                        : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                      : isDark
                      ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] font-semibold'
                      : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <IconComp
                    className={`w-4 h-4 shrink-0 ${
                      isDark
                        ? isActive
                          ? 'text-[#03F77C]'
                          : item.highlightColor === 'amber'
                          ? 'text-amber-400'
                          : 'text-gray-300'
                        : isActive
                        ? 'text-white'
                        : item.highlightColor === 'amber'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  />
                  <span className="truncate flex-1 text-left">{item.label}</span>

                  {item.badge && item.badge > 0 ? (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black flex items-center justify-center shrink-0 animate-pulse leading-none shadow-2xs">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {/* Separador de Sistema */}
            <div className={`pt-2 mt-2 border-t ${isDark ? 'border-hub-border' : 'border-[#404040]'}`}>
              <div className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${isDark ? 'text-hub-text3' : 'text-gray-400'}`}>
                Sistema
              </div>

              <button
                type="button"
                onClick={() => onSelectModule?.('configuracion')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer ${
                  activeModule === 'configuracion'
                    ? isDark
                      ? 'bg-[#03F77C]/15 text-[#03F77C] border border-[#03F77C]/40 font-bold shadow-xs'
                      : 'bg-[#009D4E] text-white border border-[#00E676]/70 font-black shadow-md ring-2 ring-[#00E676]/25'
                    : isDark
                    ? 'text-gray-300 border border-transparent hover:bg-[#03F77C]/10 hover:text-[#03F77C] font-semibold'
                    : 'text-gray-300 border border-transparent hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <Settings
                  className={`w-4 h-4 shrink-0 ${
                    isDark
                      ? activeModule === 'configuracion'
                        ? 'text-[#03F77C]'
                        : 'text-gray-300'
                      : activeModule === 'configuracion'
                      ? 'text-white'
                      : 'text-emerald-400'
                  }`}
                />
                <span className="truncate">Configuración</span>
              </button>
            </div>
          </nav>

          {/* ── TARJETA DEL OPERARIO COMPLETA (ANCLADA AL PIE, NUNCA SE DESBORDA) ────────── */}
          <div className="shrink-0 pt-2.5 mt-auto border-t border-white/10 dark:border-hub-border">
            <div
              className={`p-2.5 rounded-xl shadow-xs transition-colors ${
                isDark ? 'bg-hub-base/80 border border-hub-border' : 'bg-[#242424] border border-[#404040] text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl border font-black flex items-center justify-center text-[10px] font-mono shrink-0 shadow-2xs ${
                    isDark
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                      : 'bg-[#009D4E]/30 border-[#00E676]/60 text-[#00E676]'
                  }`}
                >
                  {operatorName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold truncate leading-tight text-white dark:text-hub-text1" title={operatorName}>
                      {operatorName}
                    </h4>
                    <span
                      className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isDark
                          ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80'
                          : 'text-[#00E676] bg-[#009D4E]/30 border-[#00E676]/50'
                      }`}
                    >
                      OP
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 truncate">
                    {operatorId} · {operatorRut}
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/10 dark:border-hub-border flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-gray-300 dark:text-hub-text2 truncate">
                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-[#00E676]'}`} />
                  <span className="truncate">CD San Bernardo</span>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    isDark ? 'bg-hub-elevated border-hub-border hover:bg-gray-800' : 'bg-[#1E1E1E] border-[#404040] hover:bg-[#2A2A2A]'
                  }`}
                  title={isDark ? 'Modo claro' : 'Modo oscuro'}
                >
                  {isDark ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-slate-300" />}
                </button>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className={`w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    isDark
                      ? 'bg-hub-elevated hover:bg-rose-950/40 border-hub-border hover:border-rose-800 text-hub-text1 hover:text-rose-400'
                      : 'bg-[#1E1E1E] hover:bg-rose-950/80 border-[#404040] hover:border-rose-800 text-gray-300 hover:text-rose-300'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── ÁREA PRINCIPAL DE CONTENIDO ────────────────────────────── */}
        <main className="flex-1 overflow-y-auto w-full bg-[#FAFDFC] dark:bg-hub-base flex flex-col min-w-0">
          <div className="flex-1 flex flex-col w-full overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
};
