import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, Share, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Shiba } from '@components/index';
import { useMoodEntryStore, useSessionStore } from '@store/index';
import { MOOD_MAP, type MoodId } from '@constants/moods';
import { colors, spacing, typography, radius } from '@constants/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = Math.floor((screenWidth - 2 * spacing.screenPadding - 6 * spacing.xs) / 7);

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
    if (!daysWithMoods[dateStr]) return;
    router.push(`/day-detail?date=${dateStr}` as Href);
  };

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const header = 'id,mood,slot,logged_at,note,sentiment_label,sentiment_score,journal_response';
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
        ].join(',');
      });
      const csv = [header, ...rows].join('\n');
      await Share.share({
        message: csv,
        title: 'Kibun Mood Export',
      });
    } finally {
      setExporting(false);
    }
  }, [entries, exporting]);

  return (
    <Screen scrollable={false}>
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Mood Calendar</Text>
          </View>
          <View style={styles.headerTopRight}>
            {isPro ? (
              <Pressable
                onPress={handleExport}
                disabled={exporting || entries.length === 0}
                style={[styles.exportBtn, (exporting || entries.length === 0) && styles.exportBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Export mood history as CSV"
              >
                <Ionicons name="share-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.exportBtnLabel}>Export</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/paywall' as Href)}
                style={styles.exportProLock}
                accessibilityRole="button"
                accessibilityLabel="Upgrade to Pro to export mood history"
              >
                <Text style={styles.exportProLockText}>Export</Text>
                <View style={styles.proLockBadge}>
                  <Text style={styles.proLockBadgeText}>Pro</Text>
                </View>
              </Pressable>
            )}
            <Shiba variant="neutral" size={44} floating />
          </View>
        </View>
        <View style={styles.header}>
          <Pressable
            onPress={goToPrevMonth}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.monthLabel} accessibilityRole="header">
            {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
          </Text>

          <Pressable
            onPress={goToNextMonth}
            disabled={isCurrentMonth}
            accessibilityLabel="Next month"
            accessibilityRole="button"
            hitSlop={12}
            style={isCurrentMonth ? styles.disabledArrow : undefined}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isCurrentMonth ? colors.textDisabled : colors.text}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, i) => (
          <Text
            key={i}
            style={[styles.weekdayLabel, { width: cellSize }]}
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
                `${monthName} ${day}`,
                isToday ? 'today' : '',
                hasEntries ? mood.label : 'no entries',
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <Pressable
                  key={dayIdx}
                  onPress={hasEntries && !isFuture ? () => handleDayPress(day) : undefined}
                  accessibilityLabel={cellA11yLabel}
                  accessibilityRole={hasEntries && !isFuture ? 'button' : 'text'}
                  style={[
                    styles.dayCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRadius: radius.sm,
                    },
                    hasEntries && { backgroundColor: mood.tintColor },
                    isToday && styles.todayCell,
                    isFuture && styles.futureCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      hasEntries ? { color: colors.text } : { color: colors.textSecondary },
                      isFuture && { color: colors.textDisabled },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C6DBFF',
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
    color: colors.primaryDark,
  },
  exportProLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#C6DBFF',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  exportProLockText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  proLockBadge: {
    backgroundColor: colors.primary,
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
    marginTop: spacing.md,
    borderRadius: 22,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.2,
    borderColor: '#DCE9FF',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C6DBFF',
  },
  headerBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    letterSpacing: 0.7,
    color: colors.primaryDark,
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
    color: colors.text,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  weekdayLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  calendarGrid: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.xs,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  futureCell: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
