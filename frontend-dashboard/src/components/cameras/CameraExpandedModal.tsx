'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/api';
import type { Camera as CameraType } from '@/types/camera';

interface CameraExpandedModalProps {
  camera: CameraType;
  onClose: () => void;
}

interface Detection {
  class: string;
  confidence: number;
  category_id: number;
  category_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export default function CameraExpandedModal({ camera, onClose }: CameraExpandedModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);         // captura (oculto)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);  // bounding boxes (visible)
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyRef = useRef(false);
  const isDetectingRef = useRef(false);
  const mountedRef = useRef(true);

  const [detections, setDetections] = useState<Detection[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // ── Dibuja bounding boxes en el canvas overlay ──────────────────────────
  const drawDetections = useCallback((dets: Detection[]) => {
    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const severityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    };

    dets.forEach((det) => {
      const { x1, y1, x2, y2 } = det.bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      const color = severityColors[det.severity] ?? '#ef4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);

      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 28, w, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(
        `${det.category_name} ${Math.round(det.confidence * 100)}%`,
        x1 + 6,
        y1 - 10
      );
    });
  }, []);

  // ── Captura frame y llama al backend ────────────────────────────────────
  const captureAndDetect = useCallback(async () => {
    if (isDetectingRef.current || !isReadyRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== 4) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    isDetectingRef.current = true;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Escala para no enviar frames enormes al backend
      let w = video.videoWidth;
      let h = video.videoHeight;
      const MAX = 640;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      console.log(`📡 [MODAL] Enviando frame ${w}x${h} a detección...`);

      const response = await apiClient.post('/detect', {
        image: imageData,
        camera_id: camera.id,
      });

      if (!mountedRef.current) return;

      console.log(`📦 [MODAL] Respuesta recibida:`, response.data);

      const isDetected = response.data.detected || response.data.success;
      const rawDets: unknown[] = response.data.detections ?? [];

      if (isDetected && rawDets.length > 0) {
        const scaleX = video.videoWidth / w;
        const scaleY = video.videoHeight / h;

        const scaled: Detection[] = rawDets
          .map((det: unknown) => {
            const d = det as Record<string, unknown>;
            let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

            const bbox = d.bbox as Record<string, number> | undefined;
            if (bbox && 'x1' in bbox) {
              x1 = bbox.x1 * scaleX;
              y1 = bbox.y1 * scaleY;
              x2 = bbox.x2 * scaleX;
              y2 = bbox.y2 * scaleY;
            } else if (Array.isArray(d.bbox)) {
              const arr = d.bbox as number[];
              x1 = arr[0] * scaleX;
              y1 = arr[1] * scaleY;
              x2 = (arr[0] + arr[2]) * scaleX;
              y2 = (arr[1] + arr[3]) * scaleY;
            } else {
              return null;
            }

            if ([x1, y1, x2, y2].some(isNaN)) return null;

            return {
              class: String(d.class ?? ''),
              confidence: Number(d.confidence ?? 0),
              category_id: Number(d.category_id ?? 0),
              category_name: String(d.category_name ?? 'Detección'),
              severity: (d.severity as Detection['severity']) ?? 'low',
              bbox: { x1, y1, x2, y2 },
            } satisfies Detection;
          })
          .filter((d): d is Detection => d !== null);

        console.log(`✅ [MODAL] ${scaled.length} detecciones procesadas`);
        setDetections(scaled);
        drawDetections(scaled);
      } else {
        console.log(`ℹ️ [MODAL] Sin detecciones`);
        setDetections([]);
        drawDetections([]);
      }
    } catch (err) {
      console.error('❌ [MODAL] Error en detección:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        console.error('❌ [MODAL] Detalles:', axiosErr.response?.data ?? axiosErr.message);
      } else if (err instanceof Error) {
        console.error('❌ [MODAL] Detalles:', err.message);
      }
    } finally {
      isDetectingRef.current = false;
    }
  }, [camera.id, drawDetections]);

  // ── Inicia stream ────────────────────────────────────────────────────────
  const startWebcamStream = useCallback(async () => {
    try {
      const deviceId = camera.rtsp_url?.replace('webcam://', '') || undefined;
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isReadyRef.current = true;
        setIsStreaming(true);

        intervalRef.current = setInterval(() => {
          captureAndDetect();
        }, 2000);
      }
    } catch (err) {
      console.error('❌ [MODAL] Error iniciando webcam:', err);
    }
  }, [camera.rtsp_url, captureAndDetect]);

  // ── Detiene stream ───────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isReadyRef.current = false;
    isDetectingRef.current = false;
    setIsStreaming(false);
  }, []);

  // ── Ciclo de vida ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (camera.ip_address.startsWith('127.0.0.')) {
      startWebcamStream();
    }

    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, [camera.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers UI ───────────────────────────────────────────────────────────
  const severityColors: Record<string, string> = {
    critical: 'bg-red-900 border-red-600 text-red-100',
    high: 'bg-orange-900 border-orange-600 text-orange-100',
    medium: 'bg-yellow-900 border-yellow-600 text-yellow-100',
    low: 'bg-green-900 border-green-600 text-green-100',
  };
  const severityLabels: Record<string, string> = {
    critical: 'CRÍTICO',
    high: 'ALTO',
    medium: 'ADVERTENCIA',
    low: 'NORMAL',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">{camera.name}</h2>
              <p className="text-sm text-gray-300">
                {camera.zone_name || 'Sin zona'} • {camera.ip_address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Video principal — visible directamente con canvas overlay */}
          <div className="flex-1 bg-gray-900 relative">

            {/* Canvas de captura — OCULTO, solo para enviar frames al backend */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video EN VIVO — visible */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${isStreaming ? '' : 'hidden'}`}
            />

            {/* Canvas overlay para bounding boxes — mismo tamaño CSS que el video */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Placeholder cuando el stream no ha iniciado */}
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Iniciando cámara...</p>
                </div>
              </div>
            )}

            {/* Badge EN VIVO */}
            {isStreaming && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                EN VIVO
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="w-80 bg-gray-900 p-4 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Detecciones ({detections.length})
            </h3>

            <div className="space-y-2">
              {detections.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  {isStreaming ? 'Sin detecciones activas' : 'Iniciando cámara...'}
                </p>
              ) : (
                detections.map((det, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border-l-4 ${severityColors[det.severity]}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">
                        {severityLabels[det.severity]}
                      </span>
                      <span className="text-xs opacity-75">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium">{det.category_name}</p>
                    <p className="text-sm opacity-90">
                      Confianza: {Math.round(det.confidence * 100)}%
                    </p>
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-black bg-opacity-30 rounded text-xs">
                        {det.class}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Estadísticas */}
            {detections.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">
                    {detections.filter((d) => d.severity === 'low').length}
                  </p>
                  <p className="text-xs text-gray-400">Normal</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-400">
                    {detections.filter((d) => ['medium', 'high'].includes(d.severity)).length}
                  </p>
                  <p className="text-xs text-gray-400">Advert.</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">
                    {detections.filter((d) => d.severity === 'critical').length}
                  </p>
                  <p className="text-xs text-gray-400">Crítica</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}