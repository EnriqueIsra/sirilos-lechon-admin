import React, { createContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api, { setOnUnauthorized } from '../api/config'

// Verifica si un JWT esta expirado decodificando el payload
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.exp * 1000 < Date.now()
    } catch {
        return true
    }
}

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarSesion()
        setOnUnauthorized(() => {
            setUsuario(null)
        })
    }, [])

    const cargarSesion = async () => {
        try {
            const token = await AsyncStorage.getItem('token')
            const datosUsuario = await AsyncStorage.getItem('usuario')
            if (token && datosUsuario) {
                if (isTokenExpired(token)) {
                    await AsyncStorage.removeItem('token')
                    await AsyncStorage.removeItem('usuario')
                } else {
                    setUsuario(JSON.parse(datosUsuario))
                }
            }
        } catch (error) {
            console.error('Error al cargar sesion: ', error)
        } finally {
            setCargando(false)
        }
    }

    const login = async (email, password) => {
        const response = await api.post('/auth/admin/login', {
            identificador: email,
            password: password,
        })

        const datos = response.data
        datos.email = email
        await AsyncStorage.setItem('token', datos.token)
        await AsyncStorage.setItem('usuario', JSON.stringify(datos))
        setUsuario(datos)
        return datos
    }

    const logout = async () => {
        await AsyncStorage.removeItem('token')
        await AsyncStorage.removeItem('usuario')
        setUsuario(null)
    }

    return (
        <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
