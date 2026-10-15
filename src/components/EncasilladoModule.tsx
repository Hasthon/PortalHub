import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EncargoEncasillado, UbicacionEncasillado, PasilloType, ActiveModule } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useAudioFeedback } from '../hooks/useAudioFeedback';
import { useDevice } from '../context/DeviceContext';
import { LocationQrModal, PRESET_UBICACIONES } from './LocationQrModal';
import {
  Scan,
  Truck,
  CheckCircle2,
  Box,
  ShieldAlert,
  AlertCircle,
  X,
  ArrowRight,
  QrCode,
  Check,
  AlertTriangle,
  RotateCcw,
  Layers,
  PackageCheck,
  Trash2,
  Lock,
  Pause,
} from 'lucide-react';

export type EncasilladoPhase =
  | 'FASE_CLASIFICACION'        // Fase 1: Escaneo inicial y clasificación en listas de pasillos
  | 'FASE_SELECCION_PASILLO'     // Fase 2.1: Hoja de ruta / Selección de pasillo para put-away
  | 'FASE_VALIDAR_UBICACION'     // Fase 2.2: Escaneo de código de ubicación del pasillo
  | 'FASE_CONTEO_REGRESIVO'      // Fase 2.3: Escaneo de bultos con conteo regresivo
  | 'FASE_PASILLO_COMPLETO'      // Fase 2.4: Pasillo actual finalizado
  | 'FASE_RESUMEN_FINAL';        // Fase 2.5: Todos los pasillos completados con éxito


export interface RampaPutawayState {
  rampaId: string; // ej: "Rampa 24" o "Rampa 04"
  rampaFullName: string;
  pasillo: PasilloType;
  qrCode: string; // ej: "RAMPA-24"
  pendingItems: EncargoEncasillado[];
  depositedItems: EncargoEncasillado[];
  isCompleted: boolean;
}

interface AislePutawayState {
  pasillo: PasilloType;
  rampa: string;
  total: number;
  pendingItems: EncargoEncasillado[];
  depositedItems: EncargoEncasillado[];
  isCompleted: boolean;
  incidencias: number;
}

interface EncasilladoModuleProps {
  onRegisterBackHandler?: (handler: (() => void) | null) => void;
  onRegisterNavigationGuard?: (guard: ((targetModule: ActiveModule) => boolean) | null) => void;
  onNavigateModule?: (module: ActiveModule) => void;
  onBackHome?: () => void;
}

// ─── Generador de códigos estándar: Encargo de 26 dígitos y OF de 9 dígitos ───
export function generateStarkenCodes() {
  const prefix = '780';
  const part1 = Math.floor(10000000000 + Math.random() * 90000000000).toString();
  const part2 = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const codigo26 = `${prefix}${part1}${part2}`; // 26 dígitos exactos
  const of9 = Math.floor(100000000 + Math.random() * 900000000).toString(); // 9 dígitos exactos
  return { codigo26, of9 };
}

