import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// IMPORTANTE: Cambiar esta IP por la IP local de tu PC
export const API_URL = 'http://192.168.100.117:8080/api'

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Callback para forzar logout cuando expira el token
let onUnauthorized = null

export const setOnUnauthorized = (callback) => {
    onUnauthorized = callback
}

// Interceptor: agrega token JWT a cada request
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Interceptor: si token expira (401/403), forzar logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            await AsyncStorage.removeItem('token')
            await AsyncStorage.removeItem('usuario')
            if (onUnauthorized) onUnauthorized()
        }
        return Promise.reject(error)
    }
)

export default api
