"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Sparkles, ChevronLeft, ChevronRight, Download } from "lucide-react";
import CalendarView, { CalendarEvent, CalendarViewHandle } from "./CalendarView";
import { Button } from "@/components/ui/Button";
import BulkUploadButton from "@/components/dashboard/BulkUploadButton";
import ActivityInputModal from "./ActivityInputModal";

type TeacherScheduleClientProps = {
  initialEvents: CalendarEvent[];
  title: string;
  description: string;
  allowedScheduleAreas?: string[];
  editableScopes?: string[];
  showAddButton?: boolean;
  initialActiveTab?: "academic" | "creative";
};

type CalendarEventWithDate = CalendarEvent & { startDate: Date };

export default function TeacherScheduleClient({
  initialEvents,
  title,
  description,
  allowedScheduleAreas,
  editableScopes,
  showAddButton = true,
  initialActiveTab = "academic",
}: TeacherScheduleClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const calendarRef = useRef<CalendarViewHandle>(null);
  const router = useRouter();
  const today = new Date();
  // 현재 캘린더 뷰에 표시되는 날짜 (기본값: 오늘)
  const [viewDate, setViewDate] = useState<Date>(today);
  const [viewType, setViewType] = useState<string>("dayGridMonth");

  const handleAddEvent = useCallback(() => {
    if (calendarRef.current) {
      const now = new Date();
      const event: CalendarEvent = {
        id: "",
        title: "",
        start: now.toISOString(),
        end: null,
        allDay: false,
        extendedProps: {
          eventType: null,
          scope: "personal",
        },
      };
      calendarRef.current.openEventModal(event);
    }
  }, []);

  // initialEvents가 변경될 때 events 상태 업데이트
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // 탭이 다시 활성화될 때 이벤트 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // 탭이 다시 활성화되면 서버 컴포넌트를 다시 실행하여 최신 데이터 가져오기
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const handleEventsChange = useCallback((updatedEvents: CalendarEvent[]) => {
    setEvents(updatedEvents);
  }, []);

  // 캘린더 뷰 변경 시 호출되는 콜백
  const handleViewChange = useCallback((date: Date, nextViewType: string) => {
    setViewDate(date);
    setViewType(nextViewType);
  }, []);

  // 현재 캘린더 뷰에 표시되는 기간의 이벤트 필터링
  const currentMonthEvents = useMemo<CalendarEventWithDate[]>(() => {
    const viewMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const nextMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

    const semesterStart =
      viewType === "semester1"
        ? new Date(viewDate.getFullYear(), 2, 1) // Mar 1
        : viewType === "semester2"
          ? new Date(viewDate.getFullYear(), 7, 1) // Aug 1
          : viewMonthStart;

    const semesterEnd =
      viewType === "semester1"
        ? new Date(viewDate.getFullYear(), 7, 1) // Aug 1
        : viewType === "semester2"
          ? new Date(viewDate.getFullYear() + 1, 2, 1) // Mar 1 next year
          : nextMonthStart;

    return events
      .map<CalendarEventWithDate>((event) => ({
        ...event,
        startDate: new Date(event.start),
      }))
      .filter(
        (event) => event.startDate >= semesterStart && event.startDate < semesterEnd
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, viewDate, viewType]);

  const formatDate = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      }).format(date),
    []
  );

  // 학년별 통계 계산 (자율*자치, 동아리, 봉사, 진로)
  const statsByGrade = useMemo(() => {
    const types = ["자율*자치", "동아리", "봉사", "진로"];
    // 기본으로 1,2,3학년을 항상 포함시키도록 초기화
    const defaultGrades = ["1", "2", "3"];
    const map: Record<string, Record<string, number>> = {};

    defaultGrades.forEach((g) => {
      map[g] = Object.fromEntries(types.map((t) => [t, 0]));
    });

    currentMonthEvents.forEach((ev) => {
      const eventType = ev.extendedProps.eventType || null;
      if (!eventType || !types.includes(eventType)) return;

      const gradeLevels: unknown = ev.extendedProps.gradeLevels;
      const grades: Array<string> = Array.isArray(gradeLevels)
        ? (gradeLevels as any[]).map((g) => String(g))
        : [];

      // 이벤트에 학년 정보가 없으면 무시
      if (grades.length === 0) {
        return;
      }

      grades.forEach((grade) => {
        if (!map[grade]) {
          map[grade] = Object.fromEntries(types.map((t) => [t, 0]));
        }
        map[grade][eventType] = (map[grade][eventType] ?? 0) + 1;
      });
    });

    // 학년 키를 숫자 순으로 정렬해서 반환
    return Object.fromEntries(
      Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))
    ) as Record<string, Record<string, number>>;
  }, [currentMonthEvents]);

  const [showStats, setShowStats] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"academic" | "creative">(initialActiveTab);
  const [activityModalEvent, setActivityModalEvent] = useState<{
    id: string;
    title: string;
    activityContent: string;
  } | null>(null);

  const handleActivitySaved = useCallback((eventId: string, activityContent: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, extendedProps: { ...e.extendedProps, activityContent } }
          : e
      )
    );
    setCreativeTabEvents((prev) =>
      prev
        ? prev.map((e) =>
            e.id === eventId
              ? { ...e, extendedProps: { ...e.extendedProps, activityContent } }
              : e
          )
        : prev
    );
  }, []);

  // 학년도 계산 함수 (3월 1일부터 다음해 2월 말까지)
  const getAcademicYear = useCallback((date: Date): number => {
    const month = date.getMonth(); // 0-11 (0=1월, 2=3월)
    return month >= 2 ? date.getFullYear() : date.getFullYear() - 1;
  }, []);

  // 현재 학년도로 초기화
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(getAcademicYear(new Date()));
  // 학년 필터 (null = 전체)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  // 일정 유형 필터 (null = 전체)
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

  // 창의적 체험활동 탭 전용 이벤트 데이터 (selectedAcademicYear 기준 API 호출)
  const [creativeTabEvents, setCreativeTabEvents] = useState<CalendarEvent[] | null>(null);
  const [isCreativeEventsLoading, setIsCreativeEventsLoading] = useState(false);

  // selectedAcademicYear 변경 시 창의적 체험활동 기간의 이벤트 API로 직접 조회
  const [creativeRefreshKey, setCreativeRefreshKey] = useState(0);
  const refreshCreativeTabEvents = useCallback(() => {
    setCreativeRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const academicYearStart = new Date(selectedAcademicYear, 2, 1); // 3월 1일
    const academicYearEnd = new Date(selectedAcademicYear + 1, 1, 28, 23, 59, 59); // 다음해 2월 28일
    const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear(selectedAcademicYear + 1)) {
      academicYearEnd.setDate(29);
    }

    let cancelled = false;
    setIsCreativeEventsLoading(true);
    setCreativeTabEvents(null);

    fetch(
      `/api/calendar-events?start=${encodeURIComponent(academicYearStart.toISOString())}&end=${encodeURIComponent(academicYearEnd.toISOString())}&scope=all`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setCreativeTabEvents(data.events || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCreativeTabEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCreativeEventsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYear, creativeRefreshKey]);

  // 창의적 체험활동 이벤트 필터링 (creativeTabEvents 기준, 학년/일정 유형 필터 포함)
  const creativeEvents = useMemo<CalendarEventWithDate[]>(() => {
    const sourceEvents = creativeTabEvents ?? [];
    return sourceEvents
      .map<CalendarEventWithDate>((event) => ({
        ...event,
        startDate: new Date(event.start),
      }))
      .filter(
        (event) => {
          // 일정 구분 필터링 (API 응답은 이미 학년도 범위 내 전체이므로 scheduleArea만 필터)
          const isCreativeActivity =
            event.extendedProps.scheduleArea === "창의적 체험활동";

          // 학년 필터링 (선택된 경우)
          const gradeLevels = event.extendedProps.gradeLevels || [];
          const matchesGrade =
            selectedGrade === null || gradeLevels.includes(selectedGrade);

          // 일정 유형 필터링 (선택된 경우)
          const eventType = event.extendedProps.eventType;
          const matchesEventType =
            selectedEventType === null || eventType === selectedEventType;

          return isCreativeActivity && matchesGrade && matchesEventType;
        }
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [creativeTabEvents, selectedGrade, selectedEventType]);

  const handleDownloadCreativeCSV = useCallback(() => {
    const headers = ["날짜", "교시", "제목", "부서", "담당자", "학년", "구분", "활동"];
    const escape = (val: string) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = creativeEvents.map((e) => {
      const dateStr = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).format(e.startDate);
      const periods = e.extendedProps.periods?.length
        ? e.extendedProps.periods.join(", ")
        : "-";
      const grades = e.extendedProps.gradeLevels?.length
        ? e.extendedProps.gradeLevels.join(", ")
        : "-";
      const eventType = e.extendedProps.eventType || "-";
      const activity = (e.extendedProps as { activityContent?: string }).activityContent ?? "";
      return [
        escape(dateStr),
        escape(periods),
        escape(e.title),
        escape(e.extendedProps.department ?? ""),
        escape(e.extendedProps.responsiblePerson ?? ""),
        escape(grades),
        escape(eventType),
        escape(activity),
      ].join(",");
    });
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `창의적체험활동_${selectedAcademicYear}학년도_일정.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [creativeEvents, selectedAcademicYear]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
            <div className="mt-4">
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setActiveTab("academic")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "academic"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  학사 일정
                </button>
                <button
                  onClick={() => setActiveTab("creative")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "creative"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  창의적 체험활동
                </button>
              </div>
            </div>
          </div>
          {showAddButton && (
            <div className="flex flex-col items-start gap-2">
              <div className="flex w-full justify-end">
                <Button onClick={handleAddEvent}>
                  일정 추가
                </Button>
              </div>
            
              <div>
                <BulkUploadButton />
              </div>
          </div>
          )}
        </div>
      </header>

      {/* CalendarView는 항상 렌더링하되, 창의적 체험활동 탭에서는 숨김 (ref를 사용하기 위해) */}
      <div className={activeTab === "academic" ? "" : "hidden"}>
        <div className="flex flex-col gap-6 lg:flex-row items-stretch">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:w-1/2">
          <CalendarView
            ref={calendarRef}
            initialEvents={initialEvents}
            onEventsChange={handleEventsChange}
            onEventSaved={refreshCreativeTabEvents}
            onEventDeleted={refreshCreativeTabEvents}
            hideAddButton={true}
            onViewChange={handleViewChange}
            allowedScheduleAreas={allowedScheduleAreas}
            editableScopes={editableScopes}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:flex-1 flex flex-col">
        <div className="flex items-baseline gap-2"> {/* items-center 대신 items-baseline 사용 */}
          <h3 className="text-lg font-semibold text-gray-900"> {/* mb-4 제거 */}
            {viewType === "semester1"
              ? "1학기"
              : viewType === "semester2"
                ? "2학기"
                : `${viewDate.getMonth() + 1}월`}{" "}
            일정
          </h3>
          <button
            type="button"
            aria-pressed={showStats}
            onClick={() => setShowStats((s) => !s)}
            className="text-sm text-blue-600 hover:text-blue-700 transition" 
          > {/* mt-1 제거 */}
            통계 보기 {showStats ? "▼" : "▲"}
          </button>
        </div>

          {showStats && (
            <div className="mb-4 p-3 rounded-md border border-dashed border-gray-300 bg-gray-100 /50 min-h-[48px]">
              {Object.keys(statsByGrade).length === 0 ? (
                <div className="text-sm text-gray-500">통계 데이터가 없습니다.</div>
              ) : (
                <div className="flex flex-wrap justify-center gap-3">
                  {Object.entries(statsByGrade).map(([grade, counts]) => (
                    <div key={grade} className="flex flex-col bg-white border rounded-md p-2 shadow-sm w-[170px]">
                    <div className="text-sm font-medium text-gray-700 mb-2">{grade}학년</div>
                    {/* 타입별 세로 프로그레스바 (참고: admin users page 스타일) */}
                    <div className="flex items-end gap-3 h-32">
                      {(() => {
                        const typeOrder = ["자율*자치", "동아리", "봉사", "진로"];
                        const colors: Record<string, string> = {
                          "자율*자치": "#dc2626",
                          "동아리": "#2563eb",
                          "봉사": "#ca8a04",
                          "진로": "#16a34a",
                        };
                        const total = typeOrder.reduce((sum, t) => sum + (counts[t] ?? 0), 0);

                        return typeOrder.map((t) => {
                          const value = counts[t] ?? 0;
                          const ratio = total > 0 ? Math.round((value / total) * 100) : 0;
                          return (
                            <div key={t} className="flex-1 flex flex-col items-center gap-2 h-full min-w-0 group">
                              <div className="relative w-full flex-1 bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                                <div
                                  className="w-full rounded-t-lg transition-all duration-500"
                                  style={{ height: `${ratio}%`, backgroundColor: colors[t] }}
                                />
                                <div className="absolute left-1/2 bottom-1 -translate-x-1/2 text-[11px] text-gray-400 bg-transparent pointer-events-none">
                                  {ratio}%
                                </div>
                              </div>
                              <div className="h-14 flex flex-col items-center justify-center">
                                <div className="text-xs text-center">{t}</div>
                                <div className="text-xs font-semibold">{value}</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {currentMonthEvents.length === 0 ? (
            <p className="text-sm text-gray-500">이번 달 예정된 일정이 없습니다.</p>
          ) : (
            <>
            {/* 열 헤더 (sm 이상에서 표시) */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mt-4 mb-2 pl-3 pr-2">
              <span className="flex items-center justify-center whitespace-nowrap w-[60px] shrink-0">날짜</span>
              <span className="flex items-center justify-center min-w-[30px] shrink-0 text-center">교시</span>
              <span className="flex items-center justify-center flex-1 min-w-0">제목</span>
              <span className="flex items-center justify-center w-[70px] shrink-0 text-right">부서</span>
              <span className="flex items-center justify-center w-[70px] shrink-0 text-center">학년</span>
              <span className="flex items-center justify-center w-[70px] shrink-0 text-center">구분</span>
            </div>

            {/* 모바일(작은 화면)에서는 간단한 레이블만 표시 */}
            <div className="sm:hidden text-xs text-gray-500 mb-2 pl-3 pr-2">
              <span>이번 달 이벤트 목록</span>
            </div>

            <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
              {currentMonthEvents.map((event) => {
                const { startDate, ...eventData } = event;
                return (
                  <li
                    key={event.id}
                    className="rounded-md border border-gray-100 p-3 hover:bg-gray-50 transition cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => calendarRef.current?.openEventModal(eventData)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        calendarRef.current?.openEventModal(eventData);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 text-sm text-gray-600 min-w-0">
                      {(() => {
                        const eventType = event.extendedProps.eventType || "교과";
                        const colors: Record<string, string> = {
                          "자율*자치": "#dc2626",
                          "동아리": "#2563eb",
                          "진로": "#16a34a",
                          "봉사": "#ca8a04",
                          "학사행사": "#9333ea",
                          "개인 일정": "#0d9488",
                        };
                        const eventColor = eventType in colors ? colors[eventType] : "#6b7280";

                        return (
                          <>
                      <span className="whitespace-nowrap w-[60px] shrink-0">{formatDate(startDate)}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap min-w-[30px] shrink-0">
                        {event.extendedProps.periods?.length
                          ? `${event.extendedProps.periods.join(", ")}교시`
                          : "-"}
                      </span>
                      <span className="text-gray-900 font-medium flex-1 min-w-0 break-words">
                        {event.title}
                      </span>
                      <span className="text-xs text-gray-500 truncate w-[70px] shrink-0 text-right">
                        {event.extendedProps.department || "-"}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap w-[70px] shrink-0 text-center">
                        {event.extendedProps.gradeLevels?.length
                          ? `${event.extendedProps.gradeLevels.join(", ")}학년`
                          : "-"}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap border w-[70px] shrink-0 text-center"
                        style={{ backgroundColor: eventColor, borderColor: eventColor, color: "#ffffff" }}
                      >
                        {eventType}
                      </span>
                          </>
                        );
                      })()}
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>
      </div>
      </div>
      
      {activeTab === "creative" && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedAcademicYear(prev => prev - 1)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="이전 학년도"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[90px] text-center">
                  {selectedAcademicYear}학년도
                </span>
                <button
                  onClick={() => setSelectedAcademicYear(prev => prev + 1)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="다음 학년도"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                창의적 체험활동 일정
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {/* CSV 다운로드 */}
              <button
                type="button"
                onClick={handleDownloadCreativeCSV}
                disabled={creativeEvents.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className="w-4 h-4" />
                CSV 다운로드
              </button>
              {/* 학년 필터 */}
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setSelectedGrade(null)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedGrade === null
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSelectedGrade("1")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedGrade === "1"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  1학년
                </button>
                <button
                  onClick={() => setSelectedGrade("2")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedGrade === "2"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  2학년
                </button>
                <button
                  onClick={() => setSelectedGrade("3")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedGrade === "3"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  3학년
                </button>
              </div>
              {/* 일정 유형 필터 */}
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setSelectedEventType(null)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedEventType === null
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSelectedEventType("자율*자치")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedEventType === "자율*자치"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  자율*자치
                </button>
                <button
                  onClick={() => setSelectedEventType("동아리")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedEventType === "동아리"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  동아리
                </button>
                <button
                  onClick={() => setSelectedEventType("봉사")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedEventType === "봉사"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  봉사
                </button>
                <button
                  onClick={() => setSelectedEventType("진로")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedEventType === "진로"
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  진로
                </button>
              </div>
            </div>
          </div>
          {isCreativeEventsLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">일정을 불러오는 중...</p>
          ) : creativeEvents.length === 0 ? (
            <p className="text-sm text-gray-500">창의적 체험활동 일정이 없습니다.</p>
          ) : (
            <>
              {/* 열 헤더 (sm 이상에서 표시) */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mt-4 mb-2 pl-3 pr-2">
                <span className="flex items-center justify-center whitespace-nowrap w-[80px] shrink-0">날짜</span>
                <span className="flex items-center justify-center min-w-[80px] shrink-0 text-center">교시</span>
                <span className="flex items-center justify-center flex-1 min-w-0">제목</span>
                <span className="flex items-center justify-center w-[70px] shrink-0 text-right">부서</span>
                <span className="flex items-center justify-center w-[70px] shrink-0 text-right">담당자</span>
                <span className="flex items-center justify-center w-[70px] shrink-0 text-center">학년</span>
                <span className="flex items-center justify-center w-[70px] shrink-0 text-center">구분</span>
                <span className="flex items-center justify-center flex-1 min-w-[100px] shrink-0 text-center">활동</span>
              </div>

              {/* 모바일(작은 화면)에서는 간단한 레이블만 표시 */}
              <div className="sm:hidden text-xs text-gray-500 mb-2 pl-3 pr-2">
                <span>창의적 체험활동 일정 목록</span>
              </div>

              <ul className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[600px]">
                {creativeEvents.map((event) => {
                  const { startDate, ...eventData } = event;
                  return (
                    <li
                      key={event.id}
                      className="rounded-md border border-gray-100 p-3 hover:bg-gray-50 transition cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => calendarRef.current?.openEventModal(eventData)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          calendarRef.current?.openEventModal(eventData);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 text-sm text-gray-600 min-w-0">
                        {(() => {
                          const eventType = event.extendedProps.eventType || "교과";
                          const colors: Record<string, string> = {
                            "자율*자치": "#dc2626",
                            "동아리": "#2563eb",
                            "진로": "#16a34a",
                            "봉사": "#ca8a04",
                            "학사행사": "#9333ea",
                            "개인 일정": "#0d9488",
                          };
                          const eventColor = eventType in colors ? colors[eventType] : "#6b7280";

                          return (
                            <>
                              <span className="whitespace-nowrap w-[80px] shrink-0">{formatDate(startDate)}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap min-w-[80px] shrink-0">
                                {event.extendedProps.periods?.length
                                  ? `${event.extendedProps.periods.join(", ")}교시`
                                  : "-"}
                              </span>
                              <span className="text-gray-900 font-medium flex-1 min-w-0 break-words">
                                {event.title}
                              </span>
                              <span className="text-xs text-gray-500 truncate w-[70px] shrink-0 text-right">
                                {event.extendedProps.department || "-"}
                              </span>
                              <span className="text-xs text-gray-500 truncate w-[70px] shrink-0 text-right">
                                {event.extendedProps.responsiblePerson || "-"}
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap w-[70px] shrink-0 text-center">
                                {event.extendedProps.gradeLevels?.length
                                  ? `${event.extendedProps.gradeLevels.join(", ")}학년`
                                  : "-"}
                              </span>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap border w-[70px] shrink-0 text-center"
                                style={{ backgroundColor: eventColor, borderColor: eventColor, color: "#ffffff" }}
                              >
                                {eventType}
                              </span>
                              <span
                                className="text-xs flex-1 min-w-[100px] shrink-0 line-clamp-2 flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityModalEvent({
                                    id: event.id,
                                    title: event.title,
                                    activityContent: (event.extendedProps as any).activityContent || "",
                                  });
                                }}
                              >
                                {(event.extendedProps as any).activityContent ? (
                                  <span className="text-gray-600 cursor-pointer hover:text-blue-600 flex justify-center w-full text-center">
                                    {(event.extendedProps as any).activityContent}
                                  </span>
                                ) : (
                                  <span className="flex justify-center w-full">
                                    <button
                                      type="button"
                                      className="text-blue-600 hover:text-blue-700 text-xs font-medium cursor-pointer"
                                    >
                                      활동 입력
                                    </button>
                                  </span>
                                )}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      <ActivityInputModal
        isOpen={!!activityModalEvent}
        onClose={() => setActivityModalEvent(null)}
        eventId={activityModalEvent?.id ?? ""}
        eventTitle={activityModalEvent?.title ?? ""}
        initialValue={activityModalEvent?.activityContent ?? ""}
        onSaved={handleActivitySaved}
      />
    </div>
  );
}

