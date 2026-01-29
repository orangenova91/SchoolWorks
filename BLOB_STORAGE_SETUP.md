# Vercel Blob Storage 설정 가이드

## 로컬 개발 환경 설정

로컬에서 Vercel Blob Storage를 사용하려면 `BLOB_READ_WRITE_TOKEN` 환경 변수가 필요합니다.

### 토큰 얻는 방법

#### 방법 1: Vercel 대시보드에서 복사 (권장)

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택 (login-csr)
3. **Storage** 탭 클릭
4. **login-csr-blob** 클릭
5. **Settings** 탭으로 이동
6. **Environment Variables** 섹션에서 `BLOB_READ_WRITE_TOKEN` 값 확인
7. 토큰 복사 (예: `vercel_blob_rw_xxxxx...`)

#### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치 (처음 한 번만)
npm i -g vercel

# 프로젝트 디렉토리에서 로그인
vercel login

# 환경 변수 가져오기
vercel env pull .env.local
```

이 명령어는 Vercel 프로젝트의 모든 환경 변수를 `.env.local` 파일로 가져옵니다.

### .env.local 파일에 추가

`.env.local` 파일에 다음 줄을 추가하세요:

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_여기에_토큰_붙여넣기"
```

### 주의사항

- `.env.local` 파일은 Git에 커밋되지 않습니다 (`.gitignore`에 포함됨)
- 토큰을 절대 공개 저장소에 공유하지 마세요
- 프로덕션 환경(Vercel)에서는 자동으로 토큰이 설정되므로 별도 설정이 필요 없습니다

## 프로덕션 환경

Vercel에 배포된 프로젝트에서는 자동으로 Blob Storage 토큰이 설정되므로 추가 작업이 필요 없습니다.



