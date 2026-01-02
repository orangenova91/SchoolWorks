import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Card, Text, Button, List, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getUser, logout, User } from '@/services/auth';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // 웹 환경에서는 confirm 사용
      const confirmed = typeof window !== 'undefined' && window.confirm('정말 로그아웃하시겠습니까?');
      if (!confirmed) return;
      performLogout();
    } else {
      // 모바일에서는 Alert 사용
      Alert.alert(
        '로그아웃',
        '정말 로그아웃하시겠습니까?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '로그아웃',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    setLogoutLoading(true);
    try {
      console.log('Starting logout process...');
      await logout();
      console.log('Logout completed, redirecting to login...');
      // 약간의 지연을 두고 리다이렉트 (UI 업데이트를 위해)
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100);
    } catch (error: any) {
      console.error('Logout error:', error);
      const errorMessage = error?.message || '로그아웃 중 오류가 발생했습니다.';
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert('오류', errorMessage);
      }
      setLogoutLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>사용자 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.name}>
            {user.name || user.email}
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            {user.email}
          </Text>
          {user.role && (
            <Text variant="bodySmall" style={styles.role}>
              역할: {user.role === 'teacher' ? '교사' : user.role}
            </Text>
          )}
          {user.school && (
            <Text variant="bodySmall" style={styles.school}>
              학교: {user.school}
            </Text>
          )}
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor="#d32f2f"
        loading={logoutLoading}
        disabled={logoutLoading}
      >
        로그아웃
      </Button>
    </ScrollView>
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
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 4,
  },
  role: {
    color: '#999',
    marginTop: 8,
  },
  school: {
    color: '#999',
  },
  divider: {
    marginVertical: 16,
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
  },
});

