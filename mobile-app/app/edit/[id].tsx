import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  Switch,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getUser } from '@/services/auth';
import apiClient from '@/services/api';

export default function EditAnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('notice');
  const [audience, setAudience] = useState('all');
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadAnnouncement();
  }, [id]);

  const loadAnnouncement = async () => {
    try {
      const response = await apiClient.get(`/announcements/${id}`);
      const announcement = response.data.announcement;
      
      setTitle(announcement.title);
      setContent(announcement.content);
      setCategory(announcement.category || 'notice');
      setAudience(announcement.audience);
      setIsScheduled(announcement.isScheduled);
      if (announcement.publishAt) {
        setPublishAt(new Date(announcement.publishAt).toISOString().slice(0, 19));
      }
    } catch (error: any) {
      console.error('Failed to load announcement:', error);
      alert('안내문을 불러올 수 없습니다');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content) {
      return;
    }

    setSaving(true);
    try {
      const user = await getUser();
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      const data = {
        title,
        content,
        category: category || null,
        audience,
        author: user.name || user.email,
        isScheduled,
        publishAt: isScheduled && publishAt ? publishAt : undefined,
      };

      await apiClient.put(`/announcements/${id}`, data);

      router.back();
    } catch (error: any) {
      console.error('Failed to update announcement:', error);
      alert(error.response?.data?.error || '안내문 수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TextInput
          label="제목"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          disabled={saving}
        />

        <Text variant="bodyMedium" style={styles.label}>
          카테고리
        </Text>
        <SegmentedButtons
          value={category}
          onValueChange={setCategory}
          buttons={[
            { value: 'notice', label: '단순 알림' },
            { value: 'survey', label: '설문 조사' },
            { value: 'consent', label: '동의서' },
          ]}
          style={styles.segmented}
        />

        <Text variant="bodyMedium" style={styles.label}>
          대상
        </Text>
        <SegmentedButtons
          value={audience}
          onValueChange={setAudience}
          buttons={[
            { value: 'all', label: '전체' },
            { value: 'parents', label: '학부모' },
          ]}
          style={styles.segmented}
        />

        <TextInput
          label="본문"
          value={content}
          onChangeText={setContent}
          mode="outlined"
          multiline
          numberOfLines={10}
          style={styles.input}
          disabled={saving}
        />

        <View style={styles.row}>
          <Text variant="bodyMedium">예약 발행</Text>
          <Switch value={isScheduled} onValueChange={setIsScheduled} disabled={saving} />
        </View>

        {isScheduled && (
          <TextInput
            label="발행 시각 (YYYY-MM-DDTHH:mm:ss)"
            value={publishAt}
            onChangeText={setPublishAt}
            mode="outlined"
            placeholder="2024-12-31T09:00:00"
            style={styles.input}
            disabled={saving}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !title || !content}
          style={styles.submitButton}
        >
          저장
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  segmented: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

