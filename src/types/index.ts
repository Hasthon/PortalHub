export type DeviceMode = 'desktop' | 'pda';

export type EncargoStatus = 'INGRESO' | 'EN_TRANSITO' | 'CLASIFICADO' | 'DESPACHADO' | 'RETENIDO';

export interface Encargo {
  id: string;
  trackingCode: string;
  cliente: string;
  destino: string;
  pesoKg: number;
  piezas: number;
  status: EncargoStatus;
  scannedAt: string;
  scannedBy: string;
  observacion?: string;
}

export type ScanStatusType = 'IDLE' | 'SUCCESS' | 'ERROR' | 'DUPLICATE' | 'WARNING';

export interface ScanResult {
  status: ScanStatusType;
  message: string;
  codeScanned: string;
  timestamp: string;
  encargo?: Encargo;
}

export interface ShiftStats {
  totalScanned: number;
  successful: number;
  errors: number;
  duplicates: number;
  lastScanTime?: string;
}

// --- TIPOS PARA EL MÓDULO DE ENCASILLADO ---

export type PasilloType = 'AZUL' | 'ROJO' | 'VERDE';

export interface UbicacionEncasillado {
  id: string;
  codeQr: string;
  nombreEstacion: string;
  pasilloPredeterminado: PasilloType;
  rampaAsociada: string;
  zonaDestino: string;
}

export interface EncargoEncasillado {
  id: string;
  codigoEncargo: string;
  pasilloAsignado: PasilloType;
  rampaLigada: string;
  horaEscaneo: string;
  cliente?: string;
  destino?: string;
  codigoBarras26?: string;
  codigoOF9?: string;
}

// --- TIPOS PARA EL MÓDULO DE NOMINACIÓN Y DESPACHO ---

export type TipoCargaNominada = 'CONTENEDORA' | 'UTC' | 'SUELTO';

export interface EncargoNominado {
  id: string;
  codigoEncargo: string;
  tipoCarga: TipoCargaNominada;
  horaEscaneo: string;
  codigoContenedor?: string;
  cantidadContenedores?: number;
  cantidadEncargos?: number;
  codigoBarras26?: string;
  codigoOF9?: string;
}

export type ActiveModule = 'home' | 'encasillado' | 'escaneo' | 'inventario' | 'despachos' | 'reportes' | 'nominacion' | 'configuracion' | 'recepcion';

// --- TIPOS PARA EL MÓDULO DE RECEPCIÓN ---

export type TipoContenedor = 'ENCARGO' | 'BINS' | 'VALIJA' | 'PALLET' | 'JAULA';

export type EstadoNomina = 'EN_TRANSITO' | 'TERMINAL' | 'DESPACHADA' | 'EMITIDA';

export type EstadoEncargo =
  | 'NORMAL'
  | 'DEVOLUCION'
  | 'REDIMENSIONADA'
  | 'FALTA_REDIMENSIONAR';

export type PrioridadSemaforo = 'P1_ATRASADO' | 'P2_A_TIEMPO' | 'P3_ADELANTADO';

export type ModoRecepcion = 'CON_INTEGRIDAD' | 'SIN_INTEGRIDAD';

export interface EncargoRecepcion {
  id: string;
  codigoOF: string;
  codigoBarras: string;
  estado: EstadoEncargo;
  prioridad?: PrioridadSemaforo;
  esUltimaMilla: boolean;
  recepcionado: boolean;
  recepcionadoAt?: string;
  nominaId: string;
}

export interface NominaContenedora {
  id: string;
  codigo: string;
  tipo: TipoContenedor;
  estado: EstadoNomina;
  totalEncargos: number;
  encargosRecepcionados: number;
  encargos: EncargoRecepcion[];
  scannedAt: string;
}

export interface RecepcionSession {
  ubicacionCodigo: string;
  ubicacionNombre: string;
  modoRecepcion: ModoRecepcion;
  nominasActivas: NominaContenedora[];
}

export interface TrazabilidadEvento {
  id: string;
  ubicacion: string;
  of: string;
  fecha: string;
  evento: string;
  usuario: string;
  detalle: string;
}
