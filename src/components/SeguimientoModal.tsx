import React, { useState } from 'react';
import {
  X,
  Search,
  Scan,
  MapPin,
  Calendar,
  User,
  Hash,
  Barcode,
  RefreshCw,
  Package,
  Boxes,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';

export interface BultoComponente {
  id: string;
  codigoBarras26: string;
  correlativo: string;
  estado: string;
  ubicacion?: string;
}

export interface EncargoSeguimientoData {
  estado: string;
  codigoBarras26: string;
  ubicacion: string;
  codigoOF: string;
  fechaEvento: string;
  usuario: string;
  totalBultos: number;
  bultos: BultoComponente[];
}

interface SeguimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generador de piezas/bultos mock para encargos multi-bulto
const generateBultosMock = (codigoBase26: string, total: number = 20): BultoComponente[] => {
  const prefix = codigoBase26.slice(0, 20);
  const totalFormatted = total.toString().padStart(3, '0');

  const bultos: BultoComponente[] = [
    {
      id: 'bulto-0',
      codigoBarras26: codigoBase26,
      correlativo: `000/${totalFormatted}`,
      estado: 'Encargo Maestro',
      ubicacion: 'HP recepción retail',
    },
  ];

  for (let i = 1; i <= total; i++) {
    const seqStr = i.toString().padStart(3, '0');
    const bultoCodigo26 = `${prefix}${seqStr}${i.toString().padStart(3, '0')}`.slice(0, 26);
    bultos.push({
      id: `bulto-${i}`,
      codigoBarras26: bultoCodigo26,
      correlativo: `${seqStr}/${totalFormatted}`,
      estado: i % 5 === 0 ? 'En rampa' : 'Pendiente de despacho',
      ubicacion: i % 5 === 0 ? 'Rampa 24 - Puerto Montt' : 'HP recepción retail',
    });
  }

  return bultos;
};

// Datos de ejemplo para la simulación
const DEFAULT_ENCARGO: EncargoSeguimientoData = {
  estado: 'Pendiente de despacho',
  codigoBarras26: '78901234567890123456222458',
  ubicacion: 'HP recepción retail',
  codigoOF: '222458769',
  fechaEvento: '25/08/2026 08:53 hrs',
  usuario: 'Byron Guerra',
  totalBultos: 20,
  bultos: generateBultosMock('78901234567890123456222458', 20),
};

const UBICACIONES_MOCK = [
  'HP recepción retail',
  'Rampa 24 - Puerto Montt',
  'Rampa 01 - Santiago Norte',
  'Rampa 12 - Concepción',
  'Andén 3 - Clasificación',
];

const USUARIOS_MOCK = [
  'Byron Guerra',
  'Carlos Mendoza',
  'Matías Valenzuela',
  'Fernanda Soto',
];

export const SeguimientoModal: React.FC<SeguimientoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { playSuccessSound } = useAudioFeedback();
  const [encargoInfo, setEncargoInfo] = useState<EncargoSeguimientoData | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isBultosExpanded, setIsBultosExpanded] = useState(false);
  const [bultoSearchQuery, setBultoSearchQuery] = useState('');
  const [selectedBulto, setSelectedBulto] = useState<BultoComponente | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const reloadTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleToggleBultos = () => {
    const next = !isBultosExpanded;
    setIsBultosExpanded(next);
    if (next) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  };

  React.useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  // Procesar código recibido (desde scanner físico o simulación)
  const handleProcessCode = (rawCode: string) => {
    const cleaned = rawCode.trim().replace(/[^0-9A-Za-z]/g, '');
    let codigo26 = '';
    let ofNum = '';

    if (cleaned.length >= 26) {
      codigo26 = cleaned.slice(0, 26);
      ofNum = cleaned.slice(17, 26);
    } else if (cleaned.length === 9) {
      ofNum = cleaned;
      codigo26 = `78901234567890123456${cleaned}`.slice(0, 26);
    } else {
      const randomOF = Math.floor(100000000 + Math.random() * 900000000).toString();
      ofNum = randomOF;
      codigo26 = `78901234567890123456${randomOF}`.slice(0, 26);
    }

    const randomUbicacion = UBICACIONES_MOCK[Math.floor(Math.random() * UBICACIONES_MOCK.length)];
    const randomUsuario = USUARIOS_MOCK[Math.floor(Math.random() * USUARIOS_MOCK.length)];
    const now = new Date();
    const fechaFormatted = `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    })} hrs`;

    // Efecto de recarga visual tipo skeleton shimmer sutil
    setIsReloading(true);
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);

    reloadTimerRef.current = setTimeout(() => {
      const bultos = generateBultosMock(codigo26, 20);
      setEncargoInfo({
        estado: 'Pendiente de despacho',
        codigoBarras26: codigo26,
        ubicacion: encargoInfo ? randomUbicacion : DEFAULT_ENCARGO.ubicacion,
        codigoOF: ofNum || DEFAULT_ENCARGO.codigoOF,
        fechaEvento: encargoInfo ? fechaFormatted : DEFAULT_ENCARGO.fechaEvento,
        usuario: encargoInfo ? randomUsuario : DEFAULT_ENCARGO.usuario,
        totalBultos: 20,
        bultos,
      });

      playSuccessSound();
      setIsReloading(false);
    }, 250);
  };

  // Escáner de hardware activo solo mientras el modal está abierto
  useBarcodeScanner({
    onScan: (code) => {
      if (isOpen && !isReloading) {
        handleProcessCode(code);
      }
    },
    enableGlobal: isOpen,
  });

  const handleSimularScan = () => {
    if (isReloading) return;

    if (!encargoInfo) {
      // Primera vez: mostrar exactamente los datos del requerimiento con breve skeleton shimmer
      setIsReloading(true);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        setEncargoInfo(DEFAULT_ENCARGO);
        playSuccessSound();
        setIsReloading(false);
      }, 250);
    } else {
      // Siguientes escaneos: variar dinámicamente con skeleton shimmer sutil
      const randomOF = Math.floor(100000000 + Math.random() * 900000000).toString();
      handleProcessCode(randomOF);
    }
  };

  const handleClose = () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    setIsReloading(false);
    setEncargoInfo(null);
    setIsBultosExpanded(false);
    setBultoSearchQuery('');
    setSelectedBulto(null);
    onClose();
  };

  const filteredBultos = React.useMemo(() => {
    if (!encargoInfo) return [];
    const raw = bultoSearchQuery.trim();
    if (!raw) return encargoInfo.bultos;

    // Normalizar búsqueda permitiendo escribir '20', 'la 20', 'bulto 20', etc.
    const cleanQuery = raw
      .toLowerCase()
      .replace(/^(bulto|pieza|el|la)\s+/i, '')
      .trim();

    if (!cleanQuery) return encargoInfo.bultos;

    const isNumericOnly = /^\d+$/.test(cleanQuery);
    const queryNum = isNumericOnly ? parseInt(cleanQuery, 10) : null;

    return encargoInfo.bultos.filter((bulto) => {
      const [piezasActual] = bulto.correlativo.split('/');
      const numActual = parseInt(piezasActual, 10);

      // Si es un número (ej: "20", "2", "005"), verificar por número de pieza
      if (isNumericOnly && queryNum !== null) {
        if (numActual === queryNum) return true;
        if (piezasActual.includes(cleanQuery)) return true;
      }

      // Búsqueda en código de barras (ej. últimos dígitos o código de 26)
      if (bulto.codigoBarras26.toLowerCase().includes(cleanQuery)) return true;

      // Coincidencia si se ingresó formato correlativo directo (ej. "020/020")
      if (cleanQuery.includes('/') && bulto.correlativo.includes(cleanQuery)) return true;

      return false;
    });
  }, [encargoInfo, bultoSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className={`bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[96vh] sm:max-h-[92vh] overflow-y-auto p-3.5 sm:p-7 shadow-2xl relative text-center animate-scale-up ${encargoInfo ? 'sm:min-h-[580px]' : ''}`}>
        {/* Botón de Cerrar X */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-1.5 sm:p-2 rounded-xl text-gray-400 dark:text-hub-text2 hover:text-[#009D4E] dark:hover:text-[#03F77C] hover:bg-[#009D4E]/10 dark:hover:bg-[#03F77C]/10 border border-transparent dark:hover:border-[#03F77C]/30 transition-all cursor-pointer"
          title="Cerrar seguimiento"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </button>

        {/* ESTADO 1: ESPERANDO ESCANEO INICIAL */}
        {!encargoInfo ? (
          <div className="flex flex-col items-center pt-2">
            {/* Ícono de Búsqueda / Escáner proporciones PDA */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mb-3 sm:mb-4 shadow-xs">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2]" />
            </div>

            {/* Badge Requerimiento */}
            <span className="px-3 py-0.5 rounded-full bg-[#EEFBF4] dark:bg-[#03F77C]/15 text-[#009D4E] dark:text-[#03F77C] border border-[#A7F3D0] dark:border-[#03F77C]/40 text-[10px] sm:text-xs font-mono font-bold uppercase mb-2.5">
              PRIMERA ACCIÓN REQUERIDA
            </span>

            {/* Título Principal ajustado a escala estándar PDA */}
            <h3 className="text-base sm:text-xl font-extrabold text-[#414745] dark:text-hub-text1 font-sans mb-4 sm:mb-6 leading-snug max-w-xs sm:max-w-md">
              Escanea un encargo para realizar el seguimiento
            </h3>

            <div className="flex flex-col items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={handleSimularScan}
                className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-11 bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:text-[#303030] font-bold rounded-full sm:rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all font-sans cursor-pointer active:scale-[0.98]"
              >
                <Scan className="w-4 h-4 stroke-[2.2]" />
                <span>Simular Escaneo de Encargo</span>
              </button>
            </div>
          </div>
        ) : selectedBulto ? (
          /* ESTADO 3: DETALLE DEL BULTO SELECCIONADO (DISEÑO 100% IDÉNTICO AL ENCARGO MAESTRO) */
          <div className="flex flex-col text-left pt-0.5 space-y-2 sm:space-y-4 animate-fadeIn">
            {/* Cabecera con Título y Badge de Estado idéntica a Detalle del Encargo */}
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-100 dark:border-hub-border pr-8">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col items-start gap-0.5 sm:gap-1">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 leading-tight">
                    Detalle del Bulto {selectedBulto.correlativo}
                  </h4>
                  {/* Badge de estado ubicado directamente bajo el título */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wide shadow-2xs ${
                    selectedBulto.estado === 'En rampa'
                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      selectedBulto.estado === 'En rampa' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                    <span>{selectedBulto.estado}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Información Detallada con diseño 100% idéntico */}
            <div className="bg-gray-50/80 dark:bg-hub-base/60 border border-gray-200/80 dark:border-hub-border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-1.5 sm:space-y-3 font-sans">
              {/* N° de Encargo (26 dígitos del bulto) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[26px] sm:min-h-[34px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>N° de encargo:</span>
                </span>
                <span className="text-[11px] sm:text-sm font-mono font-extrabold text-gray-900 dark:text-hub-text1 break-all select-all animate-fadeIn">
                  {selectedBulto.codigoBarras26}
                </span>
              </div>

              {/* N° de OF */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>N° de OF:</span>
                </span>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border font-mono font-bold text-xs text-gray-800 dark:text-hub-text1 shadow-2xs animate-fadeIn">
                  {encargoInfo.codigoOF}
                </span>
              </div>

              {/* Ubicación */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Ubicación:</span>
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-hub-text1 text-right animate-fadeIn">
                  {selectedBulto.ubicacion || encargoInfo.ubicacion}
                </span>
              </div>

              {/* Fecha Evento */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Fecha evento:</span>
                </span>
                <span className="text-xs font-mono font-bold text-gray-700 dark:text-hub-text2 text-right animate-fadeIn">
                  {encargoInfo.fechaEvento}
                </span>
              </div>

              {/* Usuario */}
              <div className="flex items-center justify-between gap-2 min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Usuario:</span>
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-hub-text1 text-right animate-fadeIn">
                  {encargoInfo.usuario}
                </span>
              </div>
            </div>

            {/* Botones de acción inferiores (Cerrar oculto en PDA) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-0.5 sm:pt-1">
              <button
                type="button"
                onClick={() => setSelectedBulto(null)}
                className="w-full sm:w-auto h-9 px-5 border-2 border-[#009D4E]/30 dark:border-[#03F77C]/30 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:bg-emerald-200 text-[#009D4E] dark:text-[#03F77C] font-bold rounded-full sm:rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Volver al listado</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="hidden sm:flex w-auto h-9 px-6 border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated active:bg-gray-200 dark:active:bg-hub-surface text-gray-700 dark:text-hub-text1 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 items-center justify-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO 2: INFORMACIÓN DEL ENCARGO CONSULTADO */
          <div className="flex flex-col text-left pt-0.5 space-y-2 sm:space-y-4 animate-fadeIn">
            {/* Cabecera con Título y Badge de Estado integrado debajo para optimizar espacio */}
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-100 dark:border-hub-border pr-8">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col items-start gap-0.5 sm:gap-1">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 leading-tight">
                    Detalle del Encargo
                  </h4>
                  {/* Badge de estado ubicado directamente bajo el título en lugar del subtítulo */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wide bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                    <span>{encargoInfo.estado}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Información Detallada con skeleton shimmer sutil en recarga */}
            <div className="bg-gray-50/80 dark:bg-hub-base/60 border border-gray-200/80 dark:border-hub-border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-1.5 sm:space-y-3 font-sans">
              {/* N° de Encargo (26 dígitos) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[26px] sm:min-h-[34px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>N° de encargo:</span>
                </span>
                {isReloading ? (
                  <div className="h-4 w-48 sm:w-56 bg-gray-200/80 dark:bg-hub-elevated rounded-md animate-pulse shrink-0 my-0.5" />
                ) : (
                  <span className="text-[11px] sm:text-sm font-mono font-extrabold text-gray-900 dark:text-hub-text1 break-all select-all animate-fadeIn">
                    {encargoInfo.codigoBarras26}
                  </span>
                )}
              </div>

              {/* N° de OF con estilo neutro */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[30px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>N° de OF:</span>
                </span>
                {isReloading ? (
                  <div className="h-5 w-24 bg-gray-200/80 dark:bg-hub-elevated rounded-lg animate-pulse" />
                ) : (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md bg-white dark:bg-hub-surface text-gray-700 dark:text-hub-text1 border border-gray-200 dark:border-hub-border text-xs font-mono font-bold shadow-2xs animate-fadeIn">
                    {encargoInfo.codigoOF}
                  </span>
                )}
              </div>

              {/* Ubicación */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Ubicación:</span>
                </span>
                {isReloading ? (
                  <div className="h-4 w-36 bg-gray-200/80 dark:bg-hub-elevated rounded-md animate-pulse" />
                ) : (
                  <span className="text-xs font-bold text-gray-800 dark:text-hub-text1 text-right animate-fadeIn">
                    {encargoInfo.ubicacion}
                  </span>
                )}
              </div>

              {/* Fecha Evento */}
              <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2.5 border-b border-gray-200/60 dark:border-hub-border min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Fecha evento:</span>
                </span>
                {isReloading ? (
                  <div className="h-4 w-40 bg-gray-200/80 dark:bg-hub-elevated rounded-md animate-pulse" />
                ) : (
                  <span className="text-xs font-mono font-bold text-gray-800 dark:text-hub-text1 text-right animate-fadeIn">
                    {encargoInfo.fechaEvento}
                  </span>
                )}
              </div>

              {/* Usuario */}
              <div className="flex items-center justify-between gap-2 min-h-[24px] sm:min-h-[28px]">
                <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#009D4E] shrink-0" />
                  <span>Usuario:</span>
                </span>
                {isReloading ? (
                  <div className="h-4 w-28 bg-gray-200/80 dark:bg-hub-elevated rounded-md animate-pulse" />
                ) : (
                  <span className="text-xs font-bold text-gray-800 dark:text-hub-text1 text-right animate-fadeIn">
                    {encargoInfo.usuario}
                  </span>
                )}
              </div>
            </div>

            {/* Lista Desplegable de Componentes / Bultos Asociados (Diseño compacto) */}
            <div className="bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-xl overflow-hidden shadow-2xs font-sans transition-all">
              <button
                type="button"
                onClick={handleToggleBultos}
                className="w-full flex items-center justify-between py-1.5 px-2.5 sm:py-2.5 sm:px-3 bg-gray-50/90 dark:bg-hub-base/70 hover:bg-gray-100/80 dark:hover:bg-hub-elevated transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] shrink-0">
                    <Boxes className="w-3 h-3 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#414745] dark:text-hub-text1 leading-tight">
                      Bultos / Componentes del Encargo
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-hub-text3 leading-none mt-0.5">
                      {encargoInfo.bultos.length} piezas asociadas a la OF
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#009D4E]/10 text-[#009D4E] dark:bg-[#03F77C]/15 dark:text-[#03F77C] border border-[#009D4E]/20">
                    {encargoInfo.totalBultos} bultos
                  </span>
                  <div className={`w-5 h-5 flex items-center justify-center text-gray-400 transition-transform duration-200 ${isBultosExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                </div>
              </button>

              {isBultosExpanded && (
                <div className="border-t border-gray-200/80 dark:border-hub-border p-2 bg-white dark:bg-hub-surface animate-fadeIn space-y-1.5">
                  {/* Buscador de Bulto con altura y espaciado correctos */}
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-hub-text3 absolute left-3 pointer-events-none stroke-[2.2]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={bultoSearchQuery}
                      onChange={(e) => setBultoSearchQuery(e.target.value)}
                      placeholder="Buscar bulto (ej: 20, 001 o código)..."
                      className="w-full h-8 sm:h-9 pl-8 sm:pl-9 pr-8 text-xs rounded-lg sm:rounded-xl bg-gray-50 dark:bg-hub-base/60 border border-gray-200 dark:border-hub-border focus:outline-none focus:border-[#009D4E] dark:focus:border-[#03F77C] text-gray-900 dark:text-hub-text1 font-medium placeholder:text-gray-400 dark:placeholder:text-hub-text3 transition-colors"
                    />
                    {bultoSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBultoSearchQuery('')}
                        className="absolute right-2.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-hub-text1 hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    )}
                  </div>

                  {/* Barra de estado con altura fija (h-4) para que nunca desplace los elementos al escribir */}
                  <div className="flex items-center justify-between px-1 h-4 text-[10px] text-gray-500 dark:text-hub-text3">
                    {bultoSearchQuery.trim() ? (
                      <>
                        <span>Resultados de búsqueda:</span>
                        <span className="font-bold text-gray-700 dark:text-hub-text1">
                          {filteredBultos.length} de {encargoInfo.bultos.length} bultos
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Listado de piezas:</span>
                        <span className="font-medium text-gray-600 dark:text-hub-text2">
                          {encargoInfo.bultos.length} componentes
                        </span>
                      </>
                    )}
                  </div>

                  {/* Listado de Bultos con ALTURA FIJA adaptativa (h-28 en PDA, h-44 en desktop) */}
                  <div className="h-28 sm:h-44 overflow-y-auto space-y-1 pr-1">
                    {filteredBultos.length > 0 ? (
                      filteredBultos.map((bulto) => (
                        <button
                          key={bulto.id}
                          type="button"
                          onClick={() => setSelectedBulto(bulto)}
                          className="w-full flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-gray-50/80 dark:bg-hub-base/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 border border-gray-200/60 dark:border-hub-border/60 hover:border-emerald-300/80 dark:hover:border-emerald-700/60 transition-all cursor-pointer text-left group"
                          title="Ver detalle del bulto"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Package className="w-3 h-3 text-[#009D4E] dark:text-[#03F77C] shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-mono font-extrabold text-gray-900 dark:text-hub-text1 break-all">
                              {bulto.codigoBarras26}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border text-[11px] font-mono font-black text-gray-800 dark:text-hub-text1 shadow-2xs group-hover:border-emerald-400 group-hover:text-[#009D4E] dark:group-hover:text-[#03F77C]">
                              {bulto.correlativo}
                            </span>
                            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#009D4E] dark:group-hover:text-[#03F77C] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-3 text-center">
                        <p className="text-xs text-gray-500 dark:text-hub-text3">
                          No se encontró el bulto <span className="font-semibold text-gray-800 dark:text-hub-text1">"{bultoSearchQuery}"</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setBultoSearchQuery('')}
                          className="mt-1.5 text-[11px] font-bold text-[#009D4E] dark:text-[#03F77C] hover:underline cursor-pointer"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer Requerido con botón sutil para simular otro escaneo */}
            <div className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <Scan className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#009D4E] dark:text-[#03F77C] shrink-0" />
                <p className="text-[10px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-tight">
                  Para hacer seguimiento de otro encargo solo debe escanear otra etiqueta.
                </p>
              </div>
              <button
                type="button"
                disabled={isReloading}
                onClick={handleSimularScan}
                className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/90 dark:bg-emerald-900/40 hover:bg-white dark:hover:bg-emerald-900/80 border border-emerald-300/80 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Simular lectura de otra etiqueta"
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#009D4E] dark:text-[#03F77C] stroke-[2.2] ${isReloading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Botón Cerrar Secundario: visible únicamente en Desktop, oculto en PDA/móvil */}
            <div className="hidden sm:flex w-full justify-end pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="w-auto h-9 px-6 border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated active:bg-gray-200 dark:active:bg-hub-surface text-gray-700 dark:text-hub-text1 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
