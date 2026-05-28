import React, { useContext, useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Vibration } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebSocketContext } from '../context/WebSocketContext'
import { COLORS, FONT_SIZES, SPACING } from '../styles/theme'

const DURATION_MS = 5000

export default function NotificacionesGlobales() {
    const { addListener } = useContext(WebSocketContext)
    const [notificaciones, setNotificaciones] = useState([])
    const insets = useSafeAreaInsets()

    const mostrar = (tipo, titulo, mensaje, color) => {
        const id = Date.now() + Math.random()
        const notif = { id, tipo, titulo, mensaje, color }
        setNotificaciones(prev => [notif, ...prev])
        Vibration.vibrate([0, 200, 100, 200])
        setTimeout(() => {
            setNotificaciones(prev => prev.filter(n => n.id !== id))
        }, DURATION_MS)
    }

    const cerrar = (id) => {
        setNotificaciones(prev => prev.filter(n => n.id !== id))
    }

    useEffect(() => {
        const unsubPedidos = addListener('/topic/pedidos', (notif) => {
            mostrar('PEDIDO', '🔔 Nuevo pedido', notif.mensaje || 'Pedido nuevo recibido', '#27ae60')
        })
        const unsubCotizaciones = addListener('/topic/cotizaciones', (notif) => {
            mostrar('COTIZACION', '🎉 Nueva cotización', notif.mensaje || 'Solicitud de evento recibida', '#3498db')
        })
        return () => {
            unsubPedidos()
            unsubCotizaciones()
        }
    }, [])

    if (notificaciones.length === 0) return null

    return (
        <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
            {notificaciones.map((n) => (
                <ToastNotif key={n.id} notif={n} onClose={() => cerrar(n.id)} />
            ))}
        </View>
    )
}

function ToastNotif({ notif, onClose }) {
    const slideAnim = useRef(new Animated.Value(-100)).current

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start()
    }, [])

    return (
        <Animated.View
            style={[
                styles.toast,
                { borderLeftColor: notif.color, transform: [{ translateY: slideAnim }] },
            ]}
        >
            <TouchableOpacity onPress={onClose} activeOpacity={0.9} style={styles.toastContent}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>{notif.titulo}</Text>
                    <Text style={styles.mensaje}>{notif.mensaje}</Text>
                </View>
                <Text style={styles.cerrar}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 10,
        right: 10,
        zIndex: 9999,
    },
    toast: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: SPACING.sm,
        borderLeftWidth: 4,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    titulo: {
        fontSize: FONT_SIZES.body,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    mensaje: {
        fontSize: FONT_SIZES.small,
        color: COLORS.textSecondary,
    },
    cerrar: {
        fontSize: 18,
        color: COLORS.textMuted,
        marginLeft: SPACING.sm,
        fontWeight: 'bold',
    },
})
