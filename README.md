# SchoolHub - 로그인 시스템

Next.js 14 (App Router) + TypeScript + NextAuth + Prisma + MongoDB를 사용한 인증 시스템입니다.

## 기술 스택

- **Framework**: Next.js 14.2.0 (App Router 사용: **예**)
- **Language**: TypeScript
- **UI**: Tailwind CSS
- **폼 관리**: react-hook-form + zod
- **인증**: NextAuth.js (Auth.js) + Credentials Provider + Google OAuth
- **데이터베이스**: Prisma + MongoDB
- **보안**: bcryptjs, Rate limiting, CSRF 방어 (NextAuth 기본 제공)

## 기능

- ✅ 로그인 (Email + Password)
- ✅ Google OAuth 로그인
- ✅ 회원가입 (이메일 중복 검사, 비밀번호 정책)
- ✅ 로그아웃
- ✅ 보호된 라우트 (대시보드)
- ✅ 세션 유지 (JWT, 쿠키)
- ✅ 비밀번호 재설정 (이메일 링크 기반, 목업)
- ✅ 이메일 인증 (옵션, 토글 가능)
- ✅ 다국어 지원 (한국어/영어)
- ✅ 접근성 (ARIA, 키보드 네비게이션)
- ✅ 반응형 디자인 (모바일 우선)

## 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
# 데이터베이스 (MongoDB)
DATABASE_URL="mongodb://localhost:27017/schoolhub"
# 또는 MongoDB Atlas 사용 시:
# DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/schoolhub?retryWrites=true&w=majority"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # openssl rand -base64 32 로 생성 가능

# Google OAuth (옵션)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# 이메일 인증 (옵션)
ENABLE_EMAIL_VERIFICATION="false" # true로 설정하면 이메일 인증 활성화

# 개발자 연락 제안 메일 발송 (교사 대시 > 개발자 연락하기)
DEVELOPER_CONTACT_EMAIL="받을 이메일 주소"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="발신용 Gmail 주소"
SMTP_PASS="Gmail 앱 비밀번호" # Google 계정 > 보안 > 2단계 인증 > 앱 비밀번호
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push

# (선택사항) Prisma Studio로 데이터베이스 확인
npm run db:studio
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어주세요.

### 5. 관리자 계정 생성

운영자가 처음 시스템에 접속할 수 있도록 관리자 계정을 하나 만들어주세요. 아래 스크립트는 Prisma를 사용해 `role: "admin"` 사용자를 생성하거나, 이미 존재하는 이메일의 계정을 관리자 권한으로 갱신합니다.

```bash
# 인터랙티브 입력
npx tsx scripts/create-admin-user.ts

# 또는 비대화형 실행
npx tsx scripts/create-admin-user.ts \
  --email admin@example.com \
  --password "Abcd1234!" \
  --name "시스템 관리자" \
  --school "SchoolHub" \
  --force
```

- `--email`, `--password` 는 필수입니다.
- `--name`, `--school` 은 기본값(각각 "관리자", "SchoolHub")으로 채워집니다.
- `--force` 를 추가하면 동일한 이메일이 이미 존재하더라도 비밀번호·역할을 강제로 갱신합니다.

## 프로젝트 구조

```
schoolhub/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts  # NextAuth API
│   │       ├── register/route.ts       # 회원가입 API
│   │       ├── reset-password/         # 비밀번호 재설정 API
│   │       └── verify-email/route.ts   # 이메일 인증 API
│   ├── dashboard/page.tsx              # 보호된 라우트
│   ├── login/page.tsx                  # 로그인 페이지
│   ├── register/page.tsx               # 회원가입 페이지
│   ├── reset-password/page.tsx         # 비밀번호 재설정 페이지
│   ├── verify-email/page.tsx           # 이메일 인증 페이지
│   ├── layout.tsx                      # 루트 레이아웃
│   └── globals.css                     # 전역 스타일
├── components/
│   ├── ui/                             # UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Toast.tsx
│   └── providers/                      # 컨텍스트 프로바이더
│       ├── Providers.tsx
│       └── ToastProvider.tsx
├── lib/
│   ├── auth.ts                         # NextAuth 설정
│   ├── prisma.ts                       # Prisma 클라이언트
│   ├── utils.ts                        # 유틸리티 함수
│   ├── validations/auth.ts             # Zod 스키마
│   └── i18n.ts                         # 다국어 설정
├── prisma/
│   └── schema.prisma                   # 데이터베이스 스키마
├── types/
│   └── next-auth.d.ts                  # NextAuth 타입 확장
└── middleware.ts                       # 미들웨어 (라우트 보호)
```

