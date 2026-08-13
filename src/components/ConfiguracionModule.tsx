import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  User,
  MapPin,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Wifi,
  Scan,
  Shield,
  Bell,
} from 'lucide-react';

interface ConfiguracionModuleProps {
  operatorName?: string;
  operatorRut?: string;
  operatorId?: string;
}

export const ConfiguracionModule: React.FC<ConfiguracionModuleProps> = ({
  operatorName = 'Carlos Mendoza',
  operatorRut = '18.492.105-K',
  operatorId = 'OP-4921',
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="w-full h-full overflow-y-auto animate-fadeIn font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header de Configuración */}
        <div>
          <h1 className="text-xl font-black text-[#414745] dark:text-[#F2F2F0] tracking-tight font-sans">
            Configuración
          </h1>
          <p className="text-xs text-gray-500 dark:text-[#B0B0AC] font-medium mt-0.5">
            Gestiona tu perfil, apariencia y opciones del sistema.
          </p>
        </div>

        {/* ═══════════════════ SECCIÓN: MI PERFIL ═══════════════════ */}
        <section className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333333] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2D2D2D]">
            <h2 className="text-sm font-extrabold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-2">
              <User className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              Mi Perfil
            </h2>
          </div>

          <div className="p-5">
            {/* Tarjeta de identidad del operario */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#03F77C]/15 border border-emerald-300 dark:border-[#03F77C]/40 text-emerald-600 dark:text-[#03F77C] font-extrabold flex items-center justify-center text-lg font-mono shadow-xs">
                {operatorName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-[#414745] dark:text-[#F2F2F0] truncate">
                  {operatorName}
                </h3>
                <p className="text-xs font-mono font-semibold text-gray-500 dark:text-[#B0B0AC]">
                  RUT: {operatorRut}
                </p>
                <p className="text-xs font-mono font-semibold text-gray-400 dark:text-[#888888]">
                  ID Operario: {operatorId}
                </p>
              </div>
            </div>

            {/* Datos del perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-[#A0A0A0] block mb-1">Rol</span>
                <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#009D4E] dark:text-[#03F77C]" />
                  Operador de Hub
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-[#A0A0A0] block mb-1">Centro de Distribución</span>
                <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#009D4E] dark:text-[#03F77C]" />
                  CD San Bernardo
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-[#A0A0A0] block mb-1">Estación</span>
                <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-1.5">
                  <Scan className="w-3.5 h-3.5 text-[#009D4E] dark:text-[#03F77C]" />
                  #402-HUB
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-[#A0A0A0] block mb-1">Turno Activo</span>
                <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#009D4E] dark:text-[#03F77C]" />
                  Turno Diurno (06:00 - 14:00)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ SECCIÓN: APARIENCIA ═══════════════════ */}
        <section className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333333] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2D2D2D]">
            <h2 className="text-sm font-extrabold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              Apariencia
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Toggle de Modo Oscuro */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333333] flex items-center justify-center">
                  {isDark ? (
                    <Moon className="w-4.5 h-4.5 text-indigo-400" />
                  ) : (
                    <Sun className="w-4.5 h-4.5 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#414745] dark:text-[#F2F2F0]">
                    Modo Oscuro
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-[#B0B0AC]">
                    {isDark ? 'Tema oscuro activado' : 'Tema claro activado'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#009D4E]/50 ${
                  isDark
                    ? 'bg-[#03F77C]'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-[#191919] rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-3.5 h-3.5 text-[#03F77C]" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </span>
              </button>
            </div>

            {/* Descripción */}
            <div className="bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
              <p className="text-[11px] text-gray-500 dark:text-[#B0B0AC] leading-relaxed">
                El modo oscuro reduce la fatiga visual en condiciones de poca luz, ideal para turnos nocturnos en el centro de distribución. Esta preferencia se guarda automáticamente.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════ SECCIÓN: SISTEMA ═══════════════════ */}
        <section className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333333] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2D2D2D]">
            <h2 className="text-sm font-extrabold text-[#414745] dark:text-[#F2F2F0] flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              Sistema
            </h2>
          </div>

          <div className="p-5 space-y-3">
            {/* Lector */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
              <div className="flex items-center gap-2.5">
                <Scan className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
                <div>
                  <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] block">Lector de Código</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#888888] font-mono">Honeywell / Zebra Integrado</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#009D4E] dark:text-[#03F77C] bg-emerald-100 dark:bg-[#03F77C]/15 border border-emerald-300 dark:border-[#03F77C]/40 px-2 py-0.5 rounded-full">
                ACTIVO
              </span>
            </div>

            {/* Sonido */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
                <div>
                  <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] block">Sonido de Alerta</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#888888] font-mono">Volumen al 100%</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#009D4E] dark:text-[#03F77C] bg-emerald-100 dark:bg-[#03F77C]/15 border border-emerald-300 dark:border-[#03F77C]/40 px-2 py-0.5 rounded-full">
                ON
              </span>
            </div>

            {/* Red */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#252525] border border-gray-200/80 dark:border-[#333333] rounded-xl p-3">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
                <div>
                  <span className="text-xs font-bold text-[#414745] dark:text-[#F2F2F0] block">Conectividad</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#888888] font-mono">WiFi CD San Bernardo</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#009D4E] dark:text-[#03F77C] bg-emerald-100 dark:bg-[#03F77C]/15 border border-emerald-300 dark:border-[#03F77C]/40 px-2 py-0.5 rounded-full">
                EXCELENTE
              </span>
            </div>
          </div>
        </section>

        {/* Versión */}
        <div className="text-center pb-4">
          <span className="text-[10px] font-mono text-gray-400 dark:text-[#888888]">
            Portal Hubs v1.2.0 · Starken Chile · Plataforma Mantenedor
          </span>
        </div>
      </div>
    </div>
  );
};
