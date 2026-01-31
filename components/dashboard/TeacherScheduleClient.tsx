"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarView, { CalendarEvent, CalendarViewHandle } from "./CalendarView";
import { Button } from "@/components/ui/Button";
import BulkUploadButton from "@/components/dashboard/BulkUploadButton";

type TeacherScheduleClientProps = {
  initialEvents: CalendarEvent[];
  title: string;
  description: string;
  allowedScheduleAreas?: string[];
  editableScopes?: string[];
  showAddButton?: boolean;
};

type CalendarEventWithDate = CalendarEvent & { startDate: Date };

export default function TeacherScheduleClient({
  initialEvents,
  title,
  description,
  allowedScheduleAreas,
  editableScopes,
  showAddButton = true,
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

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
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

      <div className="flex flex-col gap-6 lg:flex-row items-stretch">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:w-1/2">
          <CalendarView
            ref={calendarRef}
            initialEvents={initialEvents}
            onEventsChange={handleEventsChange}
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
  );
}

