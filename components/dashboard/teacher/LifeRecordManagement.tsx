"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export type HomeroomStudentForRecord = {
  id: string;
  name: string | null;
  email: string;
  studentProfile?: { studentId?: string | null; grade?: string | null } | null;
};

type InlineAnswerPayload = {
  activityContent?: string;
  questions: Array<{ id: string; text: string }>;
  answers: Array<{ questionId: string; text: string }>;
  materials?: Array<{
    filePath: string;
    originalFileName: string;
    fileSize?: number | null;
    mimeType?: string | null;
  }>;
  hasAnswers?: boolean;
};

type CreativeEventRow = {
  id: string;
  title: string;
  startDate: Date;
  gradeLevels: string[];
  eventType: string;
  activityQuestionCount: number;
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  "자율*자치": "#dc2626",
  "동아리": "#2563eb",
  "진로": "#16a34a",
  "봉사": "#ca8a04",
  "학사행사": "#9333ea",
  "개인 일정": "#0d9488",
};

const FILTER_BADGES: { key: string; label: string }[] = [
  { key: "자율*자치", label: "자" },
  { key: "동아리", label: "동" },
  { key: "봉사", label: "봉" },
  { key: "진로", label: "진" },
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function getAcademicYear(date: Date): number {
  const month = date.getMonth();
  return month >= 2 ? date.getFullYear() : date.getFullYear() - 1;
}

type LifeRecordManagementProps = {
  students: HomeroomStudentForRecord[];
};

function normalizeStudentNumber(v: string | null | undefined): string {
  return String(v ?? "").trim();
}

function compareStudentNumber(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function LifeRecordManagement({ students }: LifeRecordManagementProps) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CreativeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  // 기본 필터: "자" (자율*자치)
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>("자율*자치");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [statusLoadingStudentId, setStatusLoadingStudentId] = useState<string | null>(null);
  const [statusCache, setStatusCache] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedAnswerKey, setExpandedAnswerKey] = useState<string | null>(null);
  const [answerLoadingKey, setAnswerLoadingKey] = useState<string | null>(null);
  const [answerCache, setAnswerCache] = useState<Record<string, InlineAnswerPayload>>({});

  // 생활기록부(학생별 1개, 학년도 기준) - 자동저장(디바운스) + 로컬스토리지 임시저장
  const [lifeRecordContent, setLifeRecordContent] = useState<string>("");
  const [lifeRecordLoading, setLifeRecordLoading] = useState<boolean>(false);
  const [lifeRecordIsSaving, setLifeRecordIsSaving] = useState<boolean>(false);
  const [lifeRecordSavedAt, setLifeRecordSavedAt] = useState<number | null>(null);

  const lifeRecordDebounceTimerRef = useRef<number | null>(null);
  const lifeRecordContentRef = useRef<string>("");
  const lifeRecordLastSavedRef = useRef<string>("");
  const lifeRecordActiveStudentIdRef = useRef<string | null>(null);

  const filteredEvents = eventTypeFilter
    ? events.filter((e) => e.eventType === eventTypeFilter)
    : events;

  const sortedStudents = [...(students || [])].sort((a, b) => {
    const aNo = normalizeStudentNumber(a.studentProfile?.studentId);
    const bNo = normalizeStudentNumber(b.studentProfile?.studentId);
    if (aNo && bNo && aNo !== bNo) return compareStudentNumber(aNo, bNo);
    if (aNo && !bNo) return -1;
    if (!aNo && bNo) return 1;
    const aName = (a.name || a.email || "").trim();
    const bName = (b.name || b.email || "").trim();
    return aName.localeCompare(bName, undefined, { sensitivity: "base" });
  });

  const getEventsForStudent = (student: HomeroomStudentForRecord) => {
    const grade = String(student.studentProfile?.grade || "").trim();
    if (!grade) return filteredEvents;
    return filteredEvents.filter((e) => e.gradeLevels.length === 0 || e.gradeLevels.includes(grade));
  };

  // 테이블 헤더(<thead>)가 학생 목록마다 반복 노출되지 않도록,
  // '실제로 이벤트 테이블을 렌더링하는 첫 학생' 1명만 헤더를 보여줍니다.
  const firstStudentWithEvents = sortedStudents.find((s) => getEventsForStudent(s).length > 0)?.id;

  const academicYear = getAcademicYear(new Date());
  const teacherIdForKeyRef = useRef<string>("unknown");
  const sessionTeacherIdRef = useRef<string | null>(null);

  // session.user.id가 잡히면(비동기) 로컬스토리지 키용 teacherId도 확정
  useEffect(() => {
    const id = (session?.user as any)?.id ?? null;
    sessionTeacherIdRef.current = id;
    if (id && teacherIdForKeyRef.current === "unknown") {
      // active 학생이 이미 열려있는 경우, unknown 키에 저장된 draft를 real 키로 마이그레이션
      const activeStudentId = lifeRecordActiveStudentIdRef.current;
      if (activeStudentId) {
        const oldKey = `lifeRecordDraft:unknown:${activeStudentId}:${academicYear}`;
        const newKey = `lifeRecordDraft:${id}:${activeStudentId}:${academicYear}`;
        try {
          const oldRaw = window.localStorage.getItem(oldKey);
          if (oldRaw && !window.localStorage.getItem(newKey)) {
            window.localStorage.setItem(newKey, oldRaw);
          }
        } catch {
          // ignore
        }
      }
      teacherIdForKeyRef.current = id;
    }
  }, [academicYear, session?.user]);

  const getLifeRecordDraftKey = (studentId: string) =>
    `lifeRecordDraft:${teacherIdForKeyRef.current}:${studentId}:${academicYear}`;

  const loadLifeRecordForStudent = async (studentId: string) => {
    lifeRecordActiveStudentIdRef.current = studentId;
    setLifeRecordLoading(true);
    setLifeRecordIsSaving(false);

    const key = getLifeRecordDraftKey(studentId);

    // 1) 로컬 임시저장 먼저 로드(입력 유실 방지)
    let draftContent = "";
    let draftUpdatedAt = 0;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { content?: string; updatedAt?: number };
        draftContent = parsed.content ?? "";
        draftUpdatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
      }
    } catch {
      // ignore
    }

    setLifeRecordContent(draftContent);
    lifeRecordContentRef.current = draftContent;
    lifeRecordLastSavedRef.current = draftContent;

    // 2) 서버 저장값 로드(권한/최종 진실)
    try {
      const res = await fetch(
        `/api/teacher/life-record?studentId=${encodeURIComponent(studentId)}&academicYear=${academicYear}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "생활기록부를 불러오지 못했습니다.");
      }

      const dbContent = typeof data.content === "string" ? data.content : "";
      const dbUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

      // 로컬 draft가 더 최신이면 draft를 우선, 아니면 DB 우선
      const chosenContent = draftUpdatedAt > dbUpdatedAt ? draftContent : dbContent;
      const chosenUpdatedAt =
        draftUpdatedAt > dbUpdatedAt ? draftUpdatedAt : dbUpdatedAt || Date.now();

      // 학생이 바뀌었으면 stale 응답 무시
      if (lifeRecordActiveStudentIdRef.current !== studentId) return;

      setLifeRecordContent(chosenContent);
      lifeRecordContentRef.current = chosenContent;
      lifeRecordLastSavedRef.current = chosenContent;
      setLifeRecordSavedAt(dbUpdatedAt || null);

      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            content: chosenContent,
            updatedAt: chosenUpdatedAt,
          })
        );
      } catch {
        // ignore
      }
    } catch {
      if (lifeRecordActiveStudentIdRef.current !== studentId) return;
      setLifeRecordSavedAt(null);
    } finally {
      if (lifeRecordActiveStudentIdRef.current === studentId) {
        setLifeRecordLoading(false);
      }
    }
  };

  // 펼침/닫힘 시 타이머 정리
  useEffect(() => {
    if (lifeRecordDebounceTimerRef.current) {
      clearTimeout(lifeRecordDebounceTimerRef.current);
      lifeRecordDebounceTimerRef.current = null;
    }

    if (!expandedStudentId) {
      lifeRecordActiveStudentIdRef.current = null;
      setLifeRecordLoading(false);
      setLifeRecordIsSaving(false);
      return;
    }

    void loadLifeRecordForStudent(expandedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedStudentId, academicYear]);

  const scheduleLifeRecordSave = (studentId: string, nextContent: string) => {
    const key = getLifeRecordDraftKey(studentId);

    // localStorage는 즉시 기록(임시저장)
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          content: nextContent,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }

    // 입력 즉시 화면 value를 갱신해야 컨트롤드 textarea 동작이 정상입니다.
    lifeRecordContentRef.current = nextContent;
    setLifeRecordContent(nextContent);

    if (lifeRecordDebounceTimerRef.current) {
      clearTimeout(lifeRecordDebounceTimerRef.current);
    }

    const contentToSave = nextContent;
    lifeRecordDebounceTimerRef.current = window.setTimeout(async () => {
      // 사용자가 다른 학생으로 이동했으면 무시
      if (lifeRecordActiveStudentIdRef.current !== studentId) return;

      // 인증/세션 준비 전이면 DB PATCH는 스킵 (로컬 draft는 이미 저장됨)
      if (!sessionTeacherIdRef.current) return;

      // 마지막으로 DB에 저장된 값과 같으면 PATCH 스킵(부하 감소)
      if (contentToSave === lifeRecordLastSavedRef.current) return;

      setLifeRecordIsSaving(true);
      try {
        const res = await fetch(`/api/teacher/life-record`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            academicYear,
            content: contentToSave,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "생활기록부 저장에 실패했습니다.");
        }

        const savedContent = typeof data.content === "string" ? data.content : contentToSave;
        const updatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();

        if (lifeRecordActiveStudentIdRef.current !== studentId) return;

        // 사용자가 더 입력한 내용이 최신이면, 이전 PATCH 결과로 덮어쓰지 않습니다.
        if (lifeRecordContentRef.current !== contentToSave) return;

        lifeRecordLastSavedRef.current = savedContent;
        lifeRecordContentRef.current = savedContent;
        setLifeRecordContent(savedContent);
        setLifeRecordSavedAt(updatedAt);

        try {
          window.localStorage.setItem(
            key,
            JSON.stringify({
              content: savedContent,
              updatedAt,
            })
          );
        } catch {
          // ignore
        }
      } catch {
        // 실패해도 draft는 localStorage에 남아있음
      } finally {
        if (lifeRecordActiveStudentIdRef.current === studentId) {
          setLifeRecordIsSaving(false);
        }
      }
    }, 1000);
  };

  const fetchStatusForStudent = async (studentId: string, eventIds: string[]) => {
    if (eventIds.length === 0) {
      setStatusCache((prev) => ({ ...prev, [studentId]: {} }));
      return;
    }
    setStatusLoadingStudentId(studentId);
    try {
      const res = await fetch(`/api/teacher/activity-answers/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, eventIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "제출 상태를 불러오는 데 실패했습니다.");
      }
      setStatusCache((prev) => ({
        ...prev,
        [studentId]: data.statusByEventId || {},
      }));
    } catch {
      setStatusCache((prev) => ({ ...prev, [studentId]: prev[studentId] || {} }));
    } finally {
      setStatusLoadingStudentId((cur) => (cur === studentId ? null : cur));
    }
  };

  const fetchAnswersForStudentEvent = async (studentId: string, eventId: string) => {
    const key = `${studentId}:${eventId}`;
    if (answerCache[key]) return;
    setAnswerLoadingKey(key);
    try {
      const res = await fetch(
        `/api/teacher/calendar-events/${eventId}/activity-answers?studentId=${encodeURIComponent(
          studentId
        )}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "활동 응답을 불러오는 데 실패했습니다.");
      }
      setAnswerCache((prev) => ({ ...prev, [key]: data as InlineAnswerPayload }));
    } catch {
      setAnswerCache((prev) => ({
        ...prev,
        [key]: {
          questions: [],
          answers: [],
          materials: [],
          activityContent: "",
          hasAnswers: false,
        },
      }));
    } finally {
      setAnswerLoadingKey((cur) => (cur === key ? null : cur));
    }
  };

  useEffect(() => {
    const year = getAcademicYear(new Date());
    const start = new Date(year, 2, 1);
    const end = new Date(year + 1, 1, 28, 23, 59, 59);
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (isLeap(year + 1)) end.setDate(29);

    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/calendar-events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&scope=all`
    )
      .then((res) => res.json())
      .then((data: { events?: Array<{ id: string; title: string; start: string; extendedProps?: Record<string, unknown> }> }) => {
        if (cancelled) return;
        const list = data.events || [];
        const creative = list
          .filter((e) => (e.extendedProps?.scheduleArea as string) === "창의적 체험활동")
          .map((e) => ({
            id: e.id,
            title: e.title,
            startDate: new Date(e.start),
            gradeLevels: (e.extendedProps?.gradeLevels as string[]) || [],
            eventType: (e.extendedProps?.eventType as string) || "교과",
            activityQuestionCount: (e.extendedProps?.activityQuestionCount as number) ?? 0,
          }))
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        setEvents(creative);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-label="생활기록부 관리"
    >
      <header className="flex items-center justify-start gap-4">
        <h2 className="text-lg font-semibold text-gray-900">생활기록부 관리</h2>
        <div className="flex flex-wrap justify-center gap-1">
          {FILTER_BADGES.map(({ key, label }) => {
            const color = EVENT_TYPE_COLORS[key] ?? "#6b7280";
            const isActive = eventTypeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEventTypeFilter(isActive ? null : key)}
                className="text-xs font-medium px-1 py-0 rounded-full border-2 transition-all hover:opacity-90"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                  color: isActive ? "#ffffff" : color,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>
      
        <div className="p-3 overflow-auto h-full">
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">일정을 불러오는 중...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">창의적 체험활동 일정이 없습니다.</p>
          ) : sortedStudents.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">학생 정보가 없습니다.</p>
          ) : (
            <div className="divide-y divide-gray-100 bg-white rounded-md border border-gray-100">
              {sortedStudents.map((student) => {
                const studentNo = normalizeStudentNumber(student.studentProfile?.studentId);
                const studentName = (student.name || student.email || "").trim();
                const label = [studentNo, studentName].filter(Boolean).join(" ") || student.email;
                const isOpen = expandedStudentId === student.id;
                const eventsForStudent = getEventsForStudent(student);
                const statusByEventId = statusCache[student.id] || {};
                const isStatusLoading = statusLoadingStudentId === student.id;

                return (
                  <div key={student.id} className="bg-white">
                    <div className="px-3 pb-3">
                        {eventsForStudent.length === 0 ? (
                          <p className="text-sm text-gray-500 py-3 text-center">
                            해당 학생의 대상 창체 활동이 없습니다.
                          </p>
                        ) : (
                          <table className="w-full border-collapse table-fixed text-sm">
                            <colgroup>
                              <col style={{ width: "16%" }} />
                              <col style={{ width: "14%" }} />
                              <col style={{ width: "24%" }} />
                              <col style={{ width: "12%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "36%" }} />
                            </colgroup>
                            {student.id === firstStudentWithEvents && (
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    학생
                                  </th>
                                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    날짜
                                  </th>
                                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    제목
                                  </th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    구분
                                  </th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    제출
                                  </th>
                                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    응답
                                  </th>
                                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    생활기록부 작성
                                  </th>
                                </tr>
                              </thead>
                            )}
                            <tbody className="divide-y divide-gray-100">
                              {!isOpen ? (
                                <tr className="hover:bg-gray-50">
                                  <td
                                    className="px-2 py-3 text-left align-top cursor-pointer select-none group" // group 클래스 추가
                                    onClick={async () => {
                                      setExpandedStudentId(student.id);
                                      setExpandedAnswerKey(null);
                                      if (!statusCache[student.id]) {
                                        await fetchStatusForStudent(
                                          student.id,
                                          eventsForStudent.map((e) => e.id)
                                        );
                                      }
                                    }}
                                  >
                                    {/* 내부를 호버 시 색상이 변하는 둥근 박스로 감싸줍니다 */}
                                    <div className="min-w-0 p-2 rounded-lg transition-all duration-200 group-hover:bg-blue-50 group-active:scale-[0.98] border border-transparent group-hover:border-blue-100">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="font-bold text-gray-900 truncate group-hover:text-blue-700" title={label}>
                                          {label}
                                        </div>
                                        {/* 우측에 작은 화살표 아이콘 추가 (직관성 향상) */}
                                        <svg 
                                          className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" 
                                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>

                                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                        <span className="inline-block w-1 h-1 rounded-full bg-gray-300 group-hover:bg-blue-400"></span>
                                        대상 활동 <span className="font-semibold">{eventsForStudent.length}</span>개
                                      </div>

                                      {isStatusLoading ? (
                                        <div className="text-[10px] text-blue-500 mt-1 animate-pulse font-medium">
                                          제출 현황 불러오는 중...
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                          활동 상세 보기 
                                          <span>→</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td colSpan={6} />
                                </tr>
                              ) : (
                                eventsForStudent.map((event, idx) => {
                                const eventColor =
                                  EVENT_TYPE_COLORS[event.eventType] ?? "#6b7280";
                                const submitted = !!statusByEventId[event.id];
                                const answerKey = `${student.id}:${event.id}`;
                                const isAnswerOpen = expandedAnswerKey === answerKey;
                                const cached = answerCache[answerKey];
                                const isAnswerLoading = answerLoadingKey === answerKey;
                                const answerMap: Record<string, string> = {};
                                (cached?.answers || []).forEach((a) => {
                                  answerMap[a.questionId] = a.text;
                                });
                                return (
                                  <tr key={event.id} className="hover:bg-gray-50">
                                    {idx === 0 && (
                                      <td
                                        className="px-2 py-3 text-left align-top cursor-pointer select-none group hover:bg-gray-50"
                                        rowSpan={eventsForStudent.length}
                                        onClick={() => {
                                          setExpandedStudentId(null);
                                          setExpandedAnswerKey(null);
                                        }}
                                      >
                                        <div className="min-w-0 p-2 rounded-lg transition-all duration-200 group-hover:bg-blue-50 group-active:scale-[0.98] border border-transparent group-hover:border-blue-100">
                                          <div className="flex items-center justify-between mb-1">
                                            <div
                                              className="font-bold text-gray-900 truncate group-hover:text-blue-700"
                                              title={label}
                                            >
                                              {label}
                                            </div>
                                            <svg
                                              className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1 rotate-180"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                              />
                                            </svg>
                                          </div>

                                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                            <span className="inline-block w-1 h-1 rounded-full bg-gray-300 group-hover:bg-blue-400"></span>
                                            대상 활동{" "}
                                            <span className="font-semibold">{eventsForStudent.length}</span>개
                                          </div>

                                          {isStatusLoading ? (
                                            <div className="text-[10px] text-blue-500 mt-1 animate-pulse font-medium">
                                              제출 현황 불러오는 중...
                                            </div>
                                          ) : (
                                            <div className="mt-2 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                              활동 상세 접기
                                              <span>←</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">
                                      {formatDate(event.startDate)}
                                    </td>
                                    <td
                                      className="px-2 py-2 text-gray-900 font-medium min-w-0 truncate"
                                      title={event.title}
                                    >
                                      {event.title}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <span
                                        className="inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap border"
                                        style={{
                                          backgroundColor: eventColor,
                                          borderColor: eventColor,
                                          color: "#ffffff",
                                        }}
                                      >
                                        {event.eventType}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <span
                                        className={[
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                                          submitted
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-gray-50 text-gray-600 border-gray-200",
                                        ].join(" ")}
                                      >
                                        {submitted ? "제출" : "미제출"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 align-top">
                                      <div className="flex items-start justify-between gap-2">
                                        <button
                                          type="button"
                                          className="text-xs font-medium text-blue-600 hover:underline shrink-0"
                                          onClick={async () => {
                                            if (isAnswerOpen) {
                                              setExpandedAnswerKey(null);
                                              return;
                                            }
                                            setExpandedAnswerKey(answerKey);
                                            await fetchAnswersForStudentEvent(student.id, event.id);
                                          }}
                                        >
                                          {isAnswerOpen ? "접기" : "펼치기"}
                                        </button>
                                        {isAnswerLoading && (
                                          <span className="text-xs text-gray-400">
                                            불러오는 중...
                                          </span>
                                        )}
                                      </div>

                                      {isAnswerOpen && (
                                        <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 space-y-2">
                                          <div className="text-xs text-gray-700 whitespace-pre-wrap">
                                            {cached?.activityContent?.trim()
                                              ? cached.activityContent
                                              : "교사가 등록한 활동 내용이 없습니다."}
                                          </div>

                                          {(cached?.materials || []).length > 0 && (
                                            <div className="pt-2 border-t border-gray-100">
                                              <div className="text-xs font-medium text-gray-700 mb-1">
                                                자료
                                              </div>
                                              <ul className="space-y-1 text-xs text-gray-700">
                                                {(cached?.materials || []).map((file, idx) => (
                                                  <li key={`${file.filePath}-${idx}`}>
                                                    <a
                                                      href={file.filePath}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:underline break-all"
                                                    >
                                                      {file.originalFileName || file.filePath}
                                                    </a>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}

                                          <div className="pt-2 border-t border-gray-100">
                                            <div className="text-xs font-medium text-gray-700 mb-1">
                                              응답
                                            </div>
                                            {!cached ? (
                                              <p className="text-xs text-gray-400">
                                                응답을 불러오는 중...
                                              </p>
                                            ) : cached.questions.length === 0 ? (
                                              <p className="text-xs text-gray-500">
                                                교사가 등록한 활동 질문이 없습니다.
                                              </p>
                                            ) : (
                                              <div className="space-y-2">
                                                {cached.questions.map((q, idx) => {
                                                  const answerText = String(
                                                    answerMap[q.id] ?? ""
                                                  ).trim();
                                                  return (
                                                    <div key={q.id} className="space-y-0.5">
                                                      <div className="text-xs text-gray-900">
                                                        {idx + 1}. {q.text}
                                                      </div>
                                                      <div className="text-xs text-gray-700 whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 px-2 py-1">
                                                        {answerText ? answerText : "미제출"}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    {idx === 0 && (
                                      <td
                                        className="px-2 py-2 align-top"
                                        rowSpan={eventsForStudent.length}
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold text-gray-700 mb-1">
                                            생활기록부 작성
                                          </div>

                                          <>
                                            <textarea
                                              className="w-full rounded-md border border-gray-200 bg-white p-2 text-xs resize-none max-h-[320px] overflow-auto disabled:opacity-60 disabled:cursor-not-allowed"
                                              value={lifeRecordContent}
                                              disabled={lifeRecordLoading}
                                              onClick={(e) => e.stopPropagation()}
                                              onMouseDown={(e) => e.stopPropagation()}
                                              onChange={(e) =>
                                                scheduleLifeRecordSave(
                                                  student.id,
                                                  e.target.value
                                                )
                                              }
                                              placeholder="학년도 생활기록부 내용을 입력하세요."
                                              rows={8}
                                            />

                                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                                              <span>
                                                {lifeRecordIsSaving
                                                  ? "자동 저장 중..."
                                                  : lifeRecordLoading
                                                    ? "불러오는 중..."
                                                    : "자동 저장 대기"}
                                              </span>
                                              <span className="whitespace-nowrap">
                                                {lifeRecordSavedAt
                                                  ? `저장 ${formatTime(
                                                      lifeRecordSavedAt
                                                    )}`
                                                  : ""}
                                              </span>
                                            </div>
                                          </>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                                })
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      
    </article>
  );
}
