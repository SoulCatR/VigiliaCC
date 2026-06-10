'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api';

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
  category_name?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  class?: string;
}

interface WebcamStreamProps {
  cameraId?: number;
  deviceId?: string;
  width?: number;
  height?: number;
}

export default function WebcamStream({ cameraId, deviceId, width = 640, height = 480 }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);
  const mountedRef = useRef(true);
  
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentSeverity, setCurrentSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);

  const stopWebcam = useCallback(() => {
    console.log(`🛑 Deteniendo webcam ${cameraId}`);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [cameraId]);

  const startWebcam = useCallback(async () => {
    console.log(`📹 Iniciando webcam ${cameraId}, deviceId: ${deviceId}`);
    
    if (!videoRef.current) {
      console.error(`❌ videoRef.current es NULL`);
      setError('Error interno: elemento video no encontrado');
      setIsLoading(false);
      return;
    }
    
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: width },
              height: { ideal: height },
            }
          : {
              width: { ideal: width },
              height: { ideal: height },
              facingMode: 'user',
            },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current && mountedRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log(`✅ Stream asignado a video ${cameraId}`);
        setIsLoading(false);
        setError('');
      }
    } catch (err) {
      console.error(`❌ Error accediendo a webcam ${cameraId}:`, err);
      setError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara');
      setIsLoading(false);
    }
  }, [cameraId, deviceId, width, height]);

  const captureAndDetect = useCallback(async () => {
    if (isDetectingRef.current) {
      console.log(`⏭️ Detección en curso, saltando...`);
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;
    if (!streamRef.current?.active) return;
    if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;

    isDetectingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let captureWidth = video.videoWidth;
      let captureHeight = video.videoHeight;

      const maxDimension = 640;
      if (captureWidth > maxDimension || captureHeight > maxDimension) {
        const scale = maxDimension / Math.max(captureWidth, captureHeight);
        captureWidth = Math.floor(captureWidth * scale);
        captureHeight = Math.floor(captureHeight * scale);
      }

      canvas.width = captureWidth;
      canvas.height = captureHeight;

      if (captureWidth === 0 || captureHeight === 0) {
        console.warn(`⚠️ Canvas sin dimensiones, saltando frame cámara ${cameraId}`);
        return;
      }

      ctx.drawImage(video, 0, 0, captureWidth, captureHeight);

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = video.videoWidth;
        overlayCanvasRef.current.height = video.videoHeight;
      }

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.6);
      const imageSizeKB = Math.round(imageBase64.length / 1024);

      console.log(`📸 Capturando frame ${captureWidth}x${captureHeight} (${imageSizeKB}KB) cámara ${cameraId}`);

      const response = await apiClient.post('/detect', {
        image: imageBase64,
        camera_id: cameraId || 0,
      });

      if (!mountedRef.current) return;

      console.log(`📦 Respuesta completa del backend:`, response.data);

      // ✅ COMPATIBILIDAD MÚLTIPLE: Manejar diferentes formatos de respuesta
      const isDetected = response.data.detected || response.data.success;
      const dets = response.data.detections || [];

      console.log(`🔍 Detectado: ${isDetected}, Cantidad: ${dets.length}`);

      if (isDetected && dets.length > 0 && mountedRef.current) {
        console.log(`📋 Primera detección raw:`, dets[0]);

        const scaleX = video.videoWidth / captureWidth;
        const scaleY = video.videoHeight / captureHeight;

        const scaledDetections = dets.map((det: any) => {
          // ✅ PARSEAR BBOX - Manejar múltiples formatos
          let x, y, w, h;

          if (det.bbox && typeof det.bbox === 'object') {
            // Formato nuevo: {x1, y1, x2, y2}
            if ('x1' in det.bbox && 'y1' in det.bbox) {
              x = det.bbox.x1 * scaleX;
              y = det.bbox.y1 * scaleY;
              w = (det.bbox.x2 - det.bbox.x1) * scaleX;
              h = (det.bbox.y2 - det.bbox.y1) * scaleY;
              console.log(`📐 Bbox formato objeto: x1=${det.bbox.x1}, y1=${det.bbox.y1}, x2=${det.bbox.x2}, y2=${det.bbox.y2}`);
            }
          } else if (Array.isArray(det.bbox)) {
            // Formato antiguo: [x, y, w, h]
            x = det.bbox[0] * scaleX;
            y = det.bbox[1] * scaleY;
            w = det.bbox[2] * scaleX;
            h = det.bbox[3] * scaleY;
            console.log(`📐 Bbox formato array: [${det.bbox[0]}, ${det.bbox[1]}, ${det.bbox[2]}, ${det.bbox[3]}]`);
          } else {
            console.warn(`⚠️ Formato de bbox desconocido:`, det.bbox);
            return null;
          }

          const detection = {
            label: det.class || det.label || 'Objeto',
            confidence: det.confidence,
            category_name: det.category_name || 'Detección',
            severity: det.severity || 'low',
            class: det.class,
            bbox: [x, y, w, h] as [number, number, number, number]
          };

          console.log(`✅ Detección procesada:`, detection);
          return detection;
        }).filter(Boolean) as Detection[];

        console.log(`🎯 Total detecciones procesadas: ${scaledDetections.length}`);

        setDetections(scaledDetections);

        // Obtener categoría principal
        if (response.data.primary_detection) {
          setCurrentCategory(response.data.primary_detection.category_name);
          setCurrentSeverity(response.data.primary_detection.severity);
          console.log(`🏷️ Categoría principal: ${response.data.primary_detection.category_name} (${response.data.primary_detection.severity})`);
        } else if (scaledDetections.length > 0) {
          setCurrentCategory(scaledDetections[0].category_name || 'Detección');
          setCurrentSeverity(scaledDetections[0].severity || 'low');
          console.log(`🏷️ Categoría primera detección: ${scaledDetections[0].category_name}`);
        }

        console.log(`✅ ${scaledDetections.length} objetos detectados y procesados`);
      } else {
        console.log(`ℹ️ Sin detecciones en este frame`);
        setDetections([]);
        setCurrentCategory(null);
        setCurrentSeverity(null);
      }
    } catch (err) {
      console.error(`❌ Error en detección:`, err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: unknown }; message?: string };
        console.error(`❌ Detalles:`, axiosErr.response?.data ?? axiosErr.message);
      } else if (err instanceof Error) {
        console.error(`❌ Detalles:`, err.message);
      }
    } finally {
      isDetectingRef.current = false;
    }
  }, [cameraId]);

  useEffect(() => {
    mountedRef.current = true;
    console.log(`🎬 Componente WebcamStream ${cameraId} montado`);
    
    startWebcam();
    
    return () => {
      mountedRef.current = false;
      console.log(`🎬 Componente WebcamStream ${cameraId} desmontado`);
      stopWebcam();
    };
  }, [cameraId, deviceId, startWebcam, stopWebcam]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (intervalRef.current) {
        console.log(`⏭️ Intervalo ya activo para cámara ${cameraId}`);
        return;
      }
      
      console.log(`⏰ Iniciando intervalo de detección cada 2 segundos para cámara ${cameraId}`);
      
      intervalRef.current = setInterval(() => {
        captureAndDetect();
      }, 2000);
    };

    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      if (intervalRef.current) {
        console.log(`🧹 Limpiando intervalo de cámara ${cameraId}`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [captureAndDetect, cameraId]);

  // Dibujar detecciones
  useEffect(() => {
    if (!overlayCanvasRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log(`🎨 Dibujando ${detections.length} detecciones en canvas`);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det, index) => {
      const [x, y, w, h] = det.bbox;

      console.log(`🖍️ Dibujando detección ${index + 1}: x=${x.toFixed(0)}, y=${y.toFixed(0)}, w=${w.toFixed(0)}, h=${h.toFixed(0)}`);

      // Color según severidad
      const severityColors = {
        critical: '#ef4444', // Rojo
        high: '#f97316',     // Naranja
        medium: '#eab308',   // Amarillo
        low: '#22c55e'       // Verde
      };

      const color = det.severity ? severityColors[det.severity] : '#ef4444';

      // Caja
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Fondo del label
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 25, w, 25);

      // Texto
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      const text = `${det.category_name || det.label} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.fillText(text, x + 5, y - 8);
    });
  }, [detections]);

  const getSeverityBadgeColor = () => {
    if (!currentSeverity) return 'bg-gray-600';
    
    const colors = {
      critical: 'bg-red-600',
      high: 'bg-orange-600',
      medium: 'bg-yellow-600',
      low: 'bg-green-600'
    };
    
    return colors[currentSeverity] || 'bg-gray-600';
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isLoading || error ? 'hidden' : ''}`}
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      <canvas
        ref={overlayCanvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-400">Iniciando cámara...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400 font-medium mb-1">Error al acceder a la cámara</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Badge de categoría - Arriba derecha */}
      {!isLoading && !error && currentCategory && (
        <div className="absolute top-2 right-2">
          <div className={`${getSeverityBadgeColor()} text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow-lg flex items-center gap-2 animate-pulse`}>
            <span className="w-2 h-2 bg-white rounded-full"></span>
            {currentCategory}
          </div>
        </div>
      )}

      {/* Contador de objetos - Debajo del badge */}
      {!isLoading && !error && detections.length > 0 && (
        <div className="absolute top-12 right-2 bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
          🔴 {detections.length} {detections.length === 1 ? 'objeto' : 'objetos'}
        </div>
      )}

      {/* Indicador IA Activa */}
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          IA Activa
        </div>
      )}
    </div>
  );
}