import React, { useContext } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { AuthContext } from '../../context/AuthContext'
import PantallaHeader from '../../components/PantallaHeader'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

export default function DashboardScreen({ navigation }) {
    const { usuario, logout } = useContext(AuthContext)

    const handleLogout = () => {
        Alert.alert('Cerrar sesión', '¿Salir del panel?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: logout },
        ])
    }

    return (
        <PantallaHeader titulo="Panel admin">
            <ScrollView contentContainerStyle={styles.contenido}>
                <View style={styles.bienvenida}>
                    <Text style={styles.saludo}>Hola, {usuario?.nombre || 'Admin'} 👋</Text>
                    <Text style={styles.email}>{usuario?.email}</Text>
                </View>

                <Text style={styles.seccionTitulo}>Acciones rápidas</Text>

                <View style={styles.grid}>
                    <CardAccion
                        icono="📋"
                        titulo="Pedidos"
                        descripcion="Gestionar pedidos del día"
                        onPress={() => navigation.navigate('Pedidos')}
                    />
                    <CardAccion
                        icono="🎉"
                        titulo="Cotizaciones"
                        descripcion="Responder solicitudes de eventos"
                        onPress={() => navigation.navigate('Cotizaciones')}
                    />
                    <CardAccion
                        icono="🍽️"
                        titulo="Catálogo"
                        descripcion="Productos y bebidas"
                        onPress={() => navigation.navigate('Catalogo')}
                    />
                    <CardAccion
                        icono="📦"
                        titulo="Inventario"
                        descripcion="Stock de lechón"
                        onPress={() => navigation.navigate('Inventario')}
                    />
                    <CardAccion
                        icono="💰"
                        titulo="Gastos"
                        descripcion="Registro de costos"
                        onPress={() => navigation.navigate('Gastos')}
                    />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutTexto}>Cerrar sesión</Text>
                </TouchableOpacity>
            </ScrollView>
        </PantallaHeader>
    )
}

function CardAccion({ icono, titulo, descripcion, onPress }) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.cardIcono}>{icono}</Text>
            <Text style={styles.cardTitulo}>{titulo}</Text>
            <Text style={styles.cardDescripcion}>{descripcion}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    contenido: {
        padding: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    bienvenida: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 12,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    saludo: {
        fontSize: FONT_SIZES.subtitle,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    email: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    seccionTitulo: {
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: SPACING.md,
        width: '48%',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    cardIcono: {
        fontSize: 36,
        marginBottom: SPACING.xs,
    },
    cardTitulo: {
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    cardDescripcion: {
        fontSize: FONT_SIZES.small,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    logoutBtn: {
        borderWidth: 2,
        borderColor: COLORS.danger,
        padding: SPACING.md,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    logoutTexto: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.body,
    },
})
