import React, { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useFocusEffect } from '@react-navigation/native'
import PantallaHeader from '../../components/PantallaHeader'
import api from '../../api/config'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

const CATEGORIAS = ['CARNE', 'INSUMOS_VERDES', 'TORTILLAS_BOLILLOS', 'DESECHABLES', 'GAS', 'OTROS']
const FILTROS = ['TODAS', ...CATEGORIAS]

const META_CATEGORIA = {
    CARNE: { icono: '🥩', color: '#e74c3c', label: 'Carne' },
    INSUMOS_VERDES: { icono: '🥑', color: '#27ae60', label: 'Insumos verdes' },
    TORTILLAS_BOLILLOS: { icono: '🌮', color: '#f39c12', label: 'Tortillas/bolillos' },
    DESECHABLES: { icono: '🥡', color: '#3498db', label: 'Desechables' },
    GAS: { icono: '🔥', color: '#e67e22', label: 'Gas' },
    OTROS: { icono: '📦', color: '#95a5a6', label: 'Otros' },
}

export default function GastosScreen({ navigation }) {
    const [gastos, setGastos] = useState([])
    const [resumen, setResumen] = useState({})
    const [total, setTotal] = useState(0)
    const [filtro, setFiltro] = useState('TODAS')
    const [cargando, setCargando] = useState(true)
    const [refrescando, setRefrescando] = useState(false)
    const [creando, setCreando] = useState(false)

    const cargar = async () => {
        try {
            const [resGastos, resResumen, resTotal] = await Promise.all([
                api.get('/admin/gastos'),
                api.get('/admin/gastos/resumen'),
                api.get('/admin/gastos/total'),
            ])
            setGastos(resGastos.data)
            setResumen(resResumen.data || {})
            setTotal(parseFloat(resTotal.data.totalGastos) || 0)
        } catch (error) {
            console.error('Error al cargar gastos:', error)
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

    const registrarGasto = async (datos) => {
        try {
            await api.post('/admin/gastos', datos)
            setCreando(false)
            Alert.alert('✅ Registrado', 'Gasto guardado')
            cargar()
        } catch (error) {
            console.error(error)
            Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar')
        }
    }

    const gastosFiltrados = filtro === 'TODAS'
        ? gastos
        : gastos.filter(g => g.categoria === filtro)

    const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    const renderGasto = ({ item }) => {
        const meta = META_CATEGORIA[item.categoria] || META_CATEGORIA.OTROS
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardIcono}>{meta.icono}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitulo}>{item.descripcion}</Text>
                        <Text style={styles.cardFecha}>{formatFecha(item.fecha)} · {meta.label}</Text>
                    </View>
                    <Text style={[styles.cardMonto, { color: meta.color }]}>${item.monto.toFixed(2)}</Text>
                </View>
                {item.notas && <Text style={styles.cardNotas}>📝 {item.notas}</Text>}
            </View>
        )
    }

    if (cargando) {
        return (
            <PantallaHeader titulo="Gastos">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </PantallaHeader>
        )
    }

    return (
        <PantallaHeader titulo="Gastos">
            <ScrollView
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                contentContainerStyle={{ paddingBottom: SPACING.xl }}
            >
                {/* Total destacado */}
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Total acumulado</Text>
                    <Text style={styles.totalValor}>${total.toFixed(2)}</Text>
                    <Text style={styles.totalSub}>en {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}</Text>
                </View>

                {/* Botón crear */}
                <TouchableOpacity style={styles.btnNuevo} onPress={() => setCreando(true)}>
                    <Text style={styles.btnNuevoTexto}>+ Nuevo gasto</Text>
                </TouchableOpacity>

                {/* Resumen por categoria */}
                <Text style={styles.seccionTitulo}>Resumen por categoría</Text>
                <View style={styles.resumenGrid}>
                    {CATEGORIAS.map(cat => {
                        const meta = META_CATEGORIA[cat]
                        const monto = resumen[cat] || 0
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.resumenCard, { borderLeftColor: meta.color }]}
                                onPress={() => setFiltro(cat)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.resumenIcono}>{meta.icono}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.resumenLabel}>{meta.label}</Text>
                                    <Text style={[styles.resumenMonto, { color: meta.color }]}>${parseFloat(monto).toFixed(2)}</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {/* Historial */}
                <Text style={styles.seccionTitulo}>Historial</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filtrosScroll}
                    contentContainerStyle={styles.filtrosContent}
                >
                    {FILTROS.map(f => {
                        const activo = filtro === f
                        const label = f === 'TODAS' ? 'TODAS' : (META_CATEGORIA[f]?.label || f)
                        return (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
                                onPress={() => setFiltro(f)}
                            >
                                <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{label}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>

                {gastosFiltrados.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitulo}>Sin gastos</Text>
                        <Text style={styles.emptySub}>
                            {filtro === 'TODAS' ? 'Registra el primero' : `Nada en ${META_CATEGORIA[filtro]?.label || filtro}`}
                        </Text>
                    </View>
                ) : (
                    gastosFiltrados.map(g => (
                        <View key={g.id}>{renderGasto({ item: g })}</View>
                    ))
                )}
            </ScrollView>

            <GastoModal
                visible={creando}
                onClose={() => setCreando(false)}
                onSubmit={registrarGasto}
            />
        </PantallaHeader>
    )
}

