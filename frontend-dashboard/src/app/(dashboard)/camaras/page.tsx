'use client';

import { useEffect, useState } from 'react';
import { Camera as CameraIcon, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

// Importación dinámica para evitar errores de SSR
import dynamic from 'next/dynamic';

const CameraCard = dynamic(() => import('@/components/cameras/CameraCard'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const CameraExpandedModal = dynamic(() => import('@/components/cameras/CameraExpandedModal'), {
  ssr: false,
});

// ✅ Tipo importado desde types/camera.ts
import type { Camera } from '@/types/camera';

type FilterStatus = 'all' | 'active' | 'inactive' | 'maintenance';

export default function CamarasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/cameras');
      const data = Array.isArray(response.data) ? response.data : [];
      setCameras(data);
      
      if (data.length === 0) {
        toast('No hay cámaras registradas. Agrega cámaras desde Admin → Gestión de Cámaras', {
          icon: '📹',
          duration: 4000,
        });
      }
    } catch (error: any) {
      console.error('Error loading cameras:', error);
      toast.error('Error al cargar cámaras');
    } finally {
      setLoading(false);
    }
  };

  const filteredCameras = cameras.filter(camera => 
    filter === 'all' || camera.status === filter
  );

  const stats = {
    total: cameras.length,
    active: cameras.filter(c => c.status === 'active').length,
    maintenance: cameras.filter(c => c.status === 'maintenance').length,
    inactive: cameras.filter(c => c.status === 'inactive').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Cargando cámaras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <CameraIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoreo en Vivo</h1>
            <p className="text-gray-600">Vista en tiempo real de todas las cámaras</p>
          </div>
        </div>
        <button
          onClick={loadCameras}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Total Cámaras</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Activas</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Mantenimiento</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.maintenance}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Desconectadas</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.inactive}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activas ({stats.active})
          </button>
          <button
            onClick={() => setFilter('maintenance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'maintenance' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mantenimiento ({stats.maintenance})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'inactive' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Desconectadas ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Grid de cámaras */}
      {filteredCameras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onExpand={(id) => {
                const cam = cameras.find(c => c.id === id);
                if (cam) setSelectedCamera(cam);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            {filter === 'all' 
              ? 'No hay cámaras registradas'
              : `No hay cámaras en estado: ${
                  filter === 'active' ? 'Activas' :
                  filter === 'maintenance' ? 'Mantenimiento' :
                  'Desconectadas'
                }`
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'all' 
              ? 'Ve a Admin → Gestión de Cámaras para agregar tu primera cámara'
              : 'Cambia el filtro para ver otras cámaras'}
          </p>
        </div>
      )}

      {/* Modal de cámara expandida */}
      {selectedCamera && (
        <CameraExpandedModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}