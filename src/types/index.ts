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
}

export type ActiveModule = 'home' | 'encasillado' | 'escaneo' | 'inventario' | 'despachos' | 'reportes' | 'nominacion' | 'configuracion';
