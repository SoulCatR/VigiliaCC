'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Camera, Monitor, Power, PowerOff, Wrench } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface Camera {
  id?: number;
  name: string;
  ip_address: string;
  rtsp_url?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  model?: string | null;
  resolution?: string | null;
  fps?: number | null;
}

interface Zone {
  id: number;
  name: string;
  floor: string;
}

export default function AdminCamarasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  
  const [newCamera, setNewCamera] = useState<Camera>({
    name: '',
    ip_address: '',
    rtsp_url: '',
    status: 'active',
    zone_id: null,
  });

  useEffect(() => {
    loadCameras();
    loadZones();
    loadAvailableWebcams();
  }, []);

  const loadCameras = async () => {
    try {
      const response = await apiClient.get('/cameras');
      setCameras(response.data);
    } catch (error) {
      console.error('Error loading cameras:', error);
      toast.error('Error al cargar cámaras');
    }
  };

  const loadZones = async () => {
    try {
      const response = await apiClient.get('/zones');
      setZones(response.data);
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  };

  const loadAvailableWebcams = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
    } catch (error) {
      console.error('Error loading webcams:', error);
    }
  };

  const handleAddWebcamWithSelection = async (deviceId: string, deviceLabel: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: { exact: deviceId } }
      });
      stream.getTracks().forEach(track => track.stop());

      const existingWebcams = cameras.filter(c => c.ip_address.startsWith('127.0.0.'));
      const nextWebcamNumber = existingWebcams.length + 1;
      const webcamIp = `127.0.0.${nextWebcamNumber}`;

      const webcamCamera = {
        name: deviceLabel || `Webcam ${nextWebcamNumber}`,
        ip_address: webcamIp,
        rtsp_url: `webcam://${deviceId}`,
        status: 'active' as const,
        model: 'Webcam',
        resolution: '720p',
        fps: 30,
      };

      const response = await apiClient.post('/cameras', webcamCamera);
      setCameras([...cameras, response.data]);
      toast.success(`Webcam agregada: ${deviceLabel}`);
      setShowDeviceSelector(false);
    } catch (error: any) {
      console.error('Error adding webcam:', error);
      toast.error('Error al agregar webcam');
    }
  };

  const handleAddWebcam = () => {
    if (availableDevices.length === 0) {
      toast.error('No se encontraron webcams disponibles');
      return;
    }
    
    if (availableDevices.length === 1) {
      handleAddWebcamWithSelection(availableDevices[0].deviceId, availableDevices[0].label);
    } else {
      setShowDeviceSelector(true);
    }
  };

  const handleAddCamera = async () => {
    try {
      if (!newCamera.name || !newCamera.ip_address) {
        toast.error('Completa todos los campos obligatorios');
        return;
      }

      const response = await apiClient.post('/cameras', newCamera);
      setCameras([...cameras, response.data]);
      toast.success('Cámara agregada correctamente');
      
      setNewCamera({
        name: '',
        ip_address: '',
        rtsp_url: '',
        status: 'active',
        zone_id: null,
      });
      setIsAdding(false);
    } catch (error: any) {
      console.error('Error adding camera:', error);
      toast.error(error.response?.data?.error || 'Error al agregar cámara');
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta cámara?')) return;

    try {
      await apiClient.delete(`/cameras/${id}`);
      setCameras(cameras.filter(cam => cam.id !== id));
      toast.success('Cámara eliminada correctamente');
    } catch (error: any) {
      console.error('Error deleting camera:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar cámara');
    }
  };

  // ✅ FUNCIÓN ESPECÍFICA PARA CAMBIAR ESTADO
  const handleChangeStatus = async (id: number, newStatus: 'active' | 'inactive' | 'maintenance') => {
    try {
      console.log('🔄 Cambiando estado a:', newStatus, 'para cámara:', id);
      
      // ✅ LLAMAR AL ENDPOINT CORRECTO: /cameras/:id/status
      const response = await apiClient.patch(`/cameras/${id}/status`, {
        status: newStatus
      });
      
      console.log('✅ Respuesta del servidor:', response.data);
      
      // Actualizar estado local con la respuesta del servidor
      setCameras(cameras.map(cam => 
        cam.id === id ? { ...cam, status: response.data.status } : cam
      ));
      
      const statusText = 
        newStatus === 'active' ? 'activada' :
        newStatus === 'inactive' ? 'desactivada' :
        'en mantenimiento';
      
      toast.success(`Cámara ${statusText}`);
    } catch (error: any) {
      console.error('❌ Error al cambiar estado:', error);
      toast.error(error.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleStartEdit = (camera: Camera) => {
    setEditingId(camera.id!);
    setEditingCamera({ ...camera });
  };

  // ✅ GUARDAR EDICIÓN GENERAL (sin cambiar estado)
  const handleSaveEdit = async () => {
    if (!editingCamera || !editingId) return;

    try {
      // Solo enviar campos editables (NO el status, ese se cambia con handleChangeStatus)
      const { status, ...editableFields } = editingCamera;
      
      const response = await apiClient.patch(`/cameras/${editingId}`, editableFields);
      
      setCameras(cameras.map(cam => 
        cam.id === editingId ? response.data : cam
      ));
      
      toast.success('Cámara actualizada');
      setEditingId(null);
      setEditingCamera(null);
    } catch (error: any) {
      console.error('Error updating camera:', error);
      toast.error('Error al actualizar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cámaras</h1>
          <p className="text-gray-600">Administra las cámaras del sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddWebcam}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Agregar Webcam
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Cámara IP
          </button>
        </div>
      </div>

      {/* Selector de webcam */}
      {showDeviceSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Selecciona una webcam</h3>
            <div className="space-y-2">
              {availableDevices.map((device, index) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleAddWebcamWithSelection(device.deviceId, device.label || `Webcam ${index + 1}`)}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">{device.label || `Webcam ${index + 1}`}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de nueva cámara */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva Cámara IP</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={newCamera.name}
                onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                placeholder="Ej: Entrada Principal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección IP *
              </label>
              <input
                type="text"
                value={newCamera.ip_address}
                onChange={(e) => setNewCamera({ ...newCamera, ip_address: e.target.value })}
                placeholder="Ej: 192.168.1.100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL RTSP (opcional)
              </label>
              <input
                type="text"
                value={newCamera.rtsp_url || ''}
                onChange={(e) => setNewCamera({ ...newCamera, rtsp_url: e.target.value })}
                placeholder="rtsp://usuario:contraseña@192.168.1.100:554/stream"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zona
              </label>
              <select
                value={newCamera.zone_id || ''}
                onChange={(e) => setNewCamera({ ...newCamera, zone_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin zona asignada</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} - {zone.floor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCamera}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Agregar Cámara
            </button>
          </div>
        </div>
      )}

      {/* Lista de cámaras */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">IP</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Zona</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Modelo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cameras.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No hay cámaras registradas</p>
                  <p className="text-sm text-gray-400 mt-1">Agrega tu primera cámara para comenzar</p>
                </td>
              </tr>
            ) : (
              cameras.map((camera) => (
                <tr key={camera.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {editingId === camera.id && editingCamera ? (
                    <>
                      <td className="py-3 px-4 text-sm text-gray-900">#{camera.id}</td>

                      {/* Nombre */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingCamera.name}
                          onChange={(e) => setEditingCamera({ ...editingCamera, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingCamera.ip_address}
                          onChange={(e) => setEditingCamera({ ...editingCamera, ip_address: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>

                      {/* ZONA */}
                      <td className="py-3 px-4">
                        <select
                          value={editingCamera.zone_id || ''}
                          onChange={(e) => setEditingCamera({ 
                            ...editingCamera, 
                            zone_id: e.target.value ? Number(e.target.value) : null 
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Sin zona</option>
                          {zones.map(zone => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Modelo */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingCamera.model || ''}
                          onChange={(e) => setEditingCamera({ ...editingCamera, model: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      
                      {/* Estado (no editable aquí) */}
                      <td className="py-3 px-4">
                        {/* ✅ NO permitir editar el status aquí, solo nombre/ip/modelo */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          camera.status === 'active' ? 'bg-green-100 text-green-800' :
                          camera.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {camera.status === 'active' ? 'Activa' :
                           camera.status === 'maintenance' ? 'Mantenimiento' :
                           'Inactiva'}
                        </span>
                      </td>

                      {/* Botones Guardar/Cancelar */}
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingCamera(null);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-sm text-gray-900">#{camera.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{camera.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{camera.ip_address}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{camera.zone_name || 'Sin asignar'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-xs">
                        {camera.model || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {/* ✅ MENÚ DESPLEGABLE PARA CAMBIAR ESTADO */}
                        <select
                          value={camera.status}
                          onChange={(e) => handleChangeStatus(camera.id!, e.target.value as any)}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${
                            camera.status === 'active' ? 'bg-green-100 text-green-800' :
                            camera.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          <option value="active">Activa</option>
                          <option value="inactive">Inactiva</option>
                          <option value="maintenance">Mantenimiento</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(camera)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCamera(camera.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📌 Tipos de Cámaras Soportadas</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Webcam Local:</strong> Usa la cámara de tu laptop/computadora - Selecciona cuál usar si tienes varias</li>
          <li><strong>Cámara IP (HTTP):</strong> Ejemplo: http://192.168.1.100/stream</li>
          <li><strong>RTSP Stream:</strong> Ejemplo: rtsp://usuario:contraseña@192.168.1.100:554/stream</li>
        </ul>
      </div>
    </div>
  );
}