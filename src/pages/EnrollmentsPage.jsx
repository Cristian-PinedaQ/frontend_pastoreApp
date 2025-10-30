// 📊 EnrollmentsPage - Gestión de inscripciones/cohortes
import React, { useState, useEffect } from 'react';
import apiService from '../apiService';

export const EnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getEnrollments();
      setEnrollments(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiService.updateEnrollment(editingId, formData);
        alert('Inscripción actualizada');
      } else {
        await apiService.createEnrollment(formData);
        alert('Inscripción creada');
      }
      resetForm();
      fetchEnrollments();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (enrollment) => {
    setFormData({
      name: enrollment.name,
      description: enrollment.description || '',
      startDate: enrollment.startDate || '',
      endDate: enrollment.endDate || '',
    });
    setEditingId(enrollment.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', startDate: '', endDate: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">🌾 Formación</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancelar' : '✨ Nueva Cohorte'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Editar Cohorte' : 'Nueva Cohorte'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Nombre"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="description"
              placeholder="Descripción"
              value={formData.description}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="md:col-span-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No hay Cohortes registradas
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800">{enrollment.name}</h3>
              <p className="text-gray-600 mt-2">{enrollment.description}</p>
              <p className="text-sm text-gray-500 mt-4">
                {enrollment.startDate && `Inicia: ${new Date(enrollment.startDate).toLocaleDateString()}`}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleEdit(enrollment)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition flex-1"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
