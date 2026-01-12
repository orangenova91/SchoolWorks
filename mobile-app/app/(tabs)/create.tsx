import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { getUser } from '@/services/auth';
import apiClient from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';

export default function CreateAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('notice');
  const [audience, setAudience] = useState('all');
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!title || !content) {
      return;
    }

    setLoading(true);
    try {
      const user = await getUser();
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      const formData = new FormData();
      
      // 파일 첨부
      files.forEach((file) => {
        const fileUri = file.uri;
        const fileName = file.name || 'file';
        const fileType = file.mimeType || 'application/octet-stream';
        
        formData.append('files', {
          uri: fileUri,
          name: fileName,
          type: fileType,
        } as any);
      });

      // 데이터
      const data = {
        title,
        content,
        category: category || null,
        audience,
        author: user.name || user.email,
        isScheduled,
        publishAt: isScheduled && publishAt ? publishAt : undefined,
      };

      formData.append('data', JSON.stringify(data));

      await apiClient.post('/announcements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      router.back();
    } catch (error: any) {
      console.error('Failed to create announcement:', error);
      alert(error.response?.data?.error || '안내문 작성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets) {
        setFiles([...files, ...result.assets]);
      }
    } catch (error) {
      console.error('Failed to pick files:', error);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

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
          disabled={loading}
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
          disabled={loading}
        />

        <View style={styles.row}>
          <Text variant="bodyMedium">예약 발행</Text>
          <Switch value={isScheduled} onValueChange={setIsScheduled} disabled={loading} />
        </View>

        {isScheduled && (
          <TextInput
            label="발행 시각 (YYYY-MM-DDTHH:mm:ss)"
            value={publishAt}
            onChangeText={setPublishAt}
            mode="outlined"
            placeholder="2024-12-31T09:00:00"
            style={styles.input}
            disabled={loading}
          />
        )}

        <Button
          mode="outlined"
          onPress={pickFiles}
          icon="file"
          style={styles.button}
          disabled={loading}
        >
          파일 첨부 ({files.length})
        </Button>

        {files.length > 0 && (
          <Card style={styles.fileCard}>
            <Card.Content>
              {files.map((file, index) => (
                <View key={index} style={styles.fileRow}>
                  <Text variant="bodySmall" numberOfLines={1} style={styles.fileName}>
                    {file.name}
                  </Text>
                  <Button
                    mode="text"
                    compact
                    onPress={() => removeFile(index)}
                    icon="close"
                  >
                    제거
                  </Button>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading || !title || !content}
          style={styles.submitButton}
        >
          작성 완료
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
  button: {
    marginBottom: 16,
  },
  fileCard: {
    marginBottom: 16,
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

