import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import {
  NominaContenedora,
  EncargoRecepcion,
  TipoContenedor,
  EstadoNomina,
  EstadoEncargo,
  PrioridadSemaforo,
  ModoRecepcion,
  TrazabilidadEvento,
} from '../types';
import {
  PackageCheck,
  Scan,
  MapPin,
  Box,
  Layers,
  Container,
  Truck,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  AlertTriangle,
  X,
  ArrowLeft,
  RefreshCw,
  Search,
  RotateCcw,
  CircleCheck,
  Scale,
  ArrowRightLeft,
  Flag,
  Eye,
  Lock,
  QrCode,
  Barcode,
  Package,
  Pencil,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPERVISOR_PIN = '1234';

// ─── Step Types ──────────────────────────────────────────────────────────────

type RecepcionStep =
  | 'UBICACION'
  | 'INICIO'
  | 'SCAN_NOMINA'
  | 'VALIDACION_NOMINA'
  | 'SCAN_ENCARGO'
  | 'ALERTA_ENCARGO'
  | 'SEMAFORO'
  | 'CUADRATURA'
  | 'CIERRE_FINAL';

type SupervisorAuthReason =
  | 'NOMINA_TERMINAL'
  | 'ENCARGO_INEXISTENTE'
  | 'CIERRE_CON_PENDIENTES';

type CierreModalStep =
  | 'INCOMPLETA'
  | 'CONFIRMAR_SUPERVISOR'
  | 'QR_AUTORIZACION'
  | 'AUTORIZACION_EXITOSA'
  | 'CUADRATURA_RESUMEN'
  | 'RECEPCION_FINALIZADA';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PRESET_UBICACIONES_REC = [
  { codigo: 'UB-REC-01', nombre: 'Andén de Recepción 01 — Zona A' },
  { codigo: 'UB-REC-02', nombre: 'Andén de Recepción 02 — Zona B' },
  { codigo: 'UB-REC-03', nombre: 'Muelle 3 — Recepción Nocturna' },
];

function generarEncargos(nominaId: string, tipo: TipoContenedor, cantidad: number, todosRecepcionados = false): EncargoRecepcion[] {
  const estados: EstadoEncargo[] = ['NORMAL', 'NORMAL', 'NORMAL', 'DEVOLUCION', 'FALTA_REDIMENSIONAR', 'REDIMENSIONADA', 'NORMAL', 'NORMAL'];
  const prioridades: PrioridadSemaforo[] = [
    'P2_A_TIEMPO',
    'P1_ATRASADO',
    'P2_A_TIEMPO',
    'P3_ADELANTADO',
    'P2_A_TIEMPO',
    'P1_ATRASADO',
    'P2_A_TIEMPO',
    'P3_ADELANTADO',
  ];
  const now = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const minOffset = Math.max(0, cantidad - i);
    const timeStr = new Date(now.getTime() - minOffset * 25000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return {
      id: `${nominaId}-ENC-${String(i + 1).padStart(4, '0')}`,
      codigoOF: `OF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      codigoBarras: `78${Math.floor(1e10 + Math.random() * 9e10).toString()}`,
      estado: estados[i % estados.length],
      prioridad: tipo === 'ENCARGO' ? prioridades[i % prioridades.length] : undefined,
      esUltimaMilla: (i % 4 === 0),
      recepcionado: todosRecepcionados,
      recepcionadoAt: todosRecepcionados ? timeStr : undefined,
      nominaId,
    };
  });
}

function buildBaseTruckNomina(): NominaContenedora {
  const id = 'NOM-ENCARGO-BASE';
  const total = 50;
  const encargos = generarEncargos(id, 'ENCARGO', total, false);
  return {
    id,
    codigo: 'CARGA-GRANEL-01',
    tipo: 'ENCARGO',
    estado: 'EN_TRANSITO' as EstadoNomina,
    totalEncargos: total,
    encargosRecepcionados: 0,
    encargos,
    scannedAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  };
}

function buildContenedorIntegridad(tipo: TipoContenedor, cantidad = 300): NominaContenedora {
  const id = `NOM-${tipo}-${Math.floor(10000 + Math.random() * 90000)}`;
  const codigo = `${tipo}-${Math.floor(100000 + Math.random() * 900000)}`;
  const encargos = generarEncargos(id, tipo, cantidad, true);
  return {
    id,
    codigo,
    tipo,
    estado: 'EN_TRANSITO' as EstadoNomina,
    totalEncargos: cantidad,
    encargosRecepcionados: cantidad,
    encargos,
    scannedAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  };
}

function buildNominaDemo(tipo: TipoContenedor, modo: ModoRecepcion): NominaContenedora {
  const total = 50;
  const id = `NOM-${tipo}-${Math.floor(10000 + Math.random() * 90000)}`;
  return {
    id,
    codigo: `${tipo}-${Math.floor(100000 + Math.random() * 900000)}`,
    tipo,
    estado: 'EN_TRANSITO' as EstadoNomina,
    totalEncargos: total,
    encargosRecepcionados: 0,
    encargos: modo === 'CON_INTEGRIDAD' ? generarEncargos(id, tipo, total) : [],
    scannedAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  };
}

const MOCK_TRAZABILIDAD: TrazabilidadEvento[] = [
  { id: 'TRZ-001', ubicacion: 'Andén 01', of: 'OF-3821047', fecha: '15/09/2026 09:12', evento: 'Recepción OK', usuario: 'C.Mendoza', detalle: 'Recepcionado en sesión NOM-BINS-38210' },
  { id: 'TRZ-002', ubicacion: 'Andén 01', of: 'OF-4921038', fecha: '15/09/2026 09:14', evento: 'Alerta Devolución', usuario: 'C.Mendoza', detalle: 'Desviado a pallet CAREN' },
  { id: 'TRZ-003', ubicacion: 'Andén 02', of: 'OF-7741209', fecha: '15/09/2026 09:18', evento: 'Falta Redimensionar', usuario: 'R.Pinto', detalle: 'Separado para estación de cubicaje' },
  { id: 'TRZ-004', ubicacion: 'Andén 01', of: 'OF-3821049', fecha: '15/09/2026 09:22', evento: 'Semáforo P1', usuario: 'C.Mendoza', detalle: 'Encargo atrasado — prioridad máxima' },
  { id: 'TRZ-005', ubicacion: 'Andén 02', of: 'JAULA-992001', fecha: '15/09/2026 09:05', evento: 'Nómina TERMINAL bloqueada', usuario: 'R.Pinto', detalle: 'Desbloqueada por supervisor PIN-OK' },
];

// ─── Helper Components ────────────────────────────────────────────────────────

const TIPO_ICONS: Record<TipoContenedor, React.ComponentType<{ className?: string }>> = {
  ENCARGO: Package,
  BINS: Box,
  VALIJA: Layers,
  PALLET: Container,
  JAULA: Truck,
};

const TIPO_COLORS: Record<TipoContenedor, string> = {
  ENCARGO: 'from-blue-500 to-indigo-600',
  BINS: 'from-sky-500 to-blue-600',
  VALIJA: 'from-violet-500 to-purple-700',
  PALLET: 'from-amber-500 to-orange-600',
  JAULA: 'from-rose-500 to-red-700',
};

const SEMAFORO_CONFIG: Record<PrioridadSemaforo, { label: string; detail: string; bg: string; border: string; text: string; dot: string }> = {
  P1_ATRASADO: {
    label: 'P1 — ATRASADO',
    detail: 'Salida urgente. Priorizar carga inmediata al camión.',
    bg: 'bg-red-50 dark:bg-red-950/60',
    border: 'border-red-400 dark:border-red-600',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-industrial-error',
  },
  P2_A_TIEMPO: {
    label: 'P2 — A TIEMPO',
    detail: 'Agregar al camión en curso según plan de carga.',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-400 dark:border-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-hub-accent',
  },
  P3_ADELANTADO: {
    label: 'P3 — ADELANTADO',
    detail: 'Carga si hay espacio. Si no, reservar para siguiente turno.',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    border: 'border-sky-400 dark:border-sky-600',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
};

function estadoBadge(estado: EstadoEncargo) {
  switch (estado) {
    case 'DEVOLUCION':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">Devolución</span>;
    case 'FALTA_REDIMENSIONAR':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Falta Redimensionar</span>;
    case 'REDIMENSIONADA':
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">Redimensionada</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Normal</span>;
  }
}

function prioridadBadge(prioridad?: PrioridadSemaforo, compact = false) {
  if (!prioridad) return null;
  switch (prioridad) {
    case 'P1_ATRASADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
          <span>{compact ? 'Atrasado (Alta)' : 'Atrasado · Prioridad Alta'}</span>
        </span>
      );
    case 'P2_A_TIEMPO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{compact ? 'A tiempo (Media)' : 'A tiempo · Prioridad Media'}</span>
        </span>
      );
    case 'P3_ADELANTADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span>{compact ? 'Adelantado (Baja)' : 'Adelantado · Prioridad Baja'}</span>
        </span>
      );
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  text: string;
  type: 'success' | 'error' | 'warning';
  code?: string;
}

// ─── Module Props ─────────────────────────────────────────────────────────────

interface RecepcionModuleProps {
  onRegisterBackHandler?: (handler: (() => void) | null) => void;
  onBackHome?: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const RecepcionModule: React.FC<RecepcionModuleProps> = ({
  onRegisterBackHandler,
  onBackHome,
}) => {
  const { isPda } = useDevice();
  const { playSuccessSound, playErrorSound, playWarningSound, playAtrasadoSound, playATiempoSound, playAdelantadoSound } = useAudioFeedback();

  // ── Step State ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<RecepcionStep>('UBICACION');
  const [prevStepStack, setPrevStepStack] = useState<RecepcionStep[]>([]);

  // ── Session State ───────────────────────────────────────────────────────────
  const [ubicacion, setUbicacion] = useState<{ codigo: string; nombre: string } | null>(null);
  const [modoRecepcion, setModoRecepcion] = useState<ModoRecepcion>('CON_INTEGRIDAD');
  const [tipoContenedorSeleccionado, setTipoContenedorSeleccionado] = useState<TipoContenedor | null>(null);
  const [nominasActivas, setNominasActivas] = useState<NominaContenedora[]>(() => [buildBaseTruckNomina()]);
  const [nominaPendienteValidacion, setNominaPendienteValidacion] = useState<NominaContenedora | null>(null);

  // ── Scan State ──────────────────────────────────────────────────────────────
  const [lastScanCode, setLastScanCode] = useState('');
  const [lastScanResult, setLastScanResult] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [lastEncargoScanned, setLastEncargoScanned] = useState<EncargoRecepcion | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // ── Alert / Semaforo State ──────────────────────────────────────────────────
  const [alertaEncargo, setAlertaEncargo] = useState<EncargoRecepcion | null>(null);
  const [semaforoEncargo, setSemaforoEncargo] = useState<EncargoRecepcion | null>(null);

  // ── Supervisor Auth State ───────────────────────────────────────────────────
  const [supervisorAuthOpen, setSupervisorAuthOpen] = useState(false);
  const [supervisorAuthReason, setSupervisorAuthReason] = useState<SupervisorAuthReason | null>(null);
  const [supervisorPin, setSupervisorPin] = useState('');
  const [supervisorPinError, setSupervisorPinError] = useState(false);

  // ── Trazabilidad State ──────────────────────────────────────────────────────
  const [trazabilidadOpen, setTrazabilidadOpen] = useState(false);
  const [trazFilter, setTrazFilter] = useState('');

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Desglose PDA accordion ──────────────────────────────────────────────────
  const [desglosOpen, setDesglosOpen] = useState(false);

  // ── Valija Sello Modal & Incidencias State (Imágenes 1 a 5) ───────────────
  type ValijaModalStep = 'ESPERANDO_SELLO' | 'SELLO_EXITO' | 'SELLO_ERROR' | 'ESCANEO_BINS' | 'BINS_EXITO' | 'ALERTA_DEJAR_DESPUES';

  const [valijaModalOpen, setValijaModalOpen] = useState(false);
  const [valijaModalStep, setValijaModalStep] = useState<ValijaModalStep>('ESPERANDO_SELLO');
  const [valijaCodigoEtiqueta, setValijaCodigoEtiqueta] = useState('123465874654654132135321264671001');
  const [pendingValijaNomina, setPendingValijaNomina] = useState<NominaContenedora | null>(null);
  const [valijasEntregadasBins, setValijasEntregadasBins] = useState(0);
  const [valijasPendientesLista, setValijasPendientesLista] = useState<string[]>(['VAL-1759', 'VAL-6696', 'VAL-9930']);
  const [valijasPendientesBins, setValijasPendientesBins] = useState(3);

  // ── Modal Cierre / Cuadratura Bifurcado State ─────────────────────────────
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [cierreModalStep, setCierreModalStep] = useState<CierreModalStep>('INCOMPLETA');

  // ── Modal Derivar Valijas a Incidencias (Modo Lote) ───────────────────────
  const [derivarModalOpen, setDerivarModalOpen] = useState(false);

  // ── Testing Presets State (Discrete QA Toolbar) ───────────────────────────
  const [testTipo, setTestTipo] = useState<TipoContenedor>('ENCARGO');
  const [testModo, setTestModo] = useState<ModoRecepcion>('CON_INTEGRIDAD');

  // ─── Derived Counters ─────────────────────────────────────────────────────
  const totalGlobal = nominasActivas.reduce((s, n) => s + n.totalEncargos, 0);
  const recepcionadosGlobal = nominasActivas.reduce((s, n) => s + n.encargosRecepcionados, 0);
  const faltantesGlobal = totalGlobal - recepcionadosGlobal;

  // ─── Toast helpers ────────────────────────────────────────────────────────
  const triggerToast = useCallback((text: string, type: ToastMsg['type'], code?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastLeaving(false);
    setToast({ id: Date.now(), text, type, code });
    toastTimerRef.current = setTimeout(() => {
      setToastLeaving(true);
      setTimeout(() => { setToast(null); setToastLeaving(false); }, 280);
    }, 3600);
  }, []);

  const dismissToast = () => {
    setToastLeaving(true);
    setTimeout(() => { setToast(null); setToastLeaving(false); }, 280);
  };

  // ─── Step navigation ──────────────────────────────────────────────────────
  const pushStep = useCallback((next: RecepcionStep) => {
    setStep(prev => {
      setPrevStepStack(stack => [...stack, prev]);
      return next;
    });
  }, []);

  // ─── Back handler registration ────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (trazabilidadOpen) { setTrazabilidadOpen(false); return; }
    if (supervisorAuthOpen) { setSupervisorAuthOpen(false); setSupervisorPin(''); return; }
    if (step === 'UBICACION') { onBackHome?.(); return; }
    if (step === 'SCAN_ENCARGO' && recepcionadosGlobal === 0) {
      setStep('UBICACION');
      return;
    }
    setPrevStepStack(prev => {
      if (prev.length > 0) {
        const stack = [...prev];
        const last = stack.pop()!;
        setStep(last);
        return stack;
      }
      onBackHome?.();
      return prev;
    });
  }, [step, prevStepStack, onBackHome, trazabilidadOpen, supervisorAuthOpen, recepcionadosGlobal]);

  useEffect(() => {
    onRegisterBackHandler?.(goBack);
    return () => onRegisterBackHandler?.(null);
  }, [goBack, onRegisterBackHandler]);

  // ─── Scan handlers ────────────────────────────────────────────────────────

  const handleScanUbicacion = useCallback((code: string) => {
    const found = PRESET_UBICACIONES_REC.find(u => u.codigo === code) ?? PRESET_UBICACIONES_REC[0];
    setUbicacion(found);
    playSuccessSound();
    setLastScanResult('success');
    setLastScanCode(code);
    setTimeout(() => {
      setPrevStepStack([]);
      setStep('SCAN_ENCARGO');
    }, 400);
  }, [playSuccessSound]);

  const handleScanNomina = useCallback((code: string) => {
    if (!tipoContenedorSeleccionado) return;
    const rnd = Math.random();
    let estadoSim: EstadoNomina = 'EN_TRANSITO';
    if (rnd < 0.10) estadoSim = 'TERMINAL';
    else if (rnd < 0.15) estadoSim = 'DESPACHADA';

    const nomina: NominaContenedora = {
      ...buildNominaDemo(tipoContenedorSeleccionado, modoRecepcion),
      codigo: code,
      estado: estadoSim,
    };
    setNominaPendienteValidacion(nomina);
    setPrevStepStack(prev => [...prev, 'SCAN_NOMINA']);
    setStep('VALIDACION_NOMINA');
  }, [tipoContenedorSeleccionado, modoRecepcion]);

  const handleSimularScanNomina = useCallback(() => {
    const code = `${tipoContenedorSeleccionado}-${Math.floor(100000 + Math.random() * 900000)}`;
    handleScanNomina(code);
  }, [tipoContenedorSeleccionado, handleScanNomina]);

  useEffect(() => {
    if (step === 'VALIDACION_NOMINA' && nominaPendienteValidacion) {
      const nomina = nominaPendienteValidacion;
      const timer = setTimeout(() => {
        if (nomina.estado === 'EN_TRANSITO') {
          setNominasActivas(prev => [...prev, nomina]);
          playSuccessSound();
          triggerToast(`Nómina ${nomina.codigo} — ${nomina.totalEncargos} encargos cargados`, 'success');
          setPrevStepStack([]);
          setStep('SCAN_ENCARGO');
        } else if (nomina.estado === 'TERMINAL') {
          playErrorSound();
          setSupervisorAuthReason('NOMINA_TERMINAL');
          setSupervisorAuthOpen(true);
        } else {
          playWarningSound();
          triggerToast(`Nómina ${nomina.estado} — separar carga e informar a supervisor. Trazabilidad registrada.`, 'warning');
          setPrevStepStack([]);
          setStep('SCAN_NOMINA');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [step, nominaPendienteValidacion, playSuccessSound, playErrorSound, playWarningSound, triggerToast]);

  const handleScanEncargo = useCallback((code: string, overrideTipo?: TipoContenedor, overrideModo?: ModoRecepcion, isSimulation = false) => {
    setFlashKey(k => k + 1);

    // Si se escanea directamente un contenedor:
    const containerMatch = code.match(/^(BINS|VALIJA|PALLET|JAULA)/i);
    const tipoContainer = (containerMatch ? containerMatch[1].toUpperCase() : undefined) as TipoContenedor | undefined;
    const modoActual = overrideModo ?? testModo;

    // Caso especial VALIJA: requiere validar sello de seguridad (Imágenes 1 y 2)
    if (tipoContainer === 'VALIJA' || code.toUpperCase().includes('VALIJA') || overrideTipo === 'VALIJA') {
      const codigoValija = '123465874654654132135321264671001';
      const nuevaValija = buildContenedorIntegridad('VALIJA', 300);
      nuevaValija.codigo = code.length > 5 ? code : `VALIJA-${codigoValija.slice(-6)}`;
      setPendingValijaNomina(nuevaValija);
      setValijaCodigoEtiqueta(codigoValija);
      setValijaModalStep('ESPERANDO_SELLO');
      setValijaModalOpen(true);
      return;
    }

    if (tipoContainer && modoActual === 'CON_INTEGRIDAD') {
      const nuevoContenedor = buildContenedorIntegridad(tipoContainer, 300);
      nuevoContenedor.codigo = code.length > 5 ? code : `${tipoContainer}-${Math.floor(100000 + Math.random() * 900000)}`;
      setNominasActivas(prev => [...prev, nuevoContenedor]);
      setLastScanResult('success');
      setLastScanCode(nuevoContenedor.codigo);
      const ultimoEncargo = nuevoContenedor.encargos[nuevoContenedor.encargos.length - 1];
      setLastEncargoScanned(ultimoEncargo);
      playSuccessSound();
      triggerToast(`Nómina ${nuevoContenedor.codigo} recepcionada completa con integridad (+300 encargos)`, 'success', nuevoContenedor.codigo);
      return;
    }

    // Si aún no hay nóminas activas, este es el PRIMER ESCANEO
    if (nominasActivas.length === 0) {
      const tipo = overrideTipo ?? testTipo;
      const modo = overrideModo ?? testModo;

      if (tipo !== 'ENCARGO' && modo === 'CON_INTEGRIDAD') {
        const baseNomina = buildBaseTruckNomina();
        const nuevoContenedor = buildContenedorIntegridad(tipo, 300);
        setNominasActivas([baseNomina, nuevoContenedor]);
        setLastScanResult('success');
        setLastScanCode(nuevoContenedor.codigo);
        const ultimoEncargo = nuevoContenedor.encargos[nuevoContenedor.encargos.length - 1];
        setLastEncargoScanned(ultimoEncargo);
        playSuccessSound();
        triggerToast(`Nómina ${nuevoContenedor.codigo} recepcionada completa con integridad (+300 encargos)`, 'success', nuevoContenedor.codigo);
        return;
      }

      const nuevaNomina = buildNominaDemo(tipo, modo);

      if (modo === 'CON_INTEGRIDAD') {
        const encargos = [...nuevaNomina.encargos];
        if (encargos.length > 0) {
          const primerEncargo: EncargoRecepcion = {
            ...encargos[0],
            codigoOF: code.startsWith('OF-') ? code : (code.length >= 7 ? code : `OF-${code}`),
            recepcionado: true,
            recepcionadoAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          };
          encargos[0] = primerEncargo;
          nuevaNomina.encargos = encargos;
          nuevaNomina.encargosRecepcionados = 1;

          setNominasActivas([nuevaNomina]);
          setTipoContenedorSeleccionado(tipo);
          setModoRecepcion(modo);
          setLastEncargoScanned(primerEncargo);
          setFlashKey(k => k + 1);
          setLastScanCode(primerEncargo.codigoOF);
          setLastScanResult('success');
          playSuccessSound();
          triggerToast(`Nómina ${tipo} detectada (Con Integridad) — Primer encargo recepcionado.`, 'success', primerEncargo.codigoOF);

          if (primerEncargo.esUltimaMilla && primerEncargo.prioridad && !isSimulation) {
            setSemaforoEncargo(primerEncargo);
            setStep('SEMAFORO');
          }
          return;
        }
      } else {
        // SIN_INTEGRIDAD
        const estadosSI: EstadoEncargo[] = ['NORMAL', 'NORMAL', 'NORMAL', 'DEVOLUCION', 'FALTA_REDIMENSIONAR', 'REDIMENSIONADA'];
        const prioSI: PrioridadSemaforo[] = ['P2_A_TIEMPO', 'P1_ATRASADO', 'P3_ADELANTADO'];
        const newEnc: EncargoRecepcion = {
          id: `${nuevaNomina.id}-ENC-001`,
          codigoOF: code.startsWith('OF-') ? code : (code.length >= 7 ? code : `OF-${code}`),
          codigoBarras: code,
          estado: estadosSI[Math.floor(Math.random() * estadosSI.length)],
          prioridad: tipo === 'ENCARGO' ? prioSI[Math.floor(Math.random() * prioSI.length)] : undefined,
          esUltimaMilla: Math.random() < 0.3,
          recepcionado: true,
          recepcionadoAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          nominaId: nuevaNomina.id,
        };
        nuevaNomina.encargos = [newEnc];
        nuevaNomina.totalEncargos = 50;
        nuevaNomina.encargosRecepcionados = 1;

        setNominasActivas([nuevaNomina]);
        setTipoContenedorSeleccionado(tipo);
        setModoRecepcion(modo);
        setLastEncargoScanned(newEnc);
        setFlashKey(k => k + 1);
        setLastScanCode(newEnc.codigoOF);
        setLastScanResult('success');
        playSuccessSound();
        triggerToast(`Nómina ${tipo} detectada (Sin Integridad) — Primer encargo recepcionado.`, 'success', newEnc.codigoOF);

          if (newEnc.esUltimaMilla && newEnc.prioridad && !isSimulation) {
            setSemaforoEncargo(newEnc);
            setStep('SEMAFORO');
          }
          return;
      }
    }

    let foundEncargo: EncargoRecepcion | null = null;
    let foundNominaId: string | null = null;

    for (const nomina of nominasActivas) {
      const enc = nomina.encargos.find(e => e.codigoOF === code || e.codigoBarras === code || e.id === code);
      if (enc) { foundEncargo = enc; foundNominaId = nomina.id; break; }
    }

    if (!foundEncargo || !foundNominaId) {
      if (modoRecepcion === 'SIN_INTEGRIDAD') {
        const nominaTarget = nominasActivas[nominasActivas.length - 1];
        if (!nominaTarget) return;
        const estadosSI: EstadoEncargo[] = ['NORMAL', 'NORMAL', 'DEVOLUCION', 'FALTA_REDIMENSIONAR', 'REDIMENSIONADA'];
        const prioSI: PrioridadSemaforo[] = ['P2_A_TIEMPO', 'P1_ATRASADO', 'P3_ADELANTADO'];
        const newEnc: EncargoRecepcion = {
          id: `${nominaTarget.id}-ENC-${Date.now()}`,
          codigoOF: code.startsWith('OF-') ? code : `OF-${code}`,
          codigoBarras: code,
          estado: estadosSI[Math.floor(Math.random() * estadosSI.length)],
          prioridad: (testTipo === 'ENCARGO' || nominaTarget.tipo === 'ENCARGO') ? prioSI[Math.floor(Math.random() * prioSI.length)] : undefined,
          esUltimaMilla: Math.random() < 0.3,
          recepcionado: false,
          nominaId: nominaTarget.id,
        };
        foundEncargo = newEnc;
        foundNominaId = nominaTarget.id;
        setNominasActivas(prev => prev.map(n =>
          n.id === foundNominaId
            ? { ...n, encargos: [...n.encargos, newEnc], totalEncargos: Math.max(50, n.totalEncargos + 1) }
            : n
        ));
      } else {
        // En CON_INTEGRIDAD, buscar el primer encargo aún no recepcionado para simular escaneo fluido
        const nominaConPendientes = nominasActivas.find(n => n.encargos.some(e => !e.recepcionado));
        const pend = nominaConPendientes?.encargos.find(e => !e.recepcionado);
        if (pend) {
          foundEncargo = pend;
          foundNominaId = nominaConPendientes!.id;
        } else {
          playErrorSound();
          setLastScanResult('error');
          setLastScanCode(code);
          triggerToast(`Código ${code} no encontrado — requiere autorización de supervisor.`, 'error', code);
          setSupervisorAuthReason('ENCARGO_INEXISTENTE');
          setSupervisorAuthOpen(true);
          return;
        }
      }
    }

    if (!foundEncargo || !foundNominaId) return;

    if (foundEncargo.recepcionado) {
      playWarningSound();
      setLastScanResult('warning');
      setLastScanCode(foundEncargo.codigoOF);
      triggerToast(`${foundEncargo.codigoOF} ya fue recepcionado.`, 'warning', foundEncargo.codigoOF);
      return;
    }

    const encargoFinal = foundEncargo;
    const nominaIdFinal = foundNominaId;

    if ((encargoFinal.estado === 'DEVOLUCION' || encargoFinal.estado === 'FALTA_REDIMENSIONAR') && !isSimulation) {
      playWarningSound();
      setLastScanResult('warning');
      setLastScanCode(encargoFinal.codigoOF);
      setLastEncargoScanned(encargoFinal);
      setAlertaEncargo(encargoFinal);
      setNominasActivas(prev => prev.map(n =>
        n.id === nominaIdFinal
          ? {
            ...n,
            encargosRecepcionados: n.encargosRecepcionados + 1,
            encargos: n.encargos.map(e => e.id === encargoFinal.id ? { ...e, recepcionado: true, recepcionadoAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } : e),
          }
          : n
      ));
      setStep('ALERTA_ENCARGO');
      return;
    }

    // Audio feedback según prioridad del encargo
    if (encargoFinal.prioridad === 'P1_ATRASADO') {
      playAtrasadoSound();
    } else if (encargoFinal.prioridad === 'P3_ADELANTADO') {
      playAdelantadoSound();
    } else {
      playATiempoSound();
    }

    setLastScanResult('success');
    setLastScanCode(encargoFinal.codigoOF);
    setLastEncargoScanned(encargoFinal);
    setFlashKey(k => k + 1);
    setNominasActivas(prev => prev.map(n =>
      n.id === nominaIdFinal
        ? {
          ...n,
          encargosRecepcionados: n.encargosRecepcionados + 1,
          encargos: n.encargos.map(e => e.id === encargoFinal.id ? { ...e, recepcionado: true, recepcionadoAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) } : e),
        }
        : n
    ));

    const prioLabel = encargoFinal.prioridad === 'P1_ATRASADO'
      ? 'Atrasado (Prioridad Alta)'
      : encargoFinal.prioridad === 'P3_ADELANTADO'
      ? 'Adelantado (Prioridad Baja)'
      : 'A tiempo (Prioridad Media)';

    triggerToast(
      `${encargoFinal.codigoOF} · ${prioLabel}`,
      encargoFinal.prioridad === 'P1_ATRASADO' ? 'error' : 'success',
      encargoFinal.codigoOF
    );
  }, [nominasActivas, testTipo, testModo, modoRecepcion, playSuccessSound, playErrorSound, playWarningSound, playAtrasadoSound, playATiempoSound, playAdelantadoSound, triggerToast]);

  const handleSimularScanPrimerEncargo = useCallback((tipo?: TipoContenedor, modo?: ModoRecepcion) => {
    const t = tipo ?? testTipo;
    const m = modo ?? testModo;
    if (tipo) setTestTipo(tipo);
    if (modo) setTestModo(modo);

    // Caso VALIJA: debe validar el sello de seguridad en modal interactivo (Imágenes 1 y 2)
    if (t === 'VALIJA') {
      const codigoValija = '123465874654654132135321264671001';
      const nuevaValija = buildContenedorIntegridad('VALIJA', 300);
      nuevaValija.codigo = `VALIJA-${codigoValija.slice(-6)}`;
      setPendingValijaNomina(nuevaValija);
      setValijaCodigoEtiqueta(codigoValija);
      setValijaModalStep('ESPERANDO_SELLO');
      setValijaModalOpen(true);
      return;
    }

    // Caso Contenedor CON_INTEGRIDAD: Se suma completo (+300 encargos y +300 recepcionados)
    if (t !== 'ENCARGO' && m === 'CON_INTEGRIDAD') {
      const nuevoContenedor = buildContenedorIntegridad(t, 300);
      setNominasActivas(prev => [...prev, nuevoContenedor]);
      setLastScanResult('success');
      setLastScanCode(nuevoContenedor.codigo);
      const ultimoEncargo = nuevoContenedor.encargos[nuevoContenedor.encargos.length - 1];
      setLastEncargoScanned(ultimoEncargo);
      playSuccessSound();
      triggerToast(`Nómina ${nuevoContenedor.codigo} recepcionada completa con integridad (+300 encargos)`, 'success', nuevoContenedor.codigo);
      return;
    }

    // Caso Contenedor SIN_INTEGRIDAD: Se valida 1 por 1
    if (t !== 'ENCARGO' && m === 'SIN_INTEGRIDAD') {
      const existingNomina = nominasActivas.find(n => n.tipo === t && n.encargos.some(e => !e.recepcionado));
      if (existingNomina) {
        const pend = existingNomina.encargos.find(e => !e.recepcionado);
        if (pend) {
          handleScanEncargo(pend.codigoOF, t, m, true);
          return;
        }
      }
      const id = `NOM-${t}-${Math.floor(10000 + Math.random() * 90000)}`;
      const codigo = `${t}-${Math.floor(100000 + Math.random() * 900000)}`;
      const encargos = generarEncargos(id, t, 300, false);
      encargos[0].recepcionado = true;
      encargos[0].recepcionadoAt = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const nuevaNomina: NominaContenedora = {
        id,
        codigo,
        tipo: t,
        estado: 'EN_TRANSITO',
        totalEncargos: 300,
        encargosRecepcionados: 1,
        encargos,
        scannedAt: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      };
      setNominasActivas(prev => [...prev, nuevaNomina]);
      setLastScanResult('success');
      setLastScanCode(encargos[0].codigoOF);
      setLastEncargoScanned(encargos[0]);
      playSuccessSound();
      triggerToast(`Nómina ${codigo} (Sin Integridad) — Primer encargo verificado (1 de 300)`, 'success', encargos[0].codigoOF);
      return;
    }

    // Caso ENCARGO suelto: suma de a 1 encargo
    const pend = nominasActivas.flatMap(n => n.encargos).find(e => !e.recepcionado);
    if (pend) {
      handleScanEncargo(pend.codigoOF, t, m, true);
    } else {
      const randomOF = `OF-${Math.floor(1000000 + Math.random() * 9000000)}`;
      handleScanEncargo(randomOF, t, m, true);
    }
  }, [testTipo, testModo, nominasActivas, handleScanEncargo, playSuccessSound, triggerToast]);

  useBarcodeScanner({
    onScan: (code) => {
      if (supervisorAuthOpen || trazabilidadOpen) return;
      if (valijaModalOpen) {
        if (valijaModalStep === 'ESPERANDO_SELLO') {
          if (code.includes('ERROR') || code.includes('DIFF') || code.includes('NO')) {
            handleValijaSelloNoCoincide();
          } else {
            handleValijaSelloCoincide();
          }
          return;
        }
        if (valijaModalStep === 'ESCANEO_BINS') {
          handleValijaScanBinsExitoso();
          return;
        }
        return;
      }
      if (step === 'UBICACION') handleScanUbicacion(code);
      else if (step === 'SCAN_NOMINA') handleScanNomina(code);
      else if (step === 'SCAN_ENCARGO') handleScanEncargo(code);
    },
    enableGlobal: true,
  });

  // ─── Supervisor auth ──────────────────────────────────────────────────────
  const handleSupervisorSubmit = () => {
    if (supervisorPin !== SUPERVISOR_PIN) {
      setSupervisorPinError(true);
      playErrorSound();
      return;
    }
    playSuccessSound();
    setSupervisorAuthOpen(false);
    setSupervisorPin('');
    setSupervisorPinError(false);
    if (supervisorAuthReason === 'NOMINA_TERMINAL' && nominaPendienteValidacion) {
      const desbloqueada: NominaContenedora = { ...nominaPendienteValidacion, estado: 'EN_TRANSITO' };
      setNominasActivas(prev => [...prev, desbloqueada]);
      triggerToast(`Nómina desbloqueada por supervisor — ${desbloqueada.totalEncargos} encargos.`, 'success');
      setPrevStepStack([]);
      setStep('SCAN_ENCARGO');
    } else if (supervisorAuthReason === 'ENCARGO_INEXISTENTE') {
      triggerToast('Encargo retirado por supervisor. Trazabilidad registrada.', 'warning');
    } else if (supervisorAuthReason === 'CIERRE_CON_PENDIENTES') {
      setStep('CIERRE_FINAL');
    }
  };

  // ─── Valija Sello Modal Handlers (Imágenes 1 a 5) ─────────────────────────
  const handleValijaSelloCoincide = useCallback(() => {
    setValijaModalStep('SELLO_EXITO');
    playSuccessSound();
    setTimeout(() => {
      setValijaModalOpen(false);
      if (pendingValijaNomina) {
        setNominasActivas(prev => [...prev, pendingValijaNomina]);
        setLastScanResult('success');
        setLastScanCode(pendingValijaNomina.codigo);
        const ult = pendingValijaNomina.encargos[pendingValijaNomina.encargos.length - 1];
        setLastEncargoScanned(ult);
        triggerToast(`Nómina ${pendingValijaNomina.codigo} recepcionada completa con integridad (+300 encargos)`, 'success', pendingValijaNomina.codigo);
        setPendingValijaNomina(null);
      }
    }, 1400);
  }, [pendingValijaNomina, playSuccessSound, triggerToast]);

  const handleValijaSelloNoCoincide = useCallback(() => {
    setValijaModalStep('SELLO_ERROR');
    playErrorSound();
  }, [playErrorSound]);

  const handleValijaReintentar = useCallback(() => {
    setValijaModalStep('ESPERANDO_SELLO');
  }, []);

  const handleValijaIrABins = useCallback(() => {
    setValijaModalStep('ESCANEO_BINS');
  }, []);

  const handleValijaScanBinsExitoso = useCallback(() => {
    setValijaModalStep('BINS_EXITO');
    playSuccessSound();
    setValijasEntregadasBins(prev => prev + 1);
    if (!pendingValijaNomina) {
      setValijasPendientesLista(prev => prev.slice(1));
      setValijasPendientesBins(prev => Math.max(0, prev - 1));
    }
    setTimeout(() => {
      setValijaModalOpen(false);
      setPendingValijaNomina(null);
      triggerToast('Escaneo de contenedor exitoso. Deja este encargo en el contenedor de incidencias.', 'success');
    }, 1400);
  }, [pendingValijaNomina, playSuccessSound, triggerToast]);

  const handleValijaDejarDespues = useCallback(() => {
    setValijaModalStep('ALERTA_DEJAR_DESPUES');
    playWarningSound();
  }, [playWarningSound]);

  const handleValijaConfirmarDejarDespues = useCallback(() => {
    const nuevoCodigo = `VAL-${Math.floor(1000 + Math.random() * 9000)}`;
    setValijasPendientesLista(prev => [...prev, nuevoCodigo]);
    setValijasPendientesBins(prev => prev + 1);
    setValijaModalOpen(false);
    setPendingValijaNomina(null);
    triggerToast(`Valija ${nuevoCodigo} registrada como pendiente para contenedor de incidencias.`, 'warning');
  }, [triggerToast]);

  const handleValijaCancelar = useCallback(() => {
    setValijaModalOpen(false);
    setPendingValijaNomina(null);
  }, []);

  const handleConfirmarDerivarLote = useCallback((codigos: string[], contenedor: string) => {
    playSuccessSound();
    setValijasEntregadasBins(prev => prev + codigos.length);
    setValijasPendientesLista(prev => prev.filter(v => !codigos.includes(v)));
    setValijasPendientesBins(prev => Math.max(0, prev - codigos.length));
    triggerToast(`Se derivaron ${codigos.length} valija(s) al contenedor ${contenedor}.`, 'success');
  }, [playSuccessSound, triggerToast]);

  // ─── Cierre / Cuadratura Bifurcado Handlers ───────────────────────────────
  const handleIniciarCierre = useCallback(() => {
    const faltantes = totalGlobal - recepcionadosGlobal;
    const tienePendientes = faltantes > 0 || valijasPendientesBins > 0;
    if (tienePendientes) {
      setCierreModalStep('INCOMPLETA');
    } else {
      setCierreModalStep('CUADRATURA_RESUMEN');
    }
    setCierreModalOpen(true);
  }, [totalGlobal, recepcionadosGlobal, valijasPendientesBins]);

  const handleSupervisorAutorizado = useCallback(() => {
    playSuccessSound();
    setCierreModalStep('AUTORIZACION_EXITOSA');
    setTimeout(() => {
      setCierreModalStep('CUADRATURA_RESUMEN');
    }, 1300);
  }, [playSuccessSound]);

  const handleNuevaRecepcionDesdeModal = useCallback(() => {
    setCierreModalOpen(false);
    setStep('UBICACION');
    setUbicacion(null);
    setNominasActivas([buildBaseTruckNomina()]);
    setNominaPendienteValidacion(null);
    setTipoContenedorSeleccionado(null);
    setValijasEntregadasBins(0);
    setValijasPendientesLista(['VAL-1759', 'VAL-6696', 'VAL-9930']);
    setValijasPendientesBins(3);
    setLastScanCode('');
    setLastScanResult('idle');
    setLastEncargoScanned(null);
    setPrevStepStack([]);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFDFC] dark:bg-hub-base overflow-hidden font-sans relative">

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 sm:right-6 z-[200] max-w-sm w-[calc(100vw-2rem)] sm:w-auto px-4 py-3 rounded-2xl shadow-xl border flex items-start gap-3 transition-all
            ${toastLeaving ? 'animate-toast-slide-out-right' : 'animate-toast-slide-in-right'}
            ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : toast.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'}`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-relaxed">{toast.text}</p>
            {toast.code && <p className="text-[10px] font-mono opacity-70 mt-0.5 truncate">{toast.code}</p>}
          </div>
          <button type="button" onClick={dismissToast} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Supervisor Auth Modal ── */}
      {supervisorAuthOpen && (
        <SupervisorAuthModal
          reason={supervisorAuthReason}
          pin={supervisorPin}
          onPinChange={(v) => { setSupervisorPin(v); setSupervisorPinError(false); }}
          error={supervisorPinError}
          onSubmit={handleSupervisorSubmit}
          onCancel={() => { setSupervisorAuthOpen(false); setSupervisorPin(''); setSupervisorPinError(false); }}
        />
      )}

      {/* ── Valija Sello de Seguridad Modal (Imágenes 1, 2, 3, 4) ── */}
      <ValijaSelloModal
        isOpen={valijaModalOpen}
        step={valijaModalStep}
        valijaCodigo={valijaCodigoEtiqueta}
        onCoincide={handleValijaSelloCoincide}
        onNoCoincide={handleValijaSelloNoCoincide}
        onReintentar={handleValijaReintentar}
        onIrABins={handleValijaIrABins}
        onScanBins={handleValijaScanBinsExitoso}
        onDejarDespues={handleValijaDejarDespues}
        onConfirmarDejarDespues={handleValijaConfirmarDejarDespues}
        onCancelar={handleValijaCancelar}
      />

      {/* ── Modal Flujo de Finalización y Cuadratura (Bifurcaciones con o sin pendientes) ── */}
      <CierreRecepcionModal
        isOpen={cierreModalOpen}
        step={cierreModalStep}
        totalGlobal={totalGlobal}
        recepcionadosGlobal={recepcionadosGlobal}
        faltantes={faltantesGlobal}
        valijasPendientesBins={valijasPendientesBins}
        onContinuarEscaneo={() => setCierreModalOpen(false)}
        onFinalizarConPendientes={() => setCierreModalStep('CONFIRMAR_SUPERVISOR')}
        onVolverAEscanear={() => setCierreModalOpen(false)}
        onSolicitarAutorizacion={() => setCierreModalStep('QR_AUTORIZACION')}
        onAutorizarSupervisor={handleSupervisorAutorizado}
        onNuevaRecepcion={handleNuevaRecepcionDesdeModal}
        onBackHome={() => {
          setCierreModalOpen(false);
          onBackHome?.();
        }}
        onCancelar={() => setCierreModalOpen(false)}
      />

      {/* ── Modal Derivar Valijas a Incidencias (Modo Lote) ── */}
      <DerivarIncidenciasModal
        isOpen={derivarModalOpen}
        onClose={() => setDerivarModalOpen(false)}
        onConfirmar={handleConfirmarDerivarLote}
        valijasDisponibles={valijasPendientesLista}
        valijasPendientes={valijasPendientesBins}
      />

      {/* ── Trazabilidad Overlay ── */}
      {trazabilidadOpen && (
        <TrazabilidadOverlay
          eventos={MOCK_TRAZABILIDAD}
          filter={trazFilter}
          onFilterChange={setTrazFilter}
          onClose={() => setTrazabilidadOpen(false)}
          isPda={isPda}
        />
      )}

      {/* ── Header ── */}
      {step !== 'UBICACION' && step !== 'SCAN_ENCARGO' && (
        <RecepcionHeader
          step={step}
          ubicacion={ubicacion}
          totalGlobal={totalGlobal}
          recepcionadosGlobal={recepcionadosGlobal}
          onBack={goBack}
          onTrazabilidad={() => setTrazabilidadOpen(true)}
          isPda={isPda}
          showTrazabilidad={step === 'CUADRATURA'}
          onDerivarIncidencias={() => setDerivarModalOpen(true)}
        />
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {step === 'UBICACION' && (
          <StepUbicacion isPda={isPda} onScan={handleScanUbicacion} />
        )}
        {step === 'INICIO' && (
          <StepInicio
            isPda={isPda}
            ubicacion={ubicacion}
            tipoSeleccionado={tipoContenedorSeleccionado}
            modoRecepcion={modoRecepcion}
            onSelectTipo={setTipoContenedorSeleccionado}
            onSelectModo={setModoRecepcion}
            onContinuar={() => { if (tipoContenedorSeleccionado) pushStep('SCAN_NOMINA'); }}
            nominasActivas={nominasActivas}
          />
        )}
        {step === 'SCAN_NOMINA' && (
          <StepScanNomina
            isPda={isPda}
            tipo={tipoContenedorSeleccionado!}
            onScanSimulado={handleSimularScanNomina}
            onManualScan={handleScanNomina}
          />
        )}
        {step === 'VALIDACION_NOMINA' && (
          <StepValidacionNomina nomina={nominaPendienteValidacion} />
        )}
        {step === 'SCAN_ENCARGO' && (
          <StepScanEncargo
            isPda={isPda}
            ubicacion={ubicacion}
            onVolverRampa={() => setStep('UBICACION')}
            nominasActivas={nominasActivas}
            totalGlobal={totalGlobal}
            recepcionadosGlobal={recepcionadosGlobal}
            lastCode={lastScanCode}
            lastResult={lastScanResult}
            lastEncargo={lastEncargoScanned}
            flashKey={flashKey}
            desglosOpen={desglosOpen}
            onToggleDesglos={() => setDesglosOpen(d => !d)}
            onScan={handleScanEncargo}
            onNuevaNomina={() => pushStep('INICIO')}
            onCuadrar={handleIniciarCierre}
            modoRecepcion={modoRecepcion}
            testTipo={testTipo}
            setTestTipo={setTestTipo}
            testModo={testModo}
            setTestModo={setTestModo}
            onSimularScanPrimerEncargo={handleSimularScanPrimerEncargo}
            valijasEntregadasBins={valijasEntregadasBins}
            valijasPendientesBins={valijasPendientesBins}
            onCompletarValijaPendiente={() => {
              setValijaCodigoEtiqueta('123465874654654132135321264671001');
              setValijaModalStep('ESCANEO_BINS');
              setValijaModalOpen(true);
            }}
            onDerivarIncidencias={() => setDerivarModalOpen(true)}
          />
        )}
        {step === 'ALERTA_ENCARGO' && alertaEncargo && (
          <StepAlertaEncargo
            isPda={isPda}
            encargo={alertaEncargo}
            onContinuar={() => { setAlertaEncargo(null); setStep('SCAN_ENCARGO'); }}
          />
        )}
        {step === 'SEMAFORO' && semaforoEncargo && semaforoEncargo.prioridad && (
          <StepSemaforo
            isPda={isPda}
            encargo={semaforoEncargo}
            prioridad={semaforoEncargo.prioridad}
            onContinuar={() => { setSemaforoEncargo(null); setStep('SCAN_ENCARGO'); }}
          />
        )}
        {step === 'CUADRATURA' && (
          <StepCuadratura
            isPda={isPda}
            nominasActivas={nominasActivas}
            totalGlobal={totalGlobal}
            recepcionadosGlobal={recepcionadosGlobal}
            faltantes={faltantesGlobal}
            onFinalizar={() => {
              if (faltantesGlobal > 0) { setSupervisorAuthReason('CIERRE_CON_PENDIENTES'); setSupervisorAuthOpen(true); }
              else setStep('CIERRE_FINAL');
            }}
            onVolver={() => setStep('SCAN_ENCARGO')}
          />
        )}
        {step === 'CIERRE_FINAL' && (
          <StepCierreFinal
            isPda={isPda}
            nominasActivas={nominasActivas}
            totalGlobal={totalGlobal}
            recepcionadosGlobal={recepcionadosGlobal}
            ubicacion={ubicacion}
            onNuevaRecepcion={() => {
              setStep('UBICACION');
              setUbicacion(null);
              setNominasActivas([buildBaseTruckNomina()]);
              setNominaPendienteValidacion(null);
              setTipoContenedorSeleccionado(null);
              setValijasEntregadasBins(0);
              setValijasPendientesLista(['VAL-1759', 'VAL-6696', 'VAL-9930']);
              setValijasPendientesBins(3);
              setLastScanCode('');
              setLastScanResult('idle');
              setLastEncargoScanned(null);
              setPrevStepStack([]);
            }}
            onBackHome={() => onBackHome?.()}
          />
        )}
      </div>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const STEP_LABELS: Partial<Record<RecepcionStep, string>> = {
  UBICACION: 'Escanear Ubicación',
  INICIO: 'Recepción de carga',
  SCAN_NOMINA: 'Escanear Nómina',
  VALIDACION_NOMINA: 'Validando Nómina',
  SCAN_ENCARGO: 'Recepción de carga',
  ALERTA_ENCARGO: 'Atención requerida',
  SEMAFORO: 'Semáforo de Prioridad',
  CUADRATURA: 'Cuadratura',
  CIERRE_FINAL: 'Recepción completada',
};

const RecepcionHeader: React.FC<{
  step: RecepcionStep;
  ubicacion: { codigo: string; nombre: string } | null;
  totalGlobal: number;
  recepcionadosGlobal: number;
  onBack: () => void;
  onTrazabilidad: () => void;
  onDerivarIncidencias?: () => void;
  isPda: boolean;
  showTrazabilidad: boolean;
}> = ({ step, ubicacion, totalGlobal, recepcionadosGlobal, onBack, onTrazabilidad, onDerivarIncidencias, showTrazabilidad }) => {
  const progress = totalGlobal > 0 ? (recepcionadosGlobal / totalGlobal) * 100 : 0;

  return (
    <div className="shrink-0 bg-white dark:bg-hub-surface border-b border-gray-200 dark:border-hub-border px-4 py-3 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-hub-text2 hover:bg-gray-100 dark:hover:bg-hub-elevated border border-transparent hover:border-gray-200 dark:hover:border-hub-border transition-all cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-sm font-extrabold text-[#303030] dark:text-hub-text1 truncate">{STEP_LABELS[step] ?? 'Recepción'}</h2>
        </div>
        {ubicacion && (
          <p className="text-[10px] text-gray-400 dark:text-hub-text3 font-mono truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 inline shrink-0" />{ubicacion.nombre}
          </p>
        )}
      </div>
      {step === 'SCAN_ENCARGO' && totalGlobal > 0 && (
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs font-mono font-extrabold text-hub-accent">
            {recepcionadosGlobal}<span className="text-gray-400 dark:text-hub-text3">/{totalGlobal}</span>
          </span>
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-hub-elevated rounded-full overflow-hidden">
            <div className="h-full bg-hub-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {onDerivarIncidencias && (
        <button
          type="button"
          onClick={onDerivarIncidencias}
          title="Derivar valijas a contenedor de incidencias"
          className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all cursor-pointer shadow-2xs"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Derivar a incidencias</span>
          <span className="sm:hidden text-[10px]">Incidencias</span>
        </button>
      )}
      {showTrazabilidad && (
        <button
          type="button"
          onClick={onTrazabilidad}
          title="Ver trazabilidad"
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-hub-text2 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ─── Step: Ubicación ──────────────────────────────────────────────────────────

const StepUbicacion: React.FC<{ isPda: boolean; onScan: (code: string) => void }> = ({ isPda, onScan }) => {
  if (isPda) {
    return (
      <div className="flex-1 flex flex-col justify-start p-4">
        <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-3xl p-6 text-center mt-2 shadow-xs flex flex-col items-center animate-fadeIn">
          <div className="w-24 h-24 mb-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 shadow-2xs">
            <QrCode className="w-12 h-12 stroke-[2.2]" />
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase mb-2">
            PRIMERA ACCIÓN REQUERIDA
          </span>

          <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 mb-1.5 leading-snug">
            Escanea el QR de la ubicación donde se realizará la recepción
          </h3>

          <p className="text-xs text-gray-500 dark:text-hub-text2 mb-5 max-w-xs">
            Escanea el QR de la ubicación para habilitar las acciones de recepción.
          </p>

          <div className="w-full">
            <button
              type="button"
              onClick={() => onScan('UB-REC-01')}
              className="w-full h-12 bg-[#009D4E] hover:bg-[#008743] font-bold rounded-full text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all font-sans active:scale-[0.98] cursor-pointer"
            >
              <Scan className="w-4 h-4" />
              <span>Escanear Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-220px)] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-10 sm:p-12 shadow-sm border border-gray-200/80 dark:border-hub-border text-center flex flex-col items-center justify-center animate-fadeIn max-w-lg w-full">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#009D4E] dark:text-emerald-400 mb-4 shadow-xs">
          <QrCode className="w-10 h-10 stroke-[2.2]" />
        </div>

        <span className="px-3.5 py-1 rounded-full bg-[#EEFBF4] dark:bg-[#03F77C]/15 text-[#009D4E] dark:text-[#03F77C] border border-[#A7F3D0] dark:border-[#03F77C]/40 text-xs font-mono font-bold uppercase mb-3">
          PRIMERA ACCIÓN REQUERIDA
        </span>

        <h2 className="text-2xl font-black text-[#414745] dark:text-hub-text1 font-sans mb-2">
          Escanea el QR de la ubicación donde se realizará la recepción
        </h2>

        <p className="text-sm text-gray-500 dark:text-hub-text2 font-medium max-w-md mb-6">
          Escanea el QR de la ubicación para habilitar las acciones de recepción.
        </p>

        <div className="flex items-center gap-3 w-full justify-center">
          <button
            type="button"
            onClick={() => onScan('UB-REC-01')}
            className="w-full sm:w-auto px-8 py-4 bg-[#009D4E] hover:bg-[#008743] text-white font-extrabold rounded-2xl text-sm shadow-md flex items-center justify-center gap-3 transition-all font-sans cursor-pointer active:scale-[0.98]"
          >
            <Scan className="w-5 h-5" />
            <span>Escanear Ubicación</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Step: Inicio ─────────────────────────────────────────────────────────────

const StepInicio: React.FC<{
  isPda: boolean;
  ubicacion: { codigo: string; nombre: string } | null;
  tipoSeleccionado: TipoContenedor | null;
  modoRecepcion: ModoRecepcion;
  onSelectTipo: (t: TipoContenedor) => void;
  onSelectModo: (m: ModoRecepcion) => void;
  onContinuar: () => void;
  nominasActivas: NominaContenedora[];
}> = ({ ubicacion, tipoSeleccionado, modoRecepcion, onSelectTipo, onSelectModo, onContinuar, nominasActivas }) => {
  const tipos: TipoContenedor[] = ['BINS', 'VALIJA', 'PALLET', 'JAULA'];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {ubicacion && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 truncate">{ubicacion.nombre}</p>
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-500">{ubicacion.codigo}</p>
          </div>
        </div>
      )}
      {nominasActivas.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-wide">Nóminas en sesión ({nominasActivas.length})</p>
          <div className="space-y-1.5">
            {nominasActivas.map(n => (
              <div key={n.id} className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#303030] dark:text-hub-text1 truncate max-w-[60%]">{n.codigo}</span>
                <span className="font-bold text-hub-accent font-mono">{n.encargosRecepcionados}/{n.totalEncargos}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-hub-text2 uppercase tracking-wider mb-3">Tipo de nómina contenedora</p>
        <div className="grid grid-cols-2 gap-3">
          {tipos.map(tipo => {
            const Icon = TIPO_ICONS[tipo];
            const isSelected = tipoSeleccionado === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => onSelectTipo(tipo)}
                className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all cursor-pointer font-sans
                  ${isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-500' : 'border-gray-200 dark:border-hub-border bg-white dark:bg-hub-surface hover:border-amber-300 dark:hover:border-amber-700'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TIPO_COLORS[tipo]} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-extrabold ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-[#303030] dark:text-hub-text1'}`}>{tipo}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-hub-text2 uppercase tracking-wider mb-3">Modo de recepción</p>
        <div className="flex rounded-2xl border border-gray-200 dark:border-hub-border overflow-hidden bg-gray-50 dark:bg-hub-elevated p-1 gap-1">
          {(['CON_INTEGRIDAD', 'SIN_INTEGRIDAD'] as ModoRecepcion[]).map(modo => (
            <button
              key={modo}
              type="button"
              onClick={() => onSelectModo(modo)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                ${modoRecepcion === modo
                  ? 'bg-white dark:bg-hub-surface text-amber-700 dark:text-amber-300 shadow-sm border border-amber-200 dark:border-amber-700'
                  : 'text-gray-500 dark:text-hub-text2 hover:text-gray-700 dark:hover:text-hub-text1'}`}
            >
              {modo === 'CON_INTEGRIDAD' ? 'Con Integridad' : 'Sin Integridad'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-hub-text3 mt-2 leading-relaxed">
          {modoRecepcion === 'CON_INTEGRIDAD' ? 'Los encargos se cargan automáticamente al escanear la nómina.' : 'Deberás escanear cada encargo individualmente.'}
        </p>
      </div>
      <button
        type="button"
        disabled={!tipoSeleccionado}
        onClick={onContinuar}
        className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 dark:disabled:bg-hub-elevated disabled:text-gray-400 dark:disabled:text-hub-text3 disabled:cursor-not-allowed text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/30 cursor-pointer active:scale-[0.98]"
      >
        <Scan className="w-5 h-5" />
        Escanear nómina
      </button>
    </div>
  );
};

// ─── Step: Scan Nómina ────────────────────────────────────────────────────────

const StepScanNomina: React.FC<{
  isPda: boolean;
  tipo: TipoContenedor;
  onScanSimulado: () => void;
  onManualScan: (code: string) => void;
}> = ({ tipo, onScanSimulado, onManualScan }) => {
  const [manual, setManual] = useState('');
  const Icon = TIPO_ICONS[tipo];

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-[55vh] justify-center">
      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${TIPO_COLORS[tipo]} flex items-center justify-center text-white shadow-lg`}>
        <Icon className="w-10 h-10" />
      </div>
      <div className="text-center max-w-xs">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full inline-block mb-3">Nómina {tipo}</span>
        <h3 className="text-xl font-extrabold text-[#303030] dark:text-hub-text1 mb-2">Escanea la nómina contenedora</h3>
        <p className="text-sm text-gray-500 dark:text-hub-text2">Apunta el lector al código de barras de la nómina {tipo}.</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={e => setManual(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manual.trim()) { onManualScan(manual.trim()); setManual(''); } }}
            placeholder={`Código ${tipo}...`}
            className="flex-1 h-12 px-4 rounded-xl border border-gray-200 dark:border-hub-border bg-white dark:bg-hub-surface text-sm text-[#303030] dark:text-hub-text1 placeholder-gray-300 dark:placeholder-hub-text3 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 font-mono"
          />
          <button type="button" disabled={!manual.trim()} onClick={() => { onManualScan(manual.trim()); setManual(''); }}
            className="h-12 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 dark:disabled:bg-hub-elevated disabled:cursor-not-allowed text-white font-bold text-sm transition-all cursor-pointer">OK</button>
        </div>
        <button type="button" onClick={onScanSimulado}
          className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/30 transition-all cursor-pointer active:scale-[0.98]">
          <Barcode className="w-5 h-5" /> Simular escaneo
        </button>
      </div>
    </div>
  );
};

// ─── Step: Validación Nómina ──────────────────────────────────────────────────

const StepValidacionNomina: React.FC<{ nomina: NominaContenedora | null }> = ({ nomina }) => {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);
  if (!nomina) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-[55vh]">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-amber-500 dark:text-amber-400 animate-spin" />
      </div>
      <div className="text-center max-w-xs">
        <h3 className="text-xl font-extrabold text-[#303030] dark:text-hub-text1 mb-2">Validando nómina{dots}</h3>
        <p className="text-sm font-mono text-gray-500 dark:text-hub-text2 truncate">{nomina.codigo}</p>
        <p className="text-xs text-gray-400 dark:text-hub-text3 mt-1">Verificando estado y cargando encargos</p>
      </div>
    </div>
  );
};

// ─── Modal: Validar Sello de Seguridad para Valijas (Imágenes 1 a 4) ─────────

interface ValijaSelloModalProps {
  isOpen: boolean;
  step: 'ESPERANDO_SELLO' | 'SELLO_EXITO' | 'SELLO_ERROR' | 'ESCANEO_BINS' | 'BINS_EXITO' | 'ALERTA_DEJAR_DESPUES';
  valijaCodigo: string;
  onCoincide: () => void;
  onNoCoincide: () => void;
  onReintentar: () => void;
  onIrABins: () => void;
  onScanBins: () => void;
  onDejarDespues: () => void;
  onConfirmarDejarDespues: () => void;
  onCancelar: () => void;
}

const ValijaSelloModal: React.FC<ValijaSelloModalProps> = ({
  isOpen,
  step,
  valijaCodigo,
  onCoincide,
  onNoCoincide,
  onReintentar,
  onIrABins,
  onScanBins,
  onDejarDespues,
  onConfirmarDejarDespues,
  onCancelar,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-hub-border max-w-[560px] w-full font-sans transition-all">
        
        {/* ── 1. ESPERANDO SELLO (Imágenes 1 y 2) ── */}
        {step === 'ESPERANDO_SELLO' && (
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-hub-text1 text-center font-sans">
              Validar Sello de Seguridad
            </h3>

            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500 dark:text-hub-text2">
                Código de etiqueta valija:
              </p>
              <p className="text-xs sm:text-sm font-mono font-black text-gray-800 dark:text-gray-100 tracking-tight break-all mt-0.5 px-1">
                {valijaCodigo}
              </p>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-[#FFF9EE] dark:bg-amber-950/40 border border-[#FDE6B6] dark:border-amber-800/60 text-[#7A4D05] dark:text-amber-200 text-xs font-medium leading-relaxed text-center">
              Escanea el sello físico ubicado en la parte superior de la valija.
            </div>

            <div className="my-6 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-950 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs font-medium text-gray-500 dark:text-hub-text2 font-sans">
                Esperando sello de seguridad...
              </p>
            </div>

            {/* QA Toolbar para pruebas rápidas */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={onCoincide}
                className="flex-1 py-2 px-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
              >
                ✓ Sello Coincide
              </button>
              <button
                type="button"
                onClick={onNoCoincide}
                className="flex-1 py-2 px-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-all cursor-pointer"
              >
                ✕ No Coincide
              </button>
            </div>

            <button
              type="button"
              onClick={onCancelar}
              className="w-full py-3.5 rounded-full border border-gray-900 dark:border-gray-300 text-gray-900 dark:text-white font-extrabold text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-hub-elevated active:scale-95 transition-all cursor-pointer font-sans"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── 2. SELLO ÉXITO ── */}
        {step === 'SELLO_EXITO' && (
          <div className="py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              ¡Sello validado correctamente!
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2">
              Cargando encargos de la valija a la sesión...
            </p>
          </div>
        )}

        {/* ── 3. SELLO ERROR (Imagen 3) ── */}
        {step === 'SELLO_ERROR' && (
          <div className="text-center pt-2">
            <div className="w-14 h-14 rounded-full bg-[#EF5350] flex items-center justify-center text-white mx-auto mb-3 shadow-sm">
              <X className="w-7 h-7 stroke-[2.8]" />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white font-sans">
              El sello no coincide
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 mb-6 font-sans">
              Vuelve a escanear o deja este encargo en el contenedor de incidencias.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onIrABins}
                className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border text-gray-800 dark:text-white font-bold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-hub-elevated active:scale-95 transition-all cursor-pointer font-sans whitespace-nowrap text-center shadow-2xs"
              >
                Dejar en contenedor de incidencias
              </button>

              <button
                type="button"
                onClick={onReintentar}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#303030] hover:bg-[#1f1f1f] dark:bg-white text-white dark:text-[#303030] font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer font-sans whitespace-nowrap text-center"
              >
                Reintentar escaneo
              </button>
            </div>
          </div>
        )}

        {/* ── 4. ESCANEO CONTENEDOR DE INCIDENCIAS (Imagen 4) ── */}
        {step === 'ESCANEO_BINS' && (
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white text-center font-sans">
              Escanea el QR del contenedor de incidencias
            </h3>

            <ul className="mt-4 space-y-2 text-xs text-gray-700 dark:text-gray-300 font-medium px-1">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>Dirígete al contenedor de incidencias (bins, pallet o jaula).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 font-bold">•</span>
                <span>Escanea el QR y deja este encargo en el contenedor de incidencias.</span>
              </li>
            </ul>

            <div className="my-5 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-950 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs font-medium text-gray-500 dark:text-hub-text2 font-sans">
                Esperando escaneo de QR de contenedor
              </p>
            </div>

            <button
              type="button"
              onClick={onScanBins}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800 transition-all mb-3 cursor-pointer"
            >
              Simular Escaneo QR Contenedor
            </button>

            <button
              type="button"
              onClick={onDejarDespues}
              className="w-full py-3.5 rounded-full border border-gray-800 dark:border-gray-400 text-gray-800 dark:text-white font-extrabold text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-hub-elevated active:scale-95 transition-all cursor-pointer font-sans"
            >
              Dejar para después
            </button>
          </div>
        )}

        {/* ── 5. CONTENEDOR ÉXITO ── */}
        {step === 'BINS_EXITO' && (
          <div className="py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              ¡Escaneo de contenedor exitoso!
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2">
              Deja este encargo en el contenedor de incidencias.
            </p>
          </div>
        )}

        {/* ── 6. ALERTA DEJAR PARA DESPUÉS ── */}
        {step === 'ALERTA_DEJAR_DESPUES' && (
          <div className="text-center pt-2">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white font-sans">
              Valija pendiente para contenedor de incidencias
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 mb-6 font-sans leading-relaxed">
              Recuerda que igualmente al finalizar la recepción debes dejar este encargo en el contenedor de incidencias.
            </p>

            <button
              type="button"
              onClick={onConfirmarDejarDespues}
              className="w-full py-3.5 rounded-full bg-[#303030] dark:bg-white text-white dark:text-[#303030] font-extrabold text-xs sm:text-sm shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer font-sans"
            >
              Entendido, ir a recepción
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Modal Derivar Valijas a Incidencias (Modo Lote) ─────────────────────────

interface DerivarIncidenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (valijas: string[], contenedorId: string) => void;
  valijasDisponibles?: string[];
  valijasPendientes?: number;
}

const DerivarIncidenciasModal: React.FC<DerivarIncidenciasModalProps> = ({
  isOpen,
  onClose,
  onConfirmar,
  valijasDisponibles = ['VAL-1759', 'VAL-6696', 'VAL-9930'],
  valijasPendientes = 0,
}) => {
  const [paso, setPaso] = useState<'SCAN_VALIJAS' | 'SCAN_CONTENEDOR' | 'EXITO'>('SCAN_VALIJAS');
  const [listaValijas, setListaValijas] = useState<string[]>([]);
  const [valijasActivadas, setValijasActivadas] = useState<string[]>([]);
  const [valijasEntregadas, setValijasEntregadas] = useState<string[]>([]);
  const [contenedorId, setContenedorId] = useState('');
  const prevIsOpenRef = useRef(false);

  // Reset al abrir el modal (solo cuando pasa de cerrado a abierto)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setPaso('SCAN_VALIJAS');
      const base = valijasDisponibles && valijasDisponibles.length > 0
        ? [...valijasDisponibles]
        : ['VAL-1759', 'VAL-6696', 'VAL-9930'];
      setListaValijas(base);
      setValijasActivadas([]); // Por default deshabilitadas hasta que se escaneen
      setValijasEntregadas([]);
      setContenedorId('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, valijasDisponibles]);

  if (!isOpen) return null;

  const escanearValija = (codigo: string) => {
    const clean = codigo.trim().toUpperCase();
    if (!clean) return;

    if (!listaValijas.includes(clean)) {
      setListaValijas(prev => [...prev, clean]);
      setValijasActivadas(prev => [...prev, clean]);
    } else if (valijasActivadas.includes(clean)) {
      // Si se vuelve a escanear una valija ya activada, se quita del lote
      setValijasActivadas(prev => prev.filter(v => v !== clean));
    } else {
      setValijasActivadas(prev => [...prev, clean]);
    }
  };

  const simularScanValija = () => {
    // Si quedan valijas pendientes por activar, escanea la siguiente
    const siguientePendiente = listaValijas.find(v => !valijasActivadas.includes(v));
    if (siguientePendiente) {
      escanearValija(siguientePendiente);
    } else {
      // Si ya todas están activadas, al simular escaneo se desactiva la primera para demostrar el descarte
      const primera = listaValijas[0];
      if (primera) {
        escanearValija(primera);
      }
    }
  };

  const confirmarContenedor = (codigo: string) => {
    const clean = codigo.trim().toUpperCase() || 'BIN-INC-01';
    setContenedorId(clean);
    setValijasEntregadas([...valijasActivadas]);
    setPaso('EXITO');
    onConfirmar(valijasActivadas, clean);
  };

  return (
    <div className="fixed inset-0 z-[230] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-hub-border max-w-[540px] w-full font-sans transition-all">
        
        {/* ── STEP 1: ESCANEO DE VALIJAS EN LOTE ── */}
        {paso === 'SCAN_VALIJAS' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-2xs">
              <Layers className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-hub-text1 text-center mb-5 max-w-sm mx-auto leading-snug">
              Escanea las valijas que dejarás en el contenedor de incidencias
            </h3>

            {/* Botón simular escaneo */}
            <div className="mb-4">
              <button
                type="button"
                onClick={simularScanValija}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <Scan className="w-4 h-4" />
                <span>
                  {listaValijas.some(v => !valijasActivadas.includes(v))
                    ? '+ Simular escaneo de valija disponible'
                    : '+ Simular escaneo de valija adicional'}
                </span>
              </button>
            </div>


            {/* Lista de valijas en lote */}
            <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-3 border border-gray-200/80 dark:border-hub-border mb-5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-hub-border/60 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-hub-text3">
                    Valijas en lote
                  </span>
                  {valijasPendientes > 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-hub-text3 font-medium">
                      ({valijasPendientes} pendientes)
                    </span>
                  )}
                </div>
                <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full transition-all ${
                  valijasActivadas.length > 0
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-gray-200 dark:bg-hub-surface text-gray-500'
                }`}>
                  {valijasActivadas.length} de {listaValijas.length} activada{valijasActivadas.length === 1 ? '' : 's'}
                </span>
              </div>

              {listaValijas.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 dark:text-hub-text3">
                  No hay valijas con incidencia pendientes para derivar.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:thin]">
                  {listaValijas.map((val, idx) => {
                    const isActivada = valijasActivadas.includes(val);
                    return (
                      <div
                        key={val}
                        onClick={() => escanearValija(val)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                          isActivada
                            ? 'bg-white dark:bg-hub-surface border-emerald-300 dark:border-emerald-700 shadow-2xs'
                            : 'bg-gray-100/70 dark:bg-hub-surface/40 border-dashed border-gray-300 dark:border-hub-border/60 opacity-60 hover:opacity-90'
                        }`}
                        title="Haz clic para simular escaneo (activa o quita del lote)"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 transition-all ${
                            isActivada
                              ? 'bg-[#009D4E] text-white shadow-2xs'
                              : 'bg-gray-200 dark:bg-hub-elevated text-gray-500'
                          }`}>
                            {isActivada ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-mono text-xs font-bold transition-colors ${
                              isActivada
                                ? 'text-[#303030] dark:text-hub-text1'
                                : 'text-gray-400 dark:text-hub-text3'
                            }`}>
                              {val}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-all ${
                              isActivada
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-[#006338] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-200/80 dark:bg-hub-elevated text-gray-500 dark:text-hub-text3'
                            }`}>
                              {isActivada ? 'Activada' : 'Deshabilitada (Pendiente)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={valijasActivadas.length === 0}
                onClick={() => setPaso('SCAN_CONTENEDOR')}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#009D4E] hover:bg-[#008743] disabled:bg-gray-200 dark:disabled:bg-hub-elevated disabled:text-gray-400 dark:disabled:text-hub-text3 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ESCANEAR CONTENEDOR DE DESTINO ── */}
        {paso === 'SCAN_CONTENEDOR' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-3 shadow-2xs">
              <Box className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-hub-text1 text-center mb-1 max-w-sm mx-auto leading-snug">
              Escanea el QR del contenedor de incidencias
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2 text-center mb-4">
              Al escanear el QR, deposita las valijas dentro del contenedor.
            </p>

            {/* Resumen del lote */}
            <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-3 border border-amber-200 dark:border-amber-800 flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Total valijas a depositar:
              </span>
              <span className="text-sm font-mono font-black text-amber-700 dark:text-amber-400">
                {valijasActivadas.length} valija(s) activada(s)
              </span>
            </div>

            {/* Spinner esperando escaneo de QR */}
            <div className="my-5 flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-950 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs font-medium text-gray-500 dark:text-hub-text2">
                Esperando escaneo de QR del contenedor...
              </p>
            </div>

            {/* Botón simular QR */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => confirmarContenedor('BIN-INC-01')}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Simular escaneo QR Contenedor (BIN-INC-01)</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPaso('SCAN_VALIJAS')}
                className="flex-1 py-3 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
              >
                Volver a valijas
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-hub-elevated transition-all cursor-pointer text-center active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRMACIÓN EXITOSA ── */}
        {paso === 'EXITO' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-hub-text1 mb-1">
              Valijas entregadas en contenedor de incidencias
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2 mb-4">
              Se ingresaron <span className="font-bold text-gray-800 dark:text-white">{valijasEntregadas.length} valija(s)</span> al contenedor <span className="font-mono font-bold text-[#009D4E] dark:text-[#03F77C]">{contenedorId}</span>.
            </p>

            <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-3 border border-gray-200/80 dark:border-hub-border mb-5 flex flex-wrap gap-1.5 justify-center max-h-28 overflow-y-auto">
              {valijasEntregadas.map(v => (
                <span
                  key={v}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#009D4E]" />
                  {v}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#009D4E] hover:bg-[#008743] text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center"
            >
              Aceptar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Modal Cierre Recepción (Bifurcaciones, Autorización Supervisor QR y Cuadratura) ───

interface CierreRecepcionModalProps {
  isOpen: boolean;
  step: CierreModalStep;
  totalGlobal: number;
  recepcionadosGlobal: number;
  faltantes: number;
  valijasPendientesBins: number;
  onContinuarEscaneo: () => void;
  onFinalizarConPendientes: () => void;
  onVolverAEscanear: () => void;
  onSolicitarAutorizacion: () => void;
  onAutorizarSupervisor: () => void;
  onNuevaRecepcion: () => void;
  onBackHome: () => void;
  onCancelar: () => void;
}

const CierreRecepcionModal: React.FC<CierreRecepcionModalProps> = ({
  isOpen,
  step,
  recepcionadosGlobal,
  faltantes,
  valijasPendientesBins,
  onContinuarEscaneo,
  onFinalizarConPendientes,
  onVolverAEscanear,
  onSolicitarAutorizacion,
  onAutorizarSupervisor,
  onNuevaRecepcion,
  onBackHome,
  onCancelar,
}) => {
  // Timer para simular la lectura del supervisor en el modal QR
  useEffect(() => {
    if (isOpen && step === 'QR_AUTORIZACION') {
      const timer = setTimeout(() => {
        onAutorizarSupervisor();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step, onAutorizarSupervisor]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-hub-border max-w-[520px] w-full font-sans transition-all">

        {/* ── 1. RECEPCIÓN INCOMPLETA ── */}
        {step === 'INCOMPLETA' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-2xs">
              <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-hub-text1 text-center mb-1">
              ¿Cerrar recepción con pendientes?
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2 text-center mb-4">
              Aún quedan elementos por procesar en esta carga.
            </p>

            {/* Tarjeta estructurada de faltantes con estilo cuadratura */}
            <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Encargos por escanear:
                </span>
                <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                  {faltantes}
                </span>
              </div>

              {valijasPendientesBins > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                  <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                    Valijas pendientes de entrega:
                  </span>
                  <span className="text-base font-black font-mono text-red-600 dark:text-red-400">
                    {valijasPendientesBins}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onFinalizarConPendientes}
                className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
              >
                Finalizar con pendientes
              </button>
              <button
                type="button"
                onClick={onContinuarEscaneo}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#303030] hover:bg-[#1f1f1f] text-white dark:bg-[#03F77C] dark:hover:bg-[#02D66B] dark:text-[#303030] font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" />
                <span>Continuar escaneo</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2. SE REQUIERE AUTORIZACIÓN SUPERVISOR ── */}
        {step === 'CONFIRMAR_SUPERVISOR' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4 shadow-2xs">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-hub-text1 mb-2">
              Se requiere autorización supervisor
            </h3>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-hub-text2 leading-relaxed mb-6">
              Para finalizar con encargos pendientes, necesitas la autorización de un supervisor.
            </p>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onSolicitarAutorizacion}
                className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
              >
                Solicitar autorización
              </button>
              <button
                type="button"
                onClick={onVolverAEscanear}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#303030] hover:bg-[#1f1f1f] text-white dark:bg-[#03F77C] dark:hover:bg-[#02D66B] dark:text-[#303030] font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center"
              >
                Volver a escanear
              </button>
            </div>
          </div>
        )}

        {/* ── 3. AUTORIZACIÓN REQUERIDA (QR ADJUNTO) ── */}
        {step === 'QR_AUTORIZACION' && (
          <div className="text-center">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">
              Autorización Requerida
            </h3>

            {/* Caja de alerta amarilla/beige idéntica a la imagen */}
            <div className="p-3 rounded-xl bg-[#FFF9EE] dark:bg-amber-950/40 border border-[#FDE6B6] dark:border-amber-800/60 text-[#7A4D05] dark:text-amber-200 text-xs font-semibold leading-relaxed mb-4">
              Para finalizar la recepción con envíos pendientes, un supervisor debe validar la carga.
            </div>

            {/* Código QR idéntico a la imagen (clickeable para simular autorización) */}
            <div
              onClick={onAutorizarSupervisor}
              title="Haz clic aquí para validar autorización inmediatamente"
              className="w-44 h-44 sm:w-48 sm:h-48 mx-auto bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center cursor-pointer hover:scale-102 transition-transform"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Cuadrados posicionadores esquina sup izq */}
                <rect x="8" y="8" width="28" height="28" rx="4" fill="black" />
                <rect x="12" y="12" width="20" height="20" rx="2" fill="white" />
                <rect x="16" y="16" width="12" height="12" rx="2" fill="black" />

                {/* Cuadrados posicionadores esquina sup der */}
                <rect x="64" y="8" width="28" height="28" rx="4" fill="black" />
                <rect x="68" y="12" width="20" height="20" rx="2" fill="white" />
                <rect x="72" y="16" width="12" height="12" rx="2" fill="black" />

                {/* Cuadrados posicionadores esquina inf izq */}
                <rect x="8" y="64" width="28" height="28" rx="4" fill="black" />
                <rect x="12" y="68" width="20" height="20" rx="2" fill="white" />
                <rect x="16" y="72" width="12" height="12" rx="2" fill="black" />

                {/* Módulos de datos simulando el QR exacto de la referencia */}
                <rect x="42" y="8" width="5" height="10" fill="black" />
                <rect x="52" y="14" width="6" height="5" fill="black" />
                <rect x="42" y="24" width="16" height="6" fill="black" />
                <rect x="8" y="42" width="12" height="6" fill="black" />
                <rect x="25" y="42" width="6" height="14" fill="black" />
                <rect x="36" y="38" width="8" height="8" fill="black" />
                <rect x="48" y="36" width="10" height="6" fill="black" />
                <rect x="64" y="40" width="8" height="6" fill="black" />
                <rect x="78" y="42" width="14" height="6" fill="black" />
                <rect x="8" y="52" width="12" height="6" fill="black" />
                <rect x="36" y="50" width="6" height="12" fill="black" />
                <rect x="46" y="48" width="14" height="6" fill="black" />
                <rect x="66" y="50" width="12" height="6" fill="black" />
                <rect x="84" y="52" width="8" height="14" fill="black" />
                <rect x="42" y="64" width="6" height="14" fill="black" />
                <rect x="52" y="68" width="12" height="6" fill="black" />
                <rect x="70" y="64" width="6" height="12" fill="black" />
                <rect x="82" y="72" width="10" height="6" fill="black" />
                <rect x="44" y="84" width="14" height="8" fill="black" />
                <rect x="64" y="82" width="8" height="10" fill="black" />
                <rect x="78" y="84" width="14" height="8" fill="black" />
              </svg>
            </div>

            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-4 mb-3">
              El supervisor debe escanear este código para autorizar el cierre.
            </p>

            {/* Spinner esperando autorización */}
            <div className="flex flex-col items-center justify-center gap-1.5 my-4">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Esperando autorización...
              </span>
            </div>

            <button
              type="button"
              onClick={onCancelar}
              className="w-full py-3 rounded-full border border-gray-900 dark:border-gray-400 text-gray-900 dark:text-white font-extrabold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-hub-elevated transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── 4. AUTORIZACIÓN EXITOSA ── */}
        {step === 'AUTORIZACION_EXITOSA' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              ¡Autorización exitosa!
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2">
              El supervisor ha autorizado el cierre de la recepción.
            </p>
          </div>
        )}

        {/* ── 5. RECEPCIÓN FINALIZADA CON CUADRATURA (Popup Unificado) ── */}
        {(step === 'CUADRATURA_RESUMEN' || step === 'RECEPCION_FINALIZADA') && (
          <div>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-hub-text1 text-center mb-1">
              Recepción finalizada
            </h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2 text-center mb-5">
              Resumen de la recepción de carga
            </p>

            <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Encargos recepcionados:
                </span>
                <span className="text-base font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                  {recepcionadosGlobal}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Faltantes:
                </span>
                <span className={`text-base font-black font-mono ${faltantes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                  {faltantes}
                </span>
              </div>

              {valijasPendientesBins > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                  <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                    Pendientes contenedor de incidencias:
                  </span>
                  <span className="text-sm font-black font-mono text-red-600 dark:text-red-400">
                    {valijasPendientesBins}
                  </span>
                </div>
              )}
            </div>

            {/* Botones: Secundario a la izquierda (Volver al inicio), Primario a la derecha (Nueva recepción) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackHome}
                className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
              >
                Volver al inicio
              </button>

              <button
                type="button"
                onClick={onNuevaRecepcion}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] dark:hover:bg-[#02D66B] text-white dark:text-[#303030] font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nueva recepción</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Step: Scan Encargo (Estructura Nominación) ──────────────────────────────

const StepScanEncargo: React.FC<{
  isPda: boolean;
  ubicacion: { codigo: string; nombre: string } | null;
  onVolverRampa: () => void;
  nominasActivas: NominaContenedora[];
  totalGlobal: number;
  recepcionadosGlobal: number;
  lastCode: string;
  lastResult: 'idle' | 'success' | 'error' | 'warning';
  lastEncargo: EncargoRecepcion | null;
  flashKey: number;
  desglosOpen: boolean;
  onToggleDesglos: () => void;
  onScan: (code: string) => void;
  onNuevaNomina: () => void;
  onCuadrar: () => void;
  modoRecepcion: ModoRecepcion;
  testTipo: TipoContenedor;
  setTestTipo: (t: TipoContenedor) => void;
  testModo: ModoRecepcion;
  setTestModo: (m: ModoRecepcion) => void;
  onSimularScanPrimerEncargo: (tipo?: TipoContenedor, modo?: ModoRecepcion) => void;
  valijasEntregadasBins: number;
  valijasPendientesBins: number;
  onCompletarValijaPendiente?: () => void;
  onDerivarIncidencias?: () => void;
}> = ({
  isPda,
  ubicacion,
  onVolverRampa,
  nominasActivas,
  totalGlobal,
  recepcionadosGlobal,
  onCuadrar,
  testTipo,
  setTestTipo,
  testModo,
  setTestModo,
  onSimularScanPrimerEncargo,
  valijasEntregadasBins,
  valijasPendientesBins,
  onCompletarValijaPendiente,
  onDerivarIncidencias,
  lastEncargo,
  flashKey,
}) => {
  const allEncargosRec = nominasActivas.flatMap(n => n.encargos).filter(e => e.recepcionado);
  const activeLastEncargo = lastEncargo && lastEncargo.prioridad
    ? lastEncargo
    : [...allEncargosRec].reverse().find(e => e.prioridad) || null;
  const previousEncargos = activeLastEncargo
    ? [...allEncargosRec].reverse().filter(item => item.id !== activeLastEncargo.id)
    : [...allEncargosRec].reverse();
  const totalCamion = totalGlobal > 0 ? totalGlobal : 50;
  const isCompleted = totalCamion > 0 && recepcionadosGlobal >= totalCamion;
  const [pdaTab, setPdaTab] = useState<'ENCARGOS' | 'INCIDENCIAS'>('ENCARGOS');

  return (
    <div className={`max-w-7xl mx-auto w-full font-sans animate-fadeIn ${isPda ? 'p-3 space-y-3' : 'p-4 md:p-8 space-y-6'}`}>
      {/* ── Top Bar: Botón volver + Derivar incidencias + Badge de ubicación de la rampa ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!isPda && (
          <button
            type="button"
            onClick={onVolverRampa}
            className="font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-hub-text1 flex items-center gap-2 transition-colors font-sans cursor-pointer shrink-0 text-sm"
            title="Volver a Selección de Rampa"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Selección de Rampa</span>
          </button>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {onDerivarIncidencias && (
            <button
              type="button"
              onClick={onDerivarIncidencias}
              className="min-h-[36px] px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Derivar valijas a contenedor de incidencias (Modo Lote)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Derivar a incidencias</span>
              <span className="sm:hidden">Incidencias</span>
            </button>
          )}

          <button
            type="button"
            onClick={onVolverRampa}
            className={`min-h-[36px] pl-3 sm:pl-4 pr-2.5 py-1.5 rounded-full bg-[#EEFBF4] dark:bg-[#03F77C]/15 hover:bg-emerald-100/90 dark:hover:bg-[#03F77C]/25 border border-[#A7F3D0] dark:border-[#03F77C]/40 text-[#009D4E] dark:text-[#03F77C] text-xs font-mono font-bold flex items-center gap-2 sm:gap-3 shadow-2xs transition-all cursor-pointer active:scale-95 ${
              isPda ? 'max-w-[calc(100%-48px)]' : 'shrink-0'
            }`}
            title="Cambiar rampa / ubicación activa"
          >
            <span className="truncate">{ubicacion ? `${ubicacion.codigo} - ${ubicacion.nombre}` : 'Rampa 24 - Puerto Montt'}</span>
            <div className="w-6 h-6 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#303030] flex items-center justify-center shrink-0 shadow-2xs">
              <Pencil className="w-3 h-3 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* ── Barra de Simulación / QA Toolbar ── */}
      {isPda ? (
        <div className="flex items-center justify-between gap-1.5 p-1.5 px-2.5 bg-gray-50/90 dark:bg-hub-elevated/40 rounded-xl border border-gray-200/60 dark:border-hub-border text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wider shrink-0">Simular:</span>
            
            <select
              value={testTipo}
              onChange={e => setTestTipo(e.target.value as TipoContenedor)}
              className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 dark:text-hub-text1 focus:outline-none cursor-pointer"
            >
              <option value="ENCARGO">Encargo</option>
              <option value="BINS">Bins</option>
              <option value="VALIJA">Valija</option>
              <option value="PALLET">Pallet</option>
              <option value="JAULA">Jaula</option>
            </select>

            <button
              type="button"
              onClick={() => setTestModo(testModo === 'CON_INTEGRIDAD' ? 'SIN_INTEGRIDAD' : 'CON_INTEGRIDAD')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                testModo === 'CON_INTEGRIDAD'
                  ? 'bg-emerald-50 text-[#009D4E] border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700'
                  : 'bg-white text-gray-600 border-gray-200 dark:bg-hub-surface dark:text-hub-text2'
              }`}
              title="Alternar Con/Sin Integridad"
            >
              {testModo === 'CON_INTEGRIDAD' ? 'Con Int.' : 'Sin Int.'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSimularScanPrimerEncargo(testTipo, testModo)}
            className="px-2.5 py-1 bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] dark:hover:bg-[#02D66B] text-white dark:text-[#303030] font-bold rounded-lg text-[11px] transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Simular {testTipo !== 'ENCARGO' && testModo === 'CON_INTEGRIDAD' ? '(+300)' : '(+1)'}</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-end items-center gap-3 shrink-0 flex-wrap">
          {/* Chips de tipo de nómina contenedora */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-hub-elevated p-1 rounded-2xl border border-gray-200/60 dark:border-hub-border">
            {(['ENCARGO', 'BINS', 'VALIJA', 'PALLET', 'JAULA'] as TipoContenedor[]).map(tipo => {
              const active = testTipo === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTestTipo(tipo)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-600 dark:text-hub-text2 hover:text-gray-900'
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>

          {/* Chips de modo Con/Sin Integridad */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-hub-elevated p-1 rounded-2xl border border-gray-200/60 dark:border-hub-border">
            {(['CON_INTEGRIDAD', 'SIN_INTEGRIDAD'] as ModoRecepcion[]).map(modo => {
              const active = testModo === modo;
              return (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setTestModo(modo)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#009D4E] text-white shadow-xs'
                      : 'text-gray-600 dark:text-hub-text2 hover:text-gray-900'
                  }`}
                >
                  {modo === 'CON_INTEGRIDAD' ? 'Con Int.' : 'Sin Int.'}
                </button>
              );
            })}
          </div>

          {/* Botón Simular Escaneo PDA */}
          <button
            type="button"
            onClick={() => onSimularScanPrimerEncargo(testTipo, testModo)}
            className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 active:bg-emerald-600/30 border border-emerald-500/80 text-[#009D4E] dark:text-[#03F77C] font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 font-sans cursor-pointer active:scale-95"
          >
            <Scan className="w-4 h-4" />
            <span>Simular Escaneo PDA {testTipo !== 'ENCARGO' && testModo === 'CON_INTEGRIDAD' ? '(+300)' : '(+1)'}</span>
          </button>
        </div>
      )}

      {/* ── RECEPCIÓN DE CARGA (BARRA DE PROGRESO COMPACTA & CERO-SCROLL) ── */}
      {isPda ? (
        /* ── OPCIÓN 1 EN MODO PDA: TABBAR ARRIBA (ENCARGOS VS INCIDENCIAS) ── */
        <div className="space-y-3">
          {/* 1. TabBar Switch Superior en PDA */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-hub-elevated rounded-2xl border border-gray-200/80 dark:border-hub-border shadow-2xs">
            <button
              type="button"
              onClick={() => setPdaTab('ENCARGOS')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                pdaTab === 'ENCARGOS'
                  ? 'bg-white dark:bg-hub-surface text-gray-900 dark:text-hub-text1 shadow-xs font-black'
                  : 'text-gray-500 dark:text-hub-text3 hover:text-gray-800'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              <span>Encargos</span>
              <span className="font-mono text-[11px] text-[#009D4E] dark:text-[#03F77C] font-black">
                {Math.round(totalCamion > 0 ? (recepcionadosGlobal / totalCamion) * 100 : 0)}%
              </span>
              <span className="font-mono text-[10px] text-gray-400">
                ({recepcionadosGlobal}/{totalCamion})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPdaTab('INCIDENCIAS')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                pdaTab === 'INCIDENCIAS'
                  ? 'bg-white dark:bg-hub-surface text-gray-900 dark:text-hub-text1 shadow-xs font-black'
                  : 'text-gray-500 dark:text-hub-text3 hover:text-gray-800'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Incidencias</span>
              {valijasPendientesBins > 0 ? (
                <span className="min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-black bg-red-500 text-white font-mono flex items-center justify-center animate-pulse">
                  {valijasPendientesBins}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 font-mono">
                  ({valijasEntregadasBins})
                </span>
              )}
            </button>
          </div>

          {/* 2. Contenido según Tab Activo en PDA */}
          {pdaTab === 'ENCARGOS' ? (
            <div className="space-y-3 animate-fadeIn">
              {/* Barra de progreso compacta (solo dentro de Encargos) */}
              <div className="bg-white dark:bg-hub-surface rounded-2xl p-3.5 shadow-xs border border-gray-200/80 dark:border-hub-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-hub-text1">Progreso camión</span>
                  <span className="text-xs font-mono font-bold text-[#009D4E] dark:text-[#03F77C]">
                    {recepcionadosGlobal} de {totalCamion} ({Math.round(totalCamion > 0 ? (recepcionadosGlobal / totalCamion) * 100 : 0)}%)
                  </span>
                </div>
                <div className="w-full bg-[#D1F2DE] dark:bg-hub-elevated rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#009D4E] to-[#00B85C] dark:from-[#03F77C] dark:to-[#00D668] rounded-full transition-all duration-500 ease-out shadow-xs"
                    style={{ width: `${Math.min(100, Math.max(recepcionadosGlobal > 0 ? 2 : 0, (recepcionadosGlobal / totalCamion) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-hub-text3 text-right font-medium">
                  {totalCamion - recepcionadosGlobal} pendientes por escanear
                </p>
              </div>

              {/* Detalle de encargos recepcionados en PDA (con el último encargo adentro) */}
              <div className="bg-white dark:bg-hub-surface rounded-2xl p-3.5 border border-gray-200/80 dark:border-hub-border shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-hub-border mb-2.5 shrink-0">
                  <span className="text-xs font-bold text-gray-700 dark:text-hub-text1">
                    Encargos recepcionados
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                    {allEncargosRec.length}
                  </span>
                </div>

                {/* Banner Último encargo escaneado en PDA (DENTRO del contenedor) */}
                {activeLastEncargo && activeLastEncargo.prioridad && (
                  <div
                    key={flashKey}
                    className={`mb-2.5 p-3 rounded-xl border transition-all duration-300 shrink-0 shadow-xs animate-toast-slide-down ${
                      activeLastEncargo.prioridad === 'P1_ATRASADO'
                        ? 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800/70 border-l-4 border-l-red-500'
                        : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                        ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800/70 border-l-4 border-l-sky-500'
                        : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 border-l-4 border-l-emerald-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-hub-text3 font-mono flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full animate-ping ${
                          activeLastEncargo.prioridad === 'P1_ATRASADO'
                            ? 'bg-red-500'
                            : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                        }`} />
                        Último encargo
                      </span>
                      {prioridadBadge(activeLastEncargo.prioridad, false)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate">
                        {activeLastEncargo.codigoBarras || '78981234567898123456'}
                      </span>
                      <p className={`text-[11px] font-bold font-sans text-right ${
                        activeLastEncargo.prioridad === 'P1_ATRASADO'
                          ? 'text-red-700 dark:text-red-300'
                          : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {activeLastEncargo.prioridad === 'P1_ATRASADO'
                          ? '🚨 Salida urgente'
                          : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                          ? '🔵 Carga condicional'
                          : '✅ Plan regular'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:thin]">
                  {allEncargosRec.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 dark:text-hub-text3">
                      Escanea un encargo para comenzar
                    </div>
                  ) : (
                    previousEncargos.map((item) => {
                      const borderPriorityColor =
                        item.prioridad === 'P1_ATRASADO'
                          ? 'border-l-red-500'
                          : item.prioridad === 'P3_ADELANTADO'
                          ? 'border-l-sky-500'
                          : item.prioridad === 'P2_A_TIEMPO'
                          ? 'border-l-emerald-500'
                          : 'border-l-gray-300 dark:border-l-hub-border';

                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 border-l-4 ${borderPriorityColor} border-gray-200/80 dark:border-hub-border bg-gray-50/60 dark:bg-slate-800/40`}
                        >
                          <span className="font-bold text-xs truncate text-[#414745] dark:text-slate-200">
                            {item.codigoBarras || '78981234567898123456'}
                          </span>
                          <div className="shrink-0">
                            {prioridadBadge(item.prioridad, true)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
              /* TAB INCIDENCIAS EN PDA: 100% LIMPIO Y ENFOCADO */
              <div className="bg-white dark:bg-hub-surface rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border shadow-xs space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-[#303030] dark:text-hub-text1 font-sans">
                    Valijas con incidencia
                  </h4>
                  {valijasPendientesBins > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      {valijasPendientesBins} pendiente{valijasPendientesBins === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {/* Fila Verde: Entregadas */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4FAF6] dark:bg-emerald-950/20 border-l-4 border-l-[#006338] dark:border-l-emerald-500 shadow-2xs">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans">
                    Entregadas en contenedor
                  </span>
                  <span className="min-w-[26px] h-6 px-2.5 rounded-full text-xs font-black bg-[#D1F2DE] dark:bg-emerald-900/60 text-[#006338] dark:text-emerald-300 font-mono flex items-center justify-center">
                    {valijasEntregadasBins}
                  </span>
                </div>

                {/* Fila Roja: Pendientes */}
                <div
                  onClick={valijasPendientesBins > 0 ? (onDerivarIncidencias || onCompletarValijaPendiente) : undefined}
                  className={`flex items-center justify-between p-3 rounded-2xl bg-[#FEF6F6] dark:bg-red-950/20 border-l-4 border-l-[#E25555] dark:border-l-red-500 shadow-2xs transition-all ${
                    valijasPendientesBins > 0 ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-[0.99]' : ''
                  }`}
                >
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans">
                    Pendientes para llevar al contenedor
                  </span>
                  <span className="min-w-[26px] h-6 px-2.5 rounded-full text-xs font-black bg-[#FAD4D4] dark:bg-red-900/60 text-[#C53030] dark:text-red-300 font-mono flex items-center justify-center">
                    {valijasPendientesBins}
                  </span>
                </div>

                {/* Botón grande para el pulgar */}
                {valijasPendientesBins > 0 ? (
                  <button
                    type="button"
                    onClick={onDerivarIncidencias || onCompletarValijaPendiente}
                    className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer active:scale-95 animate-fadeIn"
                  >
                    <Box className="w-5 h-5 shrink-0" />
                    <span>Ir a dejar al contenedor ({valijasPendientesBins})</span>
                  </button>
                ) : (
                  <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex flex-col items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <CheckCircle2 className="w-6 h-6 text-[#009D4E]" />
                    <span>¡Al día! No hay valijas pendientes de entrega</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── OPCIÓN 1 EN MODO DESKTOP: 2 COLUMNAS ── */
          <div className="space-y-4">
            {/* 1. Header con Barra de Progreso Horizontal (Ahorra ~250px verticales) */}
            <div className="bg-white dark:bg-hub-surface rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200/80 dark:border-hub-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EEFBF4] dark:bg-[#03F77C]/15 border border-[#A7F3D0] dark:border-[#03F77C]/30 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] shrink-0 shadow-2xs">
                    <PackageCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-[#414745] dark:text-hub-text1 font-sans">
                        Recepción de carga
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        recepcionadosGlobal === 0
                          ? 'bg-gray-100 text-gray-500 dark:bg-hub-elevated dark:text-hub-text3'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {recepcionadosGlobal === 0 ? 'En espera' : isCompleted ? '¡Carga completa!' : 'En proceso'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-hub-text2 font-sans mt-0.5">
                      {recepcionadosGlobal === 0
                        ? 'Escanea un encargo para comenzar'
                        : isCompleted
                        ? 'Todos los encargos han sido recepcionados'
                        : `${totalCamion - recepcionadosGlobal} pendiente${totalCamion - recepcionadosGlobal === 1 ? '' : 's'} por escanear de la carga`}
                    </p>
                  </div>
                </div>

                {/* Contador y Porcentaje destacado */}
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-hub-text1 font-mono tracking-tight">
                    {recepcionadosGlobal}
                  </span>
                  <span className="text-sm font-bold text-gray-400 dark:text-hub-text3 font-sans">
                    / {totalCamion} encargos
                  </span>
                  <span className="ml-1 text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#006338] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800">
                    {Math.round(totalCamion > 0 ? (recepcionadosGlobal / totalCamion) * 100 : 0)}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso horizontal con gradiente suave */}
              <div className="w-full bg-[#D1F2DE] dark:bg-hub-elevated rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#009D4E] to-[#00B85C] dark:from-[#03F77C] dark:to-[#00D668] rounded-full transition-all duration-500 ease-out shadow-xs"
                  style={{ width: `${Math.min(100, Math.max(recepcionadosGlobal > 0 ? 2 : 0, (recepcionadosGlobal / totalCamion) * 100))}%` }}
                />
              </div>
            </div>

            {/* 2. Cuerpo en 2 Columnas (Layout Cero-Scroll) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Columna Izquierda (lg:col-span-5): Valijas con incidencia */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-hub-surface rounded-3xl p-5 border border-gray-200/80 dark:border-hub-border shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-[#303030] dark:text-hub-text1 font-sans">
                      Valijas con incidencia
                    </h4>
                  </div>

                  {/* Fila Verde: Entregadas en contenedor */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4FAF6] dark:bg-emerald-950/20 border-l-4 border-l-[#006338] dark:border-l-emerald-500 shadow-2xs">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans">
                      Entregadas en contenedor de incidencias
                    </span>
                    <span className="min-w-[26px] h-6 px-2.5 rounded-full text-xs font-black bg-[#D1F2DE] dark:bg-emerald-900/60 text-[#006338] dark:text-emerald-300 font-mono flex items-center justify-center">
                      {valijasEntregadasBins}
                    </span>
                  </div>

                  {/* Fila Roja: Pendientes para llevar al contenedor */}
                  <div
                    onClick={valijasPendientesBins > 0 ? (onDerivarIncidencias || onCompletarValijaPendiente) : undefined}
                    className={`flex items-center justify-between p-3 rounded-2xl bg-[#FEF6F6] dark:bg-red-950/20 border-l-4 border-l-[#E25555] dark:border-l-red-500 shadow-2xs transition-all ${
                      valijasPendientesBins > 0 ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-[0.99]' : ''
                    }`}
                    title={valijasPendientesBins > 0 ? 'Haz clic para escanear QR del contenedor y registrar la entrega' : undefined}
                  >
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 font-sans">
                      Pendientes para llevar a contenedor
                    </span>
                    <span className="min-w-[26px] h-6 px-2.5 rounded-full text-xs font-black bg-[#FAD4D4] dark:bg-red-900/60 text-[#C53030] dark:text-red-300 font-mono flex items-center justify-center">
                      {valijasPendientesBins}
                    </span>
                  </div>

                  {/* Botón explícito */}
                  {valijasPendientesBins > 0 && (
                    <button
                      type="button"
                      onClick={onDerivarIncidencias || onCompletarValijaPendiente}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 animate-fadeIn"
                      title="Ir a dejar valijas al contenedor de incidencias"
                    >
                      <Box className="w-4 h-4 shrink-0" />
                      <span>Ir a dejar al contenedor ({valijasPendientesBins})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Columna Derecha (lg:col-span-7): Último Encargo + Listado Scrolleable Interno */}
              <div className="lg:col-span-7 bg-white dark:bg-hub-surface rounded-3xl p-5 border border-gray-200/80 dark:border-hub-border shadow-sm flex flex-col">
                {/* Header Columna Derecha */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border mb-3 shrink-0">
                  <span className="text-xs font-bold text-[#414745] dark:text-hub-text1 font-sans">
                    Detalle de encargos ({allEncargosRec.length})
                  </span>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {allEncargosRec.length} recepcionados
                  </span>
                </div>

                {/* BANNER DINÁMICO: ÚLTIMO ENCARGO ESCANEADO */}
                {activeLastEncargo && activeLastEncargo.prioridad && (
                  <div
                    key={flashKey}
                    className={`mb-3 p-3.5 rounded-2xl border transition-all duration-300 shrink-0 shadow-sm animate-toast-slide-down ${
                      activeLastEncargo.prioridad === 'P1_ATRASADO'
                        ? 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800/70 border-l-4 border-l-red-500 ring-2 ring-red-500/20'
                        : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                        ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800/70 border-l-4 border-l-sky-500 ring-2 ring-sky-500/20'
                        : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/70 border-l-4 border-l-emerald-500 ring-2 ring-emerald-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-hub-text3 font-mono flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full animate-ping ${
                            activeLastEncargo.prioridad === 'P1_ATRASADO'
                              ? 'bg-red-500'
                              : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                              ? 'bg-sky-500'
                              : 'bg-emerald-500'
                          }`} />
                          Último encargo escaneado
                        </span>
                        <span className="text-[11px] font-mono text-gray-400 dark:text-hub-text3">
                          {activeLastEncargo.recepcionadoAt || 'Reciente'}
                        </span>
                      </div>
                      {prioridadBadge(activeLastEncargo.prioridad, false)}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate">
                        {activeLastEncargo.codigoBarras || '78981234567898123456'}
                      </span>
                      <p className={`text-xs font-bold font-sans ${
                        activeLastEncargo.prioridad === 'P1_ATRASADO'
                          ? 'text-red-700 dark:text-red-300'
                          : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                          ? 'text-sky-700 dark:text-sky-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {activeLastEncargo.prioridad === 'P1_ATRASADO'
                          ? '🚨 Salida urgente: Priorizar carga inmediata al camión'
                          : activeLastEncargo.prioridad === 'P3_ADELANTADO'
                          ? '🔵 Carga condicional: Cargar sólo si queda espacio en el camión'
                          : '✅ Plan regular: Agregar al camión en curso'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Listado con scroll interno compacto (max-h-[220px]) */}
                <div className="min-h-0 overflow-y-auto max-h-[220px] space-y-2 pr-1 pb-1 [scrollbar-width:thin]">
                  {allEncargosRec.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border flex items-center justify-center text-gray-400 dark:text-hub-text3 mb-2 shadow-2xs">
                        <Scan className="w-5 h-5 stroke-[1.8]" />
                      </div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-hub-text2">
                        Escanea un encargo de la carga para comenzar a recepcionar
                      </p>
                    </div>
                  ) : (
                    previousEncargos.map((item) => {
                      const borderPriorityColor =
                        item.prioridad === 'P1_ATRASADO'
                          ? 'border-l-red-500'
                          : item.prioridad === 'P3_ADELANTADO'
                          ? 'border-l-sky-500'
                          : item.prioridad === 'P2_A_TIEMPO'
                          ? 'border-l-emerald-500'
                          : 'border-l-gray-300 dark:border-l-hub-border';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-2xl border transition-all duration-300 font-mono flex items-center justify-between gap-3 border-l-4 ${borderPriorityColor} border-gray-200/80 dark:border-hub-border bg-gray-50/60 dark:bg-slate-800/40`}
                        >
                          <strong className="font-black text-xs font-mono tracking-tight truncate text-[#414745] dark:text-slate-200">
                            {item.codigoBarras || `78981234567898123456${Math.floor(100000 + Math.random() * 900000)}`}
                          </strong>
                          <div className="shrink-0 flex items-center justify-end">
                            {prioridadBadge(item.prioridad, true)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ── Botón Finalizar recepción en la esquina inferior derecha ── */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={recepcionadosGlobal === 0}
          onClick={onCuadrar}
          className={`px-8 py-3.5 font-black rounded-2xl text-sm shadow-md flex items-center gap-3 transition-all font-sans ${
            recepcionadosGlobal === 0
              ? 'bg-gray-200 dark:bg-hub-elevated text-gray-400 dark:text-hub-text3 cursor-not-allowed opacity-60 border border-gray-300/40 dark:border-hub-border'
              : 'bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:active:bg-[#02B55A] dark:text-[#303030] cursor-pointer active:scale-[0.98] shadow-md dark:shadow-emerald-500/20'
          }`}
          title={recepcionadosGlobal === 0 ? 'Desactivado: aún no hay encargos recepcionados' : 'Finalizar recepción'}
        >
          <span>Finalizar recepción</span>
        </button>
      </div>
    </div>
  );
};

// ─── Step: Alerta Encargo ─────────────────────────────────────────────────────

const StepAlertaEncargo: React.FC<{ isPda: boolean; encargo: EncargoRecepcion; onContinuar: () => void }> = ({ encargo, onContinuar }) => {
  const isDevolucion = encargo.estado === 'DEVOLUCION';
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-[60vh]">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 ${isDevolucion ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'}`}>
        {isDevolucion ? <ArrowRightLeft className="w-10 h-10" /> : <Scale className="w-10 h-10" />}
      </div>
      <div className="text-center max-w-sm">
        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3 border ${isDevolucion ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700' : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700'}`}>
          {isDevolucion ? 'Devolución' : 'Falta Redimensionar'}
        </span>
        <h3 className="text-xl font-extrabold text-[#303030] dark:text-hub-text1 mb-3">{isDevolucion ? 'Encargo en devolución' : 'Encargo sin dimensionar'}</h3>
        <p className="text-sm text-gray-600 dark:text-hub-text2 leading-relaxed mb-2">
          {isDevolucion ? 'Dejar en el pallet de devoluciones hacia CAREN o Hub RM correspondiente.' : 'Separar físicamente el encargo y enviarlo a la estación de redimensionamiento.'}
        </p>
        <p className="text-xs font-mono text-gray-400 dark:text-hub-text3 bg-gray-100 dark:bg-hub-elevated px-3 py-1.5 rounded-lg inline-block">{encargo.codigoOF}</p>
      </div>
      <button type="button" onClick={onContinuar} className="w-full max-w-xs h-14 rounded-2xl bg-[#303030] dark:bg-hub-elevated hover:bg-[#1f1f1f] dark:hover:bg-[#383838] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98]">
        <CheckCircle2 className="w-5 h-5" /> Entendido — continuar
      </button>
    </div>
  );
};

// ─── Step: Semáforo ───────────────────────────────────────────────────────────

const StepSemaforo: React.FC<{ isPda: boolean; encargo: EncargoRecepcion; prioridad: PrioridadSemaforo; onContinuar: () => void }> = ({ encargo, prioridad, onContinuar }) => {
  const cfg = SEMAFORO_CONFIG[prioridad];
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 min-h-[60vh]">
      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${cfg.border} ${cfg.bg}`}>
        <Flag className={`w-9 h-9 ${cfg.text}`} />
      </div>
      <div className="text-center max-w-sm">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 ${cfg.bg} ${cfg.border}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className={`text-xs font-mono font-extrabold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
        </div>
        <h3 className="text-xl font-extrabold text-[#303030] dark:text-hub-text1 mb-2">Encargo de última milla</h3>
        <p className="text-sm text-gray-600 dark:text-hub-text2 leading-relaxed mb-3">{cfg.detail}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-hub-text3 bg-gray-100 dark:bg-hub-elevated px-3 py-1.5 rounded-lg inline-block">{encargo.codigoOF}</p>
      </div>
      <button type="button" onClick={onContinuar} className="w-full max-w-xs h-14 rounded-2xl bg-[#303030] dark:bg-hub-elevated hover:bg-[#1f1f1f] dark:hover:bg-[#383838] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98]">
        <CheckCircle2 className="w-5 h-5" /> Continuar recepción
      </button>
    </div>
  );
};

// ─── Step: Cuadratura ─────────────────────────────────────────────────────────

const StepCuadratura: React.FC<{
  isPda: boolean;
  nominasActivas: NominaContenedora[];
  totalGlobal: number;
  recepcionadosGlobal: number;
  faltantes: number;
  onFinalizar: () => void;
  onVolver: () => void;
}> = ({ nominasActivas, totalGlobal, recepcionadosGlobal, faltantes, onFinalizar, onVolver }) => {
  const progress = totalGlobal > 0 ? Math.round((recepcionadosGlobal / totalGlobal) * 100) : 0;
  const pendientes = nominasActivas.flatMap(n => n.encargos.filter(e => !e.recepcionado));

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4 ${faltantes === 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'}`}>
          {faltantes === 0 ? <CircleCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-extrabold text-[#303030] dark:text-hub-text1 mb-1">Cuadratura de recepción</h3>
        <p className="text-sm text-gray-500 dark:text-hub-text2">{faltantes === 0 ? 'Todos los encargos fueron recepcionados.' : `Hay ${faltantes} encargo(s) pendiente(s).`}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: totalGlobal, color: 'text-[#303030] dark:text-hub-text1' },
          { label: 'Recepcionados', value: recepcionadosGlobal, color: 'text-hub-accent' },
          { label: 'Pendientes', value: faltantes, color: faltantes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border p-3 text-center">
            <p className={`text-2xl font-black font-mono ${item.color}`}>{item.value}</p>
            <p className="text-[10px] font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wide mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 dark:text-hub-text2">Progreso global</span>
          <span className="text-xs font-mono font-bold text-hub-accent">{progress}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-hub-elevated rounded-full overflow-hidden">
          <div className="h-full bg-hub-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-hub-text3">Desglose por nómina</p>
        {nominasActivas.map(n => {
          const Icon = TIPO_ICONS[n.tipo];
          const p = n.totalEncargos > 0 ? Math.round((n.encargosRecepcionados / n.totalEncargos) * 100) : 0;
          return (
            <div key={n.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${TIPO_COLORS[n.tipo]} flex items-center justify-center text-white shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-[#303030] dark:text-hub-text1 truncate">{n.codigo}</p>
                <div className="h-1 bg-gray-100 dark:bg-hub-elevated rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-hub-accent rounded-full transition-all" style={{ width: `${p}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold text-hub-accent font-mono shrink-0">{n.encargosRecepcionados}/{n.totalEncargos}</span>
            </div>
          );
        })}
      </div>

      {pendientes.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 px-4 py-3 border-b border-amber-200 dark:border-amber-800">OFs pendientes ({pendientes.length})</p>
          <div className="max-h-40 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900">
            {pendientes.map(enc => (
              <div key={enc.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-mono text-[#303030] dark:text-hub-text1">{enc.codigoOF}</span>
                {estadoBadge(enc.estado)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pb-4">
        <button type="button" onClick={onFinalizar}
          className={`w-full h-14 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98]
            ${faltantes === 0 ? 'bg-hub-accent hover:bg-[#00b350] text-white shadow-emerald-500/30' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'}`}>
          {faltantes === 0 ? <CircleCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          {faltantes === 0 ? 'Cerrar recepción' : 'Cerrar con pendientes (requiere supervisor)'}
        </button>
        <button type="button" onClick={onVolver} className="w-full h-12 rounded-2xl border border-gray-200 dark:border-hub-border text-gray-600 dark:text-hub-text2 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-hub-elevated transition-all cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver a escanear
        </button>
      </div>
    </div>
  );
};

// ─── Supervisor Auth Modal ────────────────────────────────────────────────────

const SUPERVISOR_REASON_TEXT: Record<SupervisorAuthReason, { title: string; detail: string }> = {
  NOMINA_TERMINAL: { title: 'Nómina en estado TERMINAL', detail: 'Ingresa el PIN de supervisor para desbloquear esta nómina y continuar con la recepción.' },
  ENCARGO_INEXISTENTE: { title: 'Encargo no encontrado', detail: 'El código escaneado no existe en el sistema. El supervisor debe autorizar su retiro.' },
  CIERRE_CON_PENDIENTES: { title: 'Cierre con pendientes', detail: 'Quedan encargos sin recepcionar. Ingresa el PIN de supervisor para autorizar el cierre.' },
};

const SupervisorAuthModal: React.FC<{
  reason: SupervisorAuthReason | null;
  pin: string;
  onPinChange: (v: string) => void;
  error: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ reason, pin, onPinChange, error, onSubmit, onCancel }) => {
  const info = reason ? SUPERVISOR_REASON_TEXT[reason] : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-7 max-w-sm w-full shadow-2xl relative">
        <button type="button" onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-hub-text1 hover:bg-gray-100 dark:hover:bg-hub-elevated cursor-pointer transition-all">
          <X className="w-4 h-4" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        {info && (
          <>
            <h3 className="text-base font-extrabold text-[#303030] dark:text-hub-text1 text-center mb-1">{info.title}</h3>
            <p className="text-xs text-gray-500 dark:text-hub-text2 text-center leading-relaxed mb-5">{info.detail}</p>
          </>
        )}
        <div className="space-y-3">
          <input type="password" value={pin} onChange={e => onPinChange(e.target.value.slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
            placeholder="PIN supervisor" maxLength={6}
            className={`w-full h-12 px-4 rounded-xl border-2 text-center text-2xl font-mono tracking-[0.5em] font-bold text-[#303030] dark:text-hub-text1 bg-gray-50 dark:bg-hub-elevated focus:outline-none transition-all
              ${error ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/40' : 'border-gray-200 dark:border-hub-border focus:border-amber-400 dark:focus:border-amber-600'}`} />
          {error && <p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">PIN incorrecto. Inténtalo de nuevo.</p>}
          <button type="button" onClick={onSubmit} disabled={pin.length < 4}
            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-gray-200 dark:disabled:bg-hub-elevated disabled:cursor-not-allowed text-white font-extrabold text-sm transition-all cursor-pointer shadow-md shadow-red-500/30">
            <ShieldAlert className="w-4 h-4 inline mr-2" />Autorizar
          </button>
        </div>
        <p className="text-[10px] text-gray-300 dark:text-hub-text3 text-center mt-3 font-mono">Demo PIN: 1234</p>
      </div>
    </div>
  );
};

// ─── Trazabilidad Overlay ─────────────────────────────────────────────────────

const TrazabilidadOverlay: React.FC<{
  eventos: TrazabilidadEvento[];
  filter: string;
  onFilterChange: (v: string) => void;
  onClose: () => void;
  isPda: boolean;
}> = ({ eventos, filter, onFilterChange, onClose, isPda }) => {
  const filtered = eventos.filter(e =>
    !filter || e.of.toLowerCase().includes(filter.toLowerCase()) || e.evento.toLowerCase().includes(filter.toLowerCase())
  );
  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-0 md:p-6">
      <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-hub-border shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-extrabold text-[#303030] dark:text-hub-text1">Trazabilidad</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-hub-elevated cursor-pointer transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-hub-border shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="text" value={filter} onChange={e => onFilterChange(e.target.value)} placeholder="Filtrar por OF o evento..."
              className="flex-1 bg-transparent text-sm text-[#303030] dark:text-hub-text1 placeholder-gray-300 dark:placeholder-hub-text3 focus:outline-none font-mono" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isPda ? (
            <div className="divide-y divide-gray-50 dark:divide-hub-border">
              {filtered.map(ev => (
                <div key={ev.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-[#303030] dark:text-hub-text1">{ev.evento}</span>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-hub-text3 shrink-0">{ev.fecha}</span>
                  </div>
                  <p className="text-xs font-mono text-amber-600 dark:text-amber-400">{ev.of}</p>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 mt-0.5">{ev.detalle}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-hub-text3">
                    <span><MapPin className="w-3 h-3 inline mr-0.5" />{ev.ubicacion}</span>
                    <span>{ev.usuario}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-hub-elevated">
                <tr className="border-b border-gray-100 dark:border-hub-border">
                  {['Ubicación', 'OF', 'Fecha', 'Evento', 'Usuario', 'Detalle'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-bold text-gray-400 dark:text-hub-text3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-hub-border">
                {filtered.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-hub-elevated/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500 dark:text-hub-text2 whitespace-nowrap">{ev.ubicacion}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{ev.of}</td>
                    <td className="px-4 py-3 font-mono text-gray-400 dark:text-hub-text3 whitespace-nowrap">{ev.fecha}</td>
                    <td className="px-4 py-3 font-semibold text-[#303030] dark:text-hub-text1 whitespace-nowrap">{ev.evento}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-hub-text2 whitespace-nowrap">{ev.usuario}</td>
                    <td className="px-4 py-3 text-gray-400 dark:text-hub-text3 max-w-[200px] truncate">{ev.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Step: Cierre Final ───────────────────────────────────────────────────────

const StepCierreFinal: React.FC<{
  isPda: boolean;
  nominasActivas: NominaContenedora[];
  totalGlobal: number;
  recepcionadosGlobal: number;
  ubicacion: { codigo: string; nombre: string } | null;
  onNuevaRecepcion: () => void;
  onBackHome: () => void;
}> = ({ nominasActivas, totalGlobal, recepcionadosGlobal, ubicacion, onNuevaRecepcion, onBackHome }) => {
  const ahora = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  const faltantes = totalGlobal - recepcionadosGlobal;

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-4 border-emerald-400 dark:border-emerald-600 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        <PackageCheck className="w-10 h-10" />
      </div>
      <div className="text-center">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full inline-block mb-3">Recepción completada</span>
        <h3 className="text-2xl font-extrabold text-[#303030] dark:text-hub-text1 mb-1">¡Recepción cerrada!</h3>
        <p className="text-sm text-gray-500 dark:text-hub-text2">{ahora}</p>
        {ubicacion && <p className="text-xs font-mono text-gray-400 dark:text-hub-text3 mt-1">{ubicacion.nombre}</p>}
      </div>

      <div className="w-full rounded-2xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border divide-y divide-gray-100 dark:divide-hub-border overflow-hidden">
        {[
          { label: 'Nóminas procesadas', value: nominasActivas.length.toString(), color: 'text-[#303030] dark:text-hub-text1' },
          { label: 'Total encargos', value: totalGlobal.toString(), color: 'text-[#303030] dark:text-hub-text1' },
          { label: 'Recepcionados', value: recepcionadosGlobal.toString(), color: 'text-hub-accent' },
          { label: 'Pendientes', value: faltantes.toString(), color: faltantes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-hub-text2">{item.label}</span>
            <span className={`text-sm font-extrabold font-mono ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="w-full space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-hub-text3">Detalle por nómina</p>
        {nominasActivas.map(n => {
          const Icon = TIPO_ICONS[n.tipo];
          return (
            <div key={n.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${TIPO_COLORS[n.tipo]} flex items-center justify-center text-white shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-[#303030] dark:text-hub-text1 truncate">{n.codigo}</p>
                <p className="text-[10px] text-gray-400 dark:text-hub-text3">{n.tipo}</p>
              </div>
              <span className="text-xs font-bold text-hub-accent font-mono">{n.encargosRecepcionados}/{n.totalEncargos}</span>
            </div>
          );
        })}
      </div>

      <div className="w-full space-y-3 pb-6">
        <button type="button" onClick={onNuevaRecepcion}
          className="w-full h-14 rounded-2xl bg-hub-accent hover:bg-[#00b350] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/30 transition-all cursor-pointer active:scale-[0.98]">
          <RotateCcw className="w-5 h-5" /> Nueva recepción
        </button>
        <button type="button" onClick={onBackHome}
          className="w-full h-12 rounded-2xl border border-gray-200 dark:border-hub-border text-gray-600 dark:text-hub-text2 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-hub-elevated transition-all cursor-pointer">
          Volver al inicio
        </button>
      </div>
    </div>
  );
};
