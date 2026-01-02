import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            대시보드
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            통계 및 요약 정보를 확인할 수 있습니다.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
});