export const EncasilladoModule: React.FC<EncasilladoModuleProps> = ({
  onRegisterBackHandler,
  onRegisterNavigationGuard,
  onNavigateModule,
  onBackHome,
}) => {
  const { isPda } = useDevice();
  const { playSuccessSound, playErrorSound, playWarningSound } = useAudioFeedback();

  // ─── Ubicación Inicial de Clasificación (Rampa 24 por defecto) ───────────
  const [activeLocation, setActiveLocation] = useState<UbicacionEncasillado>(PRESET_UBICACIONES[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // ─── Estado de Fases ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState<EncasilladoPhase>('FASE_CLASIFICACION');

  // ─── Fase 1: Listas de Encargos Clasificados (Arranca limpia por defecto) ──
  const [encargosList, setEncargosList] = useState<EncargoEncasillado[]>([]);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [latestScannedId, setLatestScannedId] = useState<string | null>(null);
  const [activeFlashPasillo, setActiveFlashPasillo] = useState<PasilloType | null>(null);
  const [activePdaTab, setActivePdaTab] = useState<PasilloType>('AZUL');

  // ─── Fase 2: Estado de Depósito y Conteo Regresivo ────────────────────────
  const [aisleBatches, setAisleBatches] = useState<Record<PasilloType, AislePutawayState>>({
    AZUL: {
      pasillo: 'AZUL',
      rampa: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
      total: 0,
      pendingItems: [],
      depositedItems: [],
      isCompleted: false,
      incidencias: 0,
    },
    ROJO: {
      pasillo: 'ROJO',
      rampa: 'Rampa 01 - Salida Norte (Santiago / V Región)',
      total: 0,
      pendingItems: [],
      depositedItems: [],
      isCompleted: false,
      incidencias: 0,
    },
    VERDE: {
      pasillo: 'VERDE',
      rampa: 'Rampa 12 - Concepción (Biobío / Temuco)',
      total: 0,
      pendingItems: [],
      depositedItems: [],
      isCompleted: false,
      incidencias: 0,
    },
  });

  const [activePutawayAisle, setActivePutawayAisle] = useState<PasilloType>('VERDE');
  const [lastScannedDepositCode, setLastScannedDepositCode] = useState<string | null>(null);
  const [activeAisleQrModal, setActiveAisleQrModal] = useState<PasilloType | null>(null);

  const [activeTargetRampaId, setActiveTargetRampaId] = useState<string | null>(null);

  // ─── Modales de Apoyo y Contingencia ──────────────────────────────────────
  const [isExitConfirmationModalOpen, setIsExitConfirmationModalOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<ActiveModule | null>(null);
  const [isIncidenciaModalOpen, setIsIncidenciaModalOpen] = useState(false);
  const [unencasillableModalInfo, setUnencasillableModalInfo] = useState<{ isOpen: boolean; code?: string } | null>(null);
  const [supervisorAuthModal, setSupervisorAuthModal] = useState<{
    isOpen: boolean;
    rampaFullName: string;
    rampaShort: string;
    status: 'waiting' | 'approved';
  } | null>(null);

  // ─── Notificaciones (Desactivadas en este módulo) ──────────────────────────
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pasilloTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = useCallback(
    (_text?: string, _type?: 'success' | 'error' | 'warning', _codeScanned?: string, _rampaName?: string) => {
      // Notificaciones flotantes eliminadas en este módulo a solicitud del usuario
    },
    []
  );

  // ─── Indicador de Progreso No Consolidado (Para Guard de Navegación) ──────
  const hasUnsavedProgress = useMemo(() => {
    if (phase === 'FASE_CLASIFICACION') {
      return encargosList.length > 0;
    }
    if (phase === 'FASE_RESUMEN_FINAL') {
      return false;
    }
    // En Fase 2, si hay algún lote pendiente de finalizar
    const totalPending =
      aisleBatches.AZUL.pendingItems.length +
      aisleBatches.ROJO.pendingItems.length +
      aisleBatches.VERDE.pendingItems.length;
    return totalPending > 0;
  }, [phase, encargosList.length, aisleBatches]);

  // ─── Registro de Guard de Navegación y Botón Atrás ────────────────────────
  useEffect(() => {
    const handleBack = () => {
      // 1. Si está depositando en una rampa específica dentro del Step 2, vuelve a la lista de rampas
      if (activeTargetRampaId !== null) {
        setActiveTargetRampaId(null);
        return;
      }
      // 2. Si está en Step 2 (o fase posterior), vuelve a la pantalla anterior (Step 1: Clasificación)
      if (phase !== 'FASE_CLASIFICACION') {
        setPhase('FASE_CLASIFICACION');
        return;
      }
      // 3. Si está en Step 1 y tiene bultos clasificados, advertir antes de salir al menú
      if (hasUnsavedProgress) {
        setPendingExitTarget('home');
        setIsExitConfirmationModalOpen(true);
      } else {
        onBackHome?.();
      }
    };

    onRegisterBackHandler?.(handleBack);
    return () => onRegisterBackHandler?.(null);
  }, [hasUnsavedProgress, phase, activeTargetRampaId, onBackHome, onRegisterBackHandler]);

  useEffect(() => {
    const guard = (targetModule: ActiveModule): boolean => {
      if (hasUnsavedProgress) {
        setPendingExitTarget(targetModule);
        setIsExitConfirmationModalOpen(true);
        return false; // Bloquea la navegación inmediata
      }
      return true; // Permite el cambio directo
    };

    onRegisterNavigationGuard?.(guard);
    return () => onRegisterNavigationGuard?.(null);
  }, [hasUnsavedProgress, onRegisterNavigationGuard]);

  // Ejecuta la salida forzada confirmada por el usuario
  const handleConfirmExit = () => {
    setIsExitConfirmationModalOpen(false);
    // Reinicia estados
    setEncargosList([]);
    setPhase('FASE_CLASIFICACION');
    if (pendingExitTarget && onNavigateModule) {
      onNavigateModule(pendingExitTarget);
    } else {
      onBackHome?.();
    }
  };

  // Mantener foco en el input para disparar lectores láser continuos
  useEffect(() => {
    const timer = setTimeout(() => scanInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [activeLocation, encargosList.length, phase, activePutawayAisle]);

  // ─── Conteo en Vivo por Pasillo (Fase 1) ───────────────────────────────────
  const countsByPasillo = useMemo(
    () => ({
      AZUL: encargosList.filter((item) => item.pasilloAsignado === 'AZUL').length,
      ROJO: encargosList.filter((item) => item.pasilloAsignado === 'ROJO').length,
      VERDE: encargosList.filter((item) => item.pasilloAsignado === 'VERDE').length,
    }),
    [encargosList]
  );

  // ─── Procesador de Escaneo: FASE 1 (Clasificación Inicial) ────────────────
  const handleProcessScanFase1 = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    const timestamp = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // ─── Caso Borde Paso 1: Bulto No Encasillable ───
    if (
      uppercaseCode.includes('NO-ENC') ||
      uppercaseCode.includes('MANUAL') ||
      uppercaseCode.includes('TOBOGAN') ||
      uppercaseCode.endsWith('99')
    ) {
      playErrorSound();
      setUnencasillableModalInfo({
        isOpen: true,
        code: uppercaseCode,
      });
      triggerToast(
        'Este bulto no puede ser encasillado, dirígete al tobogán N° 99 y déjalo manualmente.',
        'error',
        uppercaseCode
      );
      return;
    }

    const matchItem = (item: EncargoEncasillado) =>
      item.codigoEncargo === uppercaseCode ||
      item.codigoBarras26 === uppercaseCode ||
      item.codigoOF9 === uppercaseCode ||
      (item.codigoOF9 && uppercaseCode === `OF-${item.codigoOF9}`);

    if (isRemoveMode) {
      const existing = encargosList.find(matchItem);
      if (existing) {
        setEncargosList((prev) => prev.filter((item) => item.id !== existing.id));
        setActivePdaTab(existing.pasilloAsignado);
        setActiveFlashPasillo(existing.pasilloAsignado);
        if (pasilloTimerRef.current) clearTimeout(pasilloTimerRef.current);
        pasilloTimerRef.current = setTimeout(() => {
          setActiveFlashPasillo(null);
        }, 1000);
        triggerToast(`Encargo [${existing.codigoBarras26 || existing.codigoEncargo}] removido de ${existing.pasilloAsignado}.`, 'warning', uppercaseCode);
        playWarningSound();
      } else {
        triggerToast(`El código [${uppercaseCode}] no se encuentra en las listas`, 'error', uppercaseCode);
        playErrorSound();
      }
      return;
    }

    // Validación de Duplicados
    const existing = encargosList.find(matchItem);
    if (existing) {
      triggerToast(
        `⚠️ El encargo [${existing.codigoBarras26 || existing.codigoEncargo}] ya está clasificado en Pasillo ${existing.pasilloAsignado}`,
        'warning',
        uppercaseCode
      );
      playWarningSound();
      return;
    }

    // Generar o parsear códigos: Encargo de 26 dígitos y OF de 9 dígitos
    const { codigo26: gen26, of9: genOf9 } = generateStarkenCodes();
    const digitsOnly = uppercaseCode.replace(/\D/g, '');
    const finalCodigo26 = digitsOnly.length === 26 ? digitsOnly : gen26;
    const finalOf9 = digitsOnly.length === 9 ? digitsOnly : genOf9;

    // Regla de Asignación por terminación o rampa
    let assignedPasillo: PasilloType = activeLocation.pasilloPredeterminado || 'AZUL';
    if (finalCodigo26.endsWith('1') || finalCodigo26.endsWith('4') || finalCodigo26.endsWith('7')) {
      assignedPasillo = 'AZUL';
    } else if (finalCodigo26.endsWith('2') || finalCodigo26.endsWith('5') || finalCodigo26.endsWith('8')) {
      assignedPasillo = 'ROJO';
    } else {
      assignedPasillo = 'VERDE';
    }

    // Asignación realista de rampas por pasillo (cada pasillo con sus rampas asociadas)
    let rampaName = '';
    if (assignedPasillo === 'AZUL') {
      const azRampas = [
        'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
        'Rampa 25 - Castro / Ancud (Chiloé)',
        'Rampa 26 - Osorno / Frutillar',
      ];
      const idx = Math.abs(finalCodigo26.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % azRampas.length;
      rampaName = azRampas[idx];
    } else if (assignedPasillo === 'ROJO') {
      const rjRampas = [
        'Rampa 01 - Salida Norte (Santiago / V Región)',
        'Rampa 02 - La Serena / Coquimbo (IV Región)',
        'Rampa 03 - Valparaíso / Viña del Mar',
      ];
      const idx = Math.abs(finalCodigo26.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % rjRampas.length;
      rampaName = rjRampas[idx];
    } else {
      const vdRampas = [
        'Rampa 12 - Concepción (Biobío / Temuco)',
        'Rampa 13 - Los Ángeles / Chillán',
        'Rampa 14 - Temuco / Araucanía Sur',
      ];
      const idx = Math.abs(finalCodigo26.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % vdRampas.length;
      rampaName = vdRampas[idx];
    }

    const newItem: EncargoEncasillado = {
      id: `ENC-${Date.now().toString().slice(-6)}`,
      codigoEncargo: finalCodigo26,
      codigoBarras26: finalCodigo26,
      codigoOF9: finalOf9,
      pasilloAsignado: assignedPasillo,
      rampaLigada: rampaName,
      horaEscaneo: timestamp,
    };

    setEncargosList((prev) => [newItem, ...prev]);
    setLatestScannedId(newItem.id);
    setActiveFlashPasillo(assignedPasillo);
    setActivePdaTab(assignedPasillo);

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setLatestScannedId(null);
    }, 1000);

    if (pasilloTimerRef.current) clearTimeout(pasilloTimerRef.current);
    pasilloTimerRef.current = setTimeout(() => {
      setActiveFlashPasillo(null);
    }, 1000);

    triggerToast(`Encargo asignado a Pasillo ${assignedPasillo}`, 'success', finalCodigo26, rampaName);
    playSuccessSound();
  };

  // ─── Transición a Fase 2: Al presionar "Encasillar" ───────────────────────
  const handleStartEncasillado = () => {
    if (encargosList.length === 0) return;

    const azules = encargosList.filter((i) => i.pasilloAsignado === 'AZUL');
    const rojos = encargosList.filter((i) => i.pasilloAsignado === 'ROJO');
    const verdes = encargosList.filter((i) => i.pasilloAsignado === 'VERDE');

    setAisleBatches({
      AZUL: {
        pasillo: 'AZUL',
        rampa: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
        total: azules.length,
        pendingItems: [...azules],
        depositedItems: [],
        isCompleted: azules.length === 0,
        incidencias: 0,
      },
      ROJO: {
        pasillo: 'ROJO',
        rampa: 'Rampa 01 - Salida Norte (Santiago / V Región)',
        total: rojos.length,
        pendingItems: [...rojos],
        depositedItems: [],
        isCompleted: rojos.length === 0,
        incidencias: 0,
      },
      VERDE: {
        pasillo: 'VERDE',
        rampa: 'Rampa 12 - Concepción (Biobío / Temuco)',
        total: verdes.length,
        pendingItems: [...verdes],
        depositedItems: [],
        isCompleted: verdes.length === 0,
        incidencias: 0,
      },
    });

    // Selecciona el primer pasillo con carga en orden AZUL, ROJO, VERDE
    let firstAisle: PasilloType = 'AZUL';
    if (azules.length > 0) firstAisle = 'AZUL';
    else if (rojos.length > 0) firstAisle = 'ROJO';
    else if (verdes.length > 0) firstAisle = 'VERDE';

    setActivePutawayAisle(firstAisle);
    setPhase('FASE_VALIDAR_UBICACION');
    playSuccessSound();
    triggerToast(
      `Lote consolidado: ${encargosList.length} bultos`,
      'success'
    );
  };

  // ─── Procesador de Escaneo: FASE 2.2 (Validación QR de Rampa o Pasillo) ──
  const handleValidateLocationQr = (code: string) => {
    setActiveAisleQrModal(null);
    const raw = code.toUpperCase().trim();

    // Detección de rampa o pasillo escaneado
    let detectedAisle: PasilloType | null = null;
    let detectedRampaId: string | null = null;

    // Buscar coincidencia en rampas presentes en los lotes
    for (const p of ['AZUL', 'ROJO', 'VERDE'] as PasilloType[]) {
      const b = aisleBatches[p];
      const allRampasInBatch = Array.from(new Set([...b.pendingItems, ...b.depositedItems].map((i) => i.rampaLigada)));
      for (const rName of allRampasInBatch) {
        const rShort = rName.split('-')[0].trim(); // ej: "Rampa 24"
        const rNum = rShort.replace(/\D/g, ''); // ej: "24"
        if (raw === `RAMPA-${rNum}` || raw === rShort.toUpperCase() || raw.includes(`RAMPA ${rNum}`) || raw.includes(`RAMPA-${rNum}`)) {
          detectedAisle = p;
          detectedRampaId = rShort;
          break;
        }
      }
      if (detectedAisle) break;
    }

    // Si no coincidió con una rampa específica, chequear por palabra clave de pasillo
    if (!detectedAisle) {
      if (raw.includes('AZUL') || raw.includes('PMC') || raw.includes('24') || raw.includes('25') || raw.includes('26')) detectedAisle = 'AZUL';
      else if (raw.includes('ROJO') || raw.includes('STG') || raw.includes('01') || raw.includes('02') || raw.includes('03')) detectedAisle = 'ROJO';
      else if (raw.includes('VERDE') || raw.includes('CCP') || raw.includes('12') || raw.includes('13') || raw.includes('14')) detectedAisle = 'VERDE';
    }

    if (detectedAisle) {
      const batch = aisleBatches[detectedAisle];

      // Caso ideal: el pasillo/rampa escaneado tiene bultos pendientes por depositar
      if (batch.pendingItems.length > 0) {
        setActivePutawayAisle(detectedAisle);
        if (detectedRampaId) setActiveTargetRampaId(detectedRampaId);
        playSuccessSound();

        const rampaLabel = detectedRampaId ? ` (${detectedRampaId})` : '';
        triggerToast(
          `¡Ubicación validada! Pasillo ${detectedAisle}${rampaLabel}. Iniciando depósito de bultos.`,
          'success'
        );

        setPhase('FASE_CONTEO_REGRESIVO');
        return;
      }

      // Si el pasillo ya estaba completo
      if (batch.isCompleted) {
        playWarningSound();
        triggerToast(`El Pasillo ${detectedAisle} ya fue completado en este lote.`, 'warning');
        return;
      }

      // Si el pasillo no tenía bultos en este lote
      playWarningSound();
      triggerToast(`El Pasillo ${detectedAisle} no tiene bultos asignados en este lote.`, 'warning');
      return;
    }

    // Código inválido o no reconocido
    playErrorSound();
    triggerToast(`Código [${raw}] no reconocido como ubicación válida de rampa o pasillo.`, 'error');
  };

  // ─── Procesador de Escaneo: FASE 2.3 (Depósito con Conteo Regresivo) ──────
  const handleProcessScanCountdown = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    const currentBatch = aisleBatches[activePutawayAisle];

    const matchItem = (it: EncargoEncasillado) =>
      it.codigoEncargo === uppercaseCode ||
      it.codigoBarras26 === uppercaseCode ||
      it.codigoOF9 === uppercaseCode ||
      (it.codigoOF9 && uppercaseCode === `OF-${it.codigoOF9}`);

    // Verificar si el encargo pertenece a este pasillo y está pendiente
    const pendingIndex = currentBatch.pendingItems.findIndex(matchItem);

    if (pendingIndex !== -1) {
      // ¡Bulto correcto en este pasillo!
      const itemDeposited = currentBatch.pendingItems[pendingIndex];

      // Verificación de rampa/tobogán: si hay un tobogán focalizado activo, validar que pertenezca a él
      if (
        activeTargetRampaId &&
        itemDeposited.rampaLigada &&
        !itemDeposited.rampaLigada.startsWith(activeTargetRampaId)
      ) {
        playErrorSound();
        triggerToast('Este bulto no pertenece a este tobogán.', 'error', uppercaseCode);
        return;
      }

      const newPending = [...currentBatch.pendingItems];
      newPending.splice(pendingIndex, 1);
      const newDeposited = [itemDeposited, ...currentBatch.depositedItems];
      const isFinished = newPending.length === 0;

      setAisleBatches((prev) => ({
        ...prev,
        [activePutawayAisle]: {
          ...prev[activePutawayAisle],
          pendingItems: newPending,
          depositedItems: newDeposited,
          isCompleted: isFinished,
        },
      }));

      setLastScannedDepositCode(itemDeposited.codigoBarras26 || itemDeposited.codigoEncargo);

      playSuccessSound();
      triggerToast(
        `✓ Encargo [${itemDeposited.codigoOF9 ? `OF-${itemDeposited.codigoOF9}` : itemDeposited.codigoEncargo}] depositado en Pasillo ${activePutawayAisle}.`,
        'success',
        uppercaseCode
      );

      // Verificar si la rampa focalizada activa completó todos sus encargos
      if (activeTargetRampaId && !isFinished) {
        const remainingForTarget = newPending.filter(
          (i) => i.rampaLigada === activeTargetRampaId || (i.rampaLigada && i.rampaLigada.startsWith(activeTargetRampaId))
        );
        if (remainingForTarget.length === 0) {
          const completedRampaName = activeTargetRampaId;
          setTimeout(() => {
            triggerToast(
              `✓ ¡${completedRampaName} completada al 100%! Desbloqueando los demás toboganes.`,
              'success'
            );
            setActiveTargetRampaId(null);
            setPhase('FASE_VALIDAR_UBICACION');
          }, 600);
        }
      }

      if (isFinished) {
        setTimeout(() => {
          setAisleBatches((latestBatches) => {
            const otherRemaining = (['AZUL', 'ROJO', 'VERDE'] as PasilloType[]).filter(
              (p) => p !== activePutawayAisle && latestBatches[p].pendingItems.length > 0
            );

            if (otherRemaining.length > 0) {
              const nextAisle = otherRemaining[0];
              setActivePutawayAisle(nextAisle);
              setPhase('FASE_VALIDAR_UBICACION');
              triggerToast(
                `¡Pasillo ${activePutawayAisle} completado! Desbloqueando pasillos. Siguiente sugerido: Pasillo ${nextAisle}.`,
                'success'
              );
            } else {
              setPhase('FASE_RESUMEN_FINAL');
              playSuccessSound();
              triggerToast(
                `¡Todos los pasillos completados al 100%! Mostrando resumen final.`,
                'success'
              );
            }
            return latestBatches;
          });
        }, 700);
      }
      return;
    }

    // Verificar si ya fue depositado en este pasillo
    const alreadyDeposited = currentBatch.depositedItems.some(matchItem);
    if (alreadyDeposited) {
      playWarningSound();
      triggerToast(`Este bulto ya fue depositado en este tobogán.`, 'warning', uppercaseCode);
      return;
    }

    // Caso Borde Paso 2: Si no corresponde al tobogán por configuración sistémica o asignación
    playErrorSound();
    triggerToast('Este bulto no pertenece a este tobogán.', 'error', uppercaseCode);
  };

  // ─── Botón de Limpieza en Rampa (Paso 2): Vaciar y liberar la rampa ───────
  const handleClearRampaItems = useCallback((rampaFullName: string) => {
    const rampaShort = rampaFullName.split('-')[0].trim();
    const currentBatch = aisleBatches[activePutawayAisle];

    const isThisRampa = (i: EncargoEncasillado) =>
      i.rampaLigada === rampaFullName || (i.rampaLigada && i.rampaLigada.startsWith(rampaShort));

    const totalInRampa =
      currentBatch.pendingItems.filter(isThisRampa).length +
      currentBatch.depositedItems.filter(isThisRampa).length;

    // Remover todos los encargos de esta rampa (tanto pendientes como depositados)
    const remainingPending = currentBatch.pendingItems.filter((i) => !isThisRampa(i));
    const remainingDeposited = currentBatch.depositedItems.filter((i) => !isThisRampa(i));

    // Actualizar lote del pasillo activo contabilizando las incidencias de los encargos limpiados
    setAisleBatches((prev) => {
      const cur = prev[activePutawayAisle];
      const newTotal = Math.max(0, cur.total - totalInRampa);
      const isFinished = remainingPending.length === 0;
      return {
        ...prev,
        [activePutawayAisle]: {
          ...cur,
          total: newTotal,
          pendingItems: remainingPending,
          depositedItems: remainingDeposited,
          isCompleted: isFinished,
          incidencias: (cur.incidencias || 0) + totalInRampa,
        },
      };
    });

    // Removerlos también de la lista general de encargos
    setEncargosList((prev) => prev.filter((i) => !isThisRampa(i)));

    // Deseleccionar la rampa activa para desbloquear las demás y volver a la vista del pasillo
    setActiveTargetRampaId(null);
    setPhase('FASE_VALIDAR_UBICACION');
    setLastScannedDepositCode(null);

    playWarningSound();
    triggerToast(
      `✓ ${rampaShort} limpiada: se quitaron sus ${totalInRampa} encargos y la rampa quedó liberada.`,
      'success'
    );
  }, [activePutawayAisle, aisleBatches, playWarningSound, triggerToast]);

  // ─── Solicitud y Validación de Autorización de Supervisor para Limpieza ───
  const handleRequestClearRampa = (rampaFullName: string) => {
    const rampaShort = rampaFullName.split('-')[0].trim();
    setSupervisorAuthModal({
      isOpen: true,
      rampaFullName,
      rampaShort,
      status: 'waiting',
    });
  };

  const handleConfirmSupervisorAuth = useCallback(() => {
    if (!supervisorAuthModal || supervisorAuthModal.status !== 'waiting') return;
    playSuccessSound();
    const targetRampa = supervisorAuthModal.rampaFullName;
    setSupervisorAuthModal((prev) => (prev ? { ...prev, status: 'approved' } : null));

    setTimeout(() => {
      setSupervisorAuthModal(null);
      handleClearRampaItems(targetRampa);
    }, 1100);
  }, [supervisorAuthModal, playSuccessSound, handleClearRampaItems]);

  const handleCancelSupervisorAuth = () => {
    setSupervisorAuthModal(null);
  };


  // ─── Dispatcher Universal de Escáner por Código de Barras ─────────────────
  const handleUniversalScan = (code: string) => {
    if (phase === 'FASE_CLASIFICACION') {
      handleProcessScanFase1(code);
    } else if (phase === 'FASE_VALIDAR_UBICACION') {
      handleValidateLocationQr(code);
    } else if (phase === 'FASE_CONTEO_REGRESIVO') {
      handleProcessScanCountdown(code);
    }
  };

  useBarcodeScanner({
    onScan: handleUniversalScan,
    enableGlobal: true,
  });

  // ─── Cierre de Pasillo con Incidencia ─────────────────────────────────────
  const handleConfirmCierreIncidencia = () => {
    setIsIncidenciaModalOpen(false);
    const currentBatch = aisleBatches[activePutawayAisle];
    const missingCount = currentBatch.pendingItems.length;

    setAisleBatches((prev) => ({
      ...prev,
      [activePutawayAisle]: {
        ...prev[activePutawayAisle],
        isCompleted: true,
        incidencias: missingCount,
      },
    }));

    playWarningSound();
    triggerToast(
      `Pasillo ${activePutawayAisle} cerrado con ${missingCount} bultos marcados como incidencias para auditoría.`,
      'warning'
    );
    setPhase('FASE_PASILLO_COMPLETO');
  };

  // Siguiente pasillo sugerido con carga pendiente
  const nextPendingAisle = useMemo(() => {
    const list: PasilloType[] = ['VERDE', 'AZUL', 'ROJO'];
    return list.find((p) => aisleBatches[p].total > 0 && !aisleBatches[p].isCompleted) || null;
  }, [aisleBatches]);

  // ─── Helper de Renderizado de Ítem Individual ─────────────────────────────
  const renderPackageItem = (item: EncargoEncasillado) => {
    const isLatest = item.id === latestScannedId;
    return (
      <div
        key={item.id}
        className={`h-[35px] px-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between gap-2 text-xs font-mono shadow-2xs shrink-0 ${
          isLatest
            ? 'bg-[#EEFBF4] dark:bg-emerald-950/80 border-[#A7F3D0] dark:border-emerald-700/80 ring-2 ring-emerald-500/40 border-l-4 border-l-[#009D4E] font-bold animate-fadeIn'
            : 'bg-white dark:bg-hub-elevated/90 border-gray-200/80 dark:border-hub-border hover:border-gray-300 dark:hover:border-slate-700'
        }`}
      >
        <span className="font-bold text-[#414745] dark:text-hub-text1 text-[11px] font-mono truncate tracking-tight min-w-0 flex-1">
          {item.codigoBarras26 || item.codigoEncargo}
        </span>

        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-semibold bg-gray-100 dark:bg-hub-surface text-gray-600 dark:text-hub-text2 border border-gray-200/90 dark:border-hub-border shrink-0">
          OF: {item.codigoOF9 || '382104712'}
        </span>
      </div>
    );
  };

  // ─── Renderizado de Columna de Pasillo (Desktop Fase 1) ────────────────────
  const renderPasilloCard = (
    pasilloKey: PasilloType,
    title: string,
    colorClasses: {
      bgCard: string;
      borderNormal: string;
      borderFlash: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
      emptyBg: string;
      emptyBorder: string;
      emptyText: string;
    }
  ) => {
    const items = encargosList.filter((it) => it.pasilloAsignado === pasilloKey);
    const isFlashing = activeFlashPasillo === pasilloKey;

    return (
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 shadow-xs ${
          isFlashing ? colorClasses.borderFlash : colorClasses.borderNormal
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-hub-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full ${colorClasses.badgeBg} border ${colorClasses.badgeBorder}`} />
            <h3 className="font-extrabold text-[#414745] dark:text-hub-text1 text-base tracking-tight">{title}</h3>
          </div>
          <div
            className={`px-3 py-1 rounded-xl font-mono font-bold text-xs border shadow-2xs ${colorClasses.badgeBg} ${colorClasses.badgeText} ${colorClasses.badgeBorder}`}
          >
            {items.length} {items.length === 1 ? 'bulto' : 'bultos'}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pt-3 [scrollbar-width:thin] flex flex-col">
          {items.length === 0 ? (
            <div
              className={`flex-1 min-h-[140px] flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed text-center my-auto ${colorClasses.emptyBg} ${colorClasses.emptyBorder}`}
            >
              <Box className={`w-9 h-9 stroke-[1.5] mb-2 opacity-50 ${colorClasses.emptyText}`} />
              <p className={`text-xs font-bold ${colorClasses.emptyText}`}>Lista vacía</p>
              <p className="text-[11px] text-gray-400 dark:text-hub-text2 mt-1 max-w-[210px] leading-relaxed">
                Escanea encargos para comenzar a clasificar en este pasillo.
              </p>
            </div>
          ) : (
            items.map(renderPackageItem)
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALES GLOBALES
  // ═══════════════════════════════════════════════════════════════════════════

  // Modal de Advertencia de Salida (Navigation Guard)
  const renderExitConfirmationModal = () => {
    if (!isExitConfirmationModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp font-sans">
          <button
            type="button"
            onClick={() => setIsExitConfirmationModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-hub-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
              <AlertCircle className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#414745] dark:text-hub-text1 tracking-tight">
                ¿Seguro que deseas salir?
              </h3>
              <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-2 leading-relaxed">
                {phase === 'FASE_CLASIFICACION'
                  ? `Tienes ${encargosList.length} bultos escaneados sin encasillar. Si sales del módulo ahora, se perderán todos los avances acumulados.`
                  : `Tienes un proceso de encasillado físico en curso. Si sales ahora, se interrumpirá la asignación a pasillos.`}
              </p>
            </div>

            <div className="w-full pt-3 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmExit}
                className="w-full sm:w-1/2 h-11 border-2 border-[#303030] dark:border-rose-500 text-[#303030] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-extrabold rounded-2xl text-xs flex items-center justify-center transition-all cursor-pointer order-2 sm:order-1"
              >
                <span>Salir y descartar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExitConfirmationModalOpen(false)}
                className="w-full sm:w-1/2 h-11 bg-[#303030] dark:bg-[#03F77C] hover:bg-[#1f1f1f] hover:dark:bg-[#02D66B] active:bg-black text-white dark:text-[#303030] font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center transition-all cursor-pointer order-1 sm:order-2"
              >
                <span>Mantenerme aquí</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Incidencia
  const renderIncidenciaModal = () => {
    if (!isIncidenciaModalOpen) return null;
    const currentBatch = aisleBatches[activePutawayAisle];
    const missingCount = currentBatch.pendingItems.length;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp font-sans">
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <AlertTriangle className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#414745] dark:text-hub-text1 tracking-tight">
                Declarar Incidencia en Pasillo {activePutawayAisle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-hub-text2 font-medium mt-2 leading-relaxed">
                Quedan <strong className="text-amber-600 font-bold">{missingCount} bultos</strong> pendientes de depositar. Si físicamente no se encuentran en tu carro, se registrarán como incidencias para auditoría y se cerrará este pasillo.
              </p>
            </div>

            <div className="w-full pt-3 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setIsIncidenciaModalOpen(false)}
                className="w-full sm:w-1/2 h-11 border-2 border-gray-300 dark:border-hub-border text-gray-700 dark:text-hub-text2 hover:bg-gray-50 font-extrabold rounded-2xl text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                <span>Seguir buscando</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmCierreIncidencia}
                className="w-full sm:w-1/2 h-11 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center transition-all cursor-pointer"
              >
                <span>Cerrar con incidencia</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Caso Borde Paso 1: Bulto No Encasillable (Tobogán N° 99)
  const renderUnencasillableModal = () => {
    if (!unencasillableModalInfo?.isOpen) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
        <div className="bg-white dark:bg-hub-surface border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scaleUp text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4 shadow-xs">
            <AlertTriangle className="w-9 h-9 stroke-[2.2]" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2 inline-block">
            Desvío Manual Requerido
          </span>

          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-hub-text1 mb-2 tracking-tight">
            Este bulto no puede ser encasillado
          </h3>

          <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-4 leading-relaxed">
            Dirígete al tobogán N° 99 y déjalo manualmente.
          </p>

          {unencasillableModalInfo.code && (
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border text-xs font-mono text-gray-700 dark:text-hub-text2 mb-5">
              <span className="text-gray-400 font-sans block text-[10px]">Código escaneado:</span>
              <span className="font-black text-sm">{unencasillableModalInfo.code}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setUnencasillableModalInfo(null);
              scanInputRef.current?.focus();
            }}
            className="w-full h-11 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black rounded-2xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Entendido</span>
          </button>
        </div>
      </div>
    );
  };

  // Modal de Autorización del Supervisor (para Limpiar Rampa)
  const renderSupervisorAuthModal = () => {
    if (!supervisorAuthModal?.isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn font-sans">
        <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative animate-scaleUp text-center">
          {supervisorAuthModal.status === 'waiting' && (
            <button
              type="button"
              onClick={handleCancelSupervisorAuth}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-hub-text1 hover:bg-gray-100 dark:hover:bg-hub-elevated cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {supervisorAuthModal.status === 'waiting' ? (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-2xs">
                <Lock className="w-7 h-7 stroke-[2.2]" />
              </div>

              <h3 className="text-lg font-black text-gray-900 dark:text-hub-text1 mb-2">
                Autorización del Supervisor
              </h3>

              {/* Caja de alerta amarilla/beige muy similar al sistema */}
              <div className="p-3 rounded-xl bg-[#FFF9EE] dark:bg-amber-950/40 border border-[#FDE6B6] dark:border-amber-800/60 text-[#7A4D05] dark:text-amber-200 text-xs font-semibold leading-relaxed mb-4 text-left">
                Para limpiar y desasignar todos los encargos de la <strong>{supervisorAuthModal.rampaShort}</strong>, un supervisor debe validar y autorizar la acción.
              </div>

              {/* Código QR idéntico al sistema (clickeable para simular autorización inmediata) */}
              <div
                onClick={handleConfirmSupervisorAuth}
                title="Haz clic aquí para validar autorización inmediatamente"
                className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center cursor-pointer hover:scale-102 transition-transform"
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

                  {/* Módulos de datos QR */}
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

              <p className="text-xs font-bold text-gray-700 dark:text-hub-text2 mt-3.5 mb-2">
                El supervisor debe escanear este código para autorizar la limpieza.
              </p>

              {/* Spinner esperando autorización */}
              <div className="flex flex-col items-center justify-center gap-1.5 my-3">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Esperando autorización del supervisor...
                </span>
              </div>

              {/* Botones de acción rápida y cancelar */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSupervisorAuth}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Simular Escaneo Supervisor</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelSupervisorAuth}
                  className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-hub-border text-gray-700 dark:text-hub-text2 font-bold text-xs hover:bg-gray-100 dark:hover:bg-hub-elevated transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#009D4E] dark:text-[#03F77C] mx-auto mb-3 shadow-xs animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-hub-text1 mb-1">
                ¡Autorización exitosa!
              </h3>
              <p className="text-xs text-gray-500 dark:text-hub-text2 mb-2">
                Supervisor validó la limpieza de la {supervisorAuthModal.rampaShort}.
              </p>
              <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                Limpiando encargos y liberando rampa...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // VISTAS DE FASE 2: DEPÓSITO FÍSICO EN PASILLOS
  // ═══════════════════════════════════════════════════════════════════════════



  // Helpers de temas por pasillo
  const getAisleTheme = (p: PasilloType) => {
    switch (p) {
      case 'VERDE':
        return {
          badge:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          border: 'border-emerald-500',
          ring: 'ring-2 ring-emerald-500/50',
          btn: 'bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] hover:dark:bg-[#02D66B] text-white dark:text-[#303030]',
          lightBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
        };
      case 'AZUL':
        return {
          badge:
            'bg-blue-100 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-600',
          border: 'border-blue-500',
          ring: 'ring-2 ring-blue-500/50',
          btn: 'bg-blue-600 hover:bg-blue-700 text-white',
          lightBg: 'bg-blue-50/50 dark:bg-blue-950/20',
        };
      case 'ROJO':
      default:
        return {
          badge:
            'bg-rose-100 text-[#E11D48] dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dot: 'bg-rose-600',
          border: 'border-rose-500',
          ring: 'ring-2 ring-rose-500/50',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white',
          lightBg: 'bg-rose-50/50 dark:bg-rose-950/20',
        };
    }
  };

  // Paso 2: Depósito Físico en Pasillos (Kiosco Visual con Bloqueo de Pasillos durante Depósito)
  const renderValidateAisleQrView = () => {
    const isDepositing = phase === 'FASE_CONTEO_REGRESIVO';
    const activeBatch = aisleBatches[activePutawayAisle];

    // Verificar si todos los pasillos están completados
    const allCompleted =
      aisleBatches.AZUL.isCompleted &&
      aisleBatches.ROJO.isCompleted &&
      aisleBatches.VERDE.isCompleted;

    return (
      <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden animate-fadeIn w-full">
        {/* Barra Superior de Navegación y Resumen del Paso 2 (Solo Desktop) */}
        {!isPda && (
          <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl px-4 py-2.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider text-[#009D4E] dark:text-[#03F77C] shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>Paso 2 • Depósito Físico</span>
              </span>
              <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">•</span>

              {isDepositing ? (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>
                    Depósito en curso: Pasillo {activePutawayAisle} ({activeBatch.pendingItems.length} bultos restantes)
                  </span>
                </span>
              ) : allCompleted ? (
                <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Todos los pasillos completados al 100%!</span>
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 truncate">
                  Ruta sugerida: Pasillo {activePutawayAisle} ({activeBatch.pendingItems.length} bultos pendientes)
                </span>
              )}
            </div>
          </div>
        )}



        {/* ─── PASO 2: MASTER-DETAIL (PROPUESTA B DEFINITIVA) ─── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {(() => {
            const activeBatchRampas = Array.from(
              new Set([...activeBatch.pendingItems, ...activeBatch.depositedItems].map((i) => i.rampaLigada))
            ).sort((a, b) => {
              const aShort = a.split('-')[0].trim();
              const bShort = b.split('-')[0].trim();
              // 1. Si hay una rampa en encasillado activo, esa queda SIEMPRE fijada de primera arriba
              if (activeTargetRampaId) {
                if (aShort === activeTargetRampaId) return -1;
                if (bShort === activeTargetRampaId) return 1;
              }
              // 2. Orden natural numérico para las demás rampas
              const aNum = parseInt(aShort.replace(/\D/g, '') || '0', 10);
              const bNum = parseInt(bShort.replace(/\D/g, '') || '0', 10);
              return aNum - bNum;
            });
            const activeTheme = getAisleTheme(activePutawayAisle);

            return (
              <div className={isPda ? "flex flex-col gap-1.5 h-full min-h-0" : "flex flex-col gap-2.5 sm:gap-3 h-full min-h-0"}>
                {/* Master: Selector de Pasillos (Tabs en PDA, Fila de Cards en Desktop) */}
                {isPda ? (
                  <div className="grid grid-cols-3 gap-1.5 mb-1.5 shrink-0">
                    {(['AZUL', 'ROJO', 'VERDE'] as PasilloType[]).map((pKey) => {
                      const b = aisleBatches[pKey];
                      const isSelected = pKey === activePutawayAisle;
                      const isOtherAisleLocked = isDepositing && !isSelected;

                      // Estilos Opción 3: Pasillos listos descansan en gris neutro con check verde
                      const getPdaAisleStyles = () => {
                        if (isOtherAisleLocked) {
                          return 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-hub-surface/40 border-gray-200 dark:border-hub-border text-gray-400';
                        }
                        if (b.isCompleted) {
                          return isSelected
                            ? 'bg-gray-100 dark:bg-slate-800 border-2 border-gray-400 text-gray-700 dark:text-gray-200 font-bold'
                            : 'bg-gray-100/90 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400';
                        }
                        if (isSelected) {
                          if (pKey === 'AZUL') {
                            return 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-blue-400/40 text-[#2563EB] dark:bg-sky-950 dark:border-sky-700 dark:text-sky-300 font-bold';
                          }
                          if (pKey === 'ROJO') {
                            return 'bg-[#FFF0F2] border-[#E11D48] ring-2 ring-rose-400/40 text-[#E11D48] dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300 font-bold';
                          }
                          return 'bg-[#ECFDF5] border-[#059669] ring-2 ring-emerald-400/40 text-[#059669] dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 font-bold';
                        }
                        return 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2 hover:bg-gray-50';
                      };

                      return (
                        <button
                          key={pKey}
                          type="button"
                          disabled={isOtherAisleLocked}
                          onClick={() => {
                            if (isOtherAisleLocked) return;
                            setActivePutawayAisle(pKey);
                            setActiveTargetRampaId(null);
                          }}
                          className={`h-[34px] border rounded-xl px-1 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer ${getPdaAisleStyles()}`}
                        >
                          <span className="text-[9.5px] uppercase font-bold tracking-tight leading-none mb-0.5">
                            PASILLO {pKey}
                          </span>
                          <span className="text-[10px] font-mono font-black leading-none">
                            {b.isCompleted ? (
                              <span className={!isSelected ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}>
                                ✓ Listo
                              </span>
                            ) : isOtherAisleLocked ? (
                              '🔒 Bloq.'
                            ) : (
                              `${b.pendingItems.length} pend.`
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
                    {(['AZUL', 'ROJO', 'VERDE'] as PasilloType[]).map((pKey) => {
                      const b = aisleBatches[pKey];
                      const theme = getAisleTheme(pKey);
                      const isSelected = pKey === activePutawayAisle;
                      const isOtherAisleLocked = isDepositing && !isSelected;

                      const assignedRampasCount = Array.from(
                        new Set([...b.pendingItems, ...b.depositedItems].map((i) => i.rampaLigada))
                      ).length;

                      return (
                        <button
                          key={pKey}
                          type="button"
                          disabled={isOtherAisleLocked}
                          onClick={() => {
                            if (isOtherAisleLocked) return;
                            setActivePutawayAisle(pKey);
                            setActiveTargetRampaId(null);
                          }}
                          className={`h-11 px-3 sm:px-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 shadow-2xs ${
                            isOtherAisleLocked
                              ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-hub-surface/40 border-gray-200 dark:border-hub-border'
                              : b.isCompleted
                              ? isSelected
                                ? 'border-2 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 shadow-sm ring-2 ring-emerald-500/30 cursor-pointer'
                                : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800 hover:bg-emerald-50/80 hover:border-emerald-400 cursor-pointer'
                              : isSelected
                              ? `border-2 ${theme.border} bg-white dark:bg-hub-surface shadow-sm ring-2 ring-emerald-500/20 cursor-pointer`
                              : 'bg-white dark:bg-hub-surface border-gray-200/80 dark:border-hub-border hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${theme.badge} shrink-0`}>
                              PASILLO {pKey}
                            </span>
                            <span className={`text-[11px] truncate hidden md:inline ${b.isCompleted ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-medium text-gray-500 dark:text-hub-text2'}`}>
                              {assignedRampasCount} {assignedRampasCount === 1 ? 'rampa' : 'rampas'}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {b.isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                <span>Listo</span>
                              </span>
                            ) : isOtherAisleLocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                🔒 Bloqueado
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-black text-gray-700 dark:text-hub-text1">
                                {b.pendingItems.length} {b.pendingItems.length === 1 ? 'pend.' : 'pendientes'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Detail: Rampas del Pasillo Activo (Abajo tanto en Desktop como en PDA) */}
                <div className={isPda ? "flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-2.5 sm:p-3 flex flex-col" : "flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3.5 sm:p-4 flex flex-col"}>
                  <div className={`flex items-center justify-between ${isPda ? 'pb-1.5 mb-1.5' : 'pb-2 mb-2'} border-b border-gray-100 dark:border-hub-border shrink-0`}>
                    <div>
                      <h3 className={isPda ? "font-bold text-[13px] text-gray-900 dark:text-hub-text1" : "font-black text-base text-gray-900 dark:text-hub-text1"}>
                        Rampas de Pasillo {activePutawayAisle}
                      </h3>
                      {!isPda && (
                        <p className="text-[11px] text-gray-500 dark:text-hub-text2 mt-0.5">
                          {isDepositing && activeTargetRampaId
                            ? `Encasillando en ${activeTargetRampaId}. Las demás rampas están bloqueadas hasta terminar o pausar.`
                            : 'Escanea el QR de la rampa en la cual quieras comenzar el encasillado.'}
                        </p>
                      )}
                    </div>

                    {lastScannedDepositCode && isDepositing && (
                      <span className="hidden sm:inline-flex px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ✓ Último: {lastScannedDepositCode}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {activeBatchRampas.map((rampaFullName) => {
                      const rampaShort = rampaFullName.split('-')[0].trim();
                      const rampaSub = rampaFullName.split('-')[1]?.trim() || '';
                      const rampaPending = activeBatch.pendingItems.filter(
                        (i) => i.rampaLigada === rampaFullName || i.rampaLigada.startsWith(rampaShort)
                      );
                      const rampaDeposited = activeBatch.depositedItems.filter(
                        (i) => i.rampaLigada === rampaFullName || i.rampaLigada.startsWith(rampaShort)
                      );
                      const rampaTotal = rampaPending.length + rampaDeposited.length;
                      const rampaPercent = rampaTotal > 0 ? Math.round((rampaDeposited.length / rampaTotal) * 100) : 0;
                      const rampaDone = rampaPending.length === 0;
                      const isActiveRampa = isDepositing && activeTargetRampaId === rampaShort;
                      const isOtherRampaLocked = isDepositing && activeTargetRampaId !== null && activeTargetRampaId !== rampaShort;

                      // 1. Rampa Activa: Estación de trabajo expandida y compacta
                      if (isActiveRampa) {
                        return (
                          <div
                            key={rampaFullName}
                            className={`rounded-2xl border-2 ${activeTheme.border} ${activeTheme.lightBg} shadow-md flex flex-col gap-2.5 sm:gap-3 transition-colors ${
                              isPda ? 'p-3' : 'p-4 sm:p-5'
                            }`}
                          >
                            {/* Cabecera de la Rampa Activa */}
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
                              <div className="min-w-0 flex-1">
                                {isPda ? (
                                  <>
                                    <h4 className="font-black text-base text-gray-900 dark:text-hub-text1 whitespace-nowrap leading-tight">
                                      {rampaShort}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${activeTheme.badge} shrink-0`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.dot} animate-pulse`} />
                                        <span>Encasillado Activo</span>
                                      </span>
                                      {rampaSub && (
                                        <span className="text-[11px] text-gray-500 dark:text-hub-text2 truncate">
                                          • {rampaSub}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-base sm:text-lg text-gray-900 dark:text-hub-text1">
                                        {rampaShort}
                                      </h4>
                                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border ${activeTheme.badge}`}>
                                        <span className={`w-2 h-2 rounded-full ${activeTheme.dot} animate-pulse`} />
                                        <span>Encasillado Activo</span>
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-hub-text2 truncate mt-0.5">
                                      {rampaSub || 'Zona de distribución'}
                                    </p>
                                  </>
                                )}
                              </div>

                              {/* Acciones de Cabecera: Pistolear (solo desktop), Limpiar y Pausar */}
                              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {!isPda && rampaPending.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleProcessScanCountdown(rampaPending[0].codigoBarras26 || rampaPending[0].codigoEncargo)}
                                    className={`px-3 py-1.5 ${activeTheme.btn} font-extrabold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all`}
                                    title="Pistolear siguiente encargo"
                                  >
                                    <Scan className="w-3.5 h-3.5" />
                                    <span>Pistolear Encargo ({rampaPending[0].codigoOF9 ? `OF-${rampaPending[0].codigoOF9}` : rampaPending[0].codigoEncargo})</span>
                                  </button>
                                )}

                                {/* Botón de Limpieza en Step 2 (Dentro de la Rampa) */}
                                <button
                                  type="button"
                                  onClick={() => handleRequestClearRampa(rampaFullName)}
                                  className="h-8 px-2.5 sm:px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                                  title="Limpiar los encargos para quitarlos de esta rampa"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 stroke-[2.2]" />
                                  <span>Limpiar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhase('FASE_VALIDAR_UBICACION');
                                    setActiveTargetRampaId(null);
                                    triggerToast('Encasillado pausado. Selecciona otra rampa.', 'warning');
                                  }}
                                  className="h-8 px-2.5 sm:px-3.5 rounded-xl border border-gray-200 dark:border-hub-border bg-white dark:bg-hub-surface hover:bg-gray-50 dark:hover:bg-hub-elevated text-gray-700 dark:text-hub-text2 hover:text-gray-900 dark:hover:text-hub-text1 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                                  title="Pausar y cambiar a otra rampa"
                                >
                                  <Pause className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 stroke-[2.2]" />
                                  <span>Pausar</span>
                                </button>
                              </div>
                            </div>

                            {/* Mensaje de Instrucción Directa */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-950 dark:text-blue-100 text-xs font-semibold">
                              <span>📦</span>
                              <span>Escanea los encargos y déjalos en la rampa</span>
                            </div>

                            {/* Botón táctil ergonómico full-width en PDA */}
                            {isPda && rampaPending.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleProcessScanCountdown(rampaPending[0].codigoBarras26 || rampaPending[0].codigoEncargo)}
                                className={`w-full h-11 ${activeTheme.btn} font-extrabold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all`}
                              >
                                <Scan className="w-4 h-4 stroke-[2.5]" />
                                <span>Pistolear Encargo ({rampaPending[0].codigoOF9 ? `OF-${rampaPending[0].codigoOF9}` : rampaPending[0].codigoEncargo})</span>
                              </button>
                            )}

                            {/* Métricas compactas y Barra de Progreso */}
                            <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border space-y-1.5 sm:space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-gray-700 dark:text-hub-text1">
                                    Encargos a colocar: <span className="font-mono text-sm font-black text-gray-900 dark:text-hub-text1">{rampaTotal}</span>
                                  </span>
                                  <span className="text-gray-400 font-sans ml-1 text-[11px] sm:text-xs">
                                    ({rampaDeposited.length} listos • {rampaPending.length} pendientes)
                                  </span>
                                </div>
                                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border ${activeTheme.badge}`}>
                                  {rampaPercent}%
                                </span>
                              </div>

                              {/* Barra de progreso */}
                              <div className="w-full h-2 sm:h-2.5 bg-gray-100 dark:bg-hub-border rounded-full overflow-hidden p-0.5">
                                <div
                                  className={`h-full ${activeTheme.dot} rounded-full transition-all duration-500 ease-out`}
                                  style={{ width: `${rampaPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Mensaje de finalización de rampa si no quedan pendientes */}
                            {rampaPending.length === 0 && (
                              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>¡Todos los encargos de {rampaShort} fueron depositados!</span>
                              </div>
                            )}

                            {/* Lista de encargos a entregar en esta rampa con mini-scroll interno */}
                            <div className="space-y-1 pt-0.5 w-full">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-700 dark:text-hub-text1 text-[11px] sm:text-xs">
                                  Encargos a entregar en esta rampa ({rampaTotal}):
                                </span>
                                {rampaTotal > 4 && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    Desliza para ver {rampaTotal} encargos ↕
                                  </span>
                                )}
                              </div>

                              {/* Mini scroll interno: muestra 5 encargos sin expandir la pantalla */}
                              <div className={`space-y-1.5 ${isPda ? 'max-h-[150px]' : 'max-h-[205px]'} overflow-y-auto w-full [scrollbar-width:thin]`}>
                                {[...rampaPending, ...rampaDeposited].map((item) => {
                                  const isItemDone = rampaDeposited.some((d) => d.id === item.id);
                                  return (
                                    <div
                                      key={item.id}
                                      className={`w-full p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 shadow-2xs ${
                                        isItemDone
                                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                                          : 'bg-white dark:bg-hub-elevated/90 border-gray-200/90 dark:border-hub-border hover:border-gray-300 dark:hover:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className={`font-mono font-bold text-xs sm:text-[13px] truncate ${
                                          isItemDone
                                            ? 'text-emerald-900 dark:text-emerald-200 line-through opacity-70'
                                            : 'text-[#414745] dark:text-hub-text1'
                                        }`}>
                                          {item.codigoBarras26 || item.codigoEncargo}
                                        </span>
                                        <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-hub-text2">
                                          OF: {item.codigoOF9 || '382104712'}
                                        </span>
                                      </div>

                                      {isItemDone ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs shrink-0 font-sans">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          <span>Depositado</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs shrink-0 font-sans">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                          <span>Pendiente</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. Rampa Bloqueada / Deshabilitada (mientras otra está activa)
                      if (isOtherRampaLocked) {
                        return (
                          <div
                            key={rampaFullName}
                            className={`rounded-2xl border border-gray-200/50 dark:border-hub-border/50 bg-gray-50/40 dark:bg-hub-surface/40 opacity-45 flex items-center justify-between gap-2.5 sm:gap-3 cursor-not-allowed ${
                              isPda ? 'py-2 px-3' : 'p-3.5'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <h4 className="font-extrabold text-xs sm:text-sm text-gray-500 dark:text-hub-text2">
                                  {rampaShort}
                                </h4>
                                <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-hub-elevated text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Bloqueada</span>
                                </span>
                              </div>
                              {!isPda && <p className="text-xs text-gray-400 truncate mt-0.5">{rampaSub}</p>}
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              <div className="text-right flex flex-col items-end justify-center min-w-[45px] sm:min-w-[58px]">
                                <span className="font-mono font-black text-base sm:text-xl text-gray-400 leading-none">
                                  {rampaPending.length}
                                </span>
                                <span className="text-[10px] sm:text-[11px] text-gray-400 block font-medium mt-0.5">
                                  {rampaPending.length === 1 ? 'pendiente' : 'pendientes'}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled
                                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-gray-200 dark:bg-hub-elevated text-gray-400 font-bold rounded-xl text-xs flex items-center gap-1 cursor-not-allowed opacity-60"
                              >
                                <Lock className="w-3 h-3" />
                                <span className="text-[11px] sm:text-xs">En espera</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // 3. Rampa Normal o Completada
                      return (
                        <div
                          key={rampaFullName}
                          className={`p-3 sm:p-4 rounded-2xl border flex items-center justify-between gap-2.5 sm:gap-3 transition-colors ${
                            rampaDone
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200'
                              : 'bg-gray-50 dark:bg-hub-elevated border-gray-200/70 dark:border-hub-border hover:border-gray-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-hub-text1">{rampaShort}</h4>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                                {rampaPending.length} {rampaPending.length === 1 ? 'pendiente' : 'pendientes'}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5">{rampaSub}</p>
                          </div>

                          {rampaDone ? (
                            <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>✓ Lista</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTargetRampaId(rampaShort);
                                setActiveAisleQrModal(activePutawayAisle);
                              }}
                              className={`h-7 px-3.5 ${activeTheme.btn} font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all shrink-0`}
                            >
                              <span>Encasillar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Banner de Finalización de Lote */}
        {allCompleted && (
          <div className="shrink-0 p-3 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-200 truncate">
                  ¡Lote de Encasillado Completado al 100%!
                </h4>
                <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  Todos los bultos fueron depositados correctamente en sus rampas correspondientes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPhase('FASE_RESUMEN_FINAL')}
              className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer shrink-0"
            >
              Ver Resumen Final
            </button>
          </div>
        )}

        {/* Popup Modal de Validación QR de Pasillo */}
        {activeAisleQrModal && (() => {
          const modalBatch = aisleBatches[activeAisleQrModal];
          const modalTheme = getAisleTheme(activeAisleQrModal);
          const modalTargetCode = activeTargetRampaId
            ? `RAMPA-${activeTargetRampaId.replace(/\D/g, '')}`
            : `PASILLO-${activeAisleQrModal}`;
          const displayRampaName = activeTargetRampaId || modalBatch.rampa.split('-')[0].trim();

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-sans">
              <div className="bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
                {/* Botón Cerrar X */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAisleQrModal(null);
                    setActiveTargetRampaId(null);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-hub-elevated transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Ícono de QR temático */}
                <div
                  className={`w-20 h-20 rounded-3xl ${modalTheme.lightBg} border ${modalTheme.border}/40 flex items-center justify-center mx-auto mb-4 shadow-xs`}
                >
                  <QrCode
                    className={`w-10 h-10 stroke-[2.2] ${
                      activeAisleQrModal === 'VERDE'
                        ? 'text-[#009D4E] dark:text-[#03F77C]'
                        : activeAisleQrModal === 'AZUL'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  />
                </div>

                {/* Badge de Pasillo */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border mb-3 inline-block ${modalTheme.badge}`}
                >
                  PASILLO {activeAisleQrModal} • ACCIÓN REQUERIDA
                </span>

                {/* Título */}
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-hub-text1 leading-tight mb-1">
                  Escanear QR de {displayRampaName.toLowerCase().startsWith('rampa') ? displayRampaName : `Rampa ${displayRampaName}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-hub-text2 mb-4 leading-relaxed">
                  Acércate con el carro a la entrada del pasillo y pistolea el código QR físico para iniciar el depósito.
                </p>

                {/* Caja con detalles de Rampa y Bultos */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200/80 dark:border-hub-border text-left mb-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-hub-text1 mb-1">
                    <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{displayRampaName}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-hub-text2 truncate pl-6 mb-3">
                    {modalBatch.rampa.split('-')[1]?.trim() || 'Zona de distribución'}
                  </p>

                  <div className="pt-2 border-t border-gray-200/60 dark:border-hub-border flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400 font-sans">Bultos en carro:</span>
                    <span className="font-bold text-gray-800 dark:text-hub-text1">
                      {modalBatch.pendingItems.length} bultos
                    </span>
                  </div>

                  <div className="pt-2 mt-1 border-t border-gray-200/60 dark:border-hub-border flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400 font-sans">Código QR rampa:</span>
                    <span className="font-black px-2 py-0.5 rounded-lg bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border text-gray-800 dark:text-hub-text1">
                      {modalTargetCode}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleValidateLocationQr(modalTargetCode)}
                    className={`w-full py-3.5 ${modalTheme.btn} font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer`}
                  >
                    <Scan className="w-4 h-4" />
                    <span>Confirmar y Comenzar Depósito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAisleQrModal(null);
                      setActiveTargetRampaId(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-hub-border hover:bg-gray-50 dark:hover:bg-hub-elevated text-gray-600 dark:text-hub-text2 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar y elegir otro pasillo
                  </button>
                </div>
              </div>
            </div>
          );
        })()}


      </div>
    );
  };

  // Paso 2.4: Pasillo Actual Completado
  const renderAisleCompleteView = () => {
    const batch = aisleBatches[activePutawayAisle];

    return (
      <div className="max-w-md mx-auto bg-white dark:bg-hub-surface border border-gray-200 dark:border-hub-border rounded-3xl p-6 sm:p-8 shadow-sm text-center animate-fadeIn font-sans">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm animate-scaleUp">
          <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
        </div>

        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
          ¡Excelente Trabajo!
        </span>
        <h2 className="text-2xl font-black text-[#414745] dark:text-hub-text1 mb-2 tracking-tight">
          Pasillo {activePutawayAisle} Completado
        </h2>
        <p className="text-xs text-gray-500 dark:text-hub-text2 mb-6">
          Se han colocado <strong className="text-[#414745] dark:text-hub-text1 font-bold">{batch.depositedItems.length} bultos</strong> correctamente en sus casilleros de destino.
        </p>

        {batch.incidencias > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 mb-6 text-left">
            <strong>Nota de auditoría:</strong> Se registraron {batch.incidencias} bultos con incidencia en este pasillo.
          </div>
        )}

        <div className="space-y-3">
          {nextPendingAisle ? (
            <button
              type="button"
              onClick={() => {
                setActivePutawayAisle(nextPendingAisle);
                setPhase('FASE_VALIDAR_UBICACION');
              }}
              className="w-full h-12 bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] hover:dark:bg-[#02D66B] text-white dark:text-[#303030] font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continuar con Pasillo {nextPendingAisle} ({aisleBatches[nextPendingAisle].pendingItems.length} pendientes)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPhase('FASE_RESUMEN_FINAL')}
              className="w-full h-12 bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] hover:dark:bg-[#02D66B] text-white dark:text-[#303030] font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PackageCheck className="w-5 h-5" />
              <span>Ver Resumen Consolidado de Encasillado</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (nextPendingAisle) {
                setActivePutawayAisle(nextPendingAisle);
                setPhase('FASE_VALIDAR_UBICACION');
              } else {
                setPhase('FASE_CLASIFICACION');
              }
            }}
            className="w-full h-10 border border-gray-200 dark:border-hub-border text-gray-600 dark:text-hub-text2 hover:bg-gray-50 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
          >
            {nextPendingAisle ? 'Escanear otro pasillo' : 'Volver al Paso 1 (Clasificación)'}
          </button>
        </div>
      </div>
    );
  };

  // Paso 2.5: Resumen Final Consolidado (Paso 3)
  const renderResumenFinalView = () => {
    const totalDepositados =
      aisleBatches.VERDE.depositedItems.length +
      aisleBatches.AZUL.depositedItems.length +
      aisleBatches.ROJO.depositedItems.length;

    const totalIncidencias =
      aisleBatches.VERDE.incidencias + aisleBatches.AZUL.incidencias + aisleBatches.ROJO.incidencias;

    return (
      <div className={isPda ? "h-full flex flex-col w-full min-h-0" : "flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden animate-fadeIn w-full"}>
        {/* Barra Superior de Navegación y Resumen del Paso 3 (Solo Desktop) */}
        {!isPda && (
          <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl px-4 py-2.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider text-[#009D4E] dark:text-[#03F77C] shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paso 3 • Finalizado</span>
              </span>
              <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 truncate">
                Encasillado completado con éxito ({totalDepositados} {totalDepositados === 1 ? 'bulto depositado' : 'bultos depositados'})
              </span>
            </div>
          </div>
        )}

        {/* Tarjeta Principal de Resumen a Ancho Completo sin scroll */}
        <div className={`w-full flex-1 min-h-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border ${isPda ? 'rounded-2xl p-3' : 'rounded-2xl p-4 sm:p-5'} shadow-xs flex flex-col justify-between text-center font-sans overflow-hidden`}>
          {/* Header con Ícono y Título */}
          <div
            className={
              isPda
                ? 'flex flex-col items-center text-center max-w-md mx-auto shrink-0 pt-0.5'
                : 'flex items-center gap-3.5 text-left max-w-3xl mx-auto w-full shrink-0 mb-1'
            }
          >
            <div className={`${isPda ? 'w-10 h-10 mb-1.5 rounded-xl' : 'w-11 h-11 rounded-xl'} shrink-0 bg-[#009D4E]/15 dark:bg-[#009D4E]/25 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center border border-[#009D4E]/30 shadow-2xs`}>
              <PackageCheck className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#009D4E] dark:text-[#03F77C] block leading-none mb-1">
                Proceso Finalizado con Éxito
              </span>
              <h2 className={`${isPda ? 'text-base' : 'text-lg sm:text-xl'} font-bold text-[#414745] dark:text-hub-text1 leading-tight tracking-tight mb-0.5`}>
                Encasillado completo
              </h2>
              <p className={`${isPda ? 'text-[11px] max-w-xs mx-auto' : 'text-xs'} text-gray-500 dark:text-hub-text2 leading-tight`}>
                Todos los bultos han sido distribuidos físicamente y registrados en el sistema WMS.
              </p>
            </div>
          </div>

          {/* Métrica Global */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-3xl mx-auto w-full shrink-0">
            <div className={`${isPda ? 'p-2.5 rounded-xl' : 'p-3 rounded-xl'} bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 text-left flex items-center justify-between shadow-2xs`}>
              <div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
                  Total Encasillados
                </span>
                <span className={`${isPda ? 'text-xl' : 'text-xl sm:text-2xl'} font-black font-mono text-emerald-800 dark:text-emerald-100 leading-none`}>
                  {totalDepositados}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Box className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
            </div>

            <div className={`${isPda ? 'p-2.5 rounded-xl' : 'p-3 rounded-xl'} ${
              totalIncidencias > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-hub-elevated border border-gray-100 dark:border-hub-border'
            } text-left flex items-center justify-between shadow-2xs`}>
              <div>
                <span className={`text-[11px] ${
                  totalIncidencias > 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 dark:text-hub-text2'
                } font-bold block mb-1`}>
                  Incidencias
                </span>
                <span className={`${isPda ? 'text-xl' : 'text-xl sm:text-2xl'} font-black font-mono ${
                  totalIncidencias > 0
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-gray-800 dark:text-hub-text1'
                } leading-none`}>
                  {totalIncidencias}
                </span>
              </div>
              <div className={`w-7 h-7 rounded-lg ${
                totalIncidencias > 0
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
                  : 'bg-gray-100 dark:bg-hub-surface text-gray-400'
              } flex items-center justify-center shrink-0`}>
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Desglose por Pasillos (3 Columnas armónicas) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-3xl mx-auto w-full text-left shrink-0">
            {(['AZUL', 'ROJO', 'VERDE'] as PasilloType[]).map((pKey) => {
              const b = aisleBatches[pKey];
              const theme = getAisleTheme(pKey);
              return (
                <div
                  key={pKey}
                  className={`${isPda ? 'p-2 rounded-xl' : 'p-2.5 sm:p-3 rounded-xl'} bg-gray-50/70 dark:bg-hub-elevated/60 border border-gray-200/80 dark:border-hub-border flex flex-col justify-between gap-1 shadow-2xs`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${theme.badge} whitespace-nowrap`}>
                      {isPda ? pKey : `PASILLO ${pKey}`}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5] text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <div>
                    <span className={`${isPda ? 'text-base' : 'text-base sm:text-lg'} font-black font-mono text-[#414745] dark:text-hub-text1 block leading-none mb-0.5`}>
                      {b.depositedItems.length}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-hub-text2 block leading-none">
                      {b.depositedItems.length === 1 ? 'depositado' : 'depositados'}
                    </span>
                    {b.incidencias > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5 leading-none">
                        {b.incidencias} incidencias
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón de Acción Centrado */}
          <div className="flex justify-center w-full shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setEncargosList([]);
                setAisleBatches({
                  AZUL: {
                    pasillo: 'AZUL',
                    rampa: 'Rampa 24 - Puerto Montt (Chiloé / Los Lagos)',
                    total: 0,
                    pendingItems: [],
                    depositedItems: [],
                    isCompleted: false,
                    incidencias: 0,
                  },
                  ROJO: {
                    pasillo: 'ROJO',
                    rampa: 'Rampa 01 - Salida Norte (Santiago / V Región)',
                    total: 0,
                    pendingItems: [],
                    depositedItems: [],
                    isCompleted: false,
                    incidencias: 0,
                  },
                  VERDE: {
                    pasillo: 'VERDE',
                    rampa: 'Rampa 12 - Concepción (Biobío / Temuco)',
                    total: 0,
                    pendingItems: [],
                    depositedItems: [],
                    isCompleted: false,
                    incidencias: 0,
                  },
                });
                setActiveTargetRampaId(null);
                setPhase('FASE_CLASIFICACION');
                triggerToast('Listo para iniciar un nuevo lote de encasillado.', 'success');
              }}
              className={`w-full sm:w-auto sm:min-w-[280px] h-10 text-xs rounded-xl bg-[#009D4E] hover:bg-[#008743] dark:bg-[#03F77C] hover:dark:bg-[#02D66B] text-white dark:text-[#303030] font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Iniciar Nuevo Encasillado</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER MODO PDA (DISPOSITIVO MÓVIL RUGGED)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isPda) {
    return (
      <div className="flex flex-col h-full bg-[#FAFDFC] dark:bg-hub-base text-gray-900 dark:text-gray-100 select-none overflow-hidden relative font-sans">
        {renderExitConfirmationModal()}
        {renderIncidenciaModal()}
        {renderUnencasillableModal()}
        {renderSupervisorAuthModal()}

        {/* Input invisible para enfocar disparos de láser físico */}
        <input
          ref={scanInputRef}
          type="text"
          className="absolute -top-96 opacity-0 pointer-events-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value;
              if (val.trim()) {
                handleUniversalScan(val);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />

        {/* Contenido según Fase Activa */}
        {(phase === 'FASE_SELECCION_PASILLO' || phase === 'FASE_VALIDAR_UBICACION' || phase === 'FASE_CONTEO_REGRESIVO') && (
          <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 flex flex-col w-full">
            {renderValidateAisleQrView()}
          </div>
        )}

        {phase === 'FASE_PASILLO_COMPLETO' && (
          <div className="flex-1 overflow-y-auto p-3 flex items-center justify-center">
            {renderAisleCompleteView()}
          </div>
        )}

        {phase === 'FASE_RESUMEN_FINAL' && (
          <div className="flex-1 pt-3 pb-2 px-3 flex flex-col min-h-0 overflow-hidden">
            {renderResumenFinalView()}
          </div>
        )}

        {/* FASE 1: CLASIFICACIÓN PDA */}
        {phase === 'FASE_CLASIFICACION' && (
          <div className="flex-1 flex flex-col min-h-0 p-3">

            {/* 1. Barra de Escaneo y Switch para Quitar (Arriba) */}
                <div className="bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl p-3 mb-2.5 shadow-xs shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#414745] dark:text-hub-text1 flex items-center gap-1.5 font-sans">
                      <Scan className="w-4 h-4 text-[#009D4E]" /> Escanear encargo
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-gray-500 dark:text-hub-text2 font-semibold">Quitar encargo</span>
                      <input
                        type="checkbox"
                        checked={isRemoveMode}
                        onChange={(e) => setIsRemoveMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-600 relative"></div>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRemoveMode) {
                          if (encargosList.length > 0) {
                            const randomIndex = Math.floor(Math.random() * encargosList.length);
                            handleUniversalScan(encargosList[randomIndex].codigoEncargo);
                          } else {
                            triggerToast('No hay encargos en la lista para eliminar', 'warning');
                          }
                        } else {
                          const { codigo26 } = generateStarkenCodes();
                          handleUniversalScan(codigo26);
                        }
                      }}
                      className={`flex-1 h-10 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 font-sans text-white ${
                        isRemoveMode ? 'bg-[#E11D48] hover:bg-[#BE123C]' : 'bg-[#009D4E] hover:bg-[#008743]'
                      }`}
                    >
                      <Scan className="w-4 h-4" />
                      <span>{isRemoveMode ? 'Eliminar Uno' : 'Simular Escaneo'}</span>
                    </button>
                    {!isRemoveMode && (
                      <button
                        type="button"
                        onClick={() => handleUniversalScan('NO-ENC-99')}
                        className="h-10 px-2.5 border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                        title="Probar caso borde: Bulto no encasillable (Tobogán N° 99)"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Caso Borde</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Pestañas de Pasillos con Animación de Iluminación Flash (Abajo del escaneo) */}
                <div className="grid grid-cols-3 gap-2 mb-2 shrink-0">
                  <button
                    onClick={() => setActivePdaTab('AZUL')}
                    className={`h-[40px] border rounded-xl px-1 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                      activeFlashPasillo === 'AZUL'
                        ? 'bg-blue-100 dark:bg-blue-950 border-2 border-[#2563EB] ring-4 ring-blue-500/50 shadow-lg shadow-blue-500/30 scale-105 text-[#2563EB] dark:text-sky-300 font-black'
                        : activePdaTab === 'AZUL'
                        ? 'bg-[#EFF6FF] border-[#2563EB] ring-2 ring-blue-400/40 text-[#2563EB] dark:bg-sky-950 dark:border-sky-700 dark:text-sky-300 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-tight leading-none mb-0.5">PASILLO AZUL</span>
                    <span className="text-sm font-mono font-black leading-none">{countsByPasillo.AZUL}</span>
                  </button>

                  <button
                    onClick={() => setActivePdaTab('ROJO')}
                    className={`h-[40px] border rounded-xl px-1 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                      activeFlashPasillo === 'ROJO'
                        ? 'bg-rose-100 dark:bg-rose-950 border-2 border-[#E11D48] ring-4 ring-rose-500/50 shadow-lg shadow-rose-500/30 scale-105 text-[#E11D48] dark:text-rose-300 font-black'
                        : activePdaTab === 'ROJO'
                        ? 'bg-[#FFF0F2] border-[#E11D48] ring-2 ring-rose-400/40 text-[#E11D48] dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-tight leading-none mb-0.5">PASILLO ROJO</span>
                    <span className="text-sm font-mono font-black leading-none">{countsByPasillo.ROJO}</span>
                  </button>

                  <button
                    onClick={() => setActivePdaTab('VERDE')}
                    className={`h-[40px] border rounded-xl px-1 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                      activeFlashPasillo === 'VERDE'
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-2 border-[#059669] ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-500/30 scale-105 text-[#059669] dark:text-emerald-300 font-black'
                        : activePdaTab === 'VERDE'
                        ? 'bg-[#ECFDF5] border-[#059669] ring-2 ring-emerald-400/40 text-[#059669] dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 dark:bg-hub-surface dark:border-hub-border dark:text-hub-text2 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-tight leading-none mb-0.5">PASILLO VERDE</span>
                    <span className="text-sm font-mono font-black leading-none">{countsByPasillo.VERDE}</span>
                  </button>
                </div>

                {/* Lista de Encargos del Pasillo Activo con Iluminación Flash Reactiva */}
                <div
                  className={`flex-1 min-h-0 bg-white dark:bg-hub-surface border rounded-2xl p-3 shadow-xs flex flex-col mb-3 transition-all duration-300 ${
                    activeFlashPasillo === activePdaTab
                      ? activePdaTab === 'VERDE'
                        ? 'border-2 border-[#059669] ring-4 ring-emerald-500/30 shadow-lg shadow-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/40'
                        : activePdaTab === 'ROJO'
                        ? 'border-2 border-[#E11D48] ring-4 ring-rose-500/30 shadow-lg shadow-rose-500/20 bg-rose-50/30 dark:bg-rose-950/40'
                        : 'border-2 border-[#2563EB] ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/20 bg-blue-50/30 dark:bg-blue-950/40'
                      : 'border-gray-200/80 dark:border-hub-border'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-hub-border shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          activePdaTab === 'VERDE'
                            ? 'bg-[#059669]'
                            : activePdaTab === 'ROJO'
                            ? 'bg-[#E11D48]'
                            : 'bg-[#2563EB]'
                        } ${activeFlashPasillo === activePdaTab ? 'animate-ping' : ''}`}
                      />
                      <span className="text-xs font-bold text-[#414745] dark:text-hub-text1">
                        Pasillo {activePdaTab}
                      </span>
                      {activeFlashPasillo === activePdaTab && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md animate-pulse ${
                            activePdaTab === 'VERDE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300'
                              : activePdaTab === 'ROJO'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300'
                          }`}
                        >
                          ✓ ¡Asignado!
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-hub-text2">
                      {encargosList.filter((i) => i.pasilloAsignado === activePdaTab).length} bultos
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 [scrollbar-width:none]">
                    {encargosList.filter((i) => i.pasilloAsignado === activePdaTab).length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-gray-400 gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-hub-elevated border border-gray-200/70 dark:border-hub-border flex items-center justify-center text-gray-400">
                          <Box className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="font-semibold text-gray-600 dark:text-hub-text2">
                          No hay encargos en Pasillo {activePdaTab}
                        </span>
                        <span className="text-[11px] text-gray-400 max-w-xs">
                          Escanea o pistolea un encargo para asignarlo a su pasillo.
                        </span>
                      </div>
                    ) : (
                      encargosList.filter((i) => i.pasilloAsignado === activePdaTab).map(renderPackageItem)
                    )}
                  </div>
                </div>

            {/* BOTÓN INFERIOR: ENCASILLAR */}
            <div className="shrink-0 pt-1">
              <button
                type="button"
                disabled={encargosList.length === 0}
                onClick={handleStartEncasillado}
                className={`w-full h-12 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all font-sans ${
                  encargosList.length === 0
                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:active:bg-[#02B55A] dark:text-[#303030] cursor-pointer active:scale-[0.98]'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>
                  {encargosList.length === 0
                    ? 'Encasillar (0 bultos)'
                    : `Encasillar (${encargosList.length} bultos)`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal de Ubicación QR */}
        <LocationQrModal
          isOpen={isLocationModalOpen}
          onSelectLocation={(ubicacion) => {
            setActiveLocation(ubicacion);
            setIsLocationModalOpen(false);
            triggerToast(`Ubicación cambiada a ${ubicacion.nombreEstacion}`, 'success');
            playSuccessSound();
          }}
          onClose={() => setIsLocationModalOpen(false)}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER MODO DESKTOP (PC)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col p-4 sm:p-5 max-w-7xl mx-auto w-full gap-3 sm:gap-4 overflow-hidden animate-fadeIn relative font-sans">
      {renderExitConfirmationModal()}
      {renderIncidenciaModal()}
      {renderUnencasillableModal()}
      {renderSupervisorAuthModal()}

      {/* Input invisible para lectores USB o de teclado */}
      <input
        ref={scanInputRef}
        type="text"
        className="absolute -top-96 opacity-0 pointer-events-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value;
            if (val.trim()) {
              handleUniversalScan(val);
              (e.target as HTMLInputElement).value = '';
            }
          }
        }}
      />

      {/* Stepper de Círculos idéntico a Despacho */}
      <div className="flex flex-col items-center w-full pb-1 shrink-0">
        <div className="flex items-center justify-between w-full max-w-md sm:max-w-lg px-4 relative">
          {[
            { num: 1, label: 'Clasificación' },
            { num: 2, label: 'Depósito en Pasillos' },
            { num: 3, label: 'Finalizado' },
          ].map((s, idx) => {
            const currentStepNum =
              phase === 'FASE_CLASIFICACION' ? 1 : phase === 'FASE_RESUMEN_FINAL' ? 3 : 2;
            const isActive = currentStepNum === s.num;
            const isPassed = currentStepNum > s.num;

            return (
              <React.Fragment key={s.num}>
                {/* Línea conectora entre círculos */}
                {idx > 0 && (
                  <div
                    className={`flex-1 h-[2px] mx-3 transition-colors duration-300 ${
                      currentStepNum >= s.num
                        ? 'bg-[#303030] dark:bg-emerald-500'
                        : 'bg-gray-300 dark:bg-slate-700'
                    }`}
                  />
                )}

                {/* Círculo del Step interactivo */}
                <button
                  type="button"
                  onClick={() => {
                    if (s.num === 1) {
                      setPhase('FASE_CLASIFICACION');
                      triggerToast('Regresaste al Paso 1: Clasificación de encargos.', 'success');
                    } else if (s.num === 2 && encargosList.length > 0) {
                      setPhase('FASE_VALIDAR_UBICACION');
                    } else if (
                      s.num === 3 &&
                      aisleBatches.VERDE.isCompleted &&
                      aisleBatches.AZUL.isCompleted &&
                      aisleBatches.ROJO.isCompleted
                    ) {
                      setPhase('FASE_RESUMEN_FINAL');
                    }
                  }}
                  disabled={
                    (s.num === 2 && encargosList.length === 0) ||
                    (s.num === 3 &&
                      !(
                        aisleBatches.VERDE.isCompleted &&
                        aisleBatches.AZUL.isCompleted &&
                        aisleBatches.ROJO.isCompleted
                      ))
                  }
                  className={`flex flex-col items-center relative group transition-transform ${
                    s.num === 1 || (s.num === 2 && encargosList.length > 0)
                      ? 'cursor-pointer hover:scale-105 active:scale-95'
                      : 'cursor-default'
                  }`}
                  title={
                    s.num === 1
                      ? 'Volver al Paso 1: Clasificación'
                      : s.num === 2
                      ? 'Ir al Paso 2: Depósito en Pasillos'
                      : 'Paso 3: Finalizado'
                  }
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-bold text-xs ${
                      isActive
                        ? 'bg-[#303030] text-white ring-4 ring-[#303030]/20 dark:ring-emerald-500/30 dark:bg-emerald-500'
                        : isPassed
                        ? 'bg-[#009D4E] text-white border-2 border-[#009D4E]'
                        : 'bg-white dark:bg-hub-elevated border-2 border-gray-300 dark:border-hub-border text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    {isActive ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#303030] dark:bg-emerald-600" />
                      </div>
                    ) : isPassed ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{`0${s.num}`}</span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold mt-2 font-sans transition-colors text-center ${
                      isActive
                        ? 'text-[#303030] dark:text-hub-text1 font-extrabold'
                        : isPassed
                        ? 'text-[#009D4E] group-hover:underline'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* RENDER DE FASES EN DESKTOP */}
      {(phase === 'FASE_SELECCION_PASILLO' || phase === 'FASE_VALIDAR_UBICACION' || phase === 'FASE_CONTEO_REGRESIVO') &&
        renderValidateAisleQrView()}
      {phase === 'FASE_PASILLO_COMPLETO' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
          {renderAisleCompleteView()}
        </div>
      )}
      {phase === 'FASE_RESUMEN_FINAL' && renderResumenFinalView()}

      {/* FASE 1 EN DESKTOP: CLASIFICACIÓN */}
      {phase === 'FASE_CLASIFICACION' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden">
          {/* Barra Superior de Navegación y Resumen del Paso 1 (Desktop) */}
          <div className="shrink-0 bg-white dark:bg-hub-surface border border-gray-200/80 dark:border-hub-border rounded-2xl px-4 py-2.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider text-[#009D4E] dark:text-[#03F77C] shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>Paso 1 • Clasificación</span>
              </span>
              <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">•</span>

              {encargosList.length === 0 ? (
                <span className="text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 truncate">
                  Esperando escaneo de bultos (0 bultos clasificados)
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#414745] dark:text-hub-text1 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>
                    Total clasificado: {encargosList.length} {encargosList.length === 1 ? 'bulto' : 'bultos'} ({countsByPasillo.AZUL} Azul • {countsByPasillo.ROJO} Rojo • {countsByPasillo.VERDE} Verde)
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-hub-elevated border border-gray-200 dark:border-hub-border">
                <span className="text-[11px] text-gray-600 dark:text-hub-text2 font-bold">Quitar encargo</span>
                <input
                  type="checkbox"
                  checked={isRemoveMode}
                  onChange={(e) => setIsRemoveMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-rose-600 relative"></div>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (isRemoveMode) {
                    if (encargosList.length > 0) {
                      const randomIndex = Math.floor(Math.random() * encargosList.length);
                      handleUniversalScan(encargosList[randomIndex].codigoEncargo);
                    } else {
                      triggerToast('No hay bultos para eliminar', 'warning');
                    }
                  } else {
                    const { codigo26 } = generateStarkenCodes();
                    handleUniversalScan(codigo26);
                  }
                }}
                className={`h-8 px-3.5 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 text-white cursor-pointer ${
                  isRemoveMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#009D4E] hover:bg-[#008743]'
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Simular Escaneo (26 Dígitos)</span>
              </button>

              {!isRemoveMode && (
                <button
                  type="button"
                  onClick={() => {
                    handleUniversalScan('NO-ENC-99');
                  }}
                  className="h-8 px-2.5 font-bold rounded-xl text-xs border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Probar caso borde: Bulto no encasillable (Tobogán N° 99)"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Caso Borde (Tobogán 99)</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Columnas de Pasillos en Desktop proporcionales con scroll interno */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 overflow-hidden">
            {/* Columna Pasillo Azul */}
            {renderPasilloCard(
              'AZUL',
              'Pasillo Azul',
              {
                bgCard: 'bg-white dark:bg-hub-surface',
                borderNormal: 'border-blue-200/80 dark:border-blue-900/60 bg-white dark:bg-hub-surface',
                borderFlash: 'border-[#2563EB] ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20 bg-blue-50/30 dark:bg-blue-950/50',
                badgeBg: 'bg-blue-100 dark:bg-blue-950',
                badgeText: 'text-[#2563EB] dark:text-blue-300',
                badgeBorder: 'border-blue-200 dark:border-blue-800',
                emptyBg: 'bg-blue-50/30 dark:bg-blue-950/20',
                emptyBorder: 'border-blue-100 dark:border-blue-900/40',
                emptyText: 'text-blue-600 dark:text-blue-400',
              }
            )}

            {/* Columna Pasillo Rojo */}
            {renderPasilloCard(
              'ROJO',
              'Pasillo Rojo',
              {
                bgCard: 'bg-white dark:bg-hub-surface',
                borderNormal: 'border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-hub-surface',
                borderFlash: 'border-[#E11D48] ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/20 bg-rose-50/30 dark:bg-rose-950/50',
                badgeBg: 'bg-rose-100 dark:bg-rose-950',
                badgeText: 'text-[#E11D48] dark:text-rose-300',
                badgeBorder: 'border-rose-200 dark:border-rose-800',
                emptyBg: 'bg-rose-50/30 dark:bg-rose-950/20',
                emptyBorder: 'border-rose-100 dark:border-rose-900/40',
                emptyText: 'text-rose-600 dark:text-rose-400',
              }
            )}

            {/* Columna Pasillo Verde */}
            {renderPasilloCard(
              'VERDE',
              'Pasillo Verde',
              {
                bgCard: 'bg-white dark:bg-hub-surface',
                borderNormal: 'border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-hub-surface',
                borderFlash: 'border-[#059669] ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/50',
                badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
                badgeText: 'text-[#059669] dark:text-emerald-300',
                badgeBorder: 'border-emerald-200 dark:border-emerald-800',
                emptyBg: 'bg-emerald-50/30 dark:bg-emerald-950/20',
                emptyBorder: 'border-emerald-100 dark:border-emerald-900/40',
                emptyText: 'text-emerald-600 dark:text-emerald-400',
              }
            )}
          </div>

          {/* BARRA INFERIOR FIJA: BOTÓN ENCASILLAR */}
          <div className="shrink-0 bg-white/95 dark:bg-hub-surface/95 backdrop-blur-md border border-gray-200 dark:border-hub-border rounded-3xl p-3 sm:p-4 shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#009D4E] dark:text-[#03F77C] flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shrink-0">
                <Box className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#414745] dark:text-hub-text1 block truncate">
                  {encargosList.length === 0
                    ? 'Sin bultos clasificados para encasillar'
                    : `${encargosList.length} bultos listos para ubicar físicamente`}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-hub-text2 truncate block">
                  Al presionar Encasillar, pasarás a la ruta de guardado por pasillos.
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={encargosList.length === 0}
              onClick={handleStartEncasillado}
              className={`h-11 px-6 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2.5 transition-all shrink-0 ${
                encargosList.length === 0
                  ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#303030] hover:bg-[#1f1f1f] active:bg-black text-white dark:bg-[#03F77C] hover:dark:bg-[#02D66B] dark:active:bg-[#02B55A] dark:text-[#303030] cursor-pointer active:scale-[0.98]'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>
                {encargosList.length === 0
                  ? 'Encasillar (0 bultos)'
                  : `Encasillar (${encargosList.length} bultos)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Popup de Cambio de Ubicación QR */}
      <LocationQrModal
        isOpen={isLocationModalOpen}
        onSelectLocation={(ubicacion) => {
          setActiveLocation(ubicacion);
          setIsLocationModalOpen(false);
          triggerToast(`Ubicación cambiada a ${ubicacion.nombreEstacion}`, 'success');
          playSuccessSound();
        }}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
export default EncasilladoModule;
