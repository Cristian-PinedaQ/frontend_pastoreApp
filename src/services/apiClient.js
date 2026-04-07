import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://pastoreapp.cloud/api/v1",
  //baseURL: 'http://localhost:8080/api/v1',
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// 1. NUEVO: Interceptor de peticiones (Request)
// ===============================
apiClient.interceptors.request.use(
  (config) => {
    // Buscar el token en el sessionStorage (tal como lo guardas en tu método login)
    const token = sessionStorage.getItem('token');
    
    // Si el token existe, inyectarlo en los headers de la petición
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===============================
// 2. LO QUE YA TENÍAS: Interceptor de respuestas (Response)
// ===============================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    let message = "Error inesperado";

    if (!error.response) {
      message = "Error de conexión con el servidor";
    } else if (data?.fieldErrors) {
      message = Object.values(data.fieldErrors).join(". ");
    } else if (data?.message) {
      message = data.message;
    } else if (status === 409) {
      message = "El recurso ya existe";
    } else if (status === 403) {
      message = "No tienes permisos para realizar esta acción o tu sesión expiró";
    } else if (status === 404) {
      message = "Recurso no encontrado";
    } else if (status === 500) {
      message = "Error interno del servidor";
    }

    return Promise.reject({
      status,
      message,
      data
    });
  }
);

export default apiClient;