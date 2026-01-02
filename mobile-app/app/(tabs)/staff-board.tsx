import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

export default function StaffBoardScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            교직원 게시판
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            교직원 전용 게시판입니다.
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

