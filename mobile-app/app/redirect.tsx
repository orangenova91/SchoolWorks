import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    school?: string | null;
    role?: string | null;
  };
}

export default function RedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // URL 파라미터에서 code와 state 추출
        const code = params.code as string;
        const state = params.state as string;

        if (!code) {
          throw new Error('인증 코드를 받지 못했습니다');
        }

        // 웹 환경에서만 state 검증 (state가 있는 경우에만)
        if (Platform.OS === 'web' && state) {
          const savedState = sessionStorage.getItem('oauth_state');
          if (savedState && savedState !== state) {
            throw new Error('잘못된 인증 요청입니다');
          }
          if (savedState) {
            sessionStorage.removeItem('oauth_state');
          }
        }

        const redirectUri = Platform.OS === 'web' 
          ? sessionStorage.getItem('oauth_redirect_uri') || window.location.origin + '/redirect'
          : Constants.expoConfig?.scheme 
            ? `${Constants.expoConfig.scheme}://redirect`
            : 'announcement-app://redirect';

        if (Platform.OS === 'web') {
          sessionStorage.removeItem('oauth_redirect_uri');
        }

        // Authorization Code를 백엔드로 전송
        const response = await axios.post<LoginResponse>(
          `${API_BASE_URL}/auth/mobile/google`,
          { 
            code,
            redirectUri,
          }
        );

        const { accessToken, refreshToken, user } = response.data;

        // 토큰 및 사용자 정보 저장
        const storage = Platform.OS === 'web' ? {
          setItem: async (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, value);
            }
          }
        } : {
          setItem: async (key: string, value: string) => {
            await SecureStore.setItemAsync(key, value);
          }
        };

        await storage.setItem('access_token', accessToken);
        await storage.setItem('refresh_token', refreshToken);
        await storage.setItem('user', JSON.stringify(user));

        // 로그인 성공 후 홈으로 이동
        router.replace('/(tabs)');
      } catch (err: any) {
        console.error('Redirect error:', err);
        setError(err.message || '로그인 처리 중 오류가 발생했습니다');
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
      }
    };

    handleRedirect();
  }, [params, router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.subText}>로그인 화면으로 돌아갑니다...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>로그인 처리 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

