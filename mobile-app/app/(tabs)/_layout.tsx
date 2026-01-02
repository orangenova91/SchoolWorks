import { useState } from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { IconButton } from 'react-native-paper';
import DrawerMenu from '@/components/DrawerMenu';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerLeft: () => (
            <IconButton
              icon="menu"
              iconColor={isDark ? '#fff' : '#000'}
              size={24}
              onPress={() => setDrawerVisible(true)}
            />
          ),
          tabBarActiveTintColor: isDark ? '#fff' : '#6200ee',
          tabBarInactiveTintColor: isDark ? '#aaa' : '#666',
          tabBarStyle: {
            backgroundColor: isDark ? '#1e1e1e' : '#fff',
          },
        }}
      >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: '대시보드',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" size={size} color={color} />
          ),
          headerTitle: '대시보드',
        }}
      />
      <Tabs.Screen
        name="staff-board"
        options={{
          title: '교직원 게시판',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-text-outline" size={size} color={color} />
          ),
          headerTitle: '교직원 게시판',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '가정 안내문',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="email-outline" size={size} color={color} />
          ),
          headerTitle: '가정 안내문',
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null, // 하단 탭 바에서 숨김 - FAB 버튼으로 접근
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          ),
          headerTitle: '프로필',
        }}
      />
    </Tabs>
    <DrawerMenu
      visible={drawerVisible}
      onDismiss={() => setDrawerVisible(false)}
    />
    </>
  );
}

