import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@components/Screen';
import { Button } from '@components/Button';
import { Shiba } from '@components/Shiba';
import { Card } from '@components/Card';
import { colors, typography, spacing, radius, shadows } from '@constants/theme';

export default function DisclaimerScreen() {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleContinue = () => {
    if (!acknowledged) return;
    router.push('/(onboarding)/first-mood');
  };

  const handleExistingAccount = () => {
    router.push('/register?mode=login&source=onboarding');
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Shiba variant="neutral" size={100} floating style={styles.shiba} />

        <Text style={styles.title}>Before We Begin… 🌸</Text>
        <Text style={styles.subtitle}>
          Just a few things to know about Kibun
        </Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBubble}>
              <Ionicons name="heart-circle" size={28} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Kibun is a Wellness Tool</Text>
          </View>

          <Text style={styles.bodyText}>
            Kibun is here to help you with self-reflection and mood tracking — think of it as a cozy journal companion! 📝
          </Text>

          <Text style={styles.sectionTitle}>What Kibun Is NOT:</Text>
          <BulletPoint emoji="🏥" text="A medical device or app" />
          <BulletPoint emoji="🩺" text="Medical advice or diagnosis" />
          <BulletPoint emoji="💊" text="A treatment for any condition" />
          <BulletPoint emoji="👩‍⚕️" text="A substitute for professional mental health care" />
          <BulletPoint emoji="🚨" text="An emergency service" />

          <View style={styles.crisisBox}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <View style={styles.crisisContent}>
              <Text style={styles.crisisTitle}>If You're in Crisis</Text>
              <Text style={styles.crisisText}>
                Please contact local emergency services or a licensed professional immediately. You matter. 💙
              </Text>
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
            I understand Kibun is for wellness only ✨
          </Text>
        </View>

        <View style={styles.button}>
          <Button
            label="Let's Go! 🎉"
            onPress={handleContinue}
            variant="sunrise"
            disabled={!acknowledged}
            fullWidth
          />
        </View>

        <Pressable onPress={handleExistingAccount} accessibilityRole="button" style={styles.loginLinkWrap}>
          <Text style={styles.loginLink}>Already have an account? Sign in and skip onboarding</Text>
        </Pressable>
        <Text style={styles.personalizationNote}>
          Heads up: these onboarding answers improve personalized insights later.
        </Text>
      </View>
    </Screen>
  );
}

function BulletPoint({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.bulletContainer}>
      <Text style={styles.bulletEmoji}>{emoji}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
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
  bulletEmoji: {
    fontSize: typography.sizes.body,
    width: 28,
    marginRight: spacing.sm,
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
    borderWidth: 1,
    borderColor: colors.borderLight,
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
