import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@constants/theme';

export default function InsightsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontSize: 18,
    color: colors.text,
  },
});
