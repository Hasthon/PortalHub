import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAudioFeedback } from '../hooks/useAudioFeedback';

export interface SolicitudAutorizacion {
  id: string; // ej. 'AUT-8921'
  usuario: string; // ej. 'Carlos Mendoza'
  usuarioId: string; // ej. 'OP-4921'
  tipoBloqueo: 'Recepción con faltantes' | 'Encasillado con faltantes';
  descripcionDetalle: string; // ej. '3 de 5 bultos leídos (2 faltantes en guía)'
  ubicacion: string; // ej. 'Rampa 04 - Sector Retail'
  fechaHora: string; // ej. '10:42 hrs'
  tiempoEspera: string; // ej. 'Hace 2 min'
  estado: 'pendiente' | 'autorizado' | 'rechazado';
  autorizadoPor?: string;
  autorizadoAt?: string;
  motivoRechazo?: string;
  qrPayload: string; // Token único del QR del operario
}

interface AutorizacionesContextType {
  solicitudes: SolicitudAutorizacion[];
  pendingCount: number;
  isModalOpen: boolean;
  openModal: (solicitudId?: string) => void;
  closeModal: () => void;
  solicitudSeleccionada: SolicitudAutorizacion | null;
  setSolicitudSeleccionada: (s: SolicitudAutorizacion | null) => void;
  autorizarSolicitudPresencial: (id: string, supervisorName?: string) => void;
  rechazarSolicitud: (id: string, motivo: string) => void;
  simularNuevaSolicitud: () => SolicitudAutorizacion;
  toastNotification: SolicitudAutorizacion | null;
  dismissToast: () => void;
}

const INITIAL_SOLICITUDES: SolicitudAutorizacion[] = [
  {
    id: 'AUT-8921',
    usuario: 'Carlos Mendoza',
    usuarioId: 'OP-4921',
    tipoBloqueo: 'Recepción con faltantes',
    descripcionDetalle: '3 de 5 bultos leídos (2 bultos faltantes según manifiesto)',
    ubicacion: 'Rampa 04 - Sector Retail',
    fechaHora: '10:42 hrs',
    tiempoEspera: 'Hace 2 min',
    estado: 'pendiente',
    qrPayload: 'STK-AUTH-REC-AUT8921-OP4921-RAMP04',
  },
  {
    id: 'AUT-8918',
    usuario: 'Andrés Poblete',
    usuarioId: 'OP-3204',
    tipoBloqueo: 'Encasillado con faltantes',
    descripcionDetalle: '12 de 15 piezas encasilladas (3 piezas no localizadas en bulto)',
    ubicacion: 'Encasillado Línea B - Pasillo 3',
    fechaHora: '10:35 hrs',
    tiempoEspera: 'Hace 9 min',
    estado: 'pendiente',
    qrPayload: 'STK-AUTH-ENC-AUT8918-OP3204-ENCB03',
  },
];

const OPERARIOS_POOL = [
  { name: 'Felipe Morales', id: 'OP-5412' },
  { name: 'Constanza Vega', id: 'OP-1934' },
  { name: 'Ignacio Silva', id: 'OP-7023' },
  { name: 'Daniela Rivas', id: 'OP-3891' },
  { name: 'Sebastián Palma', id: 'OP-4420' },
];

const UBICACIONES_POOL = [
  'Rampa 02 - Puerto Montt',
  'Rampa 12 - Concepción',
  'Rampa 24 - Santiago Norte',
  'Encasillado Línea A - Pasillo 1',
  'Encasillado Línea C - Pasillo 4',
];

const AutorizacionesContext = createContext<AutorizacionesContextType | undefined>(undefined);

export const AutorizacionesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudAutorizacion[]>(INITIAL_SOLICITUDES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudAutorizacion | null>(null);
  const [toastNotification, setToastNotification] = useState<SolicitudAutorizacion | null>(null);

  const { playSuccessSound, playWarningSound } = useAudioFeedback();
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pendingCount = solicitudes.filter((s) => s.estado === 'pendiente').length;

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification(null);
  }, []);

  const openModal = useCallback((solicitudId?: string) => {
    dismissToast();
    if (solicitudId) {
      const target = solicitudes.find((s) => s.id === solicitudId);
      if (target) setSolicitudSeleccionada(target);
    }
    setIsModalOpen(true);
  }, [solicitudes, dismissToast]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSolicitudSeleccionada(null);
  }, []);

  const autorizarSolicitudPresencial = useCallback((id: string, supervisorName = 'Byron Guerra (Supervisor)') => {
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} hrs`;

    setSolicitudes((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              estado: 'autorizado',
              autorizadoPor: supervisorName,
              autorizadoAt: timeFormatted,
            }
          : s
      )
    );

    playSuccessSound();
  }, [playSuccessSound]);

  const rechazarSolicitud = useCallback((id: string, motivo: string) => {
    setSolicitudes((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              estado: 'rechazado',
              motivoRechazo: motivo,
            }
          : s
      )
    );
    playWarningSound();
  }, [playWarningSound]);

  const simularNuevaSolicitud = useCallback(() => {
    const op = OPERARIOS_POOL[Math.floor(Math.random() * OPERARIOS_POOL.length)];
    const ubi = UBICACIONES_POOL[Math.floor(Math.random() * UBICACIONES_POOL.length)];
    const isRecepcion = Math.random() > 0.5;
    const randomIdNum = Math.floor(8930 + Math.random() * 50);
    const id = `AUT-${randomIdNum}`;

    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} hrs`;

    const nueva: SolicitudAutorizacion = {
      id,
      usuario: op.name,
      usuarioId: op.id,
      tipoBloqueo: isRecepcion ? 'Recepción con faltantes' : 'Encasillado con faltantes',
      descripcionDetalle: isRecepcion
        ? 'Diferencia detectada en bultos físicos vs manifiesto digital'
        : 'Piezas restantes no encontradas en canasto de clasificación',
      ubicacion: ubi,
      fechaHora: timeFormatted,
      tiempoEspera: 'Recién solicitada',
      estado: 'pendiente',
      qrPayload: `STK-AUTH-${id}-${op.id}-${ubi.replace(/[^A-Za-z0-9]/g, '')}`,
    };

    setSolicitudes((prev) => [nueva, ...prev]);

    // Disparar sonido y toast de notificación
    playWarningSound();
    setToastNotification(nueva);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
    }, 6000);

    return nueva;
  }, [playWarningSound]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <AutorizacionesContext.Provider
      value={{
        solicitudes,
        pendingCount,
        isModalOpen,
        openModal,
        closeModal,
        solicitudSeleccionada,
        setSolicitudSeleccionada,
        autorizarSolicitudPresencial,
        rechazarSolicitud,
        simularNuevaSolicitud,
        toastNotification,
        dismissToast,
      }}
    >
      {children}
    </AutorizacionesContext.Provider>
  );
};

export const useAutorizaciones = () => {
  const context = useContext(AutorizacionesContext);
  if (!context) {
    throw new Error('useAutorizaciones must be used within an AutorizacionesProvider');
  }
  return context;
};
