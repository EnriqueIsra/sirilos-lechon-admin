import React, { useState, useCallback, useContext, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, Vibration, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import PantallaHeader from '../../components/PantallaHeader'
import api from '../../api/config'
import { WebSocketContext } from '../../context/WebSocketContext'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

const ESTADOS = ['TODOS', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'LISTO', 'ENTREGADO', 'CANCELADO']

const COLORES_ESTADO = {
    PENDIENTE: { bg: '#fff3cd', text: '#856404' },
    CONFIRMADO: { bg: '#d1ecf1', text: '#0c5460' },
    EN_PROCESO: { bg: '#cce5ff', text: '#004085' },
    LISTO: { bg: '#d4edda', text: '#155724' },
    ENTREGADO: { bg: '#e2e3e5', text: '#383d41' },
    CANCELADO: { bg: '#f8d7da', text: '#721c24' },
}

const COMPLEMENTOS_LABEL = {
    SOLO_BOLILLOS: 'Solo bolillos',
    SOLO_TORTILLAS: 'Solo tortillas',
    AMBOS: 'Bolillos y tortillas',
}

// Transiciones permitidas (estado actual -> siguientes posibles)
const SIGUIENTES_ESTADOS = {
    PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
    CONFIRMADO: ['EN_PROCESO', 'CANCELADO'],
    EN_PROCESO: ['LISTO', 'CANCELADO'],
    LISTO: ['ENTREGADO', 'CANCELADO'],
    ENTREGADO: [],
    CANCELADO: [],
}

export default function PedidosScreen({ navigation }) {
    const [pedidos, setPedidos] = useState([])
    const [filtro, setFiltro] = useState('TODOS')
    const [cargando, setCargando] = useState(true)
    const [refrescando, setRefrescando] = useState(false)
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
    const [cancelarVisible, setCancelarVisible] = useState(false)
    const { addListener } = useContext(WebSocketContext)

    // Refresca la lista cuando llega un pedido nuevo (notificación visual la maneja NotificacionesGlobales)
    useEffect(() => {
        const unsub = addListener('/topic/pedidos', () => {
            cargar()
        })
        return unsub
    }, [])

    const cargar = async () => {
        try {
            const response = await api.get('/admin/pedidos')
            setPedidos(response.data.sort((a, b) =>
                new Date(b.fechaPedido) - new Date(a.fechaPedido)
            ))
        } catch (error) {
            console.error('Error al cargar pedidos:', error)
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

    const cambiarEstado = async (pedido, nuevoEstado) => {
        // Si es CANCELADO, abrir modal pidiendo motivo
        if (nuevoEstado === 'CANCELADO') {
            setCancelarVisible(true)
            return
        }
        try {
            const response = await api.patch(`/admin/pedidos/${pedido.id}/estado/${nuevoEstado}`)
            setPedidos(prev => prev.map(p => p.id === pedido.id ? response.data : p))
            setPedidoSeleccionado(response.data)
            Alert.alert('Estado actualizado', `Pedido #${pedido.id} ahora está ${nuevoEstado}`)
        } catch (error) {
            console.error('Error al cambiar estado:', error)
            Alert.alert('Error', 'No se pudo cambiar el estado')
        }
    }

    const cancelarPedido = async (motivo) => {
        try {
            const response = await api.patch(`/admin/pedidos/${pedidoSeleccionado.id}/cancelar`, { motivo })
            setPedidos(prev => prev.map(p => p.id === pedidoSeleccionado.id ? response.data : p))
            setPedidoSeleccionado(response.data)
            setCancelarVisible(false)
            Alert.alert('Pedido cancelado', 'El cliente verá el motivo')
        } catch (error) {
            console.error('Error:', error)
            Alert.alert('Error', 'No se pudo cancelar')
        }
    }

    const pedidosFiltrados = filtro === 'TODOS'
        ? pedidos
        : pedidos.filter(p => p.estado === filtro)

    const conteoPorEstado = (estado) => {
        if (estado === 'TODOS') return pedidos.length
        return pedidos.filter(p => p.estado === estado).length
    }

    const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })

    const renderItem = ({ item }) => {
        const colores = COLORES_ESTADO[item.estado] || COLORES_ESTADO.PENDIENTE
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setPedidoSeleccionado(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                    <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                        <Text style={[styles.badgeTexto, { color: colores.text }]}>{item.estado}</Text>
                    </View>
                </View>

                <Text style={styles.cliente}>👤 {item.nombreCliente} · 📱 {item.telefonoCliente}</Text>
                <Text style={styles.fecha}>{formatFecha(item.fechaPedido)}</Text>

                <View style={styles.itemsResumen}>
                    {item.items.slice(0, 2).map((it, idx) => (
                        <Text key={idx} style={styles.itemTxt}>
                            • {it.tipoProducto === 'KILO' ? `${it.cantidad}kg` : `${it.cantidad}x`} {it.nombreProducto}
                        </Text>
                    ))}
                    {item.items.length > 2 && (
                        <Text style={styles.itemTxt}>+ {item.items.length - 2} más...</Text>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.tipoEntrega}>
                        {item.tipoEntrega === 'DELIVERY' ? '🛵 Delivery' : '🏪 Pickup'}
                    </Text>
                    <Text style={styles.total}>${item.total.toFixed(2)}</Text>
                </View>
            </TouchableOpacity>
        )
    }

    if (cargando) {
        return (
            <PantallaHeader titulo="Pedidos">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </PantallaHeader>
        )
    }

    return (
        <PantallaHeader titulo="Pedidos">
            {/* Filtros por estado */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtrosContainer}
                contentContainerStyle={styles.filtrosContent}
            >
                {ESTADOS.map(estado => {
                    const count = conteoPorEstado(estado)
                    const activo = filtro === estado
                    return (
                        <TouchableOpacity
                            key={estado}
                            style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
                            onPress={() => setFiltro(estado)}
                        >
                            <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>
                                {estado} {count > 0 && `(${count})`}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>

            {pedidosFiltrados.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyTitulo}>No hay pedidos</Text>
                    <Text style={styles.emptySubtitulo}>
                        {filtro === 'TODOS' ? 'Aún no se han registrado pedidos' : `Sin pedidos en ${filtro}`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pedidosFiltrados}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            )}

            <DetallePedidoModal
                pedido={pedidoSeleccionado}
                onClose={() => setPedidoSeleccionado(null)}
                onCambiarEstado={cambiarEstado}
            />

            <CancelarPedidoModal
                visible={cancelarVisible}
                onClose={() => setCancelarVisible(false)}
                onSubmit={cancelarPedido}
            />
        </PantallaHeader>
    )
}

function DetallePedidoModal({ pedido, onClose, onCambiarEstado }) {
    if (!pedido) return null

    const colores = COLORES_ESTADO[pedido.estado] || COLORES_ESTADO.PENDIENTE
    const siguientes = SIGUIENTES_ESTADOS[pedido.estado] || []

    const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    const confirmarCambio = (nuevoEstado) => {
        Alert.alert(
            'Cambiar estado',
            `¿Cambiar a ${nuevoEstado}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí', onPress: () => onCambiarEstado(pedido, nuevoEstado) },
            ]
        )
    }

    return (
        <Modal
            visible={!!pedido}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>Pedido #{pedido.id}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }}>
                        <View style={[styles.badge, { backgroundColor: colores.bg, alignSelf: 'flex-start', marginBottom: SPACING.md }]}>
                            <Text style={[styles.badgeTexto, { color: colores.text }]}>{pedido.estado}</Text>
                        </View>

                        <Text style={styles.seccionTitulo}>Cliente</Text>
                        <Text style={styles.detalle}>👤 {pedido.nombreCliente}</Text>
                        <Text style={styles.detalle}>📱 {pedido.telefonoCliente}</Text>

                        <Text style={styles.seccionTitulo}>Información del pedido</Text>
                        <Text style={styles.detalle}>📅 {formatFecha(pedido.fechaPedido)}</Text>
                        <Text style={styles.detalle}>
                            {pedido.tipoEntrega === 'DELIVERY' ? '🛵 Entrega a domicilio' : '🏪 Recoger en local'}
                        </Text>
                        {pedido.tipoEntrega === 'DELIVERY' && pedido.direccion && (
                            <Text style={styles.detalle}>📍 {pedido.direccion}</Text>
                        )}
                        <Text style={styles.detalle}>💵 {pedido.metodoPago}</Text>

                        <Text style={styles.seccionTitulo}>Productos</Text>
                        {pedido.items.map((it, idx) => (
                            <View key={idx} style={styles.itemDetalle}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemNombre}>
                                        {it.tipoProducto === 'KILO' ? `${it.cantidad}kg` : `${it.cantidad}x`} {it.nombreProducto}
                                    </Text>
                                    {it.nombreBebida && (
                                        <Text style={styles.itemDetalleTxt}>🥤 {it.nombreBebida}</Text>
                                    )}
                                    {it.opcionComplementos && (
                                        <Text style={styles.itemDetalleTxt}>🥖 {COMPLEMENTOS_LABEL[it.opcionComplementos] || it.opcionComplementos}</Text>
                                    )}
                                    {it.notas && (
                                        <Text style={styles.itemNotas}>📝 {it.notas}</Text>
                                    )}
                                </View>
                                <Text style={styles.itemSubtotal}>${it.subtotal.toFixed(2)}</Text>
                            </View>
                        ))}

                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Subtotal:</Text>
                            <Text style={styles.rowValue}>${pedido.subtotal.toFixed(2)}</Text>
                        </View>
                        {pedido.costoEnvio > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>Envío:</Text>
                                <Text style={styles.rowValue}>${pedido.costoEnvio.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={[styles.row, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total:</Text>
                            <Text style={styles.totalValue}>${pedido.total.toFixed(2)}</Text>
                        </View>

                        {pedido.notas && (
                            <>
                                <Text style={styles.seccionTitulo}>Notas del cliente</Text>
                                <View style={styles.notasClienteBox}>
                                    <Text style={styles.notasClienteTxt}>{pedido.notas}</Text>
                                </View>
                            </>
                        )}

                        {pedido.motivoRechazo && (
                            <>
                                <Text style={styles.seccionTitulo}>Motivo de cancelación</Text>
                                <View style={styles.motivoRechazoBox}>
                                    <Text style={styles.motivoRechazoTxt}>{pedido.motivoRechazo}</Text>
                                </View>
                            </>
                        )}

                        {siguientes.length > 0 && (
                            <>
                                <Text style={styles.seccionTitulo}>Cambiar estado</Text>
                                <View style={styles.botonesEstado}>
                                    {siguientes.map(estado => {
                                        const c = COLORES_ESTADO[estado]
                                        return (
                                            <TouchableOpacity
                                                key={estado}
                                                style={[styles.btnEstado, { backgroundColor: c.bg, borderColor: c.text }]}
                                                onPress={() => confirmarCambio(estado)}
                                            >
                                                <Text style={[styles.btnEstadoTexto, { color: c.text }]}>{estado}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

function CancelarPedidoModal({ visible, onClose, onSubmit }) {
    const [motivo, setMotivo] = useState('')

    useEffect(() => {
        if (visible) setMotivo('')
    }, [visible])

    const handleSubmit = () => {
        if (!motivo.trim()) {
            Alert.alert('Error', 'Escribe un motivo')
            return
        }
        onSubmit(motivo.trim())
    }

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>Motivo de cancelación</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.detalle}>
                        Explícale al cliente por qué se cancela. Esto lo verá en su app.
                    </Text>
                    <TextInput
                        style={[styles.input, { minHeight: 100, marginTop: SPACING.md }]}
                        placeholder="Ej: No hay producto disponible, fuera de zona, etc."
                        value={motivo}
                        onChangeText={setMotivo}
                        multiline
                        textAlignVertical="top"
                    />
                    <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                        <Text style={styles.btnEnviarTexto}>Confirmar cancelación</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    emptyTitulo: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.xs },
    emptySubtitulo: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, textAlign: 'center' },

    filtrosContainer: {
        flexGrow: 0,
        flexShrink: 0,
        marginBottom: SPACING.sm,
    },
    filtrosContent: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        gap: 8,
        alignItems: 'center',
    },
    filtroBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    filtroBtnActivo: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filtroTexto: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
    filtroTextoActivo: { color: '#fff' },

    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    pedidoId: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeTexto: { fontSize: FONT_SIZES.tiny, fontWeight: 'bold' },
    cliente: { fontSize: FONT_SIZES.body, color: COLORS.text, marginBottom: 3 },
    fecha: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, marginBottom: SPACING.sm },
    itemsResumen: { marginBottom: SPACING.sm },
    itemTxt: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginBottom: 2 },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    tipoEntrega: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary },
    total: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.primary },

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
        marginBottom: SPACING.md,
    },
    modalTitulo: { fontSize: FONT_SIZES.subtitle, fontWeight: 'bold', color: COLORS.primary },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center', alignItems: 'center',
    },
    closeTexto: { fontSize: 18, color: COLORS.text, fontWeight: 'bold' },
    seccionTitulo: {
        fontSize: FONT_SIZES.body,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    detalle: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginBottom: 4 },
    itemDetalle: {
        flexDirection: 'row',
        backgroundColor: COLORS.cardBg,
        borderRadius: 10,
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    itemNombre: { fontSize: FONT_SIZES.body, fontWeight: 'bold', color: COLORS.text },
    itemDetalleTxt: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginTop: 3 },
    itemNotas: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginTop: 3, fontStyle: 'italic' },
    itemSubtotal: { fontSize: FONT_SIZES.body, fontWeight: 'bold', color: COLORS.primary },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    rowLabel: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
    rowValue: { fontSize: FONT_SIZES.body, color: COLORS.text, fontWeight: 'bold' },
    totalRow: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    totalLabel: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text },
    totalValue: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.primary },

    botonesEstado: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.xs },
    btnEstado: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    btnEstadoTexto: { fontWeight: 'bold', fontSize: FONT_SIZES.body },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 12,
        fontSize: FONT_SIZES.body,
        backgroundColor: COLORS.cardBg,
    },
    btnEnviar: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    btnEnviarTexto: { color: '#fff', fontSize: FONT_SIZES.heading, fontWeight: 'bold' },
    notasClienteBox: {
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.textMuted,
    },
    notasClienteTxt: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontStyle: 'italic' },
    motivoRechazoBox: {
        backgroundColor: '#f8d7da',
        borderRadius: 10,
        padding: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: '#721c24',
    },
    motivoRechazoTxt: { fontSize: FONT_SIZES.body, color: '#721c24' },
})
