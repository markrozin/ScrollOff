import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import BackButton from '../components/BackButton';
import { colors, spacing } from '../theme';

export default function InstructionsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.title}>How It Works</Text>

        <Text style={styles.hook}>
          Compete with friends to scroll less and win money.
        </Text>

        <Text style={styles.sectionHeading}>The Rules</Text>
        <View style={styles.steps}>
          <Step n="1" text="Enter a challenge and deposit your buy-in plus max penalties." />
          <Step n="2" text="Go over your daily screen time limit and pay a penalty to the pot." />
          <Step n="3" text="Everyone is ranked by total screen time throughout the challenge." />
          <Step n="4" text="Lowest screen time at the end takes the money." />
        </View>

        <Text style={styles.sectionHeading}>Money</Text>
        <Text style={styles.body}>
          You deposit upfront so penalties are automatic and fair. Unused penalty money is returned to you at the end. Once the challenge begins, any money already lost is non-refundable.
        </Text>

        <Text style={styles.sectionHeading}>Forfeit</Text>
        <Text style={styles.body}>
          You can forfeit at any time. Any money you haven't lost yet will be refunded to you. Money already lost — your buy-in and any penalties incurred — is non-refundable.
        </Text>

        <Text style={styles.sectionHeading}>Example</Text>
        <View style={styles.exampleBlock}>
          <Text style={styles.exampleLine}>7-day challenge · 4 players</Text>
          <Text style={styles.exampleLine}>$10 buy-in · $5/day penalty</Text>
          <Text style={styles.exampleLine}>You deposit <Text style={styles.highlight}>$45</Text> upfront <Text style={styles.muted}>($10 + $5×7)</Text></Text>
          <Text style={styles.exampleLine}>Exceed 1 day → lose <Text style={styles.danger}>$5</Text></Text>
          <Text style={styles.exampleLine}>Exceed 2 days → lose <Text style={styles.danger}>$10</Text></Text>
          <Text style={styles.exampleLine}>Finish 1st → win <Text style={styles.highlight}>the entire pot</Text></Text>
          <Text style={styles.exampleLine}>Unused penalty reserve is refunded</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ n, text }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 32,
    color: colors.textDark,
  },
  hook: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 19,
    color: colors.primary,
    lineHeight: 28,
  },
  sectionHeading: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 15,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -spacing.sm,
  },
  steps: { gap: spacing.md },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.primary,
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
  stepText: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
    lineHeight: 24,
    flex: 1,
  },
  body: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
    lineHeight: 26,
  },
  exampleBlock: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  exampleLine: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
    lineHeight: 22,
  },
  highlight: {
    fontFamily: 'Raleway_700Bold',
    color: colors.primary,
  },
  muted: {
    fontFamily: 'Raleway_400Regular',
    color: colors.textLight,
    fontSize: 13,
  },
  danger: {
    fontFamily: 'Raleway_700Bold',
    color: colors.danger,
  },
});
