'use client';

import { Camera, Video, AlertTriangle, Clock } from 'lucide-react';
import type { Camera as CameraType } from '@/types/camera';
import WebcamStream from './WebcamStream'; // ✅ Import directo, NO dynamic

interface CameraCardProps {
  camera: CameraType;
  onExpand: (cameraId: number) => void;
}

export default function CameraCard({ camera, onExpand }: CameraCardProps) {
  const isWebcam = camera.rtsp_url?.startsWith('webcam://');
  const isActive = camera.status === 'active';
  
  // Extraer deviceId del rtsp_url
  const deviceId = isWebcam 
    ? camera.rtsp_url?.replace('webcam://', '') || undefined
    : undefined;

  console.log(`🎴 CameraCard render - ID: ${camera.id}, isWebcam: ${isWebcam}, isActive: ${isActive}, deviceId: ${deviceId?.substring(0, 20)}...`);

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onExpand(camera.id!)}
    >
      {/* Video Preview */}
      <div className="relative bg-gray-900 h-48">
        {isActive ? (
          isWebcam ? (
            <>
              {console.log(`🎥 Renderizando WebcamStream para cámara ${camera.id}`)}
              <WebcamStream 
                cameraId={camera.id} 
                deviceId={deviceId}
                width={640} 
                height={480} 
              />
            </>
          ) : (
            // Placeholder para cámaras IP
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Video className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Cámara IP</p>
                <p className="text-xs">{camera.rtsp_url || 'No configurada'}</p>
              </div>
            </div>
          )
        ) : (
          // Cámara desactivada
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Cámara desactivada</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          {isActive ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </span>
          ) : camera.status === 'maintenance' ? (
            <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded">
              Mantenimiento
            </span>
          ) : (
            <span className="px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Camera Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{camera.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{camera.ip_address}</p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{camera.fps || 30} FPS</span>
          </div>
          {camera.zone_name && (
            <span className="px-2 py-1 bg-gray-100 rounded">
              {camera.zone_name}
            </span>
          )}
        </div>

        {camera.status === 'maintenance' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            En mantenimiento
          </div>
        )}
      </div>
    </div>
  );
}