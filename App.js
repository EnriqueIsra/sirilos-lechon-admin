import { useContext } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, AuthContext } from './src/context/AuthContext'
import { WebSocketProvider } from './src/context/WebSocketContext'
import AppNavigation from './src/navigation/AppNavigation'
import NotificacionesGlobales from './src/components/NotificacionesGlobales'

function Contenido() {
    const { usuario } = useContext(AuthContext)
    return (
        <>
            <AppNavigation />
            {usuario && <NotificacionesGlobales />}
            <StatusBar style="light" />
        </>
    )
}

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <WebSocketProvider>
                    <Contenido />
                </WebSocketProvider>
            </AuthProvider>
        </SafeAreaProvider>
    )
}
