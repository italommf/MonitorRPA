import axios from 'axios';

const getBaseURL = () => {
    if (typeof window !== 'undefined') {
        const { hostname, port } = window.location;
        // Se estivermos na porta 8080 (produção custom), a API estará na 8081
        if (port === '8080') {
            return `http://${hostname}:8081/api`;
        }
    }
    return '/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Scripts API
export const scriptsApi = {
    list: (params = {}) => api.get('/scripts', { params }),
    getById: (id) => api.get(`/scripts/${id}`),
    create: (data) => api.post('/scripts', data),
    update: (id, data) => api.put(`/scripts/${id}`, data),
    delete: (id) => api.delete(`/scripts/${id}`),
    regenerateToken: (id) => api.post(`/scripts/${id}/regenerate-token`),
};

// Executions API
export const executionsApi = {
    listByScript: (scriptId, params = {}) =>
        api.get(`/scripts/${scriptId}/executions`, { params }),
    getById: (id) => api.get(`/scripts/executions/${id}`),
};

// Responsibles API
export const responsiblesApi = {
    list: () => api.get('/responsibles'),
    create: (data) => api.post('/responsibles', data),
    delete: (id) => api.delete(`/responsibles/${id}`),
};

// Systems API
export const systemsApi = {
    list: (params = {}) => api.get('/systems', { params }),
    getById: (id) => api.get(`/systems/${id}`),
    create: (data) => api.post('/systems', data),
    update: (id, data) => api.put(`/systems/${id}`, data),
    delete: (id) => api.delete(`/systems/${id}`),
    regenerateToken: (id) => api.post(`/systems/${id}/regenerate-token`),
    listPings: (systemId, params = {}) =>
        api.get(`/systems/${systemId}/pings`, { params }),
};

// Dashboard API
export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
};

// Health check
export const healthApi = {
    check: () => axios.get('/health'),
};

export default api;
