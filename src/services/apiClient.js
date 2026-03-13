import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://pastoreapp.cloud/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// Interceptor de respuestas
// ===============================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {

    const status = error?.response?.status;
    const data = error?.response?.data;

    let message = "Error inesperado";

    if (!error.response) {
      message = "Error de conexión con el servidor";
    }

    else if (data?.fieldErrors) {
      message = Object.values(data.fieldErrors).join(". ");
    }

    else if (data?.message) {
      message = data.message;
    }

    else if (status === 409) {
      message = "El recurso ya existe";
    }

    else if (status === 403) {
      message = "No tienes permisos para realizar esta acción";
    }

    else if (status === 404) {
      message = "Recurso no encontrado";
    }

    else if (status === 500) {
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