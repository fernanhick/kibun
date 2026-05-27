import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, Share, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AnimatedNumber } from '@components/index';
import { EmptyState } from '@components/EmptyState';
import { useMoodEntryStore, useSessionStore, useLifeEventsStore } from '@store/index';
import { useResponsive } from '@hooks/useResponsive';
import { useScreenScroll } from '@hooks/useScreenScroll';
import { MOOD_MAP, type MoodId, type MoodGroup } from '@constants/moods';
import { colors, spacing, typography, radius, shadows } from '@constants/theme';
import { getMonthNames, getWeekdayLabels } from '@i18n/dateFormat';
import { getMoodLabel, getMoodGroupLabel } from '@lib/moodLabels';

// Representative tones per mood group used in the balance bar / legend.
const GROUP_COLORS: Record<MoodGroup, string> = {
  green: '#66BB6A',
  neutral: '#BDBDBD',
  'red-orange': '#FF8A65',
  blue: '#90CAF9',
};

const GROUP_ORDER: MoodGroup[] = ['green', 'neutral', 'red-orange', 'blue'];

// Locale-aware: re-resolved on every render so language switches in Settings
// reflow the calendar header without needing to remount the screen.
function getDateLabels() {
  return {
    weekdays: getWeekdayLabels('initial'),
    monthNames: getMonthNames('long'),
  };
}

type ResponsiveSelect = ReturnType<typeof useResponsive>['select'];

// Centralized text/dimension scaling. The base (phone) values match the legacy
// design; tablet and tabletLg bump them so the screen does not feel sparse on
// larger viewports — same approach as the tab bar scale in @constants/layout.
function buildResponsiveSizes(select: ResponsiveSelect) {
  return {
    badgeText: select({ phone: typography.sizes.xs, tablet: 13, tabletLg: 15 }),
    monthLabel: select({ phone: typography.sizes.lg, tablet: 22, tabletLg: 26 }),
    weekdayLabel: select({ phone: typography.sizes.xs, tablet: 13, tabletLg: 15 }),
    dayNumber: select({ phone: typography.sizes.sm, tablet: 16, tabletLg: 18 }),
    btnLabel: select({ phone: typography.sizes.sm, tablet: 15, tabletLg: 16 }),
    statValue: select({ phone: typography.sizes.xl, tablet: 28, tabletLg: 32 }),
    statLabel: select({ phone: typography.sizes.xs, tablet: 13, tabletLg: 15 }),
    legendLabel: select({ phone: typography.sizes.xs, tablet: 13, tabletLg: 15 }),
    proLockBadge: select({ phone: 9, tablet: 11, tabletLg: 12 }),
    chevronIcon: select({ phone: 24, tablet: 28, tabletLg: 32 }),
    actionIcon: select({ phone: 16, tablet: 20, tabletLg: 22 }),
    topMoodBubble: select({ phone: 24, tablet: 30, tabletLg: 34 }),
    legendSwatch: select({ phone: 10, tablet: 12, tabletLg: 14 }),
    balanceBarHeight: select({ phone: 14, tablet: 18, tabletLg: 22 }),
    statDividerHeight: select({ phone: 28, tablet: 36, tabletLg: 40 }),
  };
}

