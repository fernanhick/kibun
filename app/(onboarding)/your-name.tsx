import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, OnboardingProgress, Shiba } from '@components/index';
import { useOnboardingStore } from '@store/onboardingStore';
import { colors, typography, spacing, radius } from '@constants/theme';

export default function YourNameScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  const router = useRouter();
  const { profile, updateProfile, firstMoodId } = useOnboardingStore();
  const [name, setName] = useState(profile.name);

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    const trimmed = name.trim();
    updateProfile({ name: trimmed });
    if (firstMoodId) {
      router.push({
        pathname: '/(onboarding)/mood-response/[moodId]',
        params: { moodId: firstMoodId },
      });
    } else {
      router.push('/(onboarding)/profile-personal');
    }
  };

  return (
    <Screen scrollable edgePadding="large">
      <LinearGradient
        colors={[colors.skyStart, colors.skyEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <OnboardingProgress current={3} total={11} style={styles.progress} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding:a11y.goBack')}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textInverse} />
        </Pressable>
        <View style={styles.shibaWrap}>
          <Shiba variant="happy" size={150} loop autoPlay />
        </View>
        <Text style={styles.title}>{t('onboarding:yourName.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding:yourName.subtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.fieldLabel}>{t('onboarding:yourName.fieldLabel')}</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('onboarding:yourName.placeholder')}
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          maxLength={50}
          onSubmitEditing={() => {
            Keyboard.dismiss();
            handleContinue();
          }}
          accessibilityLabel={t('onboarding:yourName.fieldLabel')}
        />
      </View>

      <Button
        label={t('common:actions.continue')}
        onPress={handleContinue}
        variant="sunrise"
        disabled={!canContinue}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  progress: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  shibaWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.sizes.xxl,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.body,
    color: colors.sparkle,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.chipSurface,
  },
});
