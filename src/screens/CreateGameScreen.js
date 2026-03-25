import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Share,
} from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BackButton from '../components/BackButton';
import { colors, spacing, radius } from '../theme';

function Stepper({ value, onChange, min = 0, max = 99 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={() => value > min && onChange(value - 1)}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
        onPress={() => value < max && onChange(value + 1)}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CreateGameScreen({ navigation }) {
  const [partyName, setPartyName] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeks, setWeeks] = useState(1);
  const [days, setDays] = useState(0);
  const [penalty, setPenalty] = useState('');
  const [created, setCreated] = useState(false);
  const [gameCode] = useState(() =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  const duration = weeks * 7 + days;
  const buyInNum = parseFloat(buyIn) || 0;
  const penaltyNum = parseFloat(penalty) || 0;
  const maxDeposit = buyInNum + penaltyNum * duration;
  const isValid = partyName.trim() && buyIn && dailyLimit && penalty && buyInNum > 0 && penaltyNum > 0 && duration > 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my ScrollOff challenge! Code: ${gameCode}\n\nBuy-in: $${buyIn} · ${duration}-day challenge · $${penalty}/day penalty`,
      });
    } catch {}
  };

  const handleGoToLobby = () => {
    navigation.replace('Lobby', {
      code: gameCode,
      isLeader: true,
      partyName: partyName.trim(),
      settings: { buyIn: buyInNum, dailyLimit: parseFloat(dailyLimit), duration, penalty: penaltyNum },
    });
  };

  const durationLabel = [
    weeks > 0 ? `${weeks} week${weeks > 1 ? 's' : ''}` : '',
    days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' ') || '—';

  if (created) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <BackButton onPress={() => setCreated(false)} />

          <Text style={styles.createdTitle}>{partyName}</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>Share the code with your friends</Text>

          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Game Code</Text>
            <Text style={styles.codeText}>{gameCode}</Text>
          </Card>

          <Card variant="alt" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Challenge Summary</Text>
            <View style={styles.summaryRows}>
              <SummaryRow label="Buy-in" value={`$${buyIn}`} />
              <SummaryRow label="Duration" value={durationLabel} />
              <SummaryRow label="Daily limit" value={`${dailyLimit}h`} />
              <SummaryRow label="Daily penalty" value={`$${penalty}`} />
              <View style={styles.divider} />
              <SummaryRow label="Max deposit" value={`$${maxDeposit.toFixed(2)}`} highlight />
            </View>
          </Card>

          <Button title="Share Invite" size="lg" onPress={handleShare} style={styles.fullWidth} />
          <Button title="Go to Lobby" variant="outline" size="lg" onPress={handleGoToLobby} style={styles.fullWidth} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.title}>Create a Game</Text>
        <Text style={styles.subtitle}>Set the rules for your squad</Text>

        <Card style={styles.formCard}>
          <Input
            label="Party Name"
            value={partyName}
            onChangeText={setPartyName}
            placeholder="e.g. Friday Squad"
          />
          <Input
            label="Buy-in Amount ($)"
            value={buyIn}
            onChangeText={setBuyIn}
            placeholder="e.g. 10"
            keyboardType="decimal-pad"
          />
          <Input
            label="Daily Screen Time Limit (hours)"
            value={dailyLimit}
            onChangeText={setDailyLimit}
            placeholder="e.g. 3"
            keyboardType="decimal-pad"
          />
          <Input
            label="Daily Penalty ($)"
            value={penalty}
            onChangeText={setPenalty}
            placeholder="e.g. 5"
            keyboardType="decimal-pad"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Challenge Duration</Text>
            <View style={styles.stepperStack}>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Weeks</Text>
                <Stepper value={weeks} onChange={setWeeks} min={0} max={52} />
              </View>
              <View style={styles.stepperDivider} />
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Days</Text>
                <Stepper value={days} onChange={setDays} min={0} max={6} />
              </View>
            </View>
            {duration > 0 && (
              <Text style={styles.durationTotal}>
                {durationLabel} · {duration} day{duration !== 1 ? 's' : ''} total
              </Text>
            )}
          </View>
        </Card>

        {isValid && (
          <Card variant="alt" style={styles.depositPreview}>
            <Text style={styles.depositLabel}>Max deposit per player</Text>
            <Text style={styles.depositAmount}>${maxDeposit.toFixed(2)}</Text>
            <Text style={styles.depositSub}>
              ${buyIn} buy-in + ${penalty} × {duration} days
            </Text>
          </Card>
        )}

        <Button
          title="Create Game"
          size="lg"
          onPress={() => isValid && setCreated(true)}
          style={[styles.fullWidth, !isValid && styles.disabled]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, highlight && styles.summaryHighlight]}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 30,
    color: colors.textDark,
  },
  createdTitle: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 38,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
    marginTop: -spacing.sm,
  },
  formCard: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
    marginLeft: 4,
  },
  stepperStack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stepperDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  stepperLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 15,
    color: colors.textMid,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 20,
    color: colors.primary,
    lineHeight: 24,
  },
  stepValue: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 26,
    color: colors.textDark,
    minWidth: 32,
    textAlign: 'center',
  },
  durationTotal: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 13,
    color: colors.primary,
    marginLeft: 4,
  },

  depositPreview: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  depositLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
  },
  depositAmount: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 44,
    color: colors.primary,
  },
  depositSub: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 12,
    color: colors.textLight,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },

  codeCard: { alignItems: 'center', gap: spacing.sm },
  codeLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 13,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 48,
    color: colors.primary,
    letterSpacing: 8,
  },
  summaryCard: { gap: spacing.md },
  summaryTitle: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.textDark,
  },
  summaryRows: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
  },
  summaryValue: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 15,
    color: colors.textDark,
  },
  summaryHighlight: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.primary,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
});
