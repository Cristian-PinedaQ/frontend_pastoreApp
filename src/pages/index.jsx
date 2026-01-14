// 🎓 StudentsPage - Gestión de estudiantes


// 📖 LessonsPage - Gestión de lecciones
export const LessonsPage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">🦺 Lideres</h1>
    <div className="bg-white rounded-lg shadow-lg p-8">
      <p className="text-gray-600 text-center py-12">
        Crea y gestiona las lecciones del programa.
      </p>
      <div className="text-center">
        <p className="text-gray-500">Próximamente: Gestor de proceso de liderazgo</p>
      </div>
    </div>
  </div>
);

// ✅ AttendancePage - Gestión de asistencias
export const AttendancePage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">🏘️ CBI</h1>
    <div className="bg-white rounded-lg shadow-lg p-8">
      <p className="text-gray-600 text-center py-12">
        Registra y visualiza las asistencias de los miembros.
      </p>
      <div className="text-center">
        <p className="text-gray-500">Próximamente: Gestor de procesos de Casas de bendicion integral</p>
      </div>
    </div>
  </div>
);

// 👤 UsersPage - Gestión de usuarios (solo PASTORES)
export const UsersPage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">👤 Usuarios</h1>
    <div className="bg-white rounded-lg shadow-lg p-8">
      <p className="text-gray-600 text-center py-12">
        Gestiona los usuarios del sistema y sus permisos.
      </p>
      <div className="text-center">
        <p className="text-gray-500">Próximamente: Tabla de gestión de usuarios</p>
      </div>
    </div>
  </div>
);
