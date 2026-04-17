'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, UserCheck, UserX, Shield } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  id?: number;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  last_login?: string | null;
  created_at?: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [newUser, setNewUser] = useState<User & { password: string }>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_id: 4, // Operator por defecto
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const loadRoles = async () => {
    try {
      const response = await apiClient.get('/roles');
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      if (!newUser.username || !newUser.email || !newUser.full_name || !newUser.password) {
        toast.error('Completa todos los campos obligatorios');
        return;
      }

      if (newUser.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      const response = await apiClient.post('/users', newUser);
      setUsers([...users, response.data]);
      toast.success('Usuario creado correctamente');
      
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role_id: 4,
        is_active: true,
      });
      setIsAdding(false);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.response?.data?.error || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await apiClient.delete(`/users/${id}`);
      setUsers(users.filter(user => user.id !== id));
      toast.success('Usuario eliminado correctamente');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/users/${id}`, { is_active: !currentStatus });
      setUsers(users.map(user => 
        user.id === id ? { ...user, is_active: !currentStatus } : user
      ));
      toast.success(currentStatus ? 'Usuario desactivado' : 'Usuario activado');
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingId(user.id!);
    setEditingUser({ ...user });
  };

  const handleSaveEdit = async () => {
    if (!editingUser || !editingId) return;

    try {
      const response = await apiClient.patch(`/users/${editingId}`, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role_id: editingUser.role_id,
      });
      
      setUsers(users.map(user => 
        user.id === editingId ? response.data : user
      ));
      
      toast.success('Usuario actualizado');
      setEditingId(null);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUserId || !newPassword) {
      toast.error('Ingresa una contraseña');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await apiClient.patch(`/users/${selectedUserId}`, { password: newPassword });
      toast.success('Contraseña actualizada');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUserId(null);
    } catch (error) {
      toast.error('Error al cambiar contraseña');
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Nunca';
    try {
      return new Date(dateString).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getRoleBadge = (roleName?: string) => {
    const styles: Record<string, string> = {
      SuperAdmin: 'bg-purple-100 text-purple-800',
      Admin: 'bg-blue-100 text-blue-800',
      Supervisor: 'bg-green-100 text-green-800',
      Operator: 'bg-yellow-100 text-yellow-800',
      Viewer: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[roleName || ''] || 'bg-gray-100 text-gray-800'}`}>
        {roleName || 'Sin rol'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios del sistema</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Formulario de nuevo usuario */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Usuario</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario *
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="usuario123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                value={newUser.role_id}
                onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              >
                <option value="">Seleccionar rol</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {/* <select
                value={newUser.role_id}
                onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar rol</option>
                <option value="1">SuperAdmin</option>
                <option value="2">Admin</option>
                <option value="3">Supervisor</option>
                <option value="4">Operator</option>
                <option value="5">Viewer</option>
              </select> */}
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
              onClick={handleAddUser}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Crear Usuario
            </button>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Rol</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Último acceso</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {editingId === user.id && editingUser ? (
                    <>
                      <td className="py-3 px-4 text-sm">{user.username}</td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingUser.full_name}
                          onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={editingUser.role_id}
                          onChange={(e) => setEditingUser({ ...editingUser, role_id: Number(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(user.last_login)}</td>
                      <td className="py-3 px-4">{getRoleBadge(user.role_name)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditingUser(null); }}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{user.full_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{user.email}</td>
                      <td className="py-3 px-4">{getRoleBadge(user.role_name)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(user.last_login)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(user.id!, user.is_active)}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id!);
                              setShowPasswordModal(true);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="Cambiar contraseña"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

      {/* Modal cambiar contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (mínimo 6 caracteres)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setSelectedUserId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}