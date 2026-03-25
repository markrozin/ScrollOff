import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import BackButton from '../components/BackButton';
import { colors, spacing, radius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAILY_LIMIT_H = 3;

const MOCK_PLAYERS = [
  { id: '1',  name: 'You',    isYou: true,  dailyData: [2.1, 1.8, 3.4, 2.0, 1.5, 2.9, null] },
  { id: '2',  name: 'Liron',  isYou: false, dailyData: [1.5, 2.2, 2.8, 1.9, 1.2, null, null] },
  { id: '3',  name: 'Sarah',  isYou: false, dailyData: [4.1, 3.8, 2.5, 3.1, 2.0, null, null] },
  { id: '4',  name: 'Jake',   isYou: false, dailyData: [3.0, 1.5, 1.0, 2.2, 3.5, null, null] },
  { id: '5',  name: 'Maya',   isYou: false, dailyData: [2.5, 2.0, 1.8, 2.3, 1.6, null, null] },
  { id: '6',  name: 'Daniel', isYou: false, dailyData: [3.5, 3.2, 2.9, 3.8, 2.1, null, null] },
  { id: '7',  name: 'Ava',    isYou: false, dailyData: [1.2, 1.0, 1.5, 0.8, 1.3, null, null] },
  { id: '8',  name: 'Noah',   isYou: false, dailyData: [4.5, 3.1, 2.7, 3.4, 4.0, null, null] },
  { id: '9',  name: 'Ella',   isYou: false, dailyData: [2.8, 2.3, 2.1, 1.9, 2.5, null, null] },
  { id: '10', name: 'Chris',  isYou: false, dailyData: [3.3, 2.8, 3.6, 2.4, 1.7, null, null] },
];

function getStats(player) {
  const recorded = player.dailyData.filter(d => d !== null);
  const total = recorded.reduce((s, v) => s + v, 0);
  const avg = recorded.length ? total / recorded.length : 0;
  const daysExceeded = recorded.filter(d => d > DAILY_LIMIT_H).length;
  return { total, avg, daysExceeded };
}

function getRanked() {
  return [...MOCK_PLAYERS]
    .map(p => ({ ...p, ...getStats(p) }))
    .sort((a, b) => a.avg - b.avg);
}

const TABS = ['Leaderboard', 'Daily History'];
const RANK_COLORS = ['#F0F4F8', '#A5B4FC', '#475569'];

export default function GameScreen({ navigation, route }) {
  const { settings, partyName } = route.params || {};
  const duration = settings?.duration || 7;
  const [activeTab, setActiveTab] = useState(0);
  const [currentDayPage, setCurrentDayPage] = useState(0);
  const dayFlatListRef = useRef(null);

  const ranked = getRanked();
  const currentDay = MOCK_PLAYERS[0].dailyData.filter(d => d !== null).length;
  const days = Array.from({ length: duration }, (_, i) => i);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backRow}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{partyName || 'ScrollOff'}</Text>
        </View>
        <View style={styles.dayBadgeRow}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayWord}>Day </Text>
            <Text style={styles.dayNum}>{currentDay}</Text>
            <Text style={styles.dayWord}> of {duration}</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(currentDay / duration) * 100}%` }]} />
        </View>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab content */}
      <View style={styles.contentArea}>
        {activeTab === 0 ? (
          <ScrollView contentContainerStyle={styles.leaderboardContainer} showsVerticalScrollIndicator={false}>
            {ranked.map((player, i) => {
              const rankColor = RANK_COLORS[i] || colors.textLight;
              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    i === 0 && styles.playerCardFirst,
                    player.isYou && styles.playerCardYou,
                  ]}
                >
                  <Text style={[styles.rankNum, { color: rankColor }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <View style={[styles.pfpCircle, { borderColor: rankColor }]} />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, player.isYou && styles.playerNameYou]} numberOfLines={1} adjustsFontSizeToFit>
                      {player.name}
                    </Text>
                    <View style={styles.playerCardBottom}>
                      <Text style={[styles.playerSub, player.daysExceeded > 0 && styles.playerSubDanger]} numberOfLines={1}>
                        {player.daysExceeded > 0 ? `${player.daysExceeded}d over limit` : 'Clean streak'}
                      </Text>
                      <View style={styles.statGroup}>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: rankColor }]}>
                            {player.avg.toFixed(1)}h
                          </Text>
                          <Text style={styles.statLabel}>avg</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: rankColor }]}>
                            {player.total.toFixed(1)}h
                          </Text>
                          <Text style={styles.statLabel}>total</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <DailyHistoryTab
            ranked={ranked}
            days={days}
            currentDay={currentDay}
            limit={DAILY_LIMIT_H}
            currentPage={currentDayPage}
            onPageChange={setCurrentDayPage}
            flatListRef={dayFlatListRef}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Daily History ─────────────────────────────────────────────────────────────

function DailyHistoryTab({ ranked, days, currentDay, limit, currentPage, onPageChange, flatListRef }) {
  const handleScroll = (e) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    onPageChange(page);
  };

  const goToPage = (page) => {
    flatListRef.current?.scrollToIndex({ index: page, animated: true });
  };

  return (
    <View style={styles.historyContainer}>
      <View style={styles.pagerNav}>
        <TouchableOpacity
          onPress={() => currentPage > 0 && goToPage(currentPage - 1)}
          style={[styles.navArrow, currentPage === 0 && styles.navArrowDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pagerLabel}>Day {currentPage + 1} of {days.length}</Text>
        <TouchableOpacity
          onPress={() => currentPage < days.length - 1 && goToPage(currentPage + 1)}
          style={[styles.navArrow, currentPage === days.length - 1 && styles.navArrowDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dots}>
        {days.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToPage(i)} activeOpacity={0.7}>
            <View style={[styles.dot, i === currentPage && styles.dotActive, i < currentDay && styles.dotPast]} />
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={days}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item: dayIndex }) => {
          const isPast = dayIndex < currentDay;
          return (
            <View style={styles.dayPage}>
              <View style={styles.dayCard}>
                <Text style={styles.dayTitle}>Day {dayIndex + 1}</Text>
                {!isPast ? (
                  <Text style={styles.dayFuture}>Not yet played</Text>
                ) : (
                  <>
                    <View style={styles.dayRows}>
                      {ranked.map((player, i) => {
                        const hours = player.dailyData[dayIndex];
                        const exceeded = hours !== null && hours > limit;
                        const barWidth = hours ? Math.min((hours / (limit * 1.8)) * 100, 100) : 0;
                        return (
                          <View key={player.id} style={styles.dayRowItem}>
                            <Text style={styles.dayRank}>{i + 1}</Text>
                            <Text style={[styles.dayName, player.isYou && styles.dayNameYou]} numberOfLines={1}>
                              {player.name}
                            </Text>
                            <View style={styles.barWrap}>
                              <View style={[styles.bar, { width: `${barWidth}%` }, exceeded && styles.barExceeded]} />
                            </View>
                            <Text style={[styles.dayHours, exceeded && styles.dayHoursExceeded]}>
                              {hours !== null ? `${hours.toFixed(1)}h` : '—'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.limitRow}>
                      <View style={styles.limitDash} />
                      <Text style={styles.limitLabel}>{limit}h limit</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backRow: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },

  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 32,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  dayBadgeRow: {
    alignItems: 'center',
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayWord: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 13,
    color: colors.textMid,
  },
  dayNum: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: colors.primary,
    lineHeight: 26,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textLight,
  },
  tabLabelActive: { color: colors.background },

  contentArea: { flex: 1 },

  // Leaderboard
  leaderboardContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerCardFirst: { backgroundColor: colors.surfaceAlt },
  playerCardYou: { borderColor: colors.primary },
  pfpCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    flexShrink: 0,
  },
  rankNum: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    width: 30,
    letterSpacing: 0,
    textAlign: 'center',
    flexShrink: 0,
  },
  playerInfo: { flex: 1, gap: 6 },
  playerCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 17,
    color: colors.textDark,
  },
  playerNameYou: { color: colors.primary },
  playerSub: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 12,
    color: colors.textLight,
  },
  playerSubDanger: { color: colors.danger },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  statLabel: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 10,
    color: colors.textLight,
  },

  // Daily History
  historyContainer: { flex: 1 },
  pagerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navArrowDisabled: { opacity: 0.3 },
  navArrowText: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 26,
    color: colors.primary,
    lineHeight: 30,
    marginTop: -2,
  },
  pagerLabel: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.textDark,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotPast: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryDark },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary, width: 18 },
  dayPage: { width: SCREEN_WIDTH, paddingHorizontal: spacing.xl },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  dayTitle: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 18,
    color: colors.textDark,
  },
  dayFuture: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  dayRows: { gap: spacing.md },
  dayRowItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayRank: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.textLight,
    width: 16,
    textAlign: 'center',
  },
  dayName: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
    width: 52,
  },
  dayNameYou: { color: colors.primary },
  barWrap: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  barExceeded: { backgroundColor: colors.danger },
  dayHours: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.textMid,
    width: 44,
    textAlign: 'right',
  },
  dayHoursExceeded: { color: colors.danger },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  limitDash: { flex: 1, height: 1, backgroundColor: colors.danger, opacity: 0.35 },
  limitLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 12,
    color: colors.danger,
  },
});
