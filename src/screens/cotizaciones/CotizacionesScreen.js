import React, { useState, useCallback, useContext, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, TextInput, Vibration, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import PantallaHeader from '../../components/PantallaHeader'
import api from '../../api/config'
import { WebSocketContext } from '../../context/WebSocketContext'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'

const ESTADOS = ['TODAS', 'SOLICITADA', 'COTIZADA', 'ACEPTADA', 'RECHAZADA']

const COLORES_ESTADO = {
    SOLICITADA: { bg: '#fff3cd', text: '#856404' },
    COTIZADA: { bg: '#d1ecf1', text: '#0c5460' },
    ACEPTADA: { bg: '#d4edda', text: '#155724' },
    RECHAZADA: { bg: '#f8d7da', text: '#721c24' },
}

export default function CotizacionesScreen({ navigation }) {
    const [cotizaciones, setCotizaciones] = useState([])
    const [filtro, setFiltro] = useState('TODAS')
    const [cargando, setCargando] = useState(true)
    const [refrescando, setRefrescando] = useState(false)
    const [seleccionada, setSeleccionada] = useState(null)
    const [responderVisible, setResponderVisible] = useState(false)
    const [rechazarVisible, setRechazarVisible] = useState(false)
    const { addListener } = useContext(WebSocketContext)

    const cargar = async () => {
        try {
            const response = await api.get('/admin/cotizaciones')
            setCotizaciones(response.data.sort((a, b) =>
                new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)
            ))
        } catch (error) {
            console.error('Error al cargar cotizaciones:', error)
        } finally {
            setCargando(false)
            setRefrescando(false)
        }
    }

    useFocusEffect(useCallback(() => { cargar() }, []))

    // Refresca la lista cuando llega cotización nueva (notif visual la maneja NotificacionesGlobales)
    useEffect(() => {
        const unsub = addListener('/topic/cotizaciones', () => {
            cargar()
        })
        return unsub
    }, [])

    const onRefresh = () => {
        setRefrescando(true)
        cargar()
    }

    const cambiarEstado = async (cot, nuevoEstado) => {
        try {
            const response = await api.patch(`/admin/cotizaciones/${cot.id}/estado/${nuevoEstado}`)
            setCotizaciones(prev => prev.map(c => c.id === cot.id ? response.data : c))
            setSeleccionada(response.data)
            Alert.alert('Estado actualizado', `Cotización #${cot.id} ahora está ${nuevoEstado}`)
        } catch (error) {
            console.error('Error:', error)
            Alert.alert('Error', 'No se pudo cambiar el estado')
        }
    }

    const handleResponder = async (datos) => {
        try {
            const response = await api.put(`/admin/cotizaciones/${seleccionada.id}/responder`, datos)
            setCotizaciones(prev => prev.map(c => c.id === seleccionada.id ? response.data : c))
            setSeleccionada(response.data)
            setResponderVisible(false)
            Alert.alert('✅ Cotización enviada', `Total: $${response.data.total.toFixed(2)}`)
        } catch (error) {
            console.error('Error:', error)
            Alert.alert('Error', error.response?.data?.message || 'No se pudo enviar')
        }
    }

    const cotizacionesFiltradas = filtro === 'TODAS'
        ? cotizaciones
        : cotizaciones.filter(c => c.estado === filtro)

    const conteoPorEstado = (estado) => {
        if (estado === 'TODAS') return cotizaciones.length
        return cotizaciones.filter(c => c.estado === estado).length
    }

    const formatFecha = (f) => new Date(f).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })

    const renderItem = ({ item }) => {
        const colores = COLORES_ESTADO[item.estado] || COLORES_ESTADO.SOLICITADA
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSeleccionada(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cotId}>Cotización #{item.id}</Text>
                    <View style={[styles.badge, { backgroundColor: colores.bg }]}>
                        <Text style={[styles.badgeTexto, { color: colores.text }]}>{item.estado}</Text>
                    </View>
                </View>
                <Text style={styles.cliente}>👤 {item.nombreCliente} · 📱 {item.telefonoCliente}</Text>
                <Text style={styles.info}>👥 {item.numeroPersonas} personas</Text>
                <Text style={styles.info}>📍 {item.ubicacion}</Text>
                {item.fechaEvento && (
                    <Text style={styles.info}>📅 {new Date(item.fechaEvento).toLocaleDateString('es-MX')}</Text>
                )}
                <Text style={styles.fecha}>Solicitada {formatFecha(item.fechaSolicitud)}</Text>
                {item.total && (
                    <Text style={styles.total}>Total cotizado: ${item.total.toFixed(2)}</Text>
                )}
            </TouchableOpacity>
        )
    }

    if (cargando) {
        return (
            <PantallaHeader titulo="Cotizaciones">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </PantallaHeader>
        )
    }

    return (
        <PantallaHeader titulo="Cotizaciones">
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

            {cotizacionesFiltradas.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyTitulo}>No hay cotizaciones</Text>
                    <Text style={styles.emptySubtitulo}>
                        {filtro === 'TODAS' ? 'Aún no hay solicitudes' : `Sin cotizaciones en ${filtro}`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={cotizacionesFiltradas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            )}

            <DetalleModal
                cotizacion={seleccionada}
                onClose={() => setSeleccionada(null)}
                onResponder={() => setResponderVisible(true)}
                onRechazar={() => setRechazarVisible(true)}
                onCambiarEstado={cambiarEstado}
            />

            <ResponderModal
                visible={responderVisible}
                cotizacion={seleccionada}
                onClose={() => setResponderVisible(false)}
                onSubmit={handleResponder}
            />

            <RechazarModal
                visible={rechazarVisible}
                onClose={() => setRechazarVisible(false)}
                onSubmit={async (motivo) => {
                    try {
                        const response = await api.patch(`/admin/cotizaciones/${seleccionada.id}/rechazar`, { motivo })
                        setCotizaciones(prev => prev.map(c => c.id === seleccionada.id ? response.data : c))
                        setSeleccionada(response.data)
                        setRechazarVisible(false)
                        Alert.alert('Cotización rechazada', 'El cliente verá el motivo')
                    } catch (error) {
                        console.error('Error:', error)
                        Alert.alert('Error', 'No se pudo rechazar')
                    }
                }}
            />
        </PantallaHeader>
    )
}

