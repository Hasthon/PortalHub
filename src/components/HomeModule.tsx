import React from 'react';
import { ActiveModule } from '../types';
import { useDevice } from '../context/DeviceContext';
import {
  Layers,
  Truck,
  Scan,
  Boxes,
  Send,
  BarChart3,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface HomeModuleProps {
  onSelectModule: (module: ActiveModule) => void;
}

interface ModuleCardDef {
  id: ActiveModule;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeText?: string;
}

const MODULES_LIST: ModuleCardDef[] = [
  {
    id: 'nominacion',
    title: 'Nominación y Despacho',
    subtitle: 'Rampas y Manifiestos',
    description: 'Escanear ubicación de rampa, nominar encargos por tipo de carga y autorizar salidas.',
    icon: Truck,
    accentColor: 'from-[#009D4E] to-[#008743]',
    badgeText: 'OPERATIVO',
  },
  {
    id: 'encasillado',
    title: 'Encasillado y Clasificación',
    subtitle: 'Pasillos y Estaciones',
    description: 'Escanear estación QR, clasificar cargas por pasillo (Azul, Rojo, Verde) y validar bultos.',
    icon: Layers,
    accentColor: 'from-blue-600 to-indigo-700',
    badgeText: 'OPERATIVO',
  },
  {
    id: 'escaneo',
    title: 'Escaneo General',
    subtitle: 'Ingreso Rápido de Bultos',
    description: 'Captura masiva con lector de código de barras, retroalimentación sonora e historial.',
    icon: Scan,
    accentColor: 'from-amber-500 to-orange-600',
    badgeText: 'RÁPIDO',
  },
  {
    id: 'inventario',
    title: 'Control de Inventario',
    subtitle: 'Auditoría en Nave',
    description: 'Control de stock retenido, cuadratura de bultos en tránsito y conteo por zona.',
    icon: Boxes,
    accentColor: 'from-purple-600 to-violet-700',
    badgeText: 'PRÓXIMAMENTE',
  },
  {
    id: 'despachos',
    title: 'Historial de Despachos',
    subtitle: 'Manifiestos Emitidos',
    description: 'Consulta de guías despachadas, horarios de salida de camiones y trazabilidad.',
    icon: Send,
    accentColor: 'from-teal-600 to-emerald-700',
    badgeText: 'PRÓXIMAMENTE',
  },
  {
    id: 'reportes',
    title: 'Indicadores y Reportes',
    subtitle: 'Métricas de Producción',
    description: 'Estadísticas del turno, rendimiento por operario y volumen de bultos procesados.',
    icon: BarChart3,
    accentColor: 'from-slate-700 to-slate-900',
    badgeText: 'PRÓXIMAMENTE',
  },
];

export const HomeModule: React.FC<HomeModuleProps> = ({ onSelectModule }) => {
  const { isPda } = useDevice();

  // VISTA PDA: Botones limpios con Bordes Redondeados, Solo Nombre e Ícono en #303030
  if (isPda) {
    return (
      <div className="flex-1 flex flex-col p-4 space-y-4 animate-fadeIn justify-start bg-[#FAFDFC] dark:bg-hub-base">
        {/* Saludo de Bienvenida Cercano (TOP) */}
        <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-xl p-4 shadow-xs flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-base font-black text-[#303030] dark:text-hub-text1 leading-tight font-sans">
              ¡Bienvenido, Carlos!
            </h2>
            <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium leading-tight mt-0.5">
              Todo listo para iniciar tu jornada.
            </p>
          </div>

          <span className="text-[10px] font-mono font-bold text-[#009D4E] dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border border-emerald-300 dark:border-emerald-800">
            TURNO ACTIVO
          </span>
        </div>

        {/* Label sutil para el listado */}
        <div className="px-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider block">
            Módulos Disponibles
          </span>
        </div>

        {/* Lista de Botones PDA (#303030 con bordes completamente redondeados en los costados) */}
        <div className="space-y-3">
          {MODULES_LIST.filter((mod) => mod.badgeText !== 'PRÓXIMAMENTE').map((mod) => {
            const IconComponent = mod.icon;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule(mod.id)}
                className="w-full h-14 rounded-full px-5 flex items-center justify-between shadow-md transition-all font-sans bg-[#303030] dark:bg-[#252525] border border-transparent dark:border-emerald-500/30 dark:shadow-lg dark:shadow-black/40 active:bg-[#1f1f1f] dark:active:bg-[#1E1E1E] focus:outline-none text-white dark:text-hub-text1 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 dark:bg-emerald-500/20 text-[#009D4E] dark:text-[#00C45A] border border-emerald-500/30 dark:border-emerald-500/50">
                    <IconComponent className="w-5 h-5 stroke-[2.2] text-[#009D4E] dark:text-[#00C45A]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0 leading-tight">
                    <span className="text-sm font-extrabold text-white dark:text-hub-text1 truncate tracking-tight">
                      {mod.title}
                    </span>
                    <span className="text-[11px] text-gray-300 dark:text-hub-text2 font-medium truncate">
                      {mod.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-hub-text2 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // VISTA DESKTOP: Grid completo con tarjetas ricas
  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 space-y-5 animate-fadeIn">
      {/* Saludo y Cabecera del Home */}
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-5 md:p-6 border border-gray-200/80 dark:border-hub-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
              PORTAL HUBS STARKEN
            </span>
            <span className="text-xs font-mono text-gray-400">Turno Activo</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#303030] dark:text-hub-text1 font-sans">
            Módulos de Operaciones Logísticas
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-hub-text2 font-medium">
            Selecciona un módulo operativo para comenzar tus tareas en la nave.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
          <span>Sistema Conectado</span>
        </div>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES_LIST.map((mod) => {
          const IconComponent = mod.icon;
          const isAvailable = mod.badgeText !== 'PRÓXIMAMENTE';

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => isAvailable && onSelectModule(mod.id)}
              disabled={!isAvailable}
              className={`group text-left rounded-3xl p-5 md:p-6 transition-all duration-200 flex flex-col justify-between relative overflow-hidden border ${isAvailable
                  ? 'bg-white dark:bg-hub-surface border-gray-200/90 dark:border-hub-border hover:border-[#009D4E] dark:hover:border-emerald-500 hover:shadow-lg active:scale-[0.99] cursor-pointer'
                  : 'bg-gray-50/80 dark:bg-slate-900/40 border-gray-200/50 dark:border-slate-800/50 opacity-60 cursor-not-allowed'
                }`}
            >
              <div className="flex items-start justify-between w-full mb-4">
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${mod.accentColor} text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-105`}
                >
                  <IconComponent className="w-6 h-6 md:w-7 md:h-7 stroke-[2.2]" />
                </div>

                {mod.badgeText && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-wider uppercase border ${isAvailable
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-[#009D4E] dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-gray-200 dark:bg-hub-elevated text-gray-500 dark:text-hub-text2 border-gray-300 dark:border-hub-border'
                      }`}
                  >
                    {mod.badgeText}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <span className="text-[11px] font-mono font-bold text-gray-400 dark:text-hub-text2 uppercase tracking-wider block">
                  {mod.subtitle}
                </span>
                <h3 className="text-lg font-extrabold text-[#303030] dark:text-hub-text1 leading-snug font-sans group-hover:text-[#009D4E] dark:group-hover:text-emerald-400 transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-[#009D4E] dark:text-emerald-400">
                <span>{isAvailable ? 'Ingresar al módulo' : 'En desarrollo'}</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
