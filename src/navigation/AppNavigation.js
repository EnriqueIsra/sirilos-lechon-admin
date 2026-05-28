import React, { useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import { AuthContext } from '../context/AuthContext'
import { COLORS } from '../styles/theme'

import LoginScreen from '../screens/auth/LoginScreen'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import PedidosScreen from '../screens/pedidos/PedidosScreen'
import CotizacionesScreen from '../screens/cotizaciones/CotizacionesScreen'
import CatalogoScreen from '../screens/catalogo/CatalogoScreen'
import InventarioScreen from '../screens/inventario/InventarioScreen'
import GastosScreen from '../screens/gastos/GastosScreen'

const Stack = createNativeStackNavigator()

function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Pedidos" component={PedidosScreen} />
            <Stack.Screen name="Cotizaciones" component={CotizacionesScreen} />
            <Stack.Screen name="Catalogo" component={CatalogoScreen} />
            <Stack.Screen name="Inventario" component={InventarioScreen} />
            <Stack.Screen name="Gastos" component={GastosScreen} />
        </Stack.Navigator>
    )
}

export default function AppNavigation() {
    const { usuario, cargando } = useContext(AuthContext)

    if (cargando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        )
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {usuario ? (
                    <Stack.Screen name="AppStack" component={AppStack} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    )
}
