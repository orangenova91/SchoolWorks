# 가정 안내문 모바일 앱 구현 완료

## 구현 완료 내역

### 백엔드 (Next.js)

1. **JWT 기반 모바일 인증 API** (`app/api/auth/mobile/route.ts`)
   - POST: 로그인 및 토큰 발급 (액세스 토큰 15분, 리프레시 토큰 7일)
   - PUT: 리프레시 토큰으로 액세스 토큰 갱신
   - GET: 토큰 유효성 검증
   - DELETE: 로그아웃 (토큰 무효화)

2. **JWT 인증 유틸리티** (`lib/jwt-auth.ts`)
   - NextAuth 세션과 JWT 토큰 모두 지원하는 통합 인증 함수
   - 기존 웹 앱과 모바일 앱 동시 작동 가능

3. **안내문 API JWT 지원** 
   - `app/api/announcements/route.ts`: GET, POST 엔드포인트에 JWT 인증 추가
   - `app/api/announcements/[id]/route.ts`: GET, PUT, DELETE 엔드포인트에 JWT 인증 추가

### 모바일 앱 (Expo)

1. **프로젝트 설정**
   - Expo Router 기반 파일 시스템 라우팅
   - React Native Paper UI 라이브러리
   - TypeScript 설정 완료

2. **인증 시스템**
   - `services/auth.ts`: 로그인, 토큰 관리, 자동 갱신
   - `services/api.ts`: Axios 인터셉터를 통한 토큰 자동 첨부 및 401 에러 처리

3. **화면 구현**
   - 로그인 화면 (`app/(auth)/login.tsx`)
   - 안내문 목록 화면 (`app/(tabs)/index.tsx`)
   - 안내문 작성 화면 (`app/(tabs)/create.tsx`)
   - 안내문 상세보기/수정/삭제 (`app/(tabs)/announcement/[id].tsx`, `app/(tabs)/edit/[id].tsx`)
   - 프로필 화면 (`app/(tabs)/profile.tsx`)

4. **기능**
   - 안내문 목록 조회 (Pull-to-refresh)
   - 안내문 작성 (제목, 본문, 카테고리, 대상 선택)
   - 파일 첨부 (expo-document-picker)
   - 예약 발행
   - 안내문 수정/삭제
   - 로그아웃

## 설정 필요 사항

### 백엔드 환경 변수 (`.env.local`)

```env
JWT_SECRET="your-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-here"
```

### 모바일 앱 설정 (`mobile-app/app.json`)

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-domain.com/api"
    }
  }
}
```

## 실행 방법

### 백엔드

```bash
npm install
npm run dev
```

### 모바일 앱

```bash
cd mobile-app
npm install
npm start
```

## 주요 파일 구조

```
test3_login/
├── app/
│   └── api/
│       ├── auth/
│       │   └── mobile/
│       │       └── route.ts        # JWT 인증 API
│       └── announcements/
│           ├── route.ts            # 안내문 목록/작성 (JWT 지원)
│           └── [id]/
│               └── route.ts        # 안내문 상세/수정/삭제 (JWT 지원)
├── lib/
│   └── jwt-auth.ts                 # JWT 인증 유틸리티
└── mobile-app/
    ├── app/
    │   ├── (auth)/
    │   │   └── login.tsx           # 로그인 화면
    │   ├── (tabs)/
    │   │   ├── index.tsx           # 목록
    │   │   ├── create.tsx          # 작성
    │   │   ├── profile.tsx         # 프로필
    │   │   ├── announcement/[id].tsx  # 상세보기
    │   │   └── edit/[id].tsx       # 수정
    │   └── _layout.tsx             # 루트 레이아웃
    └── services/
        ├── auth.ts                 # 인증 서비스
        └── api.ts                  # API 클라이언트
```

## 다음 단계 (선택사항)

1. 설문 조사 및 동의서 서명 기능을 더 자세히 구현
2. 푸시 알림 추가
3. 오프라인 모드 지원
4. 이미지 미리보기 기능 추가
5. 프로덕션 빌드 생성 (`eas build`)

## 참고사항

- 리프레시 토큰은 현재 메모리에 저장되어 있습니다. 프로덕션에서는 Redis 등 영구 저장소 사용을 권장합니다.
- 모바일 앱은 Expo Go에서 테스트할 수 있으나, 프로덕션 빌드는 `eas build`를 사용해야 합니다.

