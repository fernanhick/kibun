import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { Shiba } from '@components/Shiba';
import { Card } from '@components/Card';
import { OnboardingProgress } from '@components/OnboardingProgress';
import { typography, spacing, radius, shadows } from '@constants/theme';
import { useTheme, type ThemePalette } from '@theme/ThemeContext';
import { useThemedStyles } from '@hooks/useThemedStyles';

export default function DisclaimerScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  const [acknowledged, setAcknowledged] = useState(false);

  const handleContinue = () => {
    if (!acknowledged) return;
    router.push('/(onboarding)/first-mood');
  };

  const handleExistingAccount = () => {
    router.push('/register?mode=login&source=onboarding');
  };

  return (
    <Screen scrollable edgePadding="large">
      <View style={styles.container}>
        <OnboardingProgress current={1} total={8} tone="dark" style={styles.progress} />
        <Shiba variant="neutral" size={180} style={styles.shiba} />

        <Text style={styles.title}>{t('disclaimer.title')}</Text>
        <Text style={styles.subtitle}>{t('disclaimer.subtitle')}</Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBubble}>
              <Ionicons name="heart-circle" size={28} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{t('disclaimer.cardTitle')}</Text>
          </View>

          <Text style={styles.bodyText}>{t('disclaimer.body')}</Text>

          <Text style={styles.sectionTitle}>{t('disclaimer.notSection')}</Text>
          <BulletPoint icon="medkit-outline" text={t('disclaimer.bullets.medicalDevice')} />
          <BulletPoint icon="pulse-outline" text={t('disclaimer.bullets.medicalAdvice')} />
          <BulletPoint icon="medical-outline" text={t('disclaimer.bullets.treatment')} />
          <BulletPoint icon="person-outline" text={t('disclaimer.bullets.professionalCare')} />
          <BulletPoint icon="warning-outline" text={t('disclaimer.bullets.emergency')} />

          <View style={styles.crisisBox}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <View style={styles.crisisContent}>
              <Text style={styles.crisisTitle}>{t('disclaimer.crisisTitle')}</Text>
              <Text style={styles.crisisText}>{t('disclaimer.crisisBody')}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.checkboxRow}>
          <Pressable
            style={[styles.checkbox, acknowledged && styles.checkboxChecked]}
            onPress={() => setAcknowledged(!acknowledged)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
          >
            {acknowledged && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </Pressable>
          <Text
            style={styles.checkboxLabel}
            onPress={() => setAcknowledged(!acknowledged)}
          >
            {t('disclaimer.checkbox')}
          </Text>
        </View>

        <View style={styles.button}>
          <Button
            label={t('disclaimer.cta')}
            onPress={handleContinue}
            variant="sunrise"
            disabled={!acknowledged}
            fullWidth
          />
        </View>

        <Pressable onPress={handleExistingAccount} accessibilityRole="button" style={styles.loginLinkWrap}>
          <Text style={styles.loginLink}>{t('disclaimer.loginLink')}</Text>
        </Pressable>
        <Text style={styles.personalizationNote}>{t('disclaimer.personalizationNote')}</Text>
      </View>
    </Screen>
  );
}

function BulletPoint({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bulletContainer}>
      <Ionicons name={icon} size={18} color={colors.primary} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  progress: {
    marginBottom: spacing.md,
  },
  shiba: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xxl,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.lg,
    color: colors.primary,
    flex: 1,
  },
  bodyText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.body,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bulletIcon: {
    width: 28,
    marginRight: spacing.sm,
    textAlign: 'center',
  },
  bulletText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  crisisBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  crisisContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  crisisTitle: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.md,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  crisisText: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
    ...shadows.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.md,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  button: {
    width: '100%',
  },
  loginLinkWrap: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  loginLink: {
    fontFamily: typography.fonts.ui,
    fontSize: typography.sizes.md,
    color: colors.primary,
    textAlign: 'center',
  },
  personalizationNote: {
    marginTop: spacing.xs,
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
