import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen, MoodLogger } from '@components/index';
import { typography, spacing } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';
import { safeParseDateString } from '@lib/safeDate';
import { formatDate } from '@i18n/dateFormat';

function formatBackdate(d: string) {
  const date = safeParseDateString(d);
  return formatDate(date, { month: 'long', day: 'numeric' });
}

export default function CheckInScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ date?: string }>();

  const handleLogged = (entryId: string, moodId: string) => {
    const dateParam = params.date ? `&date=${params.date}` : '';
    router.replace(`/mood-confirm?entryId=${entryId}&moodId=${moodId}${dateParam}` as Href);
  };

  return (
    <Screen scrollable={true} layout="wide" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('checkIn.title')}</Text>
          <Text style={styles.subtitle}>
            {params.date
              ? t('checkIn.subtitleBackdate', { date: formatBackdate(params.date) })
              : t('checkIn.subtitlePick')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('checkIn.a11yCancel')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <MoodLogger variant="screen" date={params.date} onLogged={handleLogged} />
    </Screen>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.display,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
