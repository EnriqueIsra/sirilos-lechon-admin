import React, { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import PantallaHeader from '../../components/PantallaHeader'
import api from '../../api/config'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

const TIPOS = ['TODOS', 'COMPRA', 'COCCION', 'VENTA', 'AJUSTE']

const COLORES_TIPO = {
    COMPRA: { bg: '#fff3cd', text: '#856404', icono: '🛒' },
    COCCION: { bg: '#d1ecf1', text: '#0c5460', icono: '🔥' },
    VENTA: { bg: '#d4edda', text: '#155724', icono: '💰' },
    AJUSTE: { bg: '#e2e3e5', text: '#383d41', icono: '⚖️' },
}

export default function InventarioScreen({ navigation }) {
    const [movimientos, setMovimientos] = useState([])
    const [stock, setStock] = useState(0)
    const [filtro, setFiltro] = useState('TODOS')
    const [cargando, setCargando] = useState(true)
    const [refrescando, setRefrescando] = useState(false)
    const [modalTipo, setModalTipo] = useState(null) // 'COMPRA', 'COCCION', etc.

    const cargar = async () => {
        try {
            const [resMovs, resStock] = await Promise.all([
                api.get('/admin/inventario/movimientos'),
                api.get('/admin/inventario/stock'),
            ])
            setMovimientos(resMovs.data)
            setStock(parseFloat(resStock.data.kilosDisponibles) || 0)
        } catch (error) {
            console.error('Error al cargar inventario:', error)
        } finally {
            setCargando(false)
            setRefrescando(false)
        }
    }

    useFocusEffect(useCallback(() => { cargar() }, []))

    const onRefresh = () => {
        setRefrescando(true)
        cargar()
    }

    const registrarMovimiento = async (datos) => {
        try {
            await api.post('/admin/inventario/movimiento', datos)
            setModalTipo(null)
            Alert.alert('✅ Registrado', 'Movimiento guardado')
            cargar()
        } catch (error) {
            console.error(error)
            Alert.alert('Error', error.response?.data?.message || 'No se pudo registrar')
        }
    }

    const movimientosFiltrados = filtro === 'TODOS'
        ? movimientos
        : movimientos.filter(m => m.tipo === filtro)

    const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })

    const renderMov = ({ item }) => {
        const colores = COLORES_TIPO[item.tipo] || COLORES_TIPO.AJUSTE
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardIcono}>{colores.icono}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitulo}>{item.tipo}</Text>
                        <Text style={styles.cardFecha}>{formatFecha(item.fecha)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                        <Text style={[styles.badgeTexto, { color: colores.text }]}>
                            {item.kilosCocidos != null && `${item.kilosCocidos}kg`}
                            {item.kilosCocidos == null && item.kilosCrudos != null && `${item.kilosCrudos}kg crudo`}
                        </Text>
                    </View>
                </View>
                {item.kilosCrudos != null && item.kilosCocidos != null && (
                    <Text style={styles.cardInfo}>
                        Crudos: {item.kilosCrudos} kg → Cocidos: {item.kilosCocidos} kg
                    </Text>
                )}
                {item.costoTotal != null && (
                    <Text style={styles.cardInfo}>
                        Costo total: ${item.costoTotal.toFixed(2)} {item.costoPorKilo != null && `(${item.costoPorKilo.toFixed(2)}/kg)`}
                    </Text>
                )}
                {item.notas && <Text style={styles.cardNotas}>📝 {item.notas}</Text>}
            </View>
        )
    }

    if (cargando) {
        return (
            <PantallaHeader titulo="Inventario">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </PantallaHeader>
        )
    }

    return (
        <PantallaHeader titulo="Inventario">
            <ScrollView
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                contentContainerStyle={{ paddingBottom: SPACING.xl }}
            >
                {/* Stock destacado */}
                <View style={styles.stockCard}>
                    <Text style={styles.stockLabel}>Stock actual de lechón</Text>
                    <Text style={styles.stockValor}>{stock.toFixed(2)} kg</Text>
                    <Text style={styles.stockSub}>cocidos disponibles para venta</Text>
                </View>

                {/* Botones de acciones */}
                <Text style={styles.seccionTitulo}>Registrar movimiento</Text>
                <View style={styles.botonesGrid}>
                    <BotonAccion tipo="COMPRA" onPress={() => setModalTipo('COMPRA')} />
                    <BotonAccion tipo="COCCION" onPress={() => setModalTipo('COCCION')} />
                    <BotonAccion tipo="VENTA" onPress={() => setModalTipo('VENTA')} />
                    <BotonAccion tipo="AJUSTE" onPress={() => setModalTipo('AJUSTE')} />
                </View>

                {/* Historial */}
                <Text style={styles.seccionTitulo}>Historial de movimientos</Text>
                <View style={styles.filtrosRow}>
                    {TIPOS.map(t => {
                        const activo = filtro === t
                        return (
                            <TouchableOpacity
                                key={t}
                                style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
                                onPress={() => setFiltro(t)}
                            >
                                <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{t}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {movimientosFiltrados.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitulo}>Sin movimientos</Text>
                    </View>
                ) : (
                    movimientosFiltrados.map(m => (
                        <View key={m.id}>{renderMov({ item: m })}</View>
                    ))
                )}
            </ScrollView>

            <MovimientoModal
                tipo={modalTipo}
                onClose={() => setModalTipo(null)}
                onSubmit={registrarMovimiento}
            />
        </PantallaHeader>
    )
}

function BotonAccion({ tipo, onPress }) {
    const c = COLORES_TIPO[tipo]
    return (
        <TouchableOpacity style={[styles.btnAccion, { backgroundColor: c.bg }]} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.btnAccionIcono}>{c.icono}</Text>
            <Text style={[styles.btnAccionTexto, { color: c.text }]}>{tipo}</Text>
        </TouchableOpacity>
    )
}

