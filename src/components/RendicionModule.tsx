import React, { useState, useEffect, useRef } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { TipoMovilRendicion, MovilRendicionInfo } from '../types';
import {
  Truck,
  Car,
  Bus,
  Bike,
  Plane,
  Footprints,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Search,
  Hash,
  Check,
  KeyRound,
  Printer,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Clock,
  ChevronDown,
  Pencil,
  ShieldAlert,
} from 'lucide-react';

export interface ComprobanteRendicion {
  folio: string;
  fechaEmision: string;
  horaEmision: string;
  numeroMovil: string;
  tipoMovil: string;
  patente: string;
  conductor: string;
  rutConductor: string;
  claveTripulanteIngresada: string;
  totalBultosAsignados: number;
  totalEntregados: number;
  totalDevoluciones: number;
  totalBI?: number;
  totalExtraviados?: number;
  operadorReceptor: string;
  hubReceptor: string;
  codigoSeguridad: string;
}

export interface EncargoRendicion {
  id: string;
  numeroNomina: string; // N° de nómina asociado al encargo (aprox 8 dígitos)
  ordenFlete: string;
  destinatario: string;
  direccion: string;
  bultos: number;
  motivoDevolucion: string;
  recepcionado: boolean;
  horaRecepcion?: string;
  requiereBI?: boolean; // Marca si el encargo debe ser derivado a Bodega de Indagaciones (BI)
  motivoBI?: string;    // Instrucción o motivo específico para el andén de BI
}

// Catálogo oficial de motivos de excepción / devolución de Starken
export const MOTIVOS_EXCEPCION_RENDICION: string[] = [
  'Cliente ausente (2da visita)',
  'Dirección no existe / incompleta',
  'Rechazado por destinatario',
  'Local o empresa cerrada',
  'Cliente sin medio de pago',
  'Mercadería con daño en embalaje',
  'Zona de difícil acceso / fuera de cobertura',
  'Destinatario desconocido en dirección',
  'Plazo de retiro vencido',
  'Falta de documentación o guía',
];

const GENERAR_ENCARGOS_MOCK = (cantidad: number = 5, numeroMovil: string = '50310'): EncargoRendicion[] => {
  const motivos = MOTIVOS_EXCEPCION_RENDICION;

  const destinatarios = [
    { nombre: 'Comercializadora del Valle SpA', dir: 'Av. Gladys Marín 540, Estación Central' },
    { nombre: 'Ferretería Central Maipú Ltda.', dir: 'Camino Melipilla 8900, Maipú' },
    { nombre: 'Inversiones Santiago y Redes', dir: 'San Pablo 2120, Quinta Normal' },
    { nombre: 'Tecnología Integral Chile', dir: 'Moneda 920 Of. 402, Santiago Centro' },
    { nombre: 'Automotriz del Maipo SpA', dir: 'Av. Pajaritos 3400, Maipú' },
    { nombre: 'Distribuidora Los Andes', dir: 'Av. Américo Vespucio 1500, Pudahuel' },
  ];

  const cleanNum = parseInt(numeroMovil.replace(/\D/g, '') || '50310', 10);

  return Array.from({ length: cantidad }, (_, i) => {
    const ofNum = `${940000000 + ((cleanNum * 17 + (i + 1) * 311) % 89000000)}`;
    const nominaNum = `${10000000 + ((cleanNum * 83 + (i + 1) * 419) % 89999999)}`;
    const dest = destinatarios[i % destinatarios.length];
    const motivo = motivos[i % motivos.length];
    // En el mock, el encargo 2 (índice 1) y los casos de daño en embalaje se marcan para Bodega de Indagaciones (BI)
    const requiereBI = i === 1 || motivo.toLowerCase().includes('daño');
    return {
      id: `ENC-${i + 1}`,
      numeroNomina: nominaNum,
      ordenFlete: ofNum,
      destinatario: dest.nombre,
      direccion: dest.dir,
      bultos: 1,
      motivoDevolucion: motivo,
      recepcionado: false,
      requiereBI,
      motivoBI: requiereBI
        ? 'Mercadería o embalaje con daño. Separar para peritaje en Bodega de Indagaciones (BI).'
        : undefined,
    };
  });
};

interface RendicionModuleProps {
  onRegisterBackHandler?: (handler: (() => void) | null) => void;
  onBackHome?: () => void;
}

