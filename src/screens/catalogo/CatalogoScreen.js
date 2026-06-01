import React, { useState, useCallback } from 'react'
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from '@react-navigation/native'
import PantallaHeader from '../../components/PantallaHeader'
import api from '../../api/config'
import { COLORS, FONT_SIZES, SPACING } from '../../styles/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TIPOS_PRODUCTO = ['KILO', 'COMBO', 'INDIVIDUAL', 'BEBIDA']
const TIPOS_BEBIDA = ['AGUA_FRESCA', 'REFRESCO']

export default function CatalogoScreen({ navigation }) {
    const [seccion, setSeccion] = useState('productos')
    const [productos, setProductos] = useState([])
    const [bebidas, setBebidas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [refrescando, setRefrescando] = useState(false)
    const [editando, setEditando] = useState(null)
    const [editandoBebida, setEditandoBebida] = useState(null)

    const cargar = async () => {
        try {
            const [resP, resB] = await Promise.all([
                api.get('/admin/productos'),
                api.get('/admin/bebidas'),
            ])
            setProductos(resP.data.sort((a, b) => a.id - b.id))
            setBebidas(resB.data.sort((a, b) => a.id - b.id))
        } catch (error) {
            console.error('Error al cargar catálogo:', error)
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

    const toggleActivoProducto = async (producto) => {
        try {
            const endpoint = producto.activo ? 'desactivar' : 'activar'
            const response = await api.patch(`/admin/productos/${producto.id}/${endpoint}`)
            setProductos(prev => prev.map(p => p.id === producto.id ? response.data : p))
        } catch (error) {
            Alert.alert('Error', 'No se pudo actualizar')
        }
    }

    const toggleDisponibleBebida = async (bebida) => {
        try {
            const endpoint = bebida.disponible ? 'no-disponible' : 'disponible'
            const response = await api.patch(`/admin/bebidas/${bebida.id}/${endpoint}`)
            setBebidas(prev => prev.map(b => b.id === bebida.id ? response.data : b))
        } catch (error) {
            Alert.alert('Error', 'No se pudo actualizar')
        }
    }

    const guardarProducto = async (datos) => {
        try {
            let response
            if (editando.id) {
                response = await api.put(`/admin/productos/${editando.id}`, datos)
                setProductos(prev => prev.map(p => p.id === editando.id ? response.data : p))
            } else {
                response = await api.post('/admin/productos', datos)
                setProductos(prev => [...prev, response.data].sort((a, b) => a.id - b.id))
            }
            setEditando(null)
            Alert.alert('✅ Guardado', 'Producto guardado')
        } catch (error) {
            console.error(error)
            Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar')
        }
    }

    const guardarBebida = async (datos) => {
        try {
            let response
            if (editandoBebida.id) {
                response = await api.put(`/admin/bebidas/${editandoBebida.id}`, datos)
                setBebidas(prev => prev.map(b => b.id === editandoBebida.id ? response.data : b))
            } else {
                response = await api.post('/admin/bebidas', datos)
                setBebidas(prev => [...prev, response.data].sort((a, b) => a.id - b.id))
            }
            setEditandoBebida(null)
            Alert.alert('✅ Guardado', 'Bebida guardada')
        } catch (error) {
            console.error(error)
            Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar')
        }
    }

    const renderProducto = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, !item.activo && styles.cardInactiva]}
            onPress={() => setEditando(item)}
            activeOpacity={0.7}
        >
            {item.imagenUrl ? (
                <Image
                    source={{ uri: item.imagenUrl }}
                    style={{ width: '100%', height: 350, borderRadius: 8, marginBottom: 8 }}
                    resizeMode="cover"
                />
            ) : null}
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitulo}>{item.nombre}</Text>
                <View style={[styles.estadoBadge, item.activo ? styles.activoBadge : styles.inactivoBadge]}>
                    <Text style={styles.estadoTexto}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
            </View>
            <Text style={styles.cardDesc}>{item.descripcion}</Text>
            <View style={styles.cardFooter}>
                <View style={styles.tagsRow}>
                    <Text style={styles.tag}>{item.tipo}</Text>
                    {item.permiteOpcionComplementos && <Text style={[styles.tag, styles.tagVerde]}>Complementos</Text>}
                    {item.requiereSeleccionBebida && <Text style={[styles.tag, styles.tagAzul]}>Bebida</Text>}
                </View>
                <Text style={styles.precio}>${item.precio.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
                style={styles.toggleBtn}
                onPress={(e) => { e.stopPropagation(); toggleActivoProducto(item) }}
            >
                <Text style={styles.toggleBtnTexto}>
                    {item.activo ? 'Desactivar' : 'Activar'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    )

    const renderBebida = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, !item.disponible && styles.cardInactiva]}
            onPress={() => setEditandoBebida(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitulo}>{item.nombre}</Text>
                <View style={[styles.estadoBadge, item.disponible ? styles.activoBadge : styles.inactivoBadge]}>
                    <Text style={styles.estadoTexto}>{item.disponible ? 'Disponible' : 'No disponible'}</Text>
                </View>
            </View>
            <Text style={styles.tag}>{item.tipo}</Text>
            <TouchableOpacity
                style={styles.toggleBtn}
                onPress={(e) => { e.stopPropagation(); toggleDisponibleBebida(item) }}
            >
                <Text style={styles.toggleBtnTexto}>
                    {item.disponible ? 'Marcar no disponible' : 'Marcar disponible'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    )

    if (cargando) {
        return (
            <PantallaHeader titulo="Catálogo">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </PantallaHeader>
        )
    }

    return (
        <PantallaHeader titulo="Catálogo">
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, seccion === 'productos' && styles.tabBtnActivo]}
                    onPress={() => setSeccion('productos')}
                >
                    <Text style={[styles.tabTexto, seccion === 'productos' && styles.tabTextoActivo]}>
                        Productos ({productos.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, seccion === 'bebidas' && styles.tabBtnActivo]}
                    onPress={() => setSeccion('bebidas')}
                >
                    <Text style={[styles.tabTexto, seccion === 'bebidas' && styles.tabTextoActivo]}>
                        Bebidas ({bebidas.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.btnNueva}
                onPress={() => {
                    if (seccion === 'productos') setEditando({})
                    else setEditandoBebida({})
                }}
            >
                <Text style={styles.btnNuevaTexto}>
                    + Nueva {seccion === 'productos' ? 'producto' : 'bebida'}
                </Text>
            </TouchableOpacity>

            {seccion === 'productos' ? (
                <FlatList
                    data={productos}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProducto}
                    contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            ) : (
                <FlatList
                    data={bebidas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBebida}
                    contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
                    refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                />
            )}

            <ProductoModal
                producto={editando}
                onClose={() => setEditando(null)}
                onSubmit={guardarProducto}
            />

            <BebidaModal
                bebida={editandoBebida}
                onClose={() => setEditandoBebida(null)}
                onSubmit={guardarBebida}
            />
        </PantallaHeader>
    )
}

