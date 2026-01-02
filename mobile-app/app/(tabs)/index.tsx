import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Text, Button, ActivityIndicator, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiClient from '@/services/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  audience: string;
  isScheduled: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: string | null;
}

export default function AnnouncementListScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const response = await apiClient.get('/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch (error: any) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => router.push(`/announcement/${item.id}`)}
          >
            <Card.Content>
              <Text variant="titleMedium" style={styles.title}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                작성자: {item.author} | {formatDate(item.publishedAt || item.createdAt)}
              </Text>
              {item.isScheduled && (
                <Text variant="bodySmall" style={styles.scheduled}>
                  예약 발행
                </Text>
              )}
              {item.category && (
                <Text variant="bodySmall" style={styles.category}>
                  {item.category === 'notice' && '단순 알림'}
                  {item.category === 'survey' && '설문 조사'}
                  {item.category === 'consent' && '동의서'}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              안내문이 없습니다
            </Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(tabs)/create')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  meta: {
    color: '#666',
    marginBottom: 4,
  },
  scheduled: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  category: {
    color: '#2196f3',
    marginTop: 4,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