interface TipoMovilOption {
  id: TipoMovilRendicion;
  nombre: string;
  subtitulo: string;
  capacidad: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIPOS_MOVIL: TipoMovilOption[] = [
  {
    id: 'BUS',
    nombre: 'Bus',
    subtitulo: 'Transporte interurbano',
    capacidad: 'Paquetería y valijas',
    icon: Bus,
  },
  {
    id: 'CAMION',
    nombre: 'Camión',
    subtitulo: 'Distribución y troncal',
    capacidad: 'Hasta 10.000 kg',
    icon: Truck,
  },
  {
    id: 'RAMPLA',
    nombre: 'Rampla',
    subtitulo: 'Troncal y larga distancia',
    capacidad: 'Hasta 28.000 kg',
    icon: Truck,
  },
  {
    id: 'CAMIONETA',
    nombre: 'Camioneta',
    subtitulo: 'Distribución ágil y rural',
    capacidad: 'Hasta 1.000 kg',
    icon: Car,
  },
  {
    id: 'FURGON',
    nombre: 'Furgón',
    subtitulo: 'Última milla y express',
    capacidad: 'Hasta 1.500 kg',
    icon: Truck,
  },
  {
    id: 'MOTO',
    nombre: 'Moto',
    subtitulo: 'Mensajería y paquetería menor',
    capacidad: 'Hasta 30 kg',
    icon: Bike,
  },
  {
    id: 'TUR_CARRY',
    nombre: 'Tur Carry',
    subtitulo: 'Vehículo utilitario ligero',
    capacidad: 'Hasta 500 kg',
    icon: Truck,
  },
  {
    id: 'AVION',
    nombre: 'Avión',
    subtitulo: 'Carga aérea y envíos prioritarios',
    capacidad: 'Carga aérea express',
    icon: Plane,
  },
  {
    id: 'PEATON',
    nombre: 'Peatón',
    subtitulo: 'Entrega a pie en zona céntrica',
    capacidad: 'Mochila / Carrito',
    icon: Footprints,
  },
  {
    id: 'CAMIONETA_PLATAFORMA',
    nombre: 'Camioneta plataforma',
    subtitulo: 'Carga abierta y sobredimensionada',
    capacidad: 'Hasta 1.200 kg',
    icon: Car,
  },
  {
    id: 'CAMION_PLATAFORMA',
    nombre: 'Camión plataforma',
    subtitulo: 'Carga pesada e industrial',
    capacidad: 'Hasta 15.000 kg',
    icon: Truck,
  },
];

// Flota simulada en ruta esperando rendición (móviles de 5 dígitos)
// Móviles que empiezan con 5: con bultos para rendición
// Móviles que empiezan con 0: 100% entregado (terminar sin encargos)
const MOVILES_PRESET: Record<TipoMovilRendicion, MovilRendicionInfo[]> = {
  BUS: [
    {
      tipo: 'BUS',
      numeroMovil: '00101',
      patente: 'BU-1024',
      conductor: 'Claudio Garrido',
      rutConductor: '12.890.412-5',
      totalBultosAsignados: 35,
      entregados: 35,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 06:00',
      horaSalida: '06:00',
    },
    {
      tipo: 'BUS',
      numeroMovil: '50101',
      patente: 'BU-1024',
      conductor: 'Claudio Garrido',
      rutConductor: '12.890.412-5',
      totalBultosAsignados: 35,
      entregados: 30,
      pendientesRendicion: 5,
      fechaSalida: 'Hoy, 06:00',
      horaSalida: '06:00',
    },
  ],
  CAMION: [
    {
      tipo: 'CAMION',
      numeroMovil: '00310',
      patente: 'GH-4412',
      conductor: 'Héctor Tapia',
      rutConductor: '13.489.112-9',
      totalBultosAsignados: 92,
      entregados: 92,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 06:45',
      horaSalida: '06:45',
    },
    {
      tipo: 'CAMION',
      numeroMovil: '50310',
      patente: 'GH-4412',
      conductor: 'Héctor Tapia',
      rutConductor: '13.489.112-9',
      totalBultosAsignados: 92,
      entregados: 85,
      pendientesRendicion: 7,
      fechaSalida: 'Hoy, 06:45',
      horaSalida: '06:45',
    },
  ],
  RAMPLA: [
    {
      tipo: 'RAMPLA',
      numeroMovil: '00501',
      patente: 'BB-7821',
      conductor: 'Manuel Sepúlveda',
      rutConductor: '11.890.312-7',
      totalBultosAsignados: 320,
      entregados: 320,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 05:30',
      horaSalida: '05:30',
    },
    {
      tipo: 'RAMPLA',
      numeroMovil: '50501',
      patente: 'BB-7821',
      conductor: 'Manuel Sepúlveda',
      rutConductor: '11.890.312-7',
      totalBultosAsignados: 320,
      entregados: 310,
      pendientesRendicion: 10,
      fechaSalida: 'Hoy, 05:30',
      horaSalida: '05:30',
    },
  ],
  CAMIONETA: [
    {
      tipo: 'CAMIONETA',
      numeroMovil: '00105',
      patente: 'TK-1142',
      conductor: 'Ignacio Morales',
      rutConductor: '18.902.441-3',
      totalBultosAsignados: 24,
      entregados: 24,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 09:00',
      horaSalida: '09:00',
    },
    {
      tipo: 'CAMIONETA',
      numeroMovil: '50105',
      patente: 'TK-1142',
      conductor: 'Ignacio Morales',
      rutConductor: '18.902.441-3',
      totalBultosAsignados: 24,
      entregados: 21,
      pendientesRendicion: 3,
      fechaSalida: 'Hoy, 09:00',
      horaSalida: '09:00',
    },
  ],
  FURGON: [
    {
      tipo: 'FURGON',
      numeroMovil: '00204',
      patente: 'KJ-8219',
      conductor: 'Mauricio Silva',
      rutConductor: '15.340.829-4',
      totalBultosAsignados: 48,
      entregados: 48,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 07:30',
      horaSalida: '07:30',
    },
    {
      tipo: 'FURGON',
      numeroMovil: '50204',
      patente: 'KJ-8219',
      conductor: 'Mauricio Silva',
      rutConductor: '15.340.829-4',
      totalBultosAsignados: 48,
      entregados: 42,
      pendientesRendicion: 6,
      fechaSalida: 'Hoy, 07:30',
      horaSalida: '07:30',
    },
  ],
  MOTO: [
    {
      tipo: 'MOTO',
      numeroMovil: '00701',
      patente: 'MT-4912',
      conductor: 'Rodrigo Araya',
      rutConductor: '19.482.193-2',
      totalBultosAsignados: 18,
      entregados: 18,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 08:30',
      horaSalida: '08:30',
    },
    {
      tipo: 'MOTO',
      numeroMovil: '50701',
      patente: 'MT-4912',
      conductor: 'Rodrigo Araya',
      rutConductor: '19.482.193-2',
      totalBultosAsignados: 18,
      entregados: 16,
      pendientesRendicion: 2,
      fechaSalida: 'Hoy, 08:30',
      horaSalida: '08:30',
    },
  ],
  TUR_CARRY: [
    {
      tipo: 'TUR_CARRY',
      numeroMovil: '00801',
      patente: 'TC-9912',
      conductor: 'Eduardo Valdés',
      rutConductor: '16.782.339-1',
      totalBultosAsignados: 28,
      entregados: 28,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 08:00',
      horaSalida: '08:00',
    },
    {
      tipo: 'TUR_CARRY',
      numeroMovil: '50801',
      patente: 'TC-9912',
      conductor: 'Eduardo Valdés',
      rutConductor: '16.782.339-1',
      totalBultosAsignados: 28,
      entregados: 25,
      pendientesRendicion: 3,
      fechaSalida: 'Hoy, 08:00',
      horaSalida: '08:00',
    },
  ],
  AVION: [
    {
      tipo: 'AVION',
      numeroMovil: '00901',
      patente: 'CC-AIR1',
      conductor: 'Tripulación Aérea STK-1',
      rutConductor: '76.128.940-3',
      totalBultosAsignados: 150,
      entregados: 150,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 04:00',
      horaSalida: '04:00',
    },
    {
      tipo: 'AVION',
      numeroMovil: '50901',
      patente: 'CC-AIR1',
      conductor: 'Tripulación Aérea STK-1',
      rutConductor: '76.128.940-3',
      totalBultosAsignados: 150,
      entregados: 142,
      pendientesRendicion: 8,
      fechaSalida: 'Hoy, 04:00',
      horaSalida: '04:00',
    },
  ],
  PEATON: [
    {
      tipo: 'PEATON',
      numeroMovil: '00051',
      patente: 'PEATÓN',
      conductor: 'Sebastián Lagos',
      rutConductor: '20.182.941-K',
      totalBultosAsignados: 12,
      entregados: 12,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 09:30',
      horaSalida: '09:30',
    },
    {
      tipo: 'PEATON',
      numeroMovil: '50051',
      patente: 'PEATÓN',
      conductor: 'Sebastián Lagos',
      rutConductor: '20.182.941-K',
      totalBultosAsignados: 12,
      entregados: 11,
      pendientesRendicion: 1,
      fechaSalida: 'Hoy, 09:30',
      horaSalida: '09:30',
    },
  ],
  CAMIONETA_PLATAFORMA: [
    {
      tipo: 'CAMIONETA_PLATAFORMA',
      numeroMovil: '00155',
      patente: 'PL-3829',
      conductor: 'Franco Riquelme',
      rutConductor: '17.391.029-8',
      totalBultosAsignados: 30,
      entregados: 30,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 07:15',
      horaSalida: '07:15',
    },
    {
      tipo: 'CAMIONETA_PLATAFORMA',
      numeroMovil: '50155',
      patente: 'PL-3829',
      conductor: 'Franco Riquelme',
      rutConductor: '17.391.029-8',
      totalBultosAsignados: 30,
      entregados: 26,
      pendientesRendicion: 4,
      fechaSalida: 'Hoy, 07:15',
      horaSalida: '07:15',
    },
  ],
  CAMION_PLATAFORMA: [
    {
      tipo: 'CAMION_PLATAFORMA',
      numeroMovil: '00455',
      patente: 'CP-8821',
      conductor: 'Gonzalo Navarro',
      rutConductor: '14.829.110-4',
      totalBultosAsignados: 60,
      entregados: 60,
      pendientesRendicion: 0,
      fechaSalida: 'Hoy, 06:15',
      horaSalida: '06:15',
    },
    {
      tipo: 'CAMION_PLATAFORMA',
      numeroMovil: '50455',
      patente: 'CP-8821',
      conductor: 'Gonzalo Navarro',
      rutConductor: '14.829.110-4',
      totalBultosAsignados: 60,
      entregados: 54,
      pendientesRendicion: 6,
      fechaSalida: 'Hoy, 06:15',
      horaSalida: '06:15',
    },
  ],
};

export const RendicionModule: React.FC<RendicionModuleProps> = ({
  onRegisterBackHandler,
  onBackHome,
}) => {
  const { isPda } = useDevice();
  const { playSuccessSound, playWarningSound, playErrorSound } = useAudioFeedback();

  // Estados del Proceso
  const [tipoMovilSeleccionado, setTipoMovilSeleccionado] = useState<TipoMovilRendicion | null>(null);
  const [numeroMovilInput, setNumeroMovilInput] = useState<string>('');
  const [movilDetectado, setMovilDetectado] = useState<MovilRendicionInfo | null>(null);
  const [etapaRendicion, setEtapaRendicion] = useState<'SELECCION_MOVIL' | 'RENDICION_EN_CURSO'>('SELECCION_MOVIL');

  // Control del Selector Desplegable de Tipo de Vehículo
  const tipoDropdownRef = useRef<HTMLDivElement>(null);
  const [isTipoDropdownOpen, setIsTipoDropdownOpen] = useState(false);
  const [busquedaTipo, setBusquedaTipo] = useState('');

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(event.target as Node)) {
        setIsTipoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Modales: Clave de Tripulante y Popup de Rendición Exitosa (Máximo 2 popups)
  const [isModalClaveOpen, setIsModalClaveOpen] = useState(false);
  const [isModalExitoOpen, setIsModalExitoOpen] = useState(false);
  const [claveTripulanteInput, setClaveTripulanteInput] = useState('');
  const [showClave, setShowClave] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobanteRendicion | null>(null);

  // Modal de Edición de Motivo de Excepción
  const [encargoAEditar, setEncargoAEditar] = useState<EncargoRendicion | null>(null);
  const [nuevoMotivoSeleccionado, setNuevoMotivoSeleccionado] = useState<string>('');

  // Modal / Popup de Alerta: Encargo debe ser enviado a Bodega de Indagaciones (BI)
  const [encargoBIAlerta, setEncargoBIAlerta] = useState<EncargoRendicion | null>(null);

  // Lista de encargos a rendir en andén
  const [encargosRendicion, setEncargosRendicion] = useState<EncargoRendicion[]>([]);

  // Helper: Clave de tripulante esperada (RUT sin puntos, guiones ni dígito verificador)
  const getClaveTripulanteEsperada = (rut?: string): string => {
    if (!rut) return '15340829';
    const clean = rut.replace(/[^0-9kK]/g, '');
    return clean.slice(0, -1);
  };

  // Helper: Obtener número de nómina de 8 dígitos garantizado
  const getNumeroNomina = (enc?: EncargoRendicion | null): string => {
    if (!enc) return '10482914';
    if (enc.numeroNomina && enc.numeroNomina.trim()) return enc.numeroNomina;
    const num = parseInt(enc.ordenFlete?.replace(/\D/g, '') || '940878000', 10);
    return `${10000000 + ((num * 73) % 89999999)}`;
  };

  // Normalizar encargos existentes en memoria para asegurar que tengan siempre su N° de Nómina de 8 dígitos
  useEffect(() => {
    if (encargosRendicion.length > 0 && encargosRendicion.some((e) => !e.numeroNomina)) {
      setEncargosRendicion((prev) =>
        prev.map((enc, i) => {
          if (!enc.numeroNomina) {
            const num = parseInt(enc.ordenFlete?.replace(/\D/g, '') || '940878000', 10);
            return {
              ...enc,
              numeroNomina: `${10000000 + ((num * 73 + (i + 1) * 311) % 89999999)}`,
            };
          }
          return enc;
        })
      );
    }
  }, [encargosRendicion]);

  // Registrar handler para el botón atrás del header global
  useEffect(() => {
    if (onRegisterBackHandler) {
      if (etapaRendicion === 'RENDICION_EN_CURSO') {
        onRegisterBackHandler(() => {
          setEtapaRendicion('SELECCION_MOVIL');
        });
      } else if (tipoMovilSeleccionado) {
        onRegisterBackHandler(() => {
          setTipoMovilSeleccionado(null);
          setNumeroMovilInput('');
          setMovilDetectado(null);
        });
      } else {
        onRegisterBackHandler(onBackHome || null);
      }
    }
  }, [etapaRendicion, tipoMovilSeleccionado, onRegisterBackHandler, onBackHome]);

  // Actualizar detección de móvil: solo cuando los 5 dígitos estén completamente ingresados
  useEffect(() => {
    if (!tipoMovilSeleccionado) {
      setMovilDetectado(null);
      return;
    }

    const cleanDigits = numeroMovilInput.replace(/\D/g, '').slice(0, 5);

    // Esperar a que el número de móvil esté ingresado completamente (5 dígitos)
    if (cleanDigits.length < 5) {
      setMovilDetectado(null);
      return;
    }

    const empiezaConCinco = cleanDigits.startsWith('5');
    const lista = MOVILES_PRESET[tipoMovilSeleccionado] || [];
    const encontrado = lista.find(
      (m) =>
        m.numeroMovil === cleanDigits ||
        m.numeroMovil.replace(/^0+/, '') === cleanDigits.replace(/^0+/, '')
    );

    if (encontrado) {
      const total = encontrado.totalBultosAsignados || 48;
      const pendientes = empiezaConCinco
        ? (encontrado.pendientesRendicion && encontrado.pendientesRendicion > 0 ? encontrado.pendientesRendicion : 6)
        : 0;
      setMovilDetectado({
        ...encontrado,
        numeroMovil: cleanDigits,
        totalBultosAsignados: total,
        entregados: total - pendientes,
        pendientesRendicion: pendientes,
      });
    } else {
      // Móvil dinámico de 5 dígitos ingresado completamente
      const total = 42;
      const pendientes = empiezaConCinco ? 5 : 0;
      setMovilDetectado({
        tipo: tipoMovilSeleccionado,
        numeroMovil: cleanDigits,
        patente: `ST-${cleanDigits.slice(-4)}`,
        conductor: 'Conductor asignado en ruta',
        rutConductor: '16.890.412-K',
        totalBultosAsignados: total,
        entregados: total - pendientes,
        pendientesRendicion: pendientes,
        fechaSalida: 'Hoy, En Turno',
        horaSalida: '08:00',
      });
    }
  }, [tipoMovilSeleccionado, numeroMovilInput]);

  const handleSeleccionarTipo = (tipo: TipoMovilRendicion) => {
    setTipoMovilSeleccionado(tipo);
    setNumeroMovilInput('');
    setMovilDetectado(null);
    playSuccessSound();
  };

  const handleNumeroMovilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 5);
    setNumeroMovilInput(onlyDigits);
  };

  const handleIniciarRendicion = () => {
    if (!tipoMovilSeleccionado || !movilDetectado || numeroMovilInput.length !== 5) {
      playWarningSound();
      return;
    }
    const pendientes = movilDetectado.pendientesRendicion && movilDetectado.pendientesRendicion > 0
      ? movilDetectado.pendientesRendicion
      : 5;
    const lista = GENERAR_ENCARGOS_MOCK(pendientes, movilDetectado.numeroMovil);
    setEncargosRendicion(lista);
    playSuccessSound();
    setEtapaRendicion('RENDICION_EN_CURSO');
  };

  // Escáner de pistola física en andén para recepción directa
  useBarcodeScanner({
    onScan: (scannedCode) => {
      if (etapaRendicion !== 'RENDICION_EN_CURSO') return;
      const clean = scannedCode.trim().replace(/^(OF|ENC|NOM|NÓM|N°|#)\s*/i, '');
      const match = encargosRendicion.find(
        (e) =>
          e.ordenFlete === clean ||
          e.ordenFlete.endsWith(clean) ||
          e.numeroNomina === clean ||
          e.numeroNomina.endsWith(clean) ||
          e.id.toLowerCase() === clean.toLowerCase()
      );

      if (match) {
        if (!match.recepcionado) {
          handleToggleRecepcionarEncargo(match.id);
        } else {
          // Si ya estaba recepcionado pero requiere BI, reabrir alerta
          if (match.requiereBI) {
            playWarningSound();
            setEncargoBIAlerta(match);
          } else {
            playSuccessSound();
          }
        }
      } else {
        playErrorSound();
      }
    },
    enableGlobal: true,
  });


  // Cambiar estado de encargo: De pendiente (disabled) a recepcionado (activo en verde)
  const handleToggleRecepcionarEncargo = (id: string) => {
    const encargoActual = encargosRendicion.find((e) => e.id === id);
    if (!encargoActual) return;

    const nuevoEstado = !encargoActual.recepcionado;

    if (nuevoEstado) {
      const now = new Date();
      const hora = now.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setEncargosRendicion((prev) =>
        prev.map((enc) =>
          enc.id === id ? { ...enc, recepcionado: true, horaRecepcion: `${hora} hrs` } : enc
        )
      );

      // Si el encargo debe ser derivado a BI, emitir alerta sonora y abrir popup modal
      if (encargoActual.requiereBI) {
        playWarningSound();
        setEncargoBIAlerta(encargoActual);
      } else {
        playSuccessSound();
      }
    } else {
      playWarningSound();
      setEncargosRendicion((prev) =>
        prev.map((enc) =>
          enc.id === id ? { ...enc, recepcionado: false, horaRecepcion: undefined } : enc
        )
      );
    }
  };

  // Manejadores para edición interactiva de motivos de excepción
  const handleAbrirEditarExcepcion = (enc: EncargoRendicion) => {
    setEncargoAEditar(enc);
    setNuevoMotivoSeleccionado(enc.motivoDevolucion);
  };

  const handleGuardarNuevaExcepcion = () => {
    if (!encargoAEditar || !nuevoMotivoSeleccionado) return;
    const esBI = nuevoMotivoSeleccionado.toLowerCase().includes('daño') || Boolean(encargoAEditar.requiereBI);
    setEncargosRendicion((prev) =>
      prev.map((e) =>
        e.id === encargoAEditar.id
          ? {
              ...e,
              motivoDevolucion: nuevoMotivoSeleccionado,
              requiereBI: esBI,
              motivoBI: esBI
                ? 'Mercadería o embalaje con daño. Separar para peritaje en Bodega de Indagaciones (BI).'
                : e.motivoBI,
            }
          : e
      )
    );
    playSuccessSound();
    setEncargoAEditar(null);
  };

  // Abrir Modal de Confirmación y Clave de Tripulante (Paso 1 directo con aviso de faltantes integrado)
  const handleClicFinalizar = () => {
    if (!tipoMovilSeleccionado || !movilDetectado || numeroMovilInput.length !== 5) {
      playWarningSound();
      return;
    }

    const cantFaltantes = encargosRendicion.filter((e) => !e.recepcionado).length;
    if (cantFaltantes > 0) {
      playWarningSound();
    }
    setErrorClave(null);
    setClaveTripulanteInput('');
    setShowClave(false);
    setIsModalClaveOpen(true);
  };

  // Confirmar Clave y Emitir Comprobante Oficial (Paso 2 directo: éxito e impresión)
  const handleConfirmarClave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!movilDetectado) return;

    const claveEsperada = getClaveTripulanteEsperada(movilDetectado.rutConductor);
    const claveIngresada = claveTripulanteInput.trim();

    if (claveIngresada !== claveEsperada) {
      setErrorClave('Clave incorrecta');
      playErrorSound();
      return;
    }

    // Clave correcta -> confirmar recepción y generar comprobante
    playSuccessSound();
    setErrorClave(null);

    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaStr = now.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const cleanNum = movilDetectado.numeroMovil;
    const totalBultos = movilDetectado.totalBultosAsignados ?? 42;
    const totalRutaDevueltos = encargosRendicion.length > 0
      ? encargosRendicion.length
      : (movilDetectado.pendientesRendicion ?? 0);
    const cantDevoluciones = encargosRendicion.length > 0
      ? encargosRendicion.filter((e) => e.recepcionado).length
      : 0;
    const cantBI = encargosRendicion.length > 0
      ? encargosRendicion.filter((e) => e.recepcionado && e.requiereBI).length
      : 0;
    const cantExtraviados = encargosRendicion.length > 0
      ? encargosRendicion.filter((e) => !e.recepcionado).length
      : 0;
    const cantEntregados = totalBultos - totalRutaDevueltos;

    const nuevoComprobante: ComprobanteRendicion = {
      folio: `CR-${cleanNum}-${Math.floor(100000 + Math.random() * 900000)}`,
      fechaEmision: fechaStr,
      horaEmision: `${horaStr} hrs`,
      numeroMovil: movilDetectado.numeroMovil,
      tipoMovil: tipoActualInfo?.nombre || 'Vehículo',
      patente: movilDetectado.patente || 'S/P',
      conductor: movilDetectado.conductor || 'Conductor en Ruta',
      rutConductor: movilDetectado.rutConductor || '15.340.829-4',
      claveTripulanteIngresada: claveIngresada,
      totalBultosAsignados: totalBultos,
      totalEntregados: cantEntregados,
      totalDevoluciones: cantDevoluciones,
      totalBI: cantBI,
      totalExtraviados: cantExtraviados,
      operadorReceptor: 'Carlos Mendoza (OP-4921)',
      hubReceptor: 'Hub Pudahuel - Bodega 3',
      codigoSeguridad: `STK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${cleanNum}`,
    };

    setComprobanteEmitido(nuevoComprobante);
    setIsModalClaveOpen(false);
    setIsModalExitoOpen(true);
  };

  const handleCerrarModalExito = () => {
    setIsModalExitoOpen(false);
    handleReiniciarSeleccion();
  };

  const handleReiniciarSeleccion = () => {
    setTipoMovilSeleccionado(null);
    setNumeroMovilInput('');
    setMovilDetectado(null);
    setComprobanteEmitido(null);
    setErrorClave(null);
    setClaveTripulanteInput('');
    setEncargosRendicion([]);
    setEncargoBIAlerta(null);
    setIsModalClaveOpen(false);
    setIsModalExitoOpen(false);
    setEncargoAEditar(null);
    setIsTipoDropdownOpen(false);
    setBusquedaTipo('');
    setEtapaRendicion('SELECCION_MOVIL');
  };

  const tipoActualInfo = TIPOS_MOVIL.find((t) => t.id === tipoMovilSeleccionado);

  return (
    <div
      className={`flex-1 min-h-0 h-full w-full bg-[#FAFDFC] dark:bg-hub-base font-sans select-none flex flex-col ${
        etapaRendicion === 'SELECCION_MOVIL' ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto w-full flex-1 min-h-0 h-full flex flex-col gap-2 sm:gap-2.5 animate-fadeIn ${
          isPda ? 'p-2' : 'p-3 sm:p-5 lg:p-6 xl:p-8'
        } ${etapaRendicion === 'SELECCION_MOVIL' ? '' : 'overflow-hidden'}`}
      >
      {/* ══════════════════════════════════════════════════════════════════════════════
          ENCABEZADO UNIFICADO: ESTADO Y DATOS DEL MÓVIL (COMPACTO Y RESPONSIVO)
         ══════════════════════════════════════════════════════════════════════════════ */}
      {etapaRendicion === 'SELECCION_MOVIL' ? (
        <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#009D4E]/15 dark:bg-[#03F77C]/15 border border-[#009D4E]/30 dark:border-[#03F77C]/30 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-[#303030] dark:text-hub-text1 font-sans">
                  <span className="sm:hidden">Rendición de móviles</span>
                  <span className="hidden sm:inline">Rendición de móviles: selección de ruta</span>
                </h2>
                {tipoMovilSeleccionado && (
                  <span className="text-[10px] font-mono font-bold text-[#009D4E] dark:text-[#03F77C] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                    {tipoActualInfo?.nombre}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-hub-text3 truncate hidden sm:block">
                Selecciona el tipo de vehículo e ingresa el número de móvil para procesar la rendición
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {tipoMovilSeleccionado && (
              <button
                type="button"
                onClick={handleReiniciarSeleccion}
                className="h-7 px-2.5 rounded-md text-[11px] font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-hub-border flex items-center gap-1 transition-all cursor-pointer"
                title="Cambiar móvil o reiniciar selección"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Encabezado Unificado para Rendición en Curso (Compacto y Responsivo) */
        <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#009D4E]/15 dark:bg-[#03F77C]/15 border border-[#009D4E]/30 dark:border-[#03F77C]/30 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800">
                  {tipoActualInfo?.nombre}
                </span>
                <span className="text-[10px] font-mono font-medium text-gray-400 dark:text-hub-text3">
                  RUT: {movilDetectado?.rutConductor}
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-[#303030] dark:text-hub-text1 font-sans">
                <span className="sm:hidden">
                  Móvil {movilDetectado?.patente || 'S/P'} · {movilDetectado?.conductor}
                </span>
                <span className="hidden sm:inline">
                  Rendición de móvil {movilDetectado?.patente || 'S/P'} · {movilDetectado?.conductor}
                </span>
              </h2>
            </div>
          </div>

          {/* Métricas del Móvil en Pastillas Horizontales Compactas (Alineadas a la derecha) */}
          <div className="flex items-center justify-end w-full sm:w-auto ml-auto gap-1.5 sm:gap-2 shrink-0 font-mono">
            <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-gray-50 dark:bg-hub-base border border-gray-200 dark:border-hub-border flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-gray-500 font-sans">Total:</span>
              <span className="font-black text-gray-900 dark:text-white">
                {movilDetectado?.totalBultosAsignados}
              </span>
            </div>
            <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-sans">Entregados:</span>
              <span className="font-black text-[#009D4E] dark:text-[#03F77C]">
                {movilDetectado?.entregados}
              </span>
            </div>
            <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-sans">A rendir:</span>
              <span className="font-black text-amber-600 dark:text-amber-400">
                {encargosRendicion.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          COMPONENTE 2 (INFERIOR): FUNCIONALIDADES DEL PROCESO DE RENDICIÓN
         ══════════════════════════════════════════════════════════════════════════════ */}
      {etapaRendicion === 'SELECCION_MOVIL' ? (
        <div className="flex-1 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col gap-3">
          
          {/* ── SECCIÓN 1: SELECCIONAR TIPO DE MÓVIL ────────────────────────── */}
          <div className="space-y-1.5" ref={tipoDropdownRef}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] text-[10px] font-black flex items-center justify-center font-mono">
                  1
                </span>
                <h3 className="text-xs font-bold text-[#303030] dark:text-hub-text1">
                  1. Tipo de vehículo
                </h3>
              </div>
              <span className="text-[10px] font-medium text-gray-400 dark:text-hub-text3">
                {tipoMovilSeleccionado ? 'Seleccionado' : 'Requerido'}
              </span>
            </div>

            {/* Dropdown Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTipoDropdownOpen(!isTipoDropdownOpen)}
                className={`w-full px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer text-left h-8 sm:h-9 ${
                  isTipoDropdownOpen
                    ? 'border-[#009D4E] dark:border-[#03F77C] bg-white dark:bg-hub-surface ring-2 ring-[#009D4E]/20 shadow-xs'
                    : tipoMovilSeleccionado
                    ? 'border-[#009D4E]/60 dark:border-[#03F77C]/60 bg-[#EEFBF4]/50 dark:bg-[#03F77C]/10 hover:border-[#009D4E]'
                    : 'border-gray-200 dark:border-hub-border bg-gray-50/80 dark:bg-hub-base hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                {tipoActualInfo ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-[#009D4E] text-white dark:bg-[#03F77C] dark:text-[#1E1E1E] flex items-center justify-center shrink-0">
                      {React.createElement(tipoActualInfo.icon, { className: 'w-3 h-3 stroke-[2.2]' })}
                    </div>
                    <span className="text-xs font-bold text-[#303030] dark:text-white truncate">
                      {tipoActualInfo.nombre}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 dark:text-hub-text3">
                    <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-500 dark:text-hub-text2 truncate">
                      Seleccione el tipo de vehículo...
                    </span>
                  </div>
                )}

                <div className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                  isTipoDropdownOpen ? 'rotate-180 text-[#009D4E] dark:text-[#03F77C]' : ''
                }`}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Menú Desplegable con Búsqueda */}
              {isTipoDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                  {/* Buscador Rápido */}
                  <div className="p-1.5 border-b border-gray-100 dark:border-hub-border bg-gray-50/70 dark:bg-hub-base/60">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-3 h-3" />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={busquedaTipo}
                        onChange={(e) => setBusquedaTipo(e.target.value)}
                        placeholder="Buscar por tipo de vehículo..."
                        className="w-full pl-7 pr-2 py-1 text-xs h-7 rounded-md border border-gray-200 dark:border-hub-border bg-white dark:bg-hub-surface text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#009D4E] focus:ring-1 focus:ring-[#009D4E]"
                      />
                    </div>
                  </div>

                  {/* Lista de Opciones */}
                  <div className="max-h-44 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                    {(() => {
                      const filtrados = TIPOS_MOVIL.filter((t) =>
                        t.nombre.toLowerCase().includes(busquedaTipo.toLowerCase())
                      );

                      if (filtrados.length === 0) {
                        return (
                          <div className="py-2.5 text-center text-xs text-gray-400">
                            No se encontraron tipos con &ldquo;{busquedaTipo}&rdquo;
                          </div>
                        );
                      }

                      return filtrados.map((tipo) => {
                        const IconComponent = tipo.icon;
                        const isSelected = tipoMovilSeleccionado === tipo.id;

                        return (
                          <button
                            key={tipo.id}
                            type="button"
                            onClick={() => {
                              handleSeleccionarTipo(tipo.id);
                              setIsTipoDropdownOpen(false);
                              setBusquedaTipo('');
                            }}
                            className={`w-full px-2 py-1 rounded-md flex items-center justify-between gap-2 transition-all text-left cursor-pointer h-7 text-xs ${
                              isSelected
                                ? 'bg-[#EEFBF4] dark:bg-[#03F77C]/15 text-[#009D4E] dark:text-[#03F77C] font-black'
                                : 'hover:bg-gray-100/90 dark:hover:bg-hub-elevated text-gray-800 dark:text-hub-text1 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IconComponent className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected
                                  ? 'text-[#009D4E] dark:text-[#03F77C]'
                                  : 'text-gray-500 dark:text-hub-text3'
                              }`} />
                              <span className="truncate">{tipo.nombre}</span>
                            </div>

                            {isSelected && (
                              <Check className="w-3 h-3 text-[#009D4E] dark:text-[#03F77C] stroke-[3] shrink-0" />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECCIÓN 2: INGRESAR N° DE MÓVIL (BALANCED & RESPONSIVE GRID) ──── */}
          <div className={`space-y-1.5 transition-opacity duration-300 ${!tipoMovilSeleccionado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] text-[10px] font-black flex items-center justify-center font-mono">
                  2
                </span>
                <h3 className="text-xs font-bold text-[#303030] dark:text-hub-text1">
                  2. Ingresar número de móvil
                </h3>
              </div>
              <span className="text-[10px] font-medium text-gray-400 dark:text-hub-text3">
                {tipoMovilSeleccionado ? `N° de ${tipoActualInfo?.nombre}` : 'Requerido'}
              </span>
            </div>

            {/* Input y Ficha de Móvil en Grid Equilibrado 50/50 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
              {/* Input Izquierdo */}
              <div className="relative h-8 sm:h-9">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Hash className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={numeroMovilInput}
                  onChange={handleNumeroMovilChange}
                  placeholder="Ingrese los 5 dígitos (ej: 54243)"
                  disabled={!tipoMovilSeleccionado}
                  className="w-full h-full pl-8 pr-20 bg-gray-50/80 dark:bg-hub-base border border-gray-200 dark:border-hub-border focus:border-[#009D4E] dark:focus:border-[#03F77C] focus:bg-white dark:focus:bg-hub-surface rounded-lg text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-all outline-none focus:outline-none focus:ring-2 focus:ring-[#009D4E]/20 shadow-2xs"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border transition-all ${
                      numeroMovilInput.length === 5
                        ? 'bg-[#EEFBF4] dark:bg-emerald-950/80 text-[#009D4E] dark:text-[#03F77C] border-[#A7F3D0] dark:border-emerald-800'
                        : 'bg-gray-100 dark:bg-hub-elevated text-gray-500 dark:text-hub-text3 border-gray-200 dark:border-hub-border'
                    }`}
                  >
                    {numeroMovilInput.length}/5 dig
                  </span>
                  {numeroMovilInput && (
                    <button
                      type="button"
                      onClick={() => setNumeroMovilInput('')}
                      className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white px-0.5 cursor-pointer"
                      title="Borrar número"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Ficha de Validación Compacta en la Derecha */}
              <div>
                {movilDetectado ? (
                  <div
                    className={`p-2 sm:p-2.5 rounded-lg border text-xs animate-fadeIn ${
                      (movilDetectado.pendientesRendicion ?? 0) > 0
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            (movilDetectado.pendientesRendicion ?? 0) > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#009D4E] dark:text-[#03F77C]'
                          }`}
                        />
                        <span className="font-bold text-gray-900 dark:text-white text-xs truncate">
                          Móvil #{movilDetectado.numeroMovil} · {movilDetectado.patente}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono shrink-0 ${
                          (movilDetectado.pendientesRendicion ?? 0) > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        {(movilDetectado.pendientesRendicion ?? 0) > 0 ? 'Con bultos' : 'Sin bultos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] pt-1 border-t border-gray-200/50 dark:border-hub-border">
                      <div className="truncate text-gray-600 dark:text-hub-text2">
                        <span className="text-gray-400">Conductor: </span>
                        <span className="font-semibold text-gray-800 dark:text-white">{movilDetectado.conductor}</span>
                      </div>
                      <div className="truncate text-gray-600 dark:text-hub-text2 font-mono">
                        <span className="text-gray-400">RUT: </span>
                        <span className="font-semibold text-gray-800 dark:text-white">{movilDetectado.rutConductor}</span>
                      </div>
                      <div className="truncate font-mono">
                        <span className="text-gray-400">Asignados: </span>
                        <span className="font-bold text-[#009D4E] dark:text-[#03F77C]">
                          {movilDetectado.totalBultosAsignados} bultos
                        </span>
                      </div>
                      <div className="truncate font-mono">
                        <span className="text-gray-400">A rendir: </span>
                        <span
                          className={`font-bold ${
                            (movilDetectado.pendientesRendicion ?? 0) > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#009D4E] dark:text-[#03F77C]'
                          }`}
                        >
                          {movilDetectado.pendientesRendicion} bultos
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden sm:flex h-8 sm:h-9 px-2.5 rounded-lg border border-dashed border-gray-200 dark:border-hub-border bg-gray-50/50 dark:bg-hub-base/40 items-center justify-center gap-2 text-xs text-gray-400 dark:text-hub-text3">
                    <Search className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    <span className="text-[11px] truncate">
                      {tipoMovilSeleccionado
                        ? numeroMovilInput.length > 0
                          ? `Ingresando móvil (${numeroMovilInput.length}/5 dígitos)...`
                          : 'Ingrese los 5 dígitos del móvil para detectar datos'
                        : 'Seleccione un tipo de vehículo primero'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTONES DE ACCIÓN PRINCIPAL (PROPORCIONALES Y ELEGANTES) ─────── */}
          <div className="pt-2.5 border-t border-gray-100 dark:border-hub-border flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-auto">
            {/* Estado del Móvil a la Izquierda */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-hub-text2 w-full sm:w-auto justify-center sm:justify-start">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  movilDetectado && (movilDetectado.pendientesRendicion ?? 0) > 0
                    ? 'bg-amber-500 animate-pulse'
                    : movilDetectado
                    ? 'bg-[#009D4E] dark:bg-[#03F77C]'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <span className="text-[11px] font-medium truncate text-center sm:text-left">
                {movilDetectado
                  ? (movilDetectado.pendientesRendicion ?? 0) > 0
                    ? `Móvil con ${movilDetectado.pendientesRendicion} bultos para rendición en andén`
                    : 'Móvil sin bultos pendientes de rendición'
                  : 'Ingrese tipo y N° de móvil para habilitar el inicio'}
              </span>
            </div>

            {/* Botón de Acción a la Derecha: Ancho Completo y Bordes Redondeados en Mobile */}
            <div className="w-full sm:w-auto flex items-center justify-center sm:justify-end">
              {/* Caso 1: Con bultos para rendir (inicia con 5) */}
              {numeroMovilInput.startsWith('5') && numeroMovilInput.length === 5 && movilDetectado ? (
                <button
                  type="button"
                  onClick={handleIniciarRendicion}
                  className="w-full sm:w-auto h-11 sm:h-9 px-6 rounded-full sm:rounded-lg font-bold text-sm sm:text-xs bg-[#009D4E] hover:bg-[#008743] active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Comenzar rendición de bultos</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : null}

              {/* Caso 2: Sin bultos (100% entregado) */}
              {!numeroMovilInput.startsWith('5') && numeroMovilInput.length === 5 && movilDetectado ? (
                <button
                  type="button"
                  onClick={handleClicFinalizar}
                  className="w-full sm:w-auto h-11 sm:h-9 px-6 rounded-full sm:rounded-lg font-bold text-sm sm:text-xs bg-[#303030] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1E1E1E] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[2.5]" />
                  <span>Terminar sin encargos</span>
                </button>
              ) : null}

              {/* Caso 3: Incompleto / Deshabilitado */}
              {(!movilDetectado || numeroMovilInput.length !== 5) && (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto h-11 sm:h-9 px-6 rounded-full sm:rounded-lg font-bold text-sm sm:text-xs bg-gray-100 dark:bg-hub-elevated text-gray-400 dark:text-hub-text3 flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 dark:border-hub-border opacity-50"
                >
                  <span>Comenzar rendición</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════════
           PANTALLA: RENDICIÓN EN CURSO (RECEPCIÓN Y ESCANEO DE BULTOS EN RUTA)
           ══════════════════════════════════════════════════════════════════════════════ */
        (() => {
          const totalEnc = encargosRendicion.length;
          const recepcionadosCant = encargosRendicion.filter((e) => e.recepcionado).length;
          const todosListos = totalEnc > 0 && recepcionadosCant === totalEnc;

          return (
            <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2 animate-fadeIn">
              {/* Cabecera Unificada y Conteo de Rendición (Sin input manual de escanear OF) */}
              <div className="flex items-center justify-between gap-2 px-0.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-[#303030] dark:text-hub-text1">
                    Encargos en ruta ({totalEnc})
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-xs font-bold text-gray-800 dark:text-white">
                    <span className="text-[#009D4E] dark:text-[#03F77C]">{recepcionadosCant}</span>/{totalEnc} rendidos
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    todosListos
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {todosListos ? '✓ Listos' : `${totalEnc - recepcionadosCant} pend.`}
                  </span>
                </div>
              </div>

              {/* Lista de Encargos para Devolución: Formato ultra-compacto para una sola vista sin scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                {encargosRendicion.map((enc) => {
                  const isRecepcionado = enc.recepcionado;
                  return (
                    <div
                      key={enc.id}
                      onClick={() => handleToggleRecepcionarEncargo(enc.id)}
                      className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                        isRecepcionado && enc.requiereBI ? 'border-l-4 border-l-purple-600 dark:border-l-purple-400' : ''
                      } ${
                        isRecepcionado
                          ? 'bg-[#F0FDF4] dark:bg-emerald-950/30 border-[#009D4E] dark:border-[#03F77C] shadow-2xs'
                          : 'bg-gray-50/70 dark:bg-hub-base/60 border-gray-200 dark:border-hub-border opacity-80 hover:opacity-100 hover:border-[#009D4E]/50'
                      }`}
                    >
                      {/* Checkbox táctil */}
                      <div
                        className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                          isRecepcionado
                            ? 'bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E]'
                            : 'border-2 border-dashed border-gray-300 dark:border-hub-border bg-white dark:bg-hub-surface text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>

                      {/* Contenido perfectamente distribuido según la guía del usuario */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        {/* Fila 1: N° de Nómina a la izquierda + Estado y BI a la derecha */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-gray-500 dark:text-hub-text2 tracking-tight shrink-0 whitespace-nowrap">
                            Nóm. #{getNumeroNomina(enc)}
                          </span>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {/* TAG DE BI SEPARADO: SOLO SI ESTÁ RECEPCIONADO Y REQUIERE BI */}
                            {isRecepcionado && enc.requiereBI && (
                              <span
                                className="h-5 px-2 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700 inline-flex items-center gap-1 shadow-2xs animate-fadeIn shrink-0 whitespace-nowrap"
                                title="Marcado para derivación a Bodega de Indagaciones (BI)"
                              >
                                <ShieldAlert className="w-2.5 h-2.5 text-purple-700 dark:text-purple-300 stroke-[2.5]" />
                                <span>Enviar a BI</span>
                              </span>
                            )}

                            {/* ESTADO RENDIDO / PENDIENTE: COLOR VERDE Y FORMA ORIGINAL */}
                            {isRecepcionado ? (
                              <span className="h-5 px-2 rounded-full bg-[#009D4E] text-white text-[9px] font-bold inline-flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Rendido</span>
                              </span>
                            ) : (
                              <span className="h-5 px-2 rounded-full bg-gray-200/80 dark:bg-hub-surface text-gray-500 dark:text-hub-text3 text-[9px] font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Pendiente</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Fila 2: N° de OF en negrita destacada a la izquierda */}
                        <div className="flex items-center min-w-0">
                          <span className="font-mono font-black text-sm text-[#303030] dark:text-white tracking-tight shrink-0 whitespace-nowrap">
                            OF #{enc.ordenFlete}
                          </span>
                        </div>

                        {/* Fila 3: Motivo de incidencia ergonómico abajo a la derecha */}
                        <div className="flex items-center justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirEditarExcepcion(enc);
                            }}
                            className="min-h-[30px] px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 active:scale-[0.98] flex items-center justify-end gap-1.5 cursor-pointer transition-all shadow-2xs shrink-0"
                            title="Pincha para cambiar motivo de excepción"
                          >
                            <span className="text-[11px] font-bold text-right leading-tight whitespace-nowrap">
                              {enc.motivoDevolucion}
                            </span>
                            <Pencil className="w-3 h-3 text-amber-700 dark:text-amber-300 shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pie de Acciones: Botón Finalizar rendición con altura mínima 35px y redondeado en costados */}
              <div className="pt-2 border-t border-gray-100 dark:border-hub-border flex flex-col sm:flex-row items-center justify-between gap-1.5 shrink-0 mt-auto">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-600 dark:text-hub-text2 w-full sm:w-auto">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      todosListos ? 'bg-[#009D4E] dark:bg-[#03F77C]' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-center sm:text-left truncate">
                    {todosListos
                      ? 'Todos los bultos validados en andén. Listo para finalizar.'
                      : `${totalEnc - recepcionadosCant} bultos pendientes de validación en andén.`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClicFinalizar}
                  className="w-full sm:w-auto min-h-[38px] h-10 px-6 rounded-full font-bold text-sm sm:text-xs bg-[#009D4E] hover:bg-[#008743] active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  title={
                    todosListos
                      ? 'Todos los bultos recepcionados. Proceder a validar clave de tripulante.'
                      : `Finalizar rendición con ${totalEnc - recepcionadosCant} bultos sin rendir (extraviados).`
                  }
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Finalizar rendición</span>
                </button>
              </div>
            </div>
          );
        })()
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          MODAL: CAMBIAR MOTIVO DE EXCEPCIÓN / DEVOLUCIÓN
         ══════════════════════════════════════════════════════════════════════════════ */}
      {encargoAEditar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface rounded-2xl shadow-2xl border border-gray-100 dark:border-hub-border max-w-[480px] w-full font-sans transition-all animate-scaleUp flex flex-col max-h-[92dvh] overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 dark:border-hub-border flex items-center justify-between gap-2 shrink-0 bg-gray-50/70 dark:bg-hub-base/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                  <Pencil className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-hub-text1 leading-tight truncate">
                    Cambiar motivo de excepción
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-hub-text3 truncate">
                    Modificación para la orden de flete seleccionada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEncargoAEditar(null)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-hub-elevated flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con scroll independiente */}
            <div className="p-3.5 sm:p-4 flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar">
              {/* Ficha del Encargo y Motivo Actual */}
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-hub-base border border-gray-200 dark:border-hub-border text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-xs font-semibold text-gray-500 dark:text-hub-text3">
                      Nóm. #{getNumeroNomina(encargoAEditar)}
                    </span>
                    <span className="text-gray-300 dark:text-hub-border">·</span>
                    <span className="font-bold text-[#303030] dark:text-white">
                      OF #{encargoAEditar.ordenFlete}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-gray-200/80 dark:bg-hub-surface text-gray-700 dark:text-hub-text2 shrink-0">
                    {encargoAEditar.bultos} {encargoAEditar.bultos === 1 ? 'bulto' : 'bultos'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-hub-text3 truncate">
                  {encargoAEditar.destinatario} · {encargoAEditar.direccion}
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-200/60 dark:border-hub-border text-[11px]">
                  <span className="text-gray-400">Motivo actual:</span>
                  <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800">
                    {encargoAEditar.motivoDevolucion}
                  </span>
                </div>
              </div>

              {/* Lista de Motivos de Excepción para Seleccionar */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-hub-text2 block">
                  Selecciona la excepción correcta:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 p-1 rounded-xl border border-gray-200 dark:border-hub-border bg-gray-50/50 dark:bg-hub-base/40 custom-scrollbar">
                  {MOTIVOS_EXCEPCION_RENDICION.map((motivo) => {
                    const isSelected = nuevoMotivoSeleccionado === motivo;
                    return (
                      <button
                        key={motivo}
                        type="button"
                        onClick={() => setNuevoMotivoSeleccionado(motivo)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#EEFBF4] dark:bg-[#03F77C]/15 border border-[#009D4E] dark:border-[#03F77C] text-[#009D4E] dark:text-[#03F77C] font-bold shadow-2xs'
                            : 'hover:bg-white dark:hover:bg-hub-surface border border-transparent text-gray-700 dark:text-hub-text2'
                        }`}
                      >
                        <span className="truncate">{motivo}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#009D4E] dark:text-[#03F77C] stroke-[3] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botones de Acción (Regla PDA: Redondeados en los costados y uno arriba del otro en móvil) */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-hub-border flex flex-col sm:flex-row-reverse items-center justify-end gap-2 shrink-0 bg-white dark:bg-hub-surface">
              <button
                type="button"
                onClick={handleGuardarNuevaExcepcion}
                disabled={nuevoMotivoSeleccionado === encargoAEditar.motivoDevolucion}
                className={`w-full sm:w-auto min-h-[40px] h-10 px-6 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  nuevoMotivoSeleccionado === encargoAEditar.motivoDevolucion
                    ? 'bg-gray-200 dark:bg-hub-elevated text-gray-400 dark:text-hub-text3 cursor-not-allowed border border-gray-300 dark:border-hub-border'
                    : 'bg-[#009D4E] hover:bg-[#008743] active:scale-[0.98] text-white cursor-pointer'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Confirmar cambio</span>
              </button>
              <button
                type="button"
                onClick={() => setEncargoAEditar(null)}
                className="w-full sm:w-auto min-h-[40px] h-10 px-6 rounded-full border border-gray-200 dark:border-hub-border text-xs font-semibold text-gray-600 dark:text-hub-text2 hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          POPUP MODAL: ALERTA ENCARGO DEBE SER ENVIADO A BI (BODEGA DE INDAGACIONES)
         ══════════════════════════════════════════════════════════════════════════════ */}
      {encargoBIAlerta && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface rounded-2xl shadow-2xl border-2 border-purple-400 dark:border-purple-600 max-w-[480px] w-full font-sans transition-all animate-scaleUp flex flex-col max-h-[92dvh] overflow-hidden">
            {/* Cabecera con Icono Destacado */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-purple-100 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 shadow-xs">
                  <ShieldAlert className="w-4 h-4 stroke-[2.3] animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                    BODEGA DE INDAGACIONES (BI)
                  </div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                    ¡Encargo debe ser enviado a BI!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEncargoBIAlerta(null)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-hub-elevated flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con scroll independiente */}
            <div className="p-3.5 sm:p-4 flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar">
              {/* Ficha de Detalles de la OF */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/60 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap font-mono">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                      Nóm. #{getNumeroNomina(encargoBIAlerta)}
                    </span>
                    <span className="text-purple-300 dark:text-purple-700">·</span>
                    <span className="text-xs font-black text-purple-950 dark:text-white bg-purple-100 dark:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-700">
                      OF #{encargoBIAlerta.ordenFlete}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-hub-surface text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shrink-0">
                    {encargoBIAlerta.bultos} {encargoBIAlerta.bultos === 1 ? 'bulto' : 'bultos'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-gray-700 dark:text-hub-text2">
                  <div>
                    <span className="text-gray-500 dark:text-hub-text3">Motivo de excepción: </span>
                    <span className="font-bold text-amber-900 dark:text-amber-300">
                      {encargoBIAlerta.motivoDevolucion}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-500 dark:text-hub-text3">Destinatario: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{encargoBIAlerta.destinatario}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-500 dark:text-hub-text3">Dirección: </span>
                    <span className="text-gray-800 dark:text-hub-text1">{encargoBIAlerta.direccion}</span>
                  </div>
                </div>
              </div>

              {/* Instrucción Logística de Andén */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 flex items-start gap-2.5 text-xs text-purple-950 dark:text-purple-200">
                <AlertTriangle className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0 mt-0.5 stroke-[2.2]" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold text-[11px]">Instrucción obligatoria de andén:</p>
                  <p className="text-[11px] text-purple-900 dark:text-purple-200">
                    Aparta físicamente este bulto en la jaula / andén de <strong>Bodega de Indagaciones (BI)</strong>. No lo reincorpores al flujo general de consolidación.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de Confirmación (Fijo al pie) */}
            <div className="p-3 border-t border-purple-100 dark:border-purple-900/60 bg-white dark:bg-hub-surface shrink-0">
              <button
                type="button"
                onClick={() => setEncargoBIAlerta(null)}
                className="w-full min-h-[40px] h-10 px-6 rounded-full font-bold text-xs bg-purple-700 hover:bg-purple-800 active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Entendido, apartar y derivar a BI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          POPUP 1 DE 2: CONFIRMACIÓN DE RECEPCIÓN, AVISO DE FALTANTES Y CLAVE
         ══════════════════════════════════════════════════════════════════════════════ */}
      {isModalClaveOpen && movilDetectado && (() => {
        const totalAsignados = movilDetectado.totalBultosAsignados ?? 42;
        const totalDevueltosEnRuta = encargosRendicion.length > 0
          ? encargosRendicion.length
          : (movilDetectado.pendientesRendicion ?? 0);
        const cantRendidos = encargosRendicion.filter((e) => e.recepcionado).length;
        const cantFaltantes = encargosRendicion.filter((e) => !e.recepcionado).length;
        const cantEntregados = totalAsignados - totalDevueltosEnRuta;
        const esRendicionConBultos = totalDevueltosEnRuta > 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
            <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-scaleUp">
              {/* Cabecera del Modal */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 dark:border-hub-border flex items-center justify-between gap-2 bg-gray-50/80 dark:bg-hub-base/80 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-[#303030] dark:text-hub-text1 leading-tight truncate">
                    Confirmar recepción de móvil
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalClaveOpen(false)}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-hub-elevated flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido con scroll independiente */}
              <form onSubmit={handleConfirmarClave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar">
                  {/* Banner de Advertencia Integrado si hay bultos sin rendir (extraviados) */}
                  {cantFaltantes > 0 && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 animate-fadeIn">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.2]" />
                      <p className="font-bold text-xs text-amber-900 dark:text-amber-200">
                        Atención: Finalización con {cantFaltantes} {cantFaltantes === 1 ? 'bulto sin rendir' : 'bultos sin rendir'}
                      </p>
                    </div>
                  )}

                  {/* Tarjeta del Conductor y Móvil */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-hub-base border border-gray-200/80 dark:border-hub-border flex flex-col gap-1.5">
                    {/* 1. Conductor asignado */}
                    <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                      {movilDetectado.conductor}
                    </div>

                    {/* 2. Patente y RUT en una misma fila */}
                    <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-gray-200/60 dark:border-hub-border/60">
                      <span className="text-gray-600 dark:text-hub-text2">
                        Patente: <strong className="text-gray-900 dark:text-white font-bold">{movilDetectado.patente}</strong>
                      </span>
                      <span className="text-gray-600 dark:text-hub-text2 text-right">
                        RUT: <strong className="text-gray-900 dark:text-white font-bold">{movilDetectado.rutConductor}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Cuadratura de Ruta (Compacta y Proporcional) */}
                  <div className="bg-gray-50 dark:bg-hub-elevated rounded-xl p-3 border border-gray-200/80 dark:border-hub-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-600 dark:text-hub-text2">
                        Encargos entregados:
                      </span>
                      <span className="text-sm font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                        {cantEntregados}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                      <span className="font-bold text-gray-600 dark:text-hub-text2">
                        Encargos rendidos:
                      </span>
                      <span className={`text-sm font-black font-mono ${cantRendidos > 0 ? 'text-[#009D4E] dark:text-[#03F77C]' : 'text-gray-400'}`}>
                        {cantRendidos}
                      </span>
                    </div>

                    {cantFaltantes > 0 && (
                      <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          Sin rendir (extraviados):
                        </span>
                        <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                          {cantFaltantes}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                      <span className="font-bold text-gray-700 dark:text-hub-text1">
                        Total asignado:
                      </span>
                      <span className="text-sm font-black font-mono text-gray-900 dark:text-white">
                        {totalAsignados}
                      </span>
                    </div>
                  </div>

                  {/* Instrucción e Input de Clave de Tripulante */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#303030] dark:text-hub-text1">
                      {esRendicionConBultos
                        ? `Clave de tripulante (${cantRendidos} encargos rendidos)`
                        : 'Clave de tripulante (RUT sin dígito verificador)'}
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showClave ? 'text' : 'password'}
                        inputMode="numeric"
                        value={claveTripulanteInput}
                        onChange={(e) => {
                          setClaveTripulanteInput(e.target.value.replace(/\D/g, ''));
                          if (errorClave) setErrorClave(null);
                        }}
                        placeholder={`Ej: ${getClaveTripulanteEsperada(movilDetectado.rutConductor)}`}
                        autoFocus
                        className="w-full pl-10 pr-12 py-2.5 bg-gray-50 dark:bg-hub-base border-2 border-gray-200 dark:border-hub-border focus:border-[#009D4E] dark:focus:border-[#03F77C] focus:bg-white dark:focus:bg-hub-surface rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white transition-all outline-none focus:outline-none focus:ring-2 focus:ring-[#009D4E]/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowClave(!showClave)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
                          title={showClave ? 'Ocultar clave' : 'Mostrar clave'}
                        >
                          {showClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Mensaje de Error */}
                    {errorClave && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                        <span>{errorClave}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de Acción del Modal: Regla PDA (Redondeados en los costados y uno arriba del otro en móvil) */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-hub-border flex flex-col sm:flex-row-reverse items-center justify-end gap-2 shrink-0 bg-white dark:bg-hub-surface">
                  <button
                    type="submit"
                    disabled={!claveTripulanteInput}
                    className={`w-full sm:w-auto min-h-[40px] h-10 px-6 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                      claveTripulanteInput
                        ? 'bg-[#009D4E] hover:bg-[#008743] active:scale-[0.98] text-white'
                        : 'bg-gray-200 dark:bg-hub-elevated text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                    <span>
                      {cantRendidos > 0
                        ? `Confirmar ${cantRendidos} encargos rendidos`
                        : cantFaltantes > 0
                        ? `Confirmar con ${cantFaltantes} extraviados`
                        : 'Confirmar recepción'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalClaveOpen(false)}
                    className="w-full sm:w-auto min-h-[40px] h-10 px-6 rounded-full text-xs font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-hub-border transition-all cursor-pointer shrink-0"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════════════
          POPUP MODAL: RENDICIÓN EXITOSA (PEQUEÑA CUADRATURA + IMPRESIÓN AUTOMÁTICA)
         ══════════════════════════════════════════════════════════════════════════════ */}
      {isModalExitoOpen && comprobanteEmitido && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-scaleUp">
            {/* Contenido con scroll independiente */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3.5 custom-scrollbar">
              {/* Cabecera con Ícono de Éxito */}
              <div className="flex flex-col items-center text-center space-y-1.5 pt-1">
                <div className="w-12 h-12 rounded-2xl bg-[#009D4E]/15 dark:bg-[#03F77C]/15 border border-[#009D4E]/30 dark:border-[#03F77C]/30 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#303030] dark:text-white">
                    Rendición exitosa
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium">
                    {comprobanteEmitido.totalExtraviados && comprobanteEmitido.totalExtraviados > 0
                      ? `Móvil #${comprobanteEmitido.numeroMovil} · ${comprobanteEmitido.totalExtraviados} encargos extraviados`
                      : `Móvil #${comprobanteEmitido.numeroMovil} · ${comprobanteEmitido.conductor}`}
                  </p>
                </div>
              </div>

              {/* Cuadratura de Ruta (Compacta) */}
              <div className="bg-gray-50 dark:bg-hub-elevated rounded-xl p-3 border border-gray-200/80 dark:border-hub-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-600 dark:text-hub-text2">
                    Encargos entregados:
                  </span>
                  <span className="text-sm font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                    {comprobanteEmitido.totalEntregados}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                  <span className="font-bold text-gray-600 dark:text-hub-text2">
                    Encargos rendidos:
                  </span>
                  <span className={`text-sm font-black font-mono ${
                    comprobanteEmitido.totalDevoluciones > 0
                      ? 'text-[#009D4E] dark:text-[#03F77C]'
                      : 'text-gray-400'
                  }`}>
                    {comprobanteEmitido.totalDevoluciones}
                  </span>
                </div>

                {Boolean(comprobanteEmitido.totalBI && comprobanteEmitido.totalBI > 0) && (
                  <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                    <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
                      Derivados a BI (Bodega):
                    </span>
                    <span className="text-sm font-black font-mono text-purple-700 dark:text-purple-400">
                      {comprobanteEmitido.totalBI}
                    </span>
                  </div>
                )}

                {Boolean(comprobanteEmitido.totalExtraviados && comprobanteEmitido.totalExtraviados > 0) && (
                  <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      Sin rendir (extraviados):
                    </span>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {comprobanteEmitido.totalExtraviados}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-1.5">
                  <span className="font-bold text-gray-700 dark:text-hub-text1">
                    Total asignado:
                  </span>
                  <span className="text-sm font-black font-mono text-gray-900 dark:text-white">
                    {comprobanteEmitido.totalBultosAsignados}
                  </span>
                </div>
              </div>

              {/* Aviso de Impresión Automática */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-hub-surface text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60">
                  <Printer className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate">
                    Comprobante impreso automáticamente
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                    N° Folio: {comprobanteEmitido.folio}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón de Aceptar / Siguiente Móvil (Fijo al pie) */}
            <div className="p-3 border-t border-gray-100 dark:border-hub-border shrink-0 bg-white dark:bg-hub-surface">
              <button
                type="button"
                onClick={handleCerrarModalExito}
                className="w-full min-h-[40px] h-10 px-6 rounded-full bg-[#009D4E] hover:bg-[#008743] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>Aceptar y rendir siguiente móvil</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