function ProductoModal({ producto, onClose, onSubmit }) {
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [tipo, setTipo] = useState('INDIVIDUAL')
    const [precio, setPrecio] = useState('')
    const [permiteOpcionComplementos, setPermiteOpcionComplementos] = useState(false)
    const [requiereSeleccionBebida, setRequiereSeleccionBebida] = useState(false)
    const [imagenUrl, setImagenUrl] = useState('')
    const [imagenFullscreen, setImagenFullscreen] = useState(false)

    React.useEffect(() => {
        if (producto) {
            setNombre(producto.nombre || '')
            setDescripcion(producto.descripcion || '')
            setTipo(producto.tipo || 'INDIVIDUAL')
            setPrecio(producto.precio?.toString() || '')
            setPermiteOpcionComplementos(producto.permiteOpcionComplementos || false)
            setRequiereSeleccionBebida(producto.requiereSeleccionBebida || false)
            setImagenUrl(producto.imagenUrl || '')
        }
    }, [producto])

    if (!producto) return null

    const handleSubmit = () => {
        const p = parseFloat(precio)
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio')
            return
        }
        if (!p || p <= 0) {
            Alert.alert('Error', 'Precio inválido')
            return
        }
        onSubmit({
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            tipo,
            precio: p,
            permiteOpcionComplementos,
            requiereSeleccionBebida,
            imagenUrl: imagenUrl.trim() || null,
        })
    }

    const esNuevo = !producto.id

    const seleccionarImagen = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitas permitir acceso a la galería')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.images,
            quality: 0.8,
        })

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0]
            const formData = new FormData()
            formData.append('imagen', {
                uri: asset.uri,
                type: 'image/jpeg',
                name: 'imagen.jpg',
            })
            try {
                const response = await api.post('/admin/imagenes/subir', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
                    }
                })
                setImagenUrl(response.data.url)
            } catch (e) {
                console.error('Error subiendo imagen:', e.response?.data || e.message)
                Alert.alert('Error', e.response?.data?.message || e.message || 'No se pudo subir la imagen')
            }
        }
    }

    return (
        <Modal visible={!!producto} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>{esNuevo ? 'Nuevo producto' : `Editar #${producto.id}`}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: SPACING.lg }} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Nombre *</Text>
                        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Kilo Especial" />

                        <Text style={styles.label}>Descripción</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 60 }]}
                            value={descripcion}
                            onChangeText={setDescripcion}
                            placeholder="Detalles del producto"
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Tipo</Text>
                        <View style={styles.tiposRow}>
                            {TIPOS_PRODUCTO.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.tipoBtn, tipo === t && styles.tipoBtnActivo]}
                                    onPress={() => setTipo(t)}
                                >
                                    <Text style={[styles.tipoTexto, tipo === t && styles.tipoTextoActivo]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Precio *</Text>
                        <TextInput
                            style={styles.input}
                            value={precio}
                            onChangeText={setPrecio}
                            placeholder="Ej: 400"
                            keyboardType="decimal-pad"
                        />

                        <View style={styles.checkRow}>
                            <TouchableOpacity
                                style={[styles.checkbox, permiteOpcionComplementos && styles.checkboxActivo]}
                                onPress={() => setPermiteOpcionComplementos(!permiteOpcionComplementos)}
                            >
                                {permiteOpcionComplementos && <Text style={styles.checkboxCheck}>✓</Text>}
                            </TouchableOpacity>
                            <Text style={styles.checkLabel}>Permite opción de complementos (bolillos/tortillas)</Text>
                        </View>

                        <View style={styles.checkRow}>
                            <TouchableOpacity
                                style={[styles.checkbox, requiereSeleccionBebida && styles.checkboxActivo]}
                                onPress={() => setRequiereSeleccionBebida(!requiereSeleccionBebida)}
                            >
                                {requiereSeleccionBebida && <Text style={styles.checkboxCheck}>✓</Text>}
                            </TouchableOpacity>
                            <Text style={styles.checkLabel}>Requiere selección de bebida</Text>
                        </View>

                        <Text style={styles.label}>Imagen del producto</Text>
                        <TouchableOpacity style={styles.btnImagen} onPress={seleccionarImagen}>
                            <Text style={styles.btnImagenTexto}>
                                {imagenUrl ? '✅ Cambiar imagen' : '📷 Seleccionar imagen'}
                            </Text>
                        </TouchableOpacity>

                        {imagenUrl ? (
                            <>
                                <TouchableOpacity onPress={() => setImagenFullscreen(true)}>
                                    <Image
                                        source={{ uri: imagenUrl }}
                                        style={{ width: '100%', height: 350, borderRadius: 10, marginTop: 10 }}
                                        resizeMode="cover"
                                    />
                                    <Text style={{ textAlign: 'center', color: COLORS.primary, fontSize: 12, marginTop: 4 }}>
                                        Toca para ver completa
                                    </Text>
                                </TouchableOpacity>

                                <Modal visible={imagenFullscreen} transparent animationType="fade">
                                    <TouchableOpacity
                                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
                                        onPress={() => setImagenFullscreen(false)}
                                        activeOpacity={1}
                                    >
                                        <Image
                                            source={{ uri: imagenUrl }}
                                            style={{ width: '100%', height: '70%' }}
                                            resizeMode="contain"
                                        />
                                        <Text style={{ color: '#fff', marginTop: 20, fontSize: 14 }}>
                                            Toca para cerrar
                                        </Text>
                                    </TouchableOpacity>
                                </Modal>
                            </>
                        ) : null}

                        <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                            <Text style={styles.btnEnviarTexto}>{esNuevo ? 'Crear producto' : 'Guardar cambios'}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

function BebidaModal({ bebida, onClose, onSubmit }) {
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('AGUA_FRESCA')

    React.useEffect(() => {
        if (bebida) {
            setNombre(bebida.nombre || '')
            setTipo(bebida.tipo || 'AGUA_FRESCA')
        }
    }, [bebida])

    if (!bebida) return null

    const handleSubmit = () => {
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio')
            return
        }
        onSubmit({ nombre: nombre.trim(), tipo })
    }

    const esNuevo = !bebida.id

    return (
        <Modal visible={!!bebida} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitulo}>{esNuevo ? 'Nueva bebida' : `Editar #${bebida.id}`}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeTexto}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Nombre *</Text>
                    <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Horchata" />

                    <Text style={styles.label}>Tipo</Text>
                    <View style={styles.tiposRow}>
                        {TIPOS_BEBIDA.map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.tipoBtn, tipo === t && styles.tipoBtnActivo]}
                                onPress={() => setTipo(t)}
                            >
                                <Text style={[styles.tipoTexto, tipo === t && styles.tipoTextoActivo]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.btnEnviar} onPress={handleSubmit}>
                        <Text style={styles.btnEnviarTexto}>{esNuevo ? 'Crear bebida' : 'Guardar cambios'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: 8,
        marginBottom: SPACING.sm,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
        alignItems: 'center',
    },
    tabBtnActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabTexto: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontWeight: '600' },
    tabTextoActivo: { color: '#fff' },
    btnNueva: {
        backgroundColor: COLORS.primary,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnNuevaTexto: { color: '#fff', fontWeight: 'bold', fontSize: FONT_SIZES.body },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardInactiva: { opacity: 0.6 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    cardTitulo: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.text, flex: 1 },
    cardDesc: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, marginBottom: SPACING.sm },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 },
    tag: {
        backgroundColor: '#eee',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        fontSize: FONT_SIZES.tiny,
        color: '#555',
        overflow: 'hidden',
    },
    tagVerde: { backgroundColor: '#d4edda', color: '#155724' },
    tagAzul: { backgroundColor: '#d1ecf1', color: '#0c5460' },
    precio: { fontSize: FONT_SIZES.heading, fontWeight: 'bold', color: COLORS.primary },
    estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    activoBadge: { backgroundColor: '#d4edda' },
    inactivoBadge: { backgroundColor: '#f8d7da' },
    estadoTexto: { fontSize: FONT_SIZES.tiny, fontWeight: 'bold' },
    toggleBtn: {
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
        borderRadius: 8,
        alignItems: 'center',
    },
    toggleBtnTexto: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
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
    tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tipoBtn: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    tipoBtnActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tipoTexto: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
    tipoTextoActivo: { color: '#fff' },
    checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
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
    checkLabel: { fontSize: FONT_SIZES.body, color: COLORS.text, flex: 1 },
    btnEnviar: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    btnEnviarTexto: { color: '#fff', fontSize: FONT_SIZES.heading, fontWeight: 'bold' },
    btnImagen: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#fdf2f2',
    },
    btnImagenTexto: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.body,
    },
})