import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated } from 'react-native';
import { Drawer, Divider, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUser, User } from '@/services/auth';

interface DrawerMenuProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function DrawerMenu({ visible, onDismiss }: DrawerMenuProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-280)).current; // 드로어 너비만큼 왼쪽에 위치
  const [user, setUser] = useState<User | null>(null);

  // 사용자 정보 로드
  useEffect(() => {
    if (visible) {
      loadUser();
    }
  }, [visible]);

  const loadUser = async () => {
    try {
      const userData = await getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      // 드로어 열기: 왼쪽에서 오른쪽으로 슬라이드
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 드로어 닫기: 오른쪽에서 왼쪽으로 슬라이드
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleNavigation = (path: string) => {
    router.push(path as any);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.drawer,
            { 
              backgroundColor: theme.colors.surface,
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          <Pressable 
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Text variant="titleLarge" style={styles.headerTitle}>
              메뉴
            </Text>
          </View>
          <Divider />
          
          {/* 사용자 정보 섹션 */}
          <View style={styles.userSection}>
            {user ? (
              <>
                {user.school && (
                  <Text variant="bodySmall" style={styles.userSchool}>
                    {user.school}
                  </Text>
                )}
                <Text variant="titleMedium" style={styles.userName}>
                  {user.role === 'teacher' 
                    ? '교사' 
                    : user.role === 'admin' 
                    ? '관리자' 
                    : user.role || ''}
                  {user.role && ' '}
                  {user.name || '사용자'}
                </Text>
                <Text variant="bodySmall" style={styles.userEmail}>
                  {user.email}
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium" style={styles.userEmail}>
                로딩 중...
              </Text>
            )}
          </View>
          
          <Divider />
          
          <Drawer.Section>
            <Drawer.Item
              label="대시보드"
              icon="view-dashboard"
              onPress={() => handleNavigation('/(tabs)/dashboard')}
            />
            <Drawer.Item
              label="교직원 게시판"
              icon="account-group"
              onPress={() => handleNavigation('/(tabs)/staff-board')}
            />
            <Drawer.Item
              label="가정 안내문"
              icon="email-outline"
              onPress={() => handleNavigation('/(tabs)')}
            />
            <Drawer.Item
              label="프로필"
              icon="account-outline"
              onPress={() => handleNavigation('/(tabs)/profile')}
            />
          </Drawer.Section>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawer: {
    width: 280,
    height: '100%',
    elevation: 16,
  },
  header: {
    padding: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  userSection: {
    padding: 16,
  },
  userSchool: {
    opacity: 0.8,
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.7,
  },
});

