import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Dialog,
  Portal,
  Paragraph,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiClient from '@/services/api';
import { getUser } from '@/services/auth';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  audience: string;
  isScheduled: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: string | null;
  attachments: any[] | null;
}

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadAnnouncement();
    loadUser();
  }, [id]);

  const loadAnnouncement = async () => {
    try {
      const response = await apiClient.get(`/announcements/${id}`);
      setAnnouncement(response.data.announcement);
    } catch (error: any) {
      console.error('Failed to load announcement:', error);
      alert('안내문을 불러올 수 없습니다');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    const user = await getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const handleEdit = () => {
    router.push(`/edit/${id}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/announcements/${id}`);
      router.back();
    } catch (error: any) {
      console.error('Failed to delete announcement:', error);
      alert(error.response?.data?.error || '안내문 삭제에 실패했습니다');
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={styles.center}>
        <Text>안내문을 찾을 수 없습니다</Text>
      </View>
    );
  }

  const canEdit = currentUserId === announcement.authorId;
  const attachments = announcement.attachments
    ? typeof announcement.attachments === 'string'
      ? JSON.parse(announcement.attachments)
      : announcement.attachments
    : [];

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {announcement.title}
          </Text>

          <View style={styles.meta}>
            <Text variant="bodySmall" style={styles.metaText}>
              작성자: {announcement.author}
            </Text>
            <Text variant="bodySmall" style={styles.metaText}>
              발행일: {formatDate(announcement.publishedAt || announcement.createdAt)}
            </Text>
            {announcement.isScheduled && (
              <Text variant="bodySmall" style={styles.scheduled}>
                예약 발행: {announcement.publishAt ? formatDate(announcement.publishAt) : '-'}
              </Text>
            )}
            {announcement.category && (
              <Text variant="bodySmall" style={styles.category}>
                카테고리:{' '}
                {announcement.category === 'notice' && '단순 알림'}
                {announcement.category === 'survey' && '설문 조사'}
                {announcement.category === 'consent' && '동의서'}
              </Text>
            )}
          </View>

          <View style={styles.content}>
            <Text variant="bodyMedium">{announcement.content}</Text>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachments}>
              <Text variant="titleSmall" style={styles.attachmentsTitle}>
                첨부 파일
              </Text>
              {attachments.map((file: any, index: number) => (
                <Button
                  key={index}
                  mode="outlined"
                  icon="file"
                  onPress={() => {
                    // 파일 다운로드 또는 미리보기 (필요 시 구현)
                    alert(`파일: ${file.originalFileName}`);
                  }}
                  style={styles.attachmentButton}
                >
                  {file.originalFileName}
                </Button>
              ))}
            </View>
          )}

          {canEdit && (
            <View style={styles.actions}>
              <Button mode="contained" onPress={handleEdit} style={styles.actionButton}>
                수정
              </Button>
              <Button
                mode="outlined"
                onPress={() => setDeleteDialogVisible(true)}
                buttonColor="#d32f2f"
                style={styles.actionButton}
              >
                삭제
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>안내문 삭제</Dialog.Title>
          <Dialog.Content>
            <Paragraph>정말로 이 안내문을 삭제하시겠습니까?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>취소</Button>
            <Button onPress={handleDelete} loading={deleting} textColor="#d32f2f">
              삭제
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  card: {
    margin: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  meta: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  metaText: {
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
  content: {
    marginBottom: 16,
  },
  attachments: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachmentsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  attachmentButton: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

