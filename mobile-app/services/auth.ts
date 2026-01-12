import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// 웹과 모바일을 구분하는 스토리지 헬퍼
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export interface User {
  id: string;
  email: string;
  name?: string | null;
  school?: string | null;
  role?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthError {
  error: string;
  details?: any;
}

/**
 * 액세스 토큰 가져오기
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await storage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * 리프레시 토큰 가져오기
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await storage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * 사용자 정보 가져오기
 */
export async function getUser(): Promise<User | null> {
  try {
    const userStr = await storage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * 로그인
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/mobile`,
      { email, password }
    );

    const { accessToken, refreshToken, user } = response.data;

    // 토큰 및 사용자 정보 저장
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await storage.setItem(USER_KEY, JSON.stringify(user));

    return { accessToken, refreshToken, user };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || '로그인에 실패했습니다';
      throw new Error(message);
    }
    throw error;
  }
}

/**
 * 리프레시 토큰으로 액세스 토큰 갱신
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await axios.put<{ accessToken: string; user: User }>(
      `${API_BASE_URL}/auth/mobile`,
      { refreshToken }
    );

    const { accessToken, user } = response.data;

    // 새로운 액세스 토큰 저장
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await storage.setItem(USER_KEY, JSON.stringify(user));

    return accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    // 리프레시 실패 시 로그아웃
    await logout();
    return null;
  }
}

/**
 * 로그아웃
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();
    
    // 서버에 로그아웃 요청 (선택적)
    if (refreshToken) {
      try {
        await axios.delete(`${API_BASE_URL}/auth/mobile`, {
          data: { refreshToken },
        });
        console.log('Logout request sent to server successfully');
      } catch (error) {
        // 서버 요청 실패해도 로컬 데이터는 삭제
        console.error('Failed to logout on server:', error);
        // 에러가 발생해도 로컬 로그아웃은 진행
      }
    }

    // 로컬 저장소에서 토큰 삭제
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    console.log('Local storage cleared');
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error; // 에러를 다시 throw하여 호출자가 처리할 수 있도록
  }
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

// Google Client ID (app.json에서 설정)
// 웹 환경에서 Constants.expoConfig가 제대로 작동하지 않을 경우를 대비해 여기에도 설정
const GOOGLE_CLIENT_ID_DEFAULT = '377390074888-gbr7ec9hj9vsfvmr3os5kvpknju5lc32.apps.googleusercontent.com';

/**
 * Google OAuth 로그인
 */
export async function loginWithGoogle(): Promise<LoginResponse> {
  try {
    // 여러 소스에서 Google Client ID 읽기 시도
    let GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId;
    
    // 웹 환경에서 Constants가 제대로 작동하지 않을 경우를 대비
    if (!GOOGLE_CLIENT_ID && Platform.OS === 'web') {
      // 웹에서는 window 객체나 다른 방법 시도
      const webConfig = (global as any)?.__EXPO_CONFIG__?.extra?.googleClientId;
      if (webConfig) {
        GOOGLE_CLIENT_ID = webConfig;
      }
    }
    
    // 최후의 수단: 기본값 사용 (app.json의 값과 동일하게 설정)
    if (!GOOGLE_CLIENT_ID) {
      GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID_DEFAULT;
      console.warn('Using default Google Client ID. Constants.expoConfig.extra.googleClientId was not available.');
    }
    
    console.log('Platform:', Platform.OS);
    console.log('Google Client ID:', GOOGLE_CLIENT_ID);
    console.log('Expo config extra:', Constants.expoConfig?.extra);
    
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id.apps.googleusercontent.com') {
      throw new Error('Google OAuth가 설정되지 않았습니다. app.json의 extra.googleClientId를 확인해주세요.');
    }

    // 웹 환경: 직접 리디렉션 방식 사용
    if (Platform.OS === 'web') {
      const redirectUri = typeof window !== 'undefined' 
        ? `${window.location.origin}/redirect`
        : 'http://localhost:8081/redirect';
      
      // State를 저장하여 CSRF 방지
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_redirect_uri', redirectUri);
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid profile email&` +
        `state=${state}`;

      // 현재 창에서 리디렉션 (팝업 대신)
      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
      
      // 이 함수는 resolve되지 않습니다 (리디렉션되므로)
      // 실제 처리는 redirect.tsx에서 수행됩니다
      return new Promise(() => {}); // 무한 대기
    }

    // 모바일 환경: expo-auth-session 사용
    // Expo Go에서는 exp:// 스킴이 Google OAuth 웹 클라이언트에서 지원되지 않음
    // Google Cloud Console에서 exp:// URI를 등록할 수 없음
    // 실제 앱 빌드 후 iOS/Android 네이티브 클라이언트 ID 사용 권장
    // 또는 개발 중에는 웹 브라우저에서 사용
    
    // 현재는 모바일에서 Google 로그인 비활성화
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      throw new Error('모바일 앱에서는 현재 Google 로그인을 지원하지 않습니다.\n웹 브라우저(http://192.168.123.102:3000)에서 Google 로그인을 사용해주세요.\n\n실제 앱 빌드 후 iOS/Android 네이티브 클라이언트 ID를 설정하면 모바일에서도 사용 가능합니다.');
    }
    
    const redirectUri = AuthSession.makeRedirectUri({
      path: 'redirect',
    });

    console.log('Redirect URI:', redirectUri);

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
      usePKCE: true,
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const result = await request.promptAsync(discovery);

    if (result.type !== 'success') {
      throw new Error('Google 로그인이 취소되었습니다');
    }

    const { code } = result.params;
    
    if (!code) {
      throw new Error('Google 인증 코드를 받지 못했습니다');
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
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await storage.setItem(USER_KEY, JSON.stringify(user));

    return { accessToken, refreshToken, user };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || 'Google 로그인에 실패했습니다';
      throw new Error(message);
    }
    throw error;
  }
}

