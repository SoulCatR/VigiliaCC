'use client';

import { useEffect, useRef, useState } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyRef = useRef(false);

  const [imageWithBoxes, setImageWithBoxes] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (camera.ip_address.startsWith('127.0.0.')) {
      startWebcamStream();
    }

    return () => {
      stopStream();
    };
  }, [camera.id]);

  const startWebcamStream = async () => {
    try {
      const deviceId = camera.rtsp_url?.replace('webcam://', '') || undefined;
      
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { 
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    } catch (error) {
      console.error('Error starting webcam:', error);
    }
  };

  const stopStream = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isReadyRef.current = false;
    setIsStreaming(false);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || !isReadyRef.current) {
      console.log(`⏭️ Skipping modal detection - Not ready`);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      console.log(`⏭️ Skipping modal detection - readyState: ${video.readyState}`);
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      console.log(`📡 [MODAL] Enviando frame a detección...`);

      const response = await apiClient.post('/detect', {
        image: imageData,
        camera_id: camera.id
      });

      console.log(`📦 [MODAL] Respuesta recibida:`, response.data);

      if (response.data.detected && response.data.detections.length > 0) {
        const dets = response.data.detections;
        console.log(`✅ [MODAL] ${dets.length} detecciones recibidas`);

        const scaledDetections = dets.map((det: any, idx: number) => {
          let x, y, w, h;

          if (det.bbox && typeof det.bbox === 'object' && 'x1' in det.bbox) {
            x = det.bbox.x1;
            y = det.bbox.y1;
            w = det.bbox.x2 - det.bbox.x1;
            h = det.bbox.y2 - det.bbox.y1;
          } else {
            console.warn(`⚠️ [MODAL] Formato bbox desconocido:`, det.bbox);
            return null;
          }

          if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
            console.warn(`⚠️ [MODAL] Coordenadas inválidas:`, det);
            return null;
          }

          console.log(`📐 [MODAL] Det ${idx + 1}: x=${x}, y=${y}, w=${w}, h=${h}`);

          return {
            class: det.class,
            confidence: det.confidence,
            category_id: det.category_id,
            category_name: det.category_name,
            severity: det.severity,
            bbox: { x1: x, y1: y, x2: x + w, y2: y + h }
          };
        }).filter(Boolean);

        console.log(`🎯 [MODAL] ${scaledDetections.length} detecciones procesadas`);
        setDetections(scaledDetections);

        if (response.data.image_with_boxes) {
          setImageWithBoxes(response.data.image_with_boxes);
          console.log(`🖼️ [MODAL] Imagen con boxes actualizada`);
        }
      } else {
        console.log(`ℹ️ [MODAL] Sin detecciones`);
        setDetections([]);
        setImageWithBoxes(null);
      }
    } catch (error) {
      console.error('❌ [MODAL] Error en detección:', error);
    }
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
              <p className="text-sm text-gray-300">{camera.zone_name || 'Sin zona'} • {camera.ip_address}</p>
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
          {/* Video principal */}
          <div className="flex-1 bg-gray-900 relative">
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {imageWithBoxes ? (
              <img
                src={imageWithBoxes}
                alt="Detecciones"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Esperando detecciones...</p>
                </div>
              </div>
            )}

            {isStreaming && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                EN VIVO
              </div>
            )}
          </div>

          {/* Panel lateral de detecciones */}
          <div className="w-80 bg-gray-900 p-4 overflow-y-auto">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Detecciones ({detections.length})
            </h3>

            <div className="space-y-2">
              {detections.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No hay detecciones activas
                </p>
              ) : (
                detections.map((det, idx) => {
                  const severityColors = {
                    critical: 'bg-red-900 border-red-600 text-red-100',
                    high: 'bg-orange-900 border-orange-600 text-orange-100',
                    medium: 'bg-yellow-900 border-yellow-600 text-yellow-100',
                    low: 'bg-green-900 border-green-600 text-green-100'
                  };

                  const severityLabels = {
                    critical: 'CRÍTICO',
                    high: 'ALTO',
                    medium: 'ADVERTENCIA',
                    low: 'NORMAL'
                  };

                  return (
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
                  );
                })
              )}
            </div>

            {/* Estadísticas */}
            {detections.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">
                    {detections.filter(d => d.severity === 'low').length}
                  </p>
                  <p className="text-xs text-gray-400">Normal</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-400">
                    {detections.filter(d => ['medium', 'high'].includes(d.severity)).length}
                  </p>
                  <p className="text-xs text-gray-400">Advert.</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">
                    {detections.filter(d => d.severity === 'critical').length}
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