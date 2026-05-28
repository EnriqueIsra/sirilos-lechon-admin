import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS, FONT_SIZES, SPACING } from '../styles/theme'

export default function PantallaHeader({ titulo, accion, children }) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerRow}>
                <Text style={styles.titulo}>{titulo}</Text>
                {accion && <View>{accion}</View>}
            </View>
            {children}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.md,
    },
    titulo: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
})
