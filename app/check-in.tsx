import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@components/index';
import { MoodBubble } from '@components/MoodBubble';
import { MOODS, MoodDefinition } from '@constants/moods';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';
import { useSessionStore } from '@store/sessionStore';
import { useCustomMoodsStore } from '@store/customMoodsStore';
import { getMoodDef } from '@lib/moodUtils';
import { safeParseDateString } from '@lib/safeDate';
import { formatDate } from '@i18n/dateFormat';

function formatBackdate(d: string) {
  const date = safeParseDateString(d);
  return formatDate(date, { month: 'long', day: 'numeric' });
}

export default function MoodSelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation('screens');
  const params = useLocalSearchParams<{ date?: string }>();
  const session = useSessionStore((s) => s.session);
  const isPro = session?.subscriptionStatus === 'trial' || session?.subscriptionStatus === 'active';
  const customMoods = useCustomMoodsStore((s) => s.moods);

  const handleSelect = (mood: MoodDefinition) => {
    const dateParam = params.date ? `&date=${params.date}` : '';
    router.push(`/mood-confirm?moodId=${mood.id}${dateParam}` as Href);
  };

  const handleSelectCustom = (id: string) => {
    const dateParam = params.date ? `&date=${params.date}` : '';
    router.push(`/mood-confirm?moodId=${id}${dateParam}` as Href);
  };

  return (
    <Screen scrollable={true} layout="wide" contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.pink, colors.pinkEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('checkIn.title')}</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.a11yCancel')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {params.date
            ? t('checkIn.subtitleBackdate', { date: formatBackdate(params.date) })
            : t('checkIn.subtitlePick')}
        </Text>
      </LinearGradient>

      <View style={styles.groupSection}>
        <View style={styles.bubbleRow}>
          {MOODS.map((mood) => (
            <MoodBubble
              key={mood.id}
              mood={mood}
              size="mdCompact"
              onPress={handleSelect}
            />
          ))}
        </View>
      </View>

      {/* Custom moods — Pro only */}
      {isPro && (
        <View style={styles.groupSection}>
          <View style={styles.customGroupHeader}>
            <Text style={styles.groupLabel} accessibilityRole="header">
              {t('checkIn.customSection')}
            </Text>
            <Pressable
              onPress={() => router.push('/custom-moods' as Href)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('checkIn.a11yManageCustom')}
            >
              <Text style={styles.manageLink}>
                {customMoods.length > 0 ? t('checkIn.manage') : t('checkIn.create')}
              </Text>
            </Pressable>
          </View>
          {customMoods.length === 0 ? (
            <Pressable
              style={styles.createCustomPill}
              onPress={() => router.push('/custom-moods' as Href)}
              accessibilityRole="button"
              accessibilityLabel={t('checkIn.a11yCreateFirst')}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.createCustomText}>{t('checkIn.createFirst')}</Text>
            </Pressable>
          ) : (
            <View style={styles.bubbleRow}>
              {customMoods.map((cm) => {
                const def = getMoodDef(cm.id, customMoods);
                if (!def) return null;
                return (
                  <MoodBubble
                    key={cm.id}
                    mood={def}
                    size="mdCompact"
                    onPress={() => handleSelectCustom(cm.id)}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  heroCard: {
    ...shadows.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.display,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    color: colors.sparkle,
  },
  groupSection: {
    ...shadows.sm,
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  groupLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.ui,
    color: colors.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 0,
    rowGap: 0,
  },
  customGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  manageLink: {
    fontSize: typography.sizes.sm,
    color: colors.pink,
    fontFamily: typography.fonts.ui,
  },
  createCustomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.pinkBorder,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
    backgroundColor: colors.pinkLight,
  },
  createCustomText: {
    fontSize: typography.sizes.sm,
    color: colors.pink,
    fontFamily: typography.fonts.ui,
  },
});
