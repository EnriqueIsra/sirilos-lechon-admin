import { StyleSheet } from 'react-native'
import { COLORS, FONT_SIZES, SPACING } from './theme'

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    botonPrimario: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    botonPrimarioTexto: {
        color: '#fff',
        fontSize: FONT_SIZES.heading,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 12,
        fontSize: FONT_SIZES.body,
        backgroundColor: COLORS.cardBg,
    },
    label: {
        fontSize: FONT_SIZES.body,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
})
