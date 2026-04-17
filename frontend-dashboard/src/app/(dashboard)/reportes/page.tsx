'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Camera, AlertTriangle, MapPin } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface AlertByDay {
  date: string;
  count: number;
}

interface AlertByCamera {
  camera_name: string;
  alert_count: number;
}

// ✅ CORREGIDO: Agregar index signature
interface AlertByCategory {
  category_name: string;
  count: number;
  [key: string]: string | number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function ReportesPage() {
  const [alertsByDay, setAlertsByDay] = useState<AlertByDay[]>([]);
  const [alertsByCamera, setAlertsByCamera] = useState<AlertByCamera[]>([]);
  const [alertsByCategory, setAlertsByCategory] = useState<AlertByCategory[]>([]);
  const [alertsByZone, setAlertsByZone] = useState<Array<{ zone_name: string; alert_count: number }>>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
  try {
      setLoading(true);

      const [dayData, cameraData, categoryData, zoneData] = await Promise.all([
        apiClient.get('/reports/alerts-by-day'),
        apiClient.get('/reports/alerts-by-camera'),
        apiClient.get('/reports/alerts-by-category'),
        apiClient.get('/reports/alerts-by-zone'), // ✅ NUEVO
      ]);

      setAlertsByDay(dayData.data);
      setAlertsByCamera(cameraData.data);
      setAlertsByCategory(categoryData.data);
      setAlertsByZone(zoneData.data); // ✅ NUEVO
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h1>
        <p className="text-gray-600">Análisis de datos del sistema de vigilancia</p>
      </div>

      {/* Gráfico de líneas - Alertas por día */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Alertas por Día (Últimos 7 días)</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={alertsByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Alertas" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de barras - Alertas por cámara */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Alertas por Cámara</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={alertsByCamera}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="camera_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="alert_count" fill="#22c55e" name="Número de alertas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de torta - Alertas por categoría */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Distribución por Tipo de Alerta</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={alertsByCategory}
              dataKey="count"
              nameKey="category_name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {alertsByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* KPIs adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Total Alertas (7 días)</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {alertsByDay.reduce((sum, item) => sum + Number(item.count), 0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">Cámaras Monitoreadas</h3>
            <Camera className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{alertsByCamera.length}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-900">Tipos de Alertas</h3>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{alertsByCategory.length}</p>
        </div>
      </div>
      {/* Gráfico 4: Alertas por Zona (Barras Horizontales) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Alertas por Zona (Últimos 30 días)</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={alertsByZone} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="zone_name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="alert_count" fill="#8b5cf6" name="Alertas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}