function MovimientoModal({ tipo, onClose, onSubmit }) {
    const [kilosCrudos, setKilosCrudos] = useState('')
    const [kilosCocidos, setKilosCocidos] = useState('')
    const [costoTotal, setCostoTotal] = useState('')
    const [notas, setNotas] = useState('')

    React.useEffect(() => {
        if (tipo) {
            setKilosCrudos('')
            setKilosCocidos('')
            setCostoTotal('')
            setNotas('')
        }
    }, [tipo])

    if (!tipo) return null

    const handleSubmit = () => {
        const datos = { tipo, notas: notas.trim() || null }
        const kc = parseFloat(kilosCrudos) || null
        const kco = parseFloat(kilosCocidos) || null
        const ct = parseFloat(costoTotal) || null

        if (tipo === 'COMPRA') {
            if (!kc || kc <= 0) { Alert.alert('Error', 'Kilos crudos inválidos'); return }
            if (!ct || ct <= 0) { Alert.alert('Error', 'Costo total inválido'); return }
            datos.kilosCrudos = kc
            datos.costoTotal = ct
        } else if (tipo === 'COCCION') {
            if (!kc || kc <= 0) { Alert.alert('Error', 'Kilos crudos inválidos'); return }
            if (!kco || kco <= 0) { Alert.alert('Error', 'Kilos cocidos inválidos'); return }
            datos.kilosCrudos = kc
            datos.kilosCocidos = kco
            if (ct) datos.costoTotal = ct
        } else if (tipo === 'VENTA') {
            if (!kco || kco <= 0) { Alert.alert('Error', 'Kilos vendidos inválidos'); return }
            datos.kilosCocidos = kco
        } else if (tipo === 'AJUSTE') {
            const valor = parseFloat(kilosCocidos)
            if (isNaN(valor) || valor === 0) { Alert.alert('Error', 'Indica cuántos kilos ajustar (positivo o negativo)'); return }
            datos.kilosCocidos = valor
        }
        onSubmit(datos)
    }

    const c = COLORES_TIPO[tipo]
    const descripcion = {
        COMPRA: 'Carne cruda comprada al proveedor',
        COCCION: 'Conversión de carne cruda a cocida (lista para vender)',
        VENTA: 'Carne cocida vendida (descuenta del stock)',
        AJUSTE: 'Corrección manual del stock (positivo o negativo)',
    }[tipo]

    return (
        <Modal visible={!!tipo} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>
                            {c.icono} {tipo}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.detalle}>{descripcion}</Text>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled">
                        {/* COMPRA: pierna cruda */}
                        {tipo === 'COMPRA' && (
                            <>
                                <Text style={styles.label}>Kilos crudos *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={kilosCrudos}
                                    onChangeText={setKilosCrudos}
                                    placeholder="Ej: 12"
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.label}>Costo total *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={costoTotal}
                                    onChangeText={setCostoTotal}
                                    placeholder="Ej: 750"
                                    keyboardType="decimal-pad"
                                />
                            </>
                        )}

                        {/* COCCION */}
                        {tipo === 'COCCION' && (
                            <>
                                <Text style={styles.label}>Kilos crudos usados *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={kilosCrudos}
                                    onChangeText={setKilosCrudos}
                                    placeholder="Ej: 12"
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.label}>Kilos cocidos resultantes *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={kilosCocidos}
                                    onChangeText={setKilosCocidos}
                                    placeholder="Ej: 6"
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.label}>Costo total (opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={costoTotal}
                                    onChangeText={setCostoTotal}
                                    placeholder="Ej: 750"
                                    keyboardType="decimal-pad"
                                />
                            </>
                        )}

                        {/* VENTA */}
                        {tipo === 'VENTA' && (
                            <>
                                <Text style={styles.label}>Kilos vendidos *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={kilosCocidos}
                                    onChangeText={setKilosCocidos}
                                    placeholder="Ej: 1.5"
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.helper}>
                                    Esto descuenta del stock actual ({/* puedes mostrar el stock aqui si quieres */})
                                </Text>
                            </>
                        )}

                        {/* AJUSTE */}
                        {tipo === 'AJUSTE' && (
                            <>
                                <Text style={styles.label}>Cantidad de kilos *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={kilosCocidos}
                                    onChangeText={setKilosCocidos}
                                    placeholder="Positivo para sumar, negativo para restar (ej: -0.5)"
                                    keyboardType="numbers-and-punctuation"
                                />
                                <Text style={styles.helper}>
                                    Usa números negativos para descontar (ej: -2)
                                </Text>
                            </>
                        )}

                        <Text style={styles.label}>Notas (opcional)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 60 }]}
                            value={notas}
                            onChangeText={setNotas}
                            placeholder="Ej: Pierna de cerdo proveedor Don Pancho"
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                            <Text style={styles.btnEnviarTexto}>Registrar {tipo}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { padding: SPACING.xl, alignItems: 'center' },
    emptyTitulo: { fontSize: FONT_SIZES.body, color: COLORS.textMuted },

    stockCard: {
        backgroundColor: COLORS.primary,
        marginHorizontal: SPACING.md,
        padding: SPACING.lg,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    stockLabel: { fontSize: FONT_SIZES.body, color: '#fff', opacity: 0.9 },
    stockValor: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
    stockSub: { fontSize: FONT_SIZES.small, color: '#fff', opacity: 0.8 },

    seccionTitulo: {
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
        color: COLORS.text,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },

    botonesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    btnAccion: {
        width: '48%',
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnAccionIcono: { fontSize: 32, marginBottom: 4 },
    btnAccionTexto: { fontSize: FONT_SIZES.body, fontWeight: 'bold' },

    filtrosRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.md,
        gap: 6,
        marginBottom: SPACING.sm,
    },
    filtroBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    filtroBtnActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filtroTexto: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
    filtroTextoActivo: { color: '#fff' },

    card: {
        backgroundColor: COLORS.cardBg,
        marginHorizontal: SPACING.md,
        borderRadius: 12,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    cardIcono: { fontSize: 24 },
    cardTitulo: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text },
    cardFecha: { fontSize: FONT_SIZES.small, color: COLORS.textMuted },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeTexto: { fontSize: FONT_SIZES.tiny, fontWeight: 'bold' },
    cardInfo: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginTop: 6 },
    cardNotas: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: SPACING.lg,
        maxHeight: '92%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    modalTitulo: { fontSize: FONT_SIZES.subtitle, fontWeight: 'bold', color: COLORS.primary },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center', alignItems: 'center',
    },
    closeTexto: { fontSize: 18, color: COLORS.text, fontWeight: 'bold' },
    detalle: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginBottom: SPACING.sm },
    label: {
        fontSize: FONT_SIZES.body,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 12,
        fontSize: FONT_SIZES.body,
        backgroundColor: COLORS.cardBg,
    },
    helper: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, marginTop: 4 },
    btnEnviar: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    btnEnviarTexto: { color: '#fff', fontSize: FONT_SIZES.heading, fontWeight: 'bold' },
})
