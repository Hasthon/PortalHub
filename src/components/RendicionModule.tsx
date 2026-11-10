import React, { useState, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
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
  ShieldCheck,
  Check,
  KeyRound,
  Printer,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Barcode,
  Clock,
  ScanLine,
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
  totalExtraviados?: number;
  operadorReceptor: string;
  hubReceptor: string;
  codigoSeguridad: string;
}

export interface EncargoRendicion {
  id: string;
  ordenFlete: string;
  destinatario: string;
  direccion: string;
  bultos: number;
  motivoDevolucion: string;
  recepcionado: boolean;
  horaRecepcion?: string;
}

const GENERAR_ENCARGOS_MOCK = (cantidad: number = 5, numeroMovil: string = '50310'): EncargoRendicion[] => {
  const motivos = [
    'Cliente ausente (2da visita)',
    'Dirección no existe / incompleta',
    'Rechazado por destinatario',
    'Local o empresa cerrada',
    'Cliente sin medio de pago',
    'Mercadería con daño en embalaje',
  ];

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
    const dest = destinatarios[i % destinatarios.length];
    const motivo = motivos[i % motivos.length];
    return {
      id: `ENC-${i + 1}`,
      ordenFlete: ofNum,
      destinatario: dest.nombre,
      direccion: dest.dir,
      bultos: 1,
      motivoDevolucion: motivo,
      recepcionado: false,
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

  // Modales: Clave de Tripulante, Doble Confirmación de Faltantes y Popup de Rendición Exitosa
  const [isModalClaveOpen, setIsModalClaveOpen] = useState(false);
  const [isModalFaltantesConfirmOpen, setIsModalFaltantesConfirmOpen] = useState(false);
  const [isModalExitoOpen, setIsModalExitoOpen] = useState(false);
  const [claveTripulanteInput, setClaveTripulanteInput] = useState('');
  const [showClave, setShowClave] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobanteRendicion | null>(null);

  // Lista de encargos a rendir en andén y control de escaneo
  const [encargosRendicion, setEncargosRendicion] = useState<EncargoRendicion[]>([]);
  const [codigoEscaneoInput, setCodigoEscaneoInput] = useState<string>('');

  // Helper: Clave de tripulante esperada (RUT sin puntos, guiones ni dígito verificador)
  const getClaveTripulanteEsperada = (rut?: string): string => {
    if (!rut) return '15340829';
    const clean = rut.replace(/[^0-9kK]/g, '');
    return clean.slice(0, -1);
  };

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
    setCodigoEscaneoInput('');
    playSuccessSound();
    setEtapaRendicion('RENDICION_EN_CURSO');
  };

  // Cambiar estado de encargo: De pendiente (disabled) a recepcionado (activo en verde)
  const handleToggleRecepcionarEncargo = (id: string) => {
    setEncargosRendicion((prev) =>
      prev.map((enc) => {
        if (enc.id === id) {
          const nuevoEstado = !enc.recepcionado;
          if (nuevoEstado) {
            playSuccessSound();
            const now = new Date();
            const hora = now.toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return { ...enc, recepcionado: true, horaRecepcion: `${hora} hrs` };
          } else {
            playWarningSound();
            return { ...enc, recepcionado: false, horaRecepcion: undefined };
          }
        }
        return enc;
      })
    );
  };

  // Procesar escaneo por pistola / input
  const handleProcesarEscaneo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = codigoEscaneoInput.trim();
    if (!cleanCode) return;

    const target = encargosRendicion.find(
      (enc) =>
        enc.ordenFlete === cleanCode ||
        enc.ordenFlete.endsWith(cleanCode) ||
        enc.id.toLowerCase() === cleanCode.toLowerCase() ||
        enc.id.replace(/\D/g, '') === cleanCode
    );

    if (target) {
      if (!target.recepcionado) {
        handleToggleRecepcionarEncargo(target.id);
      } else {
        playWarningSound();
      }
      setCodigoEscaneoInput('');
    } else {
      // Si el código no coincide exactamente con una OF, recepcionar el primer pendiente disponible
      const primerPendiente = encargosRendicion.find((enc) => !enc.recepcionado);
      if (primerPendiente) {
        handleToggleRecepcionarEncargo(primerPendiente.id);
        setCodigoEscaneoInput('');
      } else {
        playErrorSound();
      }
    }
  };

  // Abrir Modal de Confirmación y Clave de Tripulante
  // Manejador del Botón Finalizar: verifica si hay faltantes
  const handleClicFinalizar = () => {
    if (!tipoMovilSeleccionado || !movilDetectado || numeroMovilInput.length !== 5) {
      playWarningSound();
      return;
    }

    const cantFaltantes = encargosRendicion.filter((e) => !e.recepcionado).length;
    if (cantFaltantes > 0) {
      playWarningSound();
      setIsModalFaltantesConfirmOpen(true);
    } else {
      setErrorClave(null);
      setClaveTripulanteInput('');
      setShowClave(false);
      setIsModalClaveOpen(true);
    }
  };

  const handleConfirmarFaltantesYContinuar = () => {
    setIsModalFaltantesConfirmOpen(false);
    setErrorClave(null);
    setClaveTripulanteInput('');
    setShowClave(false);
    setIsModalClaveOpen(true);
  };

  // Confirmar Clave y Emitir Comprobante Oficial
  const handleConfirmarClave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!movilDetectado) return;

    const claveEsperada = getClaveTripulanteEsperada(movilDetectado.rutConductor);
    const claveIngresada = claveTripulanteInput.trim();

    if (claveIngresada !== claveEsperada) {
      setErrorClave(`Clave incorrecta. Debe ingresar el número de RUT del transportista sin dígito verificador (${claveEsperada}).`);
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
    setCodigoEscaneoInput('');
    setIsModalClaveOpen(false);
    setIsModalFaltantesConfirmOpen(false);
    setIsModalExitoOpen(false);
    setEtapaRendicion('SELECCION_MOVIL');
  };

  const tipoActualInfo = TIPOS_MOVIL.find((t) => t.id === tipoMovilSeleccionado);

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-y-auto ${isPda ? 'p-2 space-y-3' : 'p-3 sm:p-5 lg:p-6'} w-full animate-fadeIn font-sans bg-[#FAFDFC] dark:bg-hub-base select-none`}>
      
      {/* ══════════════════════════════════════════════════════════════════════════════
          ENCABEZADO UNIFICADO: ESTADO Y DATOS DEL MÓVIL (UN SOLO TÍTULO)
         ══════════════════════════════════════════════════════════════════════════════ */}
      {etapaRendicion === 'SELECCION_MOVIL' ? (
        <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#009D4E]/15 dark:bg-[#03F77C]/15 border border-[#009D4E]/30 dark:border-[#03F77C]/30 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              {tipoMovilSeleccionado && (
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-hub-text2 bg-gray-100 dark:bg-hub-elevated px-2 py-0.5 rounded-md border border-gray-200 dark:border-hub-border">
                    Tipo: {tipoActualInfo?.nombre}
                  </span>
                </div>
              )}
              <h2 className="text-lg sm:text-xl font-black text-[#303030] dark:text-hub-text1 font-sans tracking-tight leading-tight truncate">
                Rendición de móviles: selección de ruta
              </h2>
              <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium leading-relaxed truncate">
                Selecciona el tipo de vehículo e ingresa el número de móvil para procesar la rendición.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {tipoMovilSeleccionado && (
              <button
                type="button"
                onClick={handleReiniciarSeleccion}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-hub-border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Cambiar móvil o reiniciar selección"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Encabezado Unificado para Rendición en Curso (Combina título + ficha de móvil en una sola cabecera) */
        <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#009D4E] text-white dark:bg-[#03F77C] dark:text-[#1E1E1E] flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#009D4E] dark:text-[#03F77C] border border-emerald-200 dark:border-emerald-800">
                  {tipoActualInfo?.nombre}
                </span>
                <span className="text-xs font-mono font-bold text-gray-400 dark:text-hub-text3">
                  RUT: {movilDetectado?.rutConductor}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#303030] dark:text-hub-text1 font-sans tracking-tight leading-tight truncate">
                Rendición de móvil {movilDetectado?.patente || 'S/P'} · {movilDetectado?.conductor}
              </h2>
            </div>
          </div>

          {/* Métricas del Móvil y Botón de Acción */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gray-50 dark:bg-hub-base border border-gray-200 dark:border-hub-border text-center min-w-[75px] sm:min-w-[85px]">
                <span className="text-[10px] text-gray-400 block font-sans">Total bultos</span>
                <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  {movilDetectado?.totalBultosAsignados}
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center min-w-[75px] sm:min-w-[85px]">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-sans">Entregados</span>
                <span className="text-sm sm:text-base font-black text-[#009D4E] dark:text-[#03F77C]">
                  {movilDetectado?.entregados}
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center min-w-[75px] sm:min-w-[85px]">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-sans">A rendir</span>
                <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                  {encargosRendicion.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          COMPONENTE 2 (INFERIOR): FUNCIONALIDADES DEL PROCESO DE RENDICIÓN
          (Debajo otro componente con las funcionalidades: selección de tipo e ingreso de N°)
         ══════════════════════════════════════════════════════════════════════════════ */}
      {etapaRendicion === 'SELECCION_MOVIL' ? (
        <div className="flex-1 bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6">
          
          {/* ── SECCIÓN 1: SELECCIONAR TIPO DE MÓVIL ────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] text-xs font-black flex items-center justify-center font-mono">
                  1
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-[#303030] dark:text-hub-text1">
                  1. Tipo de vehículo
                </h3>
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-hub-text3">
                {tipoMovilSeleccionado ? 'Tipo seleccionado' : 'Requerido'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {TIPOS_MOVIL.map((tipo) => {
                const IconComponent = tipo.icon;
                const isSelected = tipoMovilSeleccionado === tipo.id;

                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => handleSeleccionarTipo(tipo.id)}
                    className={`relative p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEFBF4] dark:bg-[#03F77C]/15 border-[#009D4E] dark:border-[#03F77C] ring-2 ring-[#009D4E]/30 dark:ring-[#03F77C]/30 shadow-xs'
                        : 'bg-gray-50/70 dark:bg-hub-elevated/50 hover:bg-gray-100/80 dark:hover:bg-hub-elevated border-gray-200 dark:border-hub-border hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Fila Superior: Ícono + Título + Check */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] shadow-2xs'
                              : 'bg-white dark:bg-hub-surface text-gray-600 dark:text-hub-text2 border border-gray-200 dark:border-hub-border group-hover:text-[#009D4E] dark:group-hover:text-[#03F77C]'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                        </div>
                        <h4
                          className={`text-xs sm:text-sm font-extrabold leading-tight truncate ${
                            isSelected
                              ? 'text-[#009D4E] dark:text-[#03F77C]'
                              : 'text-[#303030] dark:text-hub-text1'
                          }`}
                        >
                          {tipo.nombre}
                        </h4>
                      </div>

                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-slate-600 group-hover:border-[#009D4E] shrink-0" />
                      )}
                    </div>

                    {/* Subtítulo / Descripción corta */}
                    <p className="text-[10px] text-gray-500 dark:text-hub-text2 leading-tight truncate mt-1">
                      {tipo.subtitulo}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SECCIÓN 2: INGRESAR N° DE MÓVIL ─────────────────────────────── */}
          <div className={`space-y-4 pt-2 transition-opacity duration-300 ${!tipoMovilSeleccionado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] text-xs font-black flex items-center justify-center font-mono">
                  2
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-[#303030] dark:text-hub-text1">
                  2. Ingresar número de móvil
                </h3>
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-hub-text3">
                {tipoMovilSeleccionado ? `Ingrese el N° de ${tipoActualInfo?.nombre}` : 'Primero elija tipo de móvil'}
              </span>
            </div>

            {/* Input Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7 space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-hub-text3">
                    <Hash className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    value={numeroMovilInput}
                    onChange={handleNumeroMovilChange}
                    placeholder="Ingrese los 5 dígitos del móvil (ej: 00204)"
                    disabled={!tipoMovilSeleccionado}
                    className="w-full pl-11 pr-32 py-3.5 bg-gray-50/80 dark:bg-hub-base border-2 border-gray-200 dark:border-hub-border focus:border-[#009D4E] dark:focus:border-[#03F77C] focus:bg-white dark:focus:bg-hub-surface rounded-xl text-base font-mono font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-all outline-hidden shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                    {/* Contador de Dígitos */}
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all ${
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
                        className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white px-1 cursor-pointer"
                        title="Borrar número"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta de Validación / Detección del Móvil (Solo visible cuando está completamente ingresado) */}
              <div className="lg:col-span-5">
                {movilDetectado ? (
                  <div className={`p-4 rounded-xl border space-y-3 animate-fadeIn ${
                    (movilDetectado.pendientesRendicion ?? 0) > 0
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          (movilDetectado.pendientesRendicion ?? 0) > 0
                            ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-black'
                            : 'bg-[#009D4E] text-white dark:bg-[#03F77C] dark:text-[#1E1E1E]'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className={`text-[10px] font-mono font-black uppercase ${
                            (movilDetectado.pendientesRendicion ?? 0) > 0
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {(movilDetectado.pendientesRendicion ?? 0) > 0
                              ? 'Móvil con bultos para rendir'
                              : 'Móvil identificado · 100% entregado'}
                          </span>
                          <h5 className="text-sm font-black text-gray-900 dark:text-white">
                            Móvil #{movilDetectado.numeroMovil} · {movilDetectado.patente}
                          </h5>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        (movilDetectado.pendientesRendicion ?? 0) > 0
                          ? 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                      }`}>
                        {(movilDetectado.pendientesRendicion ?? 0) > 0 ? 'Con bultos' : 'Sin devolución'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/70 dark:border-hub-border">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-hub-text3 block">Conductor</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                          {movilDetectado.conductor}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-hub-text3 block">RUT</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200 truncate block">
                          {movilDetectado.rutConductor}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-hub-text3 block">Bultos asignados</span>
                        <span className="font-mono font-bold text-[#009D4E] dark:text-[#03F77C]">
                          {movilDetectado.totalBultosAsignados} bultos
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-hub-text3 block">A rendir (pendientes)</span>
                        <span className={`font-mono font-bold ${
                          (movilDetectado.pendientesRendicion ?? 0) > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#009D4E] dark:text-[#03F77C]'
                        }`}>
                          {movilDetectado.pendientesRendicion} bultos
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-hub-border text-center text-gray-400 dark:text-hub-text3 flex flex-col items-center justify-center min-h-[160px] bg-gray-50/50 dark:bg-hub-base/50">
                    <Search className="w-6 h-6 mb-1.5 opacity-40 text-gray-400" />
                    <h5 className="text-xs font-bold text-gray-700 dark:text-hub-text1 mb-1">
                      {tipoMovilSeleccionado
                        ? numeroMovilInput.length > 0
                          ? `Ingresando móvil (${numeroMovilInput.length}/5 dígitos)`
                          : 'Esperando N° de móvil'
                        : 'Seleccione un tipo de móvil'}
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-hub-text3 max-w-xs leading-relaxed">
                      {tipoMovilSeleccionado
                        ? numeroMovilInput.length > 0
                          ? `Faltan ${5 - numeroMovilInput.length} ${5 - numeroMovilInput.length === 1 ? 'dígito' : 'dígitos'} para completar los 5 dígitos y cargar la información en el panel lateral.`
                          : 'Ingrese los 5 dígitos del número de móvil (ej: 50204 para rendir con bultos, o 00204 sin encargos).'
                        : 'Elija el tipo de vehículo arriba para habilitar el ingreso del móvil.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTONES DE ACCIÓN PRINCIPAL ─────────────────────────────────────── */}
          <div className="pt-4 border-t border-gray-100 dark:border-hub-border flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
            <div className="text-xs text-gray-500 dark:text-hub-text3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#009D4E] dark:text-[#03F77C]" />
              <span>
                {numeroMovilInput.startsWith('5') && numeroMovilInput.length === 5
                  ? 'Móvil con devolución detectado: habilita comenzar rendición de bultos'
                  : 'Móvil sin devoluciones: confirme recepción sin encargos para emitir comprobante'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {/* Botón Flujo 1: Terminar sin encargos para devolución (para móviles que NO empiezan con 5) */}
              <button
                type="button"
                onClick={handleClicFinalizar}
                disabled={!tipoMovilSeleccionado || !movilDetectado || numeroMovilInput.length !== 5 || numeroMovilInput.startsWith('5')}
                className={`w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  tipoMovilSeleccionado && movilDetectado && numeroMovilInput.length === 5 && !numeroMovilInput.startsWith('5')
                    ? 'text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white bg-white dark:bg-hub-surface hover:bg-gray-100/80 dark:hover:bg-hub-elevated border-gray-300 dark:border-hub-border shadow-xs active:scale-[0.98]'
                    : 'text-gray-400 dark:text-hub-text3 bg-transparent border-transparent cursor-not-allowed opacity-35'
                }`}
                title={
                  numeroMovilInput.startsWith('5')
                    ? 'Este móvil registra bultos para rendición (N° empieza con 5)'
                    : 'Confirmar recepción sin devoluciones validando clave de tripulante'
                }
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                <span>Terminar sin encargos para devolución</span>
              </button>

              {/* Botón Flujo 2: Comenzar Rendición de Bultos (para móviles que SÍ empiezan con 5) */}
              <button
                type="button"
                onClick={handleIniciarRendicion}
                disabled={!tipoMovilSeleccionado || !movilDetectado || numeroMovilInput.length !== 5 || !numeroMovilInput.startsWith('5')}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                  tipoMovilSeleccionado && movilDetectado && numeroMovilInput.length === 5 && numeroMovilInput.startsWith('5')
                    ? 'bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-hub-elevated text-gray-400 dark:text-hub-text3 cursor-not-allowed shadow-none opacity-40'
                }`}
                title={
                  !numeroMovilInput.startsWith('5') && numeroMovilInput.length === 5
                    ? 'Este móvil no tiene bultos pendientes (ingrese N° que empiece con 5 para rendición)'
                    : 'Comenzar escaneo y rendición de bultos del móvil'
                }
              >
                <span>Comenzar rendición de bultos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
          const porcentaje = totalEnc > 0 ? Math.round((recepcionadosCant / totalEnc) * 100) : 0;
          const todosListos = totalEnc > 0 && recepcionadosCant === totalEnc;

          return (
            <div className="flex-1 bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-4 sm:gap-5 animate-fadeIn">
              {/* Barra de Progreso y Escaneo con Pistola */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-hub-surface border border-gray-200/90 dark:border-hub-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
                {/* Input Escáner / Código de Barra */}
                <form onSubmit={handleProcesarEscaneo} className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={codigoEscaneoInput}
                      onChange={(e) => setCodigoEscaneoInput(e.target.value)}
                      placeholder="Escanear orden de flete o haz clic directo en cada encargo..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-hub-border bg-gray-50/70 dark:bg-hub-base text-xs font-mono font-medium focus:outline-none focus:border-[#009D4E] focus:ring-1 focus:ring-[#009D4E] dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#303030] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <ScanLine className="w-4 h-4 text-[#03F77C]" />
                    <span>Escanear</span>
                  </button>
                </form>

                {/* Progreso de Recepción */}
                <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <div className="text-xs font-mono font-bold text-gray-800 dark:text-white">
                      <span className="text-[#009D4E] dark:text-[#03F77C]">{recepcionadosCant}</span> de {totalEnc} rendidos
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans">
                      {todosListos ? '✓ Todos validados en andén' : `${totalEnc - recepcionadosCant} pendientes de escanear`}
                    </div>
                  </div>

                  <div className="w-24 sm:w-28 bg-gray-200 dark:bg-hub-base h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#009D4E] dark:bg-[#03F77C] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Lista de Encargos para Devolución */}
              <div className="space-y-2 flex-1 overflow-y-auto overflow-x-hidden p-1 sm:p-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-hub-text3 px-1 mb-1">
                  <span>Encargos en ruta para rendición ({totalEnc})</span>
                  <span className="font-normal text-[11px] text-gray-400 hidden sm:inline">
                    Pincha un encargo para marcarlo como rendido
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {encargosRendicion.map((enc) => {
                    const isRecepcionado = enc.recepcionado;
                    return (
                      <div
                        key={enc.id}
                        onClick={() => handleToggleRecepcionarEncargo(enc.id)}
                        className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                          isRecepcionado
                            ? 'bg-[#F0FDF4] dark:bg-emerald-950/30 border-[#009D4E] dark:border-[#03F77C] shadow-xs'
                            : 'bg-gray-50/70 dark:bg-hub-base/60 border-gray-200 dark:border-hub-border opacity-65 hover:opacity-100 hover:border-[#009D4E]/50 hover:bg-emerald-50/20'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Checkbox y Datos de la OF */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Indicador visual tipo Checkbox */}
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                isRecepcionado
                                  ? 'bg-[#009D4E] dark:bg-[#03F77C] text-white dark:text-[#1E1E1E] shadow-2xs'
                                  : 'border-2 border-dashed border-gray-300 dark:border-hub-border bg-white dark:bg-hub-surface text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>

                            {/* Información del Encargo */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-sm text-[#303030] dark:text-white">
                                  OF #{enc.ordenFlete}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200/80 dark:bg-hub-surface text-gray-700 dark:text-hub-text2">
                                  {enc.bultos} {enc.bultos === 1 ? 'bulto' : 'bultos'}
                                </span>
                                {/* Motivo de devolución */}
                                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                                  {enc.motivoDevolucion}
                                </span>
                              </div>

                              <div className="text-xs text-gray-600 dark:text-hub-text2 mt-1 truncate">
                                <span className="font-bold text-gray-800 dark:text-gray-200">{enc.destinatario}</span>
                                <span className="text-gray-400 dark:text-hub-text3 mx-1.5">·</span>
                                <span className="text-gray-500 dark:text-hub-text3">{enc.direccion}</span>
                              </div>
                            </div>
                          </div>

                          {/* Estado: Pendiente vs Recepcionado */}
                          <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60 dark:border-hub-border">
                            {isRecepcionado ? (
                              <>
                                <span className="px-2.5 py-1 rounded-full bg-[#009D4E] text-white text-[11px] font-bold font-sans flex items-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Rendido</span>
                                </span>
                                {enc.horaRecepcion && (
                                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    {enc.horaRecepcion}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="px-2.5 py-1 rounded-full bg-gray-200/80 dark:bg-hub-surface text-gray-500 dark:text-hub-text3 text-[11px] font-medium font-sans flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Pendiente de escaneo</span>
                                </span>
                                <span className="text-[10px] text-gray-400 font-sans">
                                  Pinchar para recibir
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie de Acciones: Botón Finalizar activo siempre */}
              <div className="pt-3 border-t border-gray-200/80 dark:border-hub-border flex items-center justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={handleClicFinalizar}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white shadow-sm"
                  title={
                    todosListos
                      ? 'Todos los bultos han sido recepcionados. Proceder a validar clave de tripulante.'
                      : `Finalizar rendición con ${totalEnc - recepcionadosCant} bultos sin rendir (extraviados).`
                  }
                >
                  <CheckCircle2 className="w-4 h-4 text-[#03F77C]" />
                  <span>Finalizar</span>
                </button>
              </div>
            </div>
          );
        })()
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          MODAL: DOBLE CONFIRMACIÓN AL FINALIZAR CON FALTANTES / EXTRAVIADOS
         ══════════════════════════════════════════════════════════════════════════════ */}
      {isModalFaltantesConfirmOpen && movilDetectado && (() => {
        const cantRecepcionados = encargosRendicion.filter((e) => e.recepcionado).length;
        const cantFaltantes = encargosRendicion.filter((e) => !e.recepcionado).length;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-hub-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-hub-border max-w-[500px] w-full font-sans transition-all animate-scaleUp">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-2xs">
                <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
              </div>

              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-hub-text1 text-center mb-2">
                ¿Estás seguro de finalizar?
              </h3>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-hub-text2 text-center mb-5 leading-relaxed">
                Existen <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold">{cantFaltantes}</strong> {cantFaltantes === 1 ? 'bulto sin rendir' : 'bultos sin rendir'} y el estado de {cantFaltantes === 1 ? 'este encargo quedará como extraviado' : 'estos encargos quedará como extraviados'}.
              </p>

              {/* Resumen de Cuadratura con Faltantes */}
              <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                    Encargos rendidos:
                  </span>
                  <span className="text-base font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                    {cantRecepcionados}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                  <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                    Sin rendir (extraviados):
                  </span>
                  <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                    {cantFaltantes}
                  </span>
                </div>
              </div>

              {/* Botones de Doble Confirmación */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalFaltantesConfirmOpen(false)}
                  className="w-full sm:flex-1 py-3 sm:py-3.5 px-4 rounded-2xl border-2 border-gray-300 dark:border-hub-border hover:bg-gray-100 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text1 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
                >
                  No, volver a escanear
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarFaltantesYContinuar}
                  className="w-full sm:flex-1 py-3 sm:py-3.5 px-4 rounded-2xl bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] dark:hover:bg-[#02D66B] dark:text-[#303030] font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-md cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#03F77C] dark:text-[#303030]" />
                  <span>Sí, confirmo</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════════════
          MODAL: CONFIRMACIÓN DE RECEPCIÓN Y CLAVE DE TRIPULANTE (RUT SIN DV)
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
              {/* Cabecera del Modal */}
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-hub-border flex items-center justify-between bg-gray-50/70 dark:bg-hub-base/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#303030] dark:text-hub-text1 leading-tight">
                      Confirmar recepción de móvil
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-hub-text2">
                      {cantFaltantes > 0
                        ? `Cierre con ${cantRendidos} encargos rendidos y ${cantFaltantes} sin rendir (extraviados)`
                        : esRendicionConBultos
                        ? `Cierre con rendición de ${cantRendidos} encargos devueltos en andén`
                        : 'Cierre de ruta sin encargos para devolución'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalClaveOpen(false)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-hub-elevated flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <form onSubmit={handleConfirmarClave} className="p-4 sm:p-6 space-y-4">
                {/* Tarjeta del Conductor y Móvil */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-hub-base border border-gray-200/80 dark:border-hub-border flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black uppercase text-[#009D4E] dark:text-[#03F77C]">
                        {tipoActualInfo?.nombre} #{movilDetectado.numeroMovil}
                      </span>
                      <span className="text-gray-300 dark:text-hub-border">·</span>
                      <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-hub-text3">
                        Patente: {movilDetectado.patente}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                      {movilDetectado.conductor}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 dark:text-hub-text3 block font-mono uppercase">
                      RUT conductor
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                      {movilDetectado.rutConductor}
                    </span>
                  </div>
                </div>

                {/* Cuadratura de Ruta (Estilo Popup Recepción Finalizada) */}
                <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                      Encargos entregados:
                    </span>
                    <span className="text-base font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                      {cantEntregados}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                    <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                      Encargos rendidos:
                    </span>
                    <span className={`text-base font-black font-mono ${cantRendidos > 0 ? 'text-[#009D4E] dark:text-[#03F77C]' : 'text-gray-400'}`}>
                      {cantRendidos}
                    </span>
                  </div>

                  {cantFaltantes > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                      <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                        Sin rendir (extraviados):
                      </span>
                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                        {cantFaltantes}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                    <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                      Total asignado:
                    </span>
                    <span className="text-base font-black font-mono text-gray-900 dark:text-white">
                      {totalAsignados}
                    </span>
                  </div>
                </div>

                {/* Instrucción e Input de Clave de Tripulante */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#303030] dark:text-hub-text1">
                    {esRendicionConBultos
                      ? `Clave de tripulante (${cantRendidos} encargos rendidos)`
                      : 'Clave de tripulante (RUT sin dígito verificador)'}
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-hub-text2 leading-tight">
                    {esRendicionConBultos
                      ? `Ingrese el RUT sin dígito verificador para confirmar los ${cantRendidos} encargos rendidos.`
                      : 'Ingrese el RUT sin dígito verificador.'}
                  </p>

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
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-hub-base border-2 border-gray-200 dark:border-hub-border focus:border-[#009D4E] dark:focus:border-[#03F77C] focus:bg-white dark:focus:bg-hub-surface rounded-xl text-base font-mono font-bold text-gray-900 dark:text-white transition-all outline-hidden"
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
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                      <span>{errorClave}</span>
                    </div>
                  )}
                </div>

                {/* Botones de Acción del Modal */}
                <div className="pt-3 border-t border-gray-100 dark:border-hub-border flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalClaveOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-hub-elevated hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!claveTripulanteInput}
                    className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                      claveTripulanteInput
                        ? 'bg-[#303030] hover:bg-black text-white active:scale-95'
                        : 'bg-gray-200 dark:bg-hub-elevated text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#03F77C]" />
                    <span>
                      {cantRendidos > 0
                        ? `Confirmar ${cantRendidos} encargos rendidos`
                        : cantFaltantes > 0
                        ? `Confirmar rendición con ${cantFaltantes} extraviados`
                        : 'Confirmar recepción y emitir comprobante'}
                    </span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp p-5 sm:p-6 space-y-4">
            
            {/* Cabecera con Ícono de Éxito */}
            <div className="flex flex-col items-center text-center space-y-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-[#009D4E]/15 dark:bg-[#03F77C]/15 border border-[#009D4E]/30 dark:border-[#03F77C]/30 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#303030] dark:text-white">
                  Rendición exitosa
                </h3>
                <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium">
                  {comprobanteEmitido.totalExtraviados && comprobanteEmitido.totalExtraviados > 0
                    ? `Móvil #${comprobanteEmitido.numeroMovil} · ${comprobanteEmitido.totalExtraviados} encargos extraviados`
                    : `Móvil #${comprobanteEmitido.numeroMovil} · ${comprobanteEmitido.conductor}`}
                </p>
              </div>
            </div>

            {/* Cuadratura de Ruta (Estilo Popup Recepción Finalizada) */}
            <div className="bg-gray-50 dark:bg-hub-elevated rounded-2xl p-4 border border-gray-200/80 dark:border-hub-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Encargos entregados:
                </span>
                <span className="text-base font-black font-mono text-[#009D4E] dark:text-[#03F77C]">
                  {comprobanteEmitido.totalEntregados}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Encargos rendidos:
                </span>
                <span className={`text-base font-black font-mono ${
                  comprobanteEmitido.totalDevoluciones > 0
                    ? 'text-[#009D4E] dark:text-[#03F77C]'
                    : 'text-gray-400'
                }`}>
                  {comprobanteEmitido.totalDevoluciones}
                </span>
              </div>

              {Boolean(comprobanteEmitido.totalExtraviados && comprobanteEmitido.totalExtraviados > 0) && (
                <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                  <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                    Sin rendir (extraviados):
                  </span>
                  <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                    {comprobanteEmitido.totalExtraviados}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-200/60 dark:border-hub-border/60 pt-2.5">
                <span className="text-xs font-bold text-gray-600 dark:text-hub-text2">
                  Total asignado:
                </span>
                <span className="text-base font-black font-mono text-gray-900 dark:text-white">
                  {comprobanteEmitido.totalBultosAsignados}
                </span>
              </div>
            </div>

            {/* Aviso de Impresión Automática */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-hub-surface text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate">
                  Comprobante impreso automáticamente
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block truncate">
                  Folio: {comprobanteEmitido.folio} · Listo para entrega
                </span>
              </div>
            </div>

            {/* Botón de Aceptar / Siguiente Móvil */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCerrarModalExito}
                className="w-full py-3 rounded-xl bg-[#303030] hover:bg-black text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>Aceptar y rendir siguiente móvil</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