function GastoModal({ visible, onClose, onSubmit }) {
    const [categoria, setCategoria] = useState('OTROS')
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [fechaTxt, setFechaTxt] = useState('')
    const [fechaDate, setFechaDate] = useState(new Date())
    const [showPicker, setShowPicker] = useState(false)
    const [notas, setNotas] = useState('')

    React.useEffect(() => {
        if (visible) {
            setCategoria('OTROS')
            setDescripcion('')
            setMonto('')
            setNotas('')
            const hoy = new Date()
            setFechaDate(hoy)
            const y = hoy.getFullYear()
            const m = String(hoy.getMonth() + 1).padStart(2, '0')
            const d = String(hoy.getDate()).padStart(2, '0')
            setFechaTxt(`${y}-${m}-${d}`)
        }
    }, [visible])

    const onDateChange = (event, date) => {
        setShowPicker(false)
        if (date) {
            setFechaDate(date)
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            setFechaTxt(`${y}-${m}-${d}`)
        }
    }

    const handleSubmit = () => {
        if (!descripcion.trim()) {
            Alert.alert('Error', 'La descripción es obligatoria')
            return
        }
        const m = parseFloat(monto)
        if (!m || m <= 0) {
            Alert.alert('Error', 'Monto inválido')
            return
        }
        const datos = {
            categoria,
            descripcion: descripcion.trim(),
            monto: m,
            notas: notas.trim() || null,
        }
        if (fechaTxt.trim()) {
            datos.fecha = `${fechaTxt.trim()}T12:00:00`
        }
        onSubmit(datos)
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>Nuevo gasto</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Categoría *</Text>
                        <View style={styles.tiposRow}>
                            {CATEGORIAS.map(c => {
                                const meta = META_CATEGORIA[c]
                                const activo = categoria === c
                                return (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.tipoBtn, activo && { backgroundColor: meta.color, borderColor: meta.color }]}
                                        onPress={() => setCategoria(c)}
                                    >
                                        <Text style={[styles.tipoTexto, activo && styles.tipoTextoActivo]}>
                                            {meta.icono} {meta.label}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        <Text style={styles.label}>Descripción *</Text>
                        <TextInput
                            style={styles.input}
                            value={descripcion}
                            onChangeText={setDescripcion}
                            placeholder="Ej: Pierna de cerdo - Don Pancho"
                        />

                        <Text style={styles.label}>Monto *</Text>
                        <TextInput
                            style={styles.input}
                            value={monto}
                            onChangeText={setMonto}
                            placeholder="Ej: 750"
                            keyboardType="decimal-pad"
                        />

                        <Text style={styles.label}>Fecha</Text>
                        <View style={styles.fechaRow}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={fechaTxt}
                                onChangeText={setFechaTxt}
                                placeholder="YYYY-MM-DD"
                            />
                            <TouchableOpacity style={styles.iconoBtn} onPress={() => setShowPicker(true)}>
                                <Text style={{ fontSize: 22 }}>📅</Text>
                            </TouchableOpacity>
                        </View>
                        {showPicker && (
                            <DateTimePicker
                                value={fechaDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )}

                        <Text style={styles.label}>Notas (opcional)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 60 }]}
                            value={notas}
                            onChangeText={setNotas}
                            placeholder="Detalle extra"
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                            <Text style={styles.btnEnviarTexto}>Registrar gasto</Text>
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
    emptyTitulo: { fontSize: FONT_SIZES.body, color: COLORS.textMuted, fontWeight: 'bold' },
    emptySub: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, marginTop: 4 },

    totalCard: {
        backgroundColor: COLORS.primary,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        padding: SPACING.lg,
        borderRadius: 16,
        alignItems: 'center',
    },
    totalLabel: { fontSize: FONT_SIZES.body, color: '#fff', opacity: 0.9 },
    totalValor: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
    totalSub: { fontSize: FONT_SIZES.small, color: '#fff', opacity: 0.8 },

    btnNuevo: {
        backgroundColor: COLORS.primary,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnNuevoTexto: { color: '#fff', fontWeight: 'bold', fontSize: FONT_SIZES.body },

    seccionTitulo: {
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
        color: COLORS.text,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },

    resumenGrid: {
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    resumenCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        padding: SPACING.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 4,
    },
    resumenIcono: { fontSize: 28, marginRight: SPACING.sm },
    resumenLabel: { fontSize: FONT_SIZES.body, color: COLORS.text, fontWeight: '600' },
    resumenMonto: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', marginTop: 2 },

    filtrosScroll: { flexGrow: 0, marginBottom: SPACING.sm },
    filtrosContent: { paddingHorizontal: SPACING.md, gap: 6, paddingVertical: 4 },
    filtroBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
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
    cardIcono: { fontSize: 28 },
    cardTitulo: { fontSize: FONT_SIZES.body, fontWeight: 'bold', color: COLORS.text },
    cardFecha: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, marginTop: 2 },
    cardMonto: { fontSize: FONT_SIZES.heading, fontWeight: 'bold' },
    cardNotas: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, fontStyle: 'italic', marginTop: SPACING.xs, marginLeft: 40 },

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
    fechaRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    iconoBtn: {
        width: 50,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tipoBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    tipoTexto: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
    tipoTextoActivo: { color: '#fff' },
    btnEnviar: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    btnEnviarTexto: { color: '#fff', fontSize: FONT_SIZES.heading, fontWeight: 'bold' },
})
