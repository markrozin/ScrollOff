import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Button({ title, onPress, variant = 'primary', size = 'md', loading = false, style }) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.base,
        size === 'sm' && styles.small,
        size === 'lg' && styles.large,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        style,
      ]}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isGhost ? colors.primary : colors.background} />
      ) : (
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSmall,
            size === 'lg' && styles.labelLarge,
            (isOutline || isGhost) && styles.labelOutline,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  label: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.background,
  },
  labelSmall: { fontSize: 14 },
  labelLarge: { fontSize: 18 },
  labelOutline: { color: colors.primary },
});
