import { NextResponse } from "next/server";
import type { Session } from "next-auth";

type SessionUser = NonNullable<Session["user"]>;

/**
 * 공지·학교 스코프 API에서 사용: 세션에 학교가 없으면 타 학교 데이터 노출을 막기 위해 거부합니다.
 */
export function rejectUnauthenticated(): NextResponse {
  return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
}

export function rejectMissingSchool(): NextResponse {
  return NextResponse.json(
    { error: "학교 정보가 필요합니다. 관리자에게 문의하세요." },
    { status: 403 }
  );
}

export function rejectForbidden(): NextResponse {
  return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
}

/** 세션 없음 → 401 */
export function requireSession(session: Session | null): session is Session & { user: SessionUser } {
  return Boolean(session?.user);
}

/**
 * 학교 단위 공지 접근: 로그인 사용자에게 school이 있어야 하고,
 * 공지 레코드의 school이 세션과 일치해야 합니다. (school이 null인 레거시 행은 접근 거부)
 */
export function assertSameSchoolForAnnouncement(
  session: Session & { user: SessionUser },
  announcementSchool: string | null | undefined
): NextResponse | null {
  if (!session.user.school) {
    return rejectMissingSchool();
  }
  if (!announcementSchool || announcementSchool !== session.user.school) {
    return rejectForbidden();
  }
  return null;
}