## 보안 기능

### 1. 비밀번호 해시
- bcryptjs 사용 (salt rounds: 12)
- 평문 비밀번호는 절대 저장하지 않음

### 2. CSRF 방어
- NextAuth.js가 기본적으로 CSRF 토큰을 처리
- SameSite 쿠키 설정으로 추가 보호

### 3. Rate Limiting
- 회원가입: 15분당 5회
- 비밀번호 재설정: 15분당 3회
- 메모리 기반 (프로덕션에서는 Redis 사용 권장)

### 4. 에러 메시지 일반화
- 계정 존재 여부를 구분하지 않는 일반적인 에러 메시지
- 브루트포스 공격 방어

### 5. 세션/쿠키 설정
- `httpOnly: true` - XSS 방어
- `secure: true` (프로덕션) - HTTPS만 허용
- `sameSite: "lax"` - CSRF 방어
- `maxAge: 30일` - 세션 만료 시간

### 6. 입력 유효성 검사
- Zod 스키마 기반 검증
- 이메일 형식 검증
- 비밀번호 정책: 최소 8자, 대문자/소문자/숫자 포함

## 비밀번호 정책

- 최소 8자 이상
- 대문자, 소문자, 숫자 포함

## 이메일 인증 (옵션)

`.env.local`에서 `ENABLE_EMAIL_VERIFICATION="true"`로 설정하면 이메일 인증이 활성화됩니다.

개발 환경에서는 콘솔에 인증 링크가 출력됩니다:
```
=== 이메일 인증 링크 (개발 모드) ===
이메일: user@example.com
인증 링크: http://localhost:3000/verify-email?token=...
================================
```

프로덕션에서는 실제 이메일 서비스 (예: SendGrid, AWS SES)를 연동해야 합니다.

## 비밀번호 재설정

비밀번호 재설정 링크는 개발 환경에서 콘솔에 출력됩니다:
```
=== 비밀번호 재설정 링크 (개발 모드) ===
이메일: user@example.com
재설정 링크: http://localhost:3000/reset-password?token=...
================================
```

프로덕션에서는 실제 이메일 서비스를 연동해야 합니다.

## Google OAuth 로그인 설정

### 1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **API 및 서비스** > **사용자 인증 정보**로 이동
4. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
5. 애플리케이션 유형: **웹 애플리케이션** 선택
6. 승인된 리디렉션 URI 추가:
   - 개발 환경: `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `https://yourdomain.com/api/auth/callback/google`
7. 클라이언트 ID와 클라이언트 보안 비밀번호 복사

### 2. 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. 동작 방식

- **기존 사용자**: 같은 이메일로 가입한 사용자가 Google로 로그인하면 기존 계정에 Google 계정이 연결됩니다.
- **신규 사용자**: Google로 처음 로그인하면 자동으로 계정이 생성됩니다 (이메일 인증 자동 완료).
- **역할 설정**: Google로 가입한 사용자는 기본적으로 `role`이 설정되지 않습니다. 필요시 관리자가 수동으로 설정하거나 추가 정보 입력 페이지를 구현할 수 있습니다.

## 다국어 지원

현재 지원 언어:
- 한국어 (ko) - 기본
- 영어 (en)

`lib/i18n.ts`에서 번역을 추가하거나 수정할 수 있습니다.

## 접근성

- ARIA 레이블 및 속성 사용
- 키보드 네비게이션 지원
- 포커스 링 스타일
- 스크린 리더 지원

## 배포

### Vercel 배포

1. GitHub에 프로젝트 푸시
2. Vercel에서 프로젝트 임포트
3. 환경 변수 설정
4. 데이터베이스 연결 (MongoDB Atlas 권장 또는 외부 MongoDB)

### 환경 변수 (프로덕션)

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/schoolhub?retryWrites=true&w=majority"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
ENABLE_EMAIL_VERIFICATION="true"
```

## 라이센스

MIT

