'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, X } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface Zone {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function ZonasPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/zones');
      setZones(response.data.zones || []);
    } catch (error) {
      console.error('Error loading zones:', error);
      toast.error('Error al cargar zonas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      if (editingZone) {
        await apiClient.put(`/zones/${editingZone.id}`, formData);
        toast.success('Zona actualizada correctamente');
      } else {
        await apiClient.post('/zones', formData);
        toast.success('Zona creada correctamente');
      }
      
      loadZones();
      handleCloseModal();
    } catch (error) {
      toast.error('Error al guardar zona');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta zona? Las cámaras asociadas quedarán sin zona.')) {
      return;
    }

    try {
      await apiClient.delete(`/zones/${id}`);
      toast.success('Zona eliminada correctamente');
      loadZones();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('No se puede eliminar: hay cámaras asociadas');
      } else {
        toast.error('Error al eliminar zona');
      }
    }
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingZone(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración de Zonas</h1>
          <p className="text-gray-600">Gestiona las zonas de vigilancia del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva Zona
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Creada</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">Cargando zonas...</td>
              </tr>
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No hay zonas registradas</p>
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">#{zone.id}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{zone.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{zone.description || 'Sin descripción'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(zone.created_at).toLocaleDateString('es-PE')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(zone)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingZone ? 'Editar Zona' : 'Nueva Zona'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-600 hover:text-gray-900">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Entrada Principal"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción de la zona..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    {editingZone ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}