function DetalleModal({ cotizacion, onClose, onResponder, onRechazar, onCambiarEstado }) {
    if (!cotizacion) return null

    const colores = COLORES_ESTADO[cotizacion.estado] || COLORES_ESTADO.SOLICITADA
    const puedeResponder = cotizacion.estado === 'SOLICITADA' || cotizacion.estado === 'COTIZADA'

    return (
        <Modal visible={!!cotizacion} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>Cotización #{cotizacion.id}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }}>
                        <View style={[styles.badge, { backgroundColor: colores.bg, alignSelf: 'flex-start', marginBottom: SPACING.md }]}>
                            <Text style={[styles.badgeTexto, { color: colores.text }]}>{cotizacion.estado}</Text>
                        </View>

                        <Text style={styles.seccionTitulo}>Cliente</Text>
                        <Text style={styles.detalle}>👤 {cotizacion.nombreCliente}</Text>
                        <Text style={styles.detalle}>📱 {cotizacion.telefonoCliente}</Text>

                        <Text style={styles.seccionTitulo}>Detalles del evento</Text>
                        <Text style={styles.detalle}>👥 {cotizacion.numeroPersonas} personas</Text>
                        <Text style={styles.detalle}>📍 {cotizacion.ubicacion}</Text>
                        {cotizacion.fechaEvento && (
                            <Text style={styles.detalle}>📅 {new Date(cotizacion.fechaEvento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                        )}

                        {cotizacion.cantidadVitroleros > 0 && (
                            <>
                                <Text style={styles.seccionTitulo}>Agua del evento</Text>
                                <Text style={styles.detalle}>🥤 {cotizacion.cantidadVitroleros} {cotizacion.cantidadVitroleros === 1 ? 'vitrolero' : 'vitroleros'} de 20L</Text>
                                {cotizacion.bebidas && cotizacion.bebidas.length > 0 && (
                                    <View style={styles.bebidasRow}>
                                        {cotizacion.bebidas.map((sabor, idx) => (
                                            <View key={idx} style={styles.bebidaTag}>
                                                <Text style={styles.bebidaTagTexto}>{sabor}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

                        {cotizacion.descripcionPaquete && (
                            <>
                                <Text style={styles.seccionTitulo}>Paquete cotizado</Text>
                                <Text style={styles.detalle}>{cotizacion.descripcionPaquete}</Text>
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Cantidad:</Text>
                                    <Text style={styles.rowValue}>{cotizacion.cantidadKilos} kg</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Precio x kilo:</Text>
                                    <Text style={styles.rowValue}>${cotizacion.precioPorKilo}</Text>
                                </View>
                                {cotizacion.incluyeFlete && (
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Flete:</Text>
                                        <Text style={styles.rowValue}>${cotizacion.costoFlete}</Text>
                                    </View>
                                )}
                                <View style={[styles.row, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Total:</Text>
                                    <Text style={styles.totalValue}>${cotizacion.total?.toFixed(2)}</Text>
                                </View>
                            </>
                        )}

                        {cotizacion.notas && (
                            <>
                                <Text style={styles.seccionTitulo}>Notas del cliente</Text>
                                <Text style={styles.detalle}>{cotizacion.notas}</Text>
                            </>
                        )}

                        {cotizacion.notasAdmin && (
                            <>
                                <Text style={styles.seccionTitulo}>Notas del admin</Text>
                                <Text style={styles.detalle}>{cotizacion.notasAdmin}</Text>
                            </>
                        )}

                        {cotizacion.motivoRechazo && (
                            <>
                                <Text style={styles.seccionTitulo}>Motivo de rechazo</Text>
                                <View style={styles.motivoRechazoBox}>
                                    <Text style={styles.motivoRechazoTxt}>{cotizacion.motivoRechazo}</Text>
                                </View>
                            </>
                        )}

                        {puedeResponder && (
                            <TouchableOpacity style={styles.btnResponder} onPress={onResponder}>
                                <Text style={styles.btnResponderTexto}>
                                    {cotizacion.estado === 'SOLICITADA' ? '💬 Responder cotización' : '✏️ Editar cotización'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {cotizacion.estado !== 'ACEPTADA' && cotizacion.estado !== 'RECHAZADA' && (
                            <View style={styles.botonesEstado}>
                                {cotizacion.estado === 'COTIZADA' && (
                                    <TouchableOpacity
                                        style={[styles.btnEstado, { backgroundColor: COLORES_ESTADO.ACEPTADA.bg, borderColor: COLORES_ESTADO.ACEPTADA.text }]}
                                        onPress={() => onCambiarEstado(cotizacion, 'ACEPTADA')}
                                    >
                                        <Text style={[styles.btnEstadoTexto, { color: COLORES_ESTADO.ACEPTADA.text }]}>Marcar ACEPTADA</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.btnEstado, { backgroundColor: COLORES_ESTADO.RECHAZADA.bg, borderColor: COLORES_ESTADO.RECHAZADA.text }]}
                                    onPress={onRechazar}
                                >
                                    <Text style={[styles.btnEstadoTexto, { color: COLORES_ESTADO.RECHAZADA.text }]}>Rechazar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

function ResponderModal({ visible, cotizacion, onClose, onSubmit }) {
    const [descripcion, setDescripcion] = useState('')
    const [cantidadKilos, setCantidadKilos] = useState('')
    const [precioPorKilo, setPrecioPorKilo] = useState('')
    const [incluyeFlete, setIncluyeFlete] = useState(false)
    const [costoFlete, setCostoFlete] = useState('')
    const [notasAdmin, setNotasAdmin] = useState('')

    useEffect(() => {
        if (cotizacion && visible) {
            setDescripcion(cotizacion.descripcionPaquete || '')
            setCantidadKilos(cotizacion.cantidadKilos?.toString() || '')
            setPrecioPorKilo(cotizacion.precioPorKilo?.toString() || '')
            setIncluyeFlete(cotizacion.incluyeFlete || false)
            setCostoFlete(cotizacion.costoFlete?.toString() || '')
            setNotasAdmin(cotizacion.notasAdmin || '')
        }
    }, [cotizacion, visible])

    const handleSubmit = () => {
        const kilos = parseFloat(cantidadKilos)
        const precio = parseFloat(precioPorKilo)
        if (!descripcion.trim()) {
            Alert.alert('Error', 'Describe el paquete')
            return
        }
        if (!kilos || kilos <= 0) {
            Alert.alert('Error', 'Cantidad de kilos inválida')
            return
        }
        if (!precio || precio <= 0) {
            Alert.alert('Error', 'Precio inválido')
            return
        }
        const flete = incluyeFlete ? (parseFloat(costoFlete) || 0) : 0

        onSubmit({
            descripcionPaquete: descripcion.trim(),
            cantidadKilos: kilos,
            precioPorKilo: precio,
            incluyeFlete,
            costoFlete: flete,
            notasAdmin: notasAdmin.trim() || null,
        })
    }

    const totalEstimado = (parseFloat(cantidadKilos) || 0) * (parseFloat(precioPorKilo) || 0) + (incluyeFlete ? (parseFloat(costoFlete) || 0) : 0)

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>Responder cotización</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Descripción del paquete *</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 70 }]}
                            placeholder="Ej: Paquete boda 50 personas - Kilo completo"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Cantidad de kilos *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 8"
                            keyboardType="decimal-pad"
                            value={cantidadKilos}
                            onChangeText={setCantidadKilos}
                        />

                        <Text style={styles.label}>Precio por kilo *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 400"
                            keyboardType="decimal-pad"
                            value={precioPorKilo}
                            onChangeText={setPrecioPorKilo}
                        />

                        <View style={styles.fleteRow}>
                            <TouchableOpacity
                                style={[styles.checkbox, incluyeFlete && styles.checkboxActivo]}
                                onPress={() => setIncluyeFlete(!incluyeFlete)}
                            >
                                {incluyeFlete && <Text style={styles.checkboxCheck}>✓</Text>}
                            </TouchableOpacity>
                            <Text style={styles.checkboxLabel}>Incluir flete</Text>
                        </View>

                        {incluyeFlete && (
                            <>
                                <Text style={styles.label}>Costo del flete</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: 200"
                                    keyboardType="decimal-pad"
                                    value={costoFlete}
                                    onChangeText={setCostoFlete}
                                />
                            </>
                        )}

                        {cotizacion?.notas && (
                            <>
                                <Text style={styles.label}>Notas del cliente (solo lectura)</Text>
                                <View style={styles.notasClienteBox}>
                                    <Text style={styles.notasClienteTxt}>{cotizacion.notas}</Text>
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>Notas del admin (visible para el cliente)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 60 }]}
                            placeholder="Ej: Incluye montaje de mesa, mantelería, etc."
                            value={notasAdmin}
                            onChangeText={setNotasAdmin}
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.totalEstimado}>
                            <Text style={styles.totalEstimadoLabel}>Total estimado:</Text>
                            <Text style={styles.totalEstimadoValor}>${totalEstimado.toFixed(2)}</Text>
                        </View>

                        <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                            <Text style={styles.btnEnviarTexto}>Enviar cotización al cliente</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

function RechazarModal({ visible, onClose, onSubmit }) {
    const [motivo, setMotivo] = useState('')

    useEffect(() => {
        if (visible) setMotivo('')
    }, [visible])

    const handleSubmit = () => {
        if (!motivo.trim()) {
            Alert.alert('Error', 'Por favor escribe un motivo')
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
                        <Text style={styles.modalTitulo}>Motivo del rechazo</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.detalle}>
                        Explícale al cliente por qué se rechaza la cotización. Esta nota la verá en su app.
                    </Text>
                    <TextInput
                        style={[styles.input, { minHeight: 100, marginTop: SPACING.md }]}
                        placeholder="Ej: La fecha solicitada no está disponible, no llegamos a esa zona, etc."
                        value={motivo}
                        onChangeText={setMotivo}
                        multiline
                        textAlignVertical="top"
                    />
                    <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                        <Text style={styles.btnEnviarTexto}>Confirmar rechazo</Text>
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
    filtroBtnActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
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
    cotId: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeTexto: { fontSize: FONT_SIZES.tiny, fontWeight: 'bold' },
    cliente: { fontSize: FONT_SIZES.body, color: COLORS.text, marginBottom: 3 },
    info: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginTop: 3 },
    fecha: { fontSize: FONT_SIZES.small, color: COLORS.textMuted, marginTop: SPACING.xs },
    total: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.primary, marginTop: SPACING.sm },

    // Modal compartido
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
    bebidasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.xs },
    bebidaTag: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    bebidaTagTexto: { color: COLORS.primary, fontWeight: 'bold', fontSize: FONT_SIZES.small },
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

    btnResponder: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    btnResponderTexto: { color: '#fff', fontSize: FONT_SIZES.heading, fontWeight: 'bold' },

    botonesEstado: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
    btnEstado: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    btnEstadoTexto: { fontWeight: 'bold', fontSize: FONT_SIZES.body },

    // Form responder
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
    fleteRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
    checkbox: {
        width: 24, height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    checkboxActivo: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
    checkboxCheck: { color: '#fff', fontWeight: 'bold' },
    checkboxLabel: { fontSize: FONT_SIZES.body, color: COLORS.text },

    totalEstimado: {
        backgroundColor: COLORS.primaryLight,
        padding: SPACING.md,
        borderRadius: 12,
        marginTop: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalEstimadoLabel: { fontSize: FONT_SIZES.heading, color: COLORS.primary },
    totalEstimadoValor: { fontSize: FONT_SIZES.subtitle, fontWeight: 'bold', color: COLORS.primary },

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
