# 가정 안내문 모바일 앱

SchoolHub의 가정 안내문 기능을 관리하는 모바일 앱입니다.

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`app.json` 파일의 `extra.apiBaseUrl`을 백엔드 API URL로 수정하세요:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-domain.com/api"
    }
  }
}
```

### 3. 앱 실행

```bash
# 개발 서버 시작
npm start

# iOS 시뮬레이터에서 실행 (macOS 필요)
npm run ios

# Android 에뮬레이터에서 실행
npm run android
```

## 기능

- 로그인/로그아웃
- 안내문 목록 조회
- 안내문 작성
- 안내문 수정
- 안내문 삭제
- 파일 첨부
- 예약 발행
- 카테고리 선택 (단순 알림, 설문 조사, 동의서)

## 기술 스택

- Expo
- React Native
- Expo Router
- React Native Paper
- Axios
- Expo Secure Store

