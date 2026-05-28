import React, { useState, useContext } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { AuthContext } from '../../context/AuthContext'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

export default function LoginScreen() {
    const { login } = useContext(AuthContext)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [cargando, setCargando] = useState(false)

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Completa todos los campos')
            return
        }

        setCargando(true)
        try {
            await login(email, password)
        } catch (error) {
            Alert.alert('Error', 'Email o contraseña incorrectos')
        } finally {
            setCargando(false)
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.contenido}>
                <Text style={styles.logo}>Sirilo's Lechón</Text>
                <Text style={styles.subtitulo}>Panel de Administración</Text>

                <View style={styles.formCard}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="admin@sirilos.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tu contraseña"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={[styles.boton, cargando && styles.botonDeshabilitado]}
                        onPress={handleLogin}
                        disabled={cargando}
                    >
                        <Text style={styles.botonTexto}>
                            {cargando ? 'Entrando...' : 'Iniciar sesión'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Acceso restringido al personal</Text>
            </View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    contenido: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    logo: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitulo: {
        fontSize: FONT_SIZES.body,
        color: '#fff',
        textAlign: 'center',
        opacity: 0.9,
        marginBottom: SPACING.xl,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    label: {
        fontSize: FONT_SIZES.body,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
        marginTop: SPACING.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
        fontSize: FONT_SIZES.body,
        backgroundColor: COLORS.cardBg,
    },
    boton: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    botonDeshabilitado: {
        backgroundColor: '#ccc',
    },
    botonTexto: {
        color: '#fff',
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
    },
    footer: {
        color: '#fff',
        textAlign: 'center',
        marginTop: SPACING.xl,
        opacity: 0.7,
        fontSize: FONT_SIZES.small,
    },
})