type ResponsiveSizes = ReturnType<typeof buildResponsiveSizes>;

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const responsive = useResponsive();
  const r = useMemo(() => buildResponsiveSizes(responsive.select), [responsive.select]);
  const { onScroll } = useScreenScroll();
  const { weekdays: WEEKDAYS, monthNames: MONTH_NAMES } = getDateLabels();
  // The calendar panel measures its own width via onLayout; cellSize is derived
  // from that so the grid stays correct when Screen clamps content on tablets.
  const [calendarWidth, setCalendarWidth] = useState(0);
  const cellSize = calendarWidth > 0
    ? Math.floor((calendarWidth - 2 * spacing.sm - 6 * spacing.xs) / 7)
    : 44;
  const handleCalendarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== calendarWidth) setCalendarWidth(w);
  }, [calendarWidth]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [exporting, setExporting] = useState(false);

  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';

  const yearMonth = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;

  // Select stable reference, derive outside selector to avoid infinite loop:
  // getDaysWithEntries returns a new object each call, breaking useSyncExternalStore.
  const entries = useMoodEntryStore((s) => s.entries);
  const lifeEvents = useLifeEventsStore((s) => s.events);

  const daysWithMoods = useMemo(() => {
    const dayEntries = entries.filter((e) => e.loggedAt.startsWith(yearMonth));
    const byDay: Record<string, typeof entries> = {};
    for (const e of dayEntries) {
      const day = e.loggedAt.split('T')[0];
      (byDay[day] ??= []).push(e);
    }
    const result: Record<string, string> = {};
    for (const [day, dayEnts] of Object.entries(byDay)) {
      const freq: Record<string, number> = {};
      for (const e of dayEnts) {
        freq[e.moodId] = (freq[e.moodId] ?? 0) + 1;
      }
      let maxCount = 0;
      for (const count of Object.values(freq)) {
        if (count > maxCount) maxCount = count;
      }
      const topMoods = Object.keys(freq).filter((m) => freq[m] === maxCount);
      if (topMoods.length === 1) {
        result[day] = topMoods[0];
      } else {
        const sorted = dayEnts
          .filter((e) => topMoods.includes(e.moodId))
          .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
        result[day] = sorted[0].moodId;
      }
    }
    return result;
  }, [entries, yearMonth]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    for (const e of lifeEvents) {
      if (e.eventDate.startsWith(yearMonth)) set.add(e.eventDate);
    }
    return set;
  }, [lifeEvents, yearMonth]);

  const monthSummary = useMemo(() => {
    const monthEntries = entries.filter((e) => e.loggedAt.startsWith(yearMonth));
    const total = monthEntries.length;
    const activeDays = new Set(monthEntries.map((e) => e.loggedAt.split('T')[0])).size;

    const groupCounts: Record<MoodGroup, number> = {
      green: 0, neutral: 0, 'red-orange': 0, blue: 0,
    };
    const moodFreq: Record<string, number> = {};
    for (const e of monthEntries) {
      const def = MOOD_MAP[e.moodId as MoodId];
      if (!def) continue;
      groupCounts[def.group]++;
      moodFreq[e.moodId] = (moodFreq[e.moodId] ?? 0) + 1;
    }

    let topMoodId: MoodId | null = null;
    let topCount = 0;
    for (const [id, count] of Object.entries(moodFreq)) {
      if (count > topCount) {
        topCount = count;
        topMoodId = id as MoodId;
      }
    }

    return { total, activeDays, groupCounts, topMoodId, topCount };
  }, [entries, yearMonth]);

  const grid = useMemo(
    () => buildCalendarGrid(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isCurrentMonth =
    currentMonth.year === now.getFullYear() && currentMonth.month === now.getMonth();

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    const next =
      currentMonth.month === 11
        ? { year: currentMonth.year + 1, month: 0 }
        : { ...currentMonth, month: currentMonth.month + 1 };
    if (
      next.year > now.getFullYear() ||
      (next.year === now.getFullYear() && next.month > now.getMonth())
    )
      return;
    setCurrentMonth(next);
  };

  const handleDayPress = (day: number) => {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    // Strict YYYY-MM-DD validation
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (!isValidDate) {
      if (__DEV__) console.warn('Invalid date string for calendar press:', dateStr);
      return;
    }
    if (daysWithMoods[dateStr]) {
      router.push(`/day-detail?date=${dateStr}` as Href);
    } else {
      router.push(`/check-in?date=${dateStr}` as Href);
    }
  };

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const header = 'id,mood,slot,logged_at,note,sentiment_label,sentiment_score,journal_response,energy_level,focus_level';
      const rows = entries.map((e) => {
        const escape = (v: string | null | undefined) =>
          v ? `"${v.replace(/"/g, '""')}"` : '';
        return [
          e.id,
          e.moodId,
          e.slot,
          e.loggedAt,
          escape(e.note),
          e.sentimentLabel ?? '',
          e.sentimentScore ?? '',
          escape(e.journalResponse),
          e.energyLevel ?? '',
          e.focusLevel ?? '',
        ].join(',');
      });
      const csv = [header, ...rows].join('\n');
      await Share.share({
        message: csv,
        title: t('history.exportTitle'),
      });
    } finally {
      setExporting(false);
    }
  }, [entries, exporting, t]);

  return (
    <Screen scrollable={true} layout="wide" contentContainerStyle={styles.scrollPadding} onScroll={onScroll}>
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerBadge}>
            <Text style={[styles.headerBadgeText, { fontSize: r.badgeText }]}>{t('history.header.badge')}</Text>
          </View>
          <View style={styles.headerTopRight}>
            <View style={styles.headerActions}>
              {isPro && (
                <Pressable
                  onPress={() => router.push('/log-event' as Href)}
                  style={styles.addEventBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('history.actions.eventA11y')}
                >
                  <Ionicons name="add" size={r.actionIcon} color={colors.textInverse} />
                  <Text style={[styles.exportBtnLabel, { fontSize: r.btnLabel }]}>{t('history.actions.event')}</Text>
                </Pressable>
              )}
              {isPro ? (
                <Pressable
                  onPress={handleExport}
                  disabled={exporting || entries.length === 0}
                  style={[styles.exportBtn, (exporting || entries.length === 0) && styles.exportBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={t('history.actions.exportA11y')}
                >
                  <Ionicons name="share-outline" size={r.actionIcon} color={colors.textInverse} />
                  <Text style={[styles.exportBtnLabel, { fontSize: r.btnLabel }]}>{t('history.actions.export')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push('/paywall' as Href)}
                  style={styles.exportProLock}
                  accessibilityRole="button"
                  accessibilityLabel={t('history.actions.exportLockedA11y')}
                >
                  <Text style={[styles.exportProLockText, { fontSize: r.btnLabel }]}>{t('history.actions.export')}</Text>
                  <View style={styles.proLockBadge}>
                    <Text style={[styles.proLockBadgeText, { fontSize: r.proLockBadge }]}>{t('insights.proBadge')}</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>
        <View style={styles.header}>
          <Pressable
            onPress={goToPrevMonth}
            accessibilityLabel={t('history.header.prevMonthA11y')}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={r.chevronIcon} color={colors.textInverse} />
          </Pressable>

          <Text style={[styles.monthLabel, { fontSize: r.monthLabel }]} accessibilityRole="header">
            {t('history.header.monthYear', { month: MONTH_NAMES[currentMonth.month], year: currentMonth.year })}
          </Text>

          <Pressable
            onPress={goToNextMonth}
            disabled={isCurrentMonth}
            accessibilityLabel={t('history.header.nextMonthA11y')}
            accessibilityRole="button"
            hitSlop={12}
            style={isCurrentMonth ? styles.disabledArrow : undefined}
          >
            <Ionicons
              name="chevron-forward"
              size={r.chevronIcon}
              color={isCurrentMonth ? 'rgba(255,255,255,0.4)' : colors.textInverse}
            />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.calendarPanel} onLayout={handleCalendarLayout}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day, i) => (
            <Text
              key={i}
              style={[styles.weekdayLabel, { width: cellSize, fontSize: r.weekdayLabel }]}
            >
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {grid.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {week.map((day, dayIdx) => {
                if (day === null) {
                  return <View key={dayIdx} style={{ width: cellSize, height: cellSize }} />;
                }

              const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
              const moodId = daysWithMoods[dateStr];
              const mood = moodId ? MOOD_MAP[moodId as MoodId] : undefined;
              const isToday = dateStr === todayStr;
              const isFuture = !isToday && new Date(dateStr + 'T12:00:00') > now;
              const hasEntries = !!mood;
              const monthName = MONTH_NAMES[currentMonth.month];

              const cellA11yLabel = [
                t('history.calendar.cellA11y', { month: monthName, day }),
                isToday ? t('history.calendar.today') : '',
                hasEntries
                  ? getMoodLabel(moodId)
                  : (!isFuture ? t('history.calendar.tapToLog') : t('history.calendar.noEntries')),
              ]
                .filter(Boolean)
                .join(', ');

                return (
                  <Pressable
                    key={dayIdx}
                    onPress={!isFuture ? () => handleDayPress(day) : undefined}
                    accessibilityLabel={cellA11yLabel}
                    accessibilityRole={!isFuture ? 'button' : 'text'}
                    style={[
                      styles.dayCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radius.sm,
                      },
                      hasEntries && { backgroundColor: mood.tintColor },
                      !hasEntries && !isFuture && styles.emptyPastCell,
                      isToday && styles.todayCell,
                      isFuture && styles.futureCell,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { fontSize: r.dayNumber },
                        hasEntries ? { color: colors.text } : { color: colors.text },
                        isFuture && { color: colors.textDisabled },
                      ]}
                    >
                      {day}
                    </Text>
                    {daysWithEvents.has(dateStr) && (
                      <View style={styles.eventDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <MonthSnapshot
        monthLabel={MONTH_NAMES[currentMonth.month]}
        summary={monthSummary}
        r={r}
      />
    </Screen>
  );
}

interface MonthSnapshotProps {
  monthLabel: string;
  summary: {
    total: number;
    activeDays: number;
    groupCounts: Record<MoodGroup, number>;
    topMoodId: MoodId | null;
    topCount: number;
  };
  r: ResponsiveSizes;
}

function MonthSnapshot({ monthLabel, summary, r }: MonthSnapshotProps) {
  const { t } = useTranslation('screens');
  const { total, activeDays, groupCounts, topMoodId } = summary;
  const topMood = topMoodId ? MOOD_MAP[topMoodId] : null;

  if (total === 0) {
    return (
      <View style={styles.snapshotCard}>
        <View style={styles.snapshotBadge}>
          <Text style={[styles.snapshotBadgeText, { fontSize: r.badgeText }]}>{t('history.snapshot.badge')}</Text>
        </View>
        <EmptyState
          illustration="chart"
          title={t('history.snapshot.emptyTitle', { month: monthLabel })}
          description={t('history.snapshot.emptySubtitle')}
          illustrationSize={120}
        />
      </View>
    );
  }

  const balanceSegments = GROUP_ORDER
    .map((group) => ({ group, count: groupCounts[group] }))
    .filter((s) => s.count > 0);

  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotBadge}>
        <Text style={[styles.snapshotBadgeText, { fontSize: r.badgeText }]}>{t('history.snapshot.badge')}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <AnimatedNumber
            value={total}
            style={[styles.statValue, { fontSize: r.statValue }]}
            maxFontSizeMultiplier={1.2}
          />
          <Text style={[styles.statLabel, { fontSize: r.statLabel }]}>{t('history.snapshot.moodsLogged')}</Text>
        </View>
        <View style={[styles.statDivider, { height: r.statDividerHeight }]} />
        <View style={styles.statCell}>
          <AnimatedNumber
            value={activeDays}
            style={[styles.statValue, { fontSize: r.statValue }]}
            maxFontSizeMultiplier={1.2}
          />
          <Text style={[styles.statLabel, { fontSize: r.statLabel }]}>{t('history.snapshot.activeDays')}</Text>
        </View>
        {topMood && topMoodId && (
          <>
            <View style={[styles.statDivider, { height: r.statDividerHeight }]} />
            <View style={[styles.statCell, styles.topMoodCell]}>
              <View style={[
                styles.topMoodBubble,
                { backgroundColor: topMood.bubbleColor, width: r.topMoodBubble, height: r.topMoodBubble },
              ]} />
              <Text style={[styles.statLabel, { fontSize: r.statLabel }]} numberOfLines={1}>
                {t('history.snapshot.topMood', { mood: getMoodLabel(topMoodId).toLowerCase() })}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={[styles.balanceBar, { height: r.balanceBarHeight }]}>
        {balanceSegments.map((seg, idx) => {
          const flex = seg.count / total;
          const isFirst = idx === 0;
          const isLast = idx === balanceSegments.length - 1;
          return (
            <View
              key={seg.group}
              style={{
                flex,
                height: '100%',
                backgroundColor: GROUP_COLORS[seg.group],
                borderTopLeftRadius: isFirst ? 999 : 0,
                borderBottomLeftRadius: isFirst ? 999 : 0,
                borderTopRightRadius: isLast ? 999 : 0,
                borderBottomRightRadius: isLast ? 999 : 0,
              }}
            />
          );
        })}
      </View>

      <View style={styles.legendRow}>
        {GROUP_ORDER.map((group) => {
          const count = groupCounts[group];
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <View key={group} style={styles.legendItem}>
              <View style={[
                styles.legendSwatch,
                { backgroundColor: GROUP_COLORS[group], width: r.legendSwatch, height: r.legendSwatch },
              ]} />
              <Text style={[styles.legendLabel, { fontSize: r.legendLabel }]}>
                {getMoodGroupLabel(group)} <Text style={styles.legendPct}>{pct}%</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollPadding: {
    paddingBottom: 120,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexShrink: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
  },
  exportProLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  exportProLockText: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
  },
  proLockBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proLockBadgeText: {
    fontSize: 9,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  headerCard: {
    ...shadows.md,
    marginTop: spacing.md,
    borderRadius: 16,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  headerBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    letterSpacing: 0.7,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  monthLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.ui,
    color: colors.textInverse,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  weekdayLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  calendarPanel: {
    ...shadows.sm,
    marginTop: spacing.md,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255, 218, 218, 0.94)',
  },
  calendarGrid: {
    gap: spacing.xs,
    alignItems: 'stretch',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.xs,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: '#D9E5F7',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  futureCell: {
    opacity: 0.55,
  },
  emptyPastCell: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 1,
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  snapshotCard: {
    ...shadows.md,
    marginTop: spacing.md,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.95)',
    gap: spacing.sm,
  },
  snapshotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pinkLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  snapshotBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    letterSpacing: 0.7,
    color: colors.pink,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  topMoodCell: {
    gap: 4,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  topMoodBubble: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  balanceBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: 6,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  legendPct: {
    color: colors.text,
    fontFamily: typography.fonts.ui,
  },
});
