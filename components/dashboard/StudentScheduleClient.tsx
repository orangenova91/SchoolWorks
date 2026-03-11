"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar, Sparkles, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import CalendarView, { CalendarEvent, CalendarViewHandle } from "./CalendarView";
import ActivityAnswerModal from "./ActivityAnswerModal";

type CalendarEventWithDate = CalendarEvent & { startDate: Date };

type StudentScheduleClientProps = {
  title: string;
  description: string;
  initialEvents: CalendarEvent[];
  initialTab?: "academic" | "creative";
};

export default function StudentScheduleClient({
  title,
  description,
  initialEvents,
  initialTab,
}: StudentScheduleClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const calendarRef = useRef<CalendarViewHandle | null>(null);
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(today);
  const [viewType, setViewType] = useState<string>("dayGridMonth");
  const [showStats, setShowStats] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"academic" | "creative">(
    initialTab ?? "academic"
  );

  useEffect(() => {
    setActiveTab(initialTab ?? "academic");
  }, [initialTab]);

  const getAcademicYear = useCallback((date: Date): number => {
    const month = date.getMonth();
    return month >= 2 ? date.getFullYear() : date.getFullYear() - 1;
  }, []);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number>(
    getAcademicYear(new Date())
  );
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

  const [creativeTabEvents, setCreativeTabEvents] = useState<CalendarEvent[] | null>(
    null
  );
  const [isCreativeEventsLoading, setIsCreativeEventsLoading] = useState(false);
  const [creativeRefreshKey, setCreativeRefreshKey] = useState(0);
  const [answeredEventIds, setAnsweredEventIds] = useState<Record<string, boolean>>({});
  const [answerModalEvent, setAnswerModalEvent] = useState<{
    id: string;
    title: string;
    activityContent?: string;
  } | null>(null);

  const refreshCreativeTabEvents = useCallback(() => {
    setCreativeRefreshKey((k) => k + 1);
  }, []);

  const handleEventsChange = useCallback((updatedEvents: CalendarEvent[]) => {
    setEvents(updatedEvents);
  }, []);

  const handleViewChange = useCallback((date: Date, nextViewType: string) => {
    setViewDate(date);
    setViewType(nextViewType);
  }, []);

  const currentMonthEvents = useMemo<CalendarEventWithDate[]>(() => {
    const viewMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const nextMonthStart = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      1
    );

    const semesterStart =
      viewType === "semester1"
        ? new Date(viewDate.getFullYear(), 2, 1)
        : viewType === "semester2"
        ? new Date(viewDate.getFullYear(), 7, 1)
        : viewMonthStart;

    const semesterEnd =
      viewType === "semester1"
        ? new Date(viewDate.getFullYear(), 7, 1)
        : viewType === "semester2"
        ? new Date(viewDate.getFullYear() + 1, 2, 1)
        : nextMonthStart;

    return events
      .map<CalendarEventWithDate>((event) => ({
        ...event,
        startDate: new Date(event.start),
      }))
      .filter(
        (event) =>
          event.startDate >= semesterStart && event.startDate < semesterEnd
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, viewDate, viewType]);

  const statsByGrade = useMemo(() => {
    const types = ["자율*자치", "동아리", "봉사", "진로"];
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

    return Object.fromEntries(
      Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))
    ) as Record<string, Record<string, number>>;
  }, [currentMonthEvents]);

  useEffect(() => {
    const academicYearStart = new Date(selectedAcademicYear, 2, 1);
    const academicYearEnd = new Date(
      selectedAcademicYear + 1,
      1,
      28,
      23,
      59,
      59
    );
    const isLeapYear = (year: number) =>
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (isLeapYear(selectedAcademicYear + 1)) {
      academicYearEnd.setDate(29);
    }

    let cancelled = false;
    setIsCreativeEventsLoading(true);
    setCreativeTabEvents(null);

    fetch(
      `/api/calendar-events?start=${encodeURIComponent(
        academicYearStart.toISOString()
      )}&end=${encodeURIComponent(academicYearEnd.toISOString())}&scope=all`
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

  const creativeEvents = useMemo<CalendarEventWithDate[]>(() => {
    const sourceEvents = creativeTabEvents ?? [];
    return sourceEvents
      .map<CalendarEventWithDate>((event) => ({
        ...event,
        startDate: new Date(event.start),
      }))
      .filter((event) => {
        const isCreativeActivity =
          event.extendedProps.scheduleArea === "창의적 체험활동";

        const gradeLevels = event.extendedProps.gradeLevels || [];
        const matchesGrade =
          selectedGrade === null || gradeLevels.includes(selectedGrade);

        const eventType = event.extendedProps.eventType;
        const matchesEventType =
          selectedEventType === null || eventType === selectedEventType;

        return isCreativeActivity && matchesGrade && matchesEventType;
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [creativeTabEvents, selectedGrade, selectedEventType]);

  const handleDownloadCreativeCSV = useCallback(() => {
    const headers = [
      "날짜",
      "교시",
      "제목",
      "부서",
      "담당자",
      "학년",
      "구분",
      "활동",
    ];
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
      const activity = (e.extendedProps as { activityContent?: string })
        .activityContent ?? "";
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

  const formatDate = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      }).format(date),
    []
  );

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
          <div className="flex flex-col items-start gap-2">
            <div className="flex w-full justify-end">
              <Button
                onClick={() => {
                  if (!calendarRef.current) return;
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
                      scheduleArea: "개인일정(나만 보기)",
                    },
                  };
                  calendarRef.current.openEventModal(event);
                }}
              >
                일정 추가
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 학사 일정 탭 */}
      <div className={activeTab === "academic" ? "" : "hidden"}>
        <div className="flex flex-col gap-6 lg:flex-row items-stretch">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:w-1/2">
            <CalendarView
              ref={calendarRef}
              initialEvents={initialEvents}
              onEventsChange={handleEventsChange}
              hideAddButton={true}
              onViewChange={handleViewChange}
              allowedScheduleAreas={["개인일정(나만 보기)"]}
              editableScopes={["personal"]}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:flex-1 flex flex-col">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
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
              >
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
                      <div
                        key={grade}
                        className="flex flex-col bg-white border rounded-md p-2 shadow-sm w-[170px]"
                      >
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {grade}학년
                        </div>
                        <div className="flex items-end gap-3 h-32">
                          {(() => {
                            const typeOrder = ["자율*자치", "동아리", "봉사", "진로"];
                            const colors: Record<string, string> = {
                              "자율*자치": "#dc2626",
                              동아리: "#2563eb",
                              봉사: "#ca8a04",
                              진로: "#16a34a",
                            };
                            const total = typeOrder.reduce(
                              (sum, t) => sum + (counts[t] ?? 0),
                              0
                            );

                            return typeOrder.map((t) => {
                              const value = counts[t] ?? 0;
                              const ratio =
                                total > 0 ? Math.round((value / total) * 100) : 0;
                              return (
                                <div
                                  key={t}
                                  className="flex-1 flex flex-col items-center gap-2 h-full min-w-0 group"
                                >
                                  <div className="relative w-full flex-1 bg-gray-100 rounded-t-lg overflow-hidden flex flex-col justify-end">
                                    <div
                                      className="w-full rounded-t-lg transition-all duration-500"
                                      style={{
                                        height: `${ratio}%`,
                                        backgroundColor: colors[t],
                                      }}
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
              <p className="text-sm text-gray-500">
                이번 달 예정된 일정이 없습니다.
              </p>
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mt-4 mb-2 pl-3 pr-2">
                  <span className="flex items-center justify-center whitespace-nowrap w-[60px] shrink-0">
                    날짜
                  </span>
                  <span className="flex items-center justify-center min-w-[30px] shrink-0 text-center">
                    교시
                  </span>
                  <span className="flex items-center justify-center flex-1 min-w-0">
                    제목
                  </span>
                  <span className="flex items-center justify-center w-[70px] shrink-0 text-right">
                    부서
                  </span>
                  <span className="flex items-center justify-center w-[70px] shrink-0 text-center">
                    학년
                  </span>
                  <span className="flex items-center justify-center w-[70px] shrink-0 text-center">
                    구분
                  </span>
                </div>

                <div className="sm:hidden text-xs text-gray-500 mb-2 pl-3 pr-2">
                  <span>이번 달 이벤트 목록</span>
                </div>

                <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {currentMonthEvents.map((event) => {
                    const { startDate, ...eventData } = event;
                    const eventType = event.extendedProps.eventType || "교과";
                    const colors: Record<string, string> = {
                      "자율*자치": "#dc2626",
                      동아리: "#2563eb",
                      진로: "#16a34a",
                      봉사: "#ca8a04",
                      학사행사: "#9333ea",
                      "개인 일정": "#0d9488",
                    };
                    const eventColor =
                      eventType in colors ? colors[eventType] : "#6b7280";

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
                          <span className="whitespace-nowrap w-[60px] shrink-0">
                            {formatDate(startDate)}
                          </span>
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
                              ? `${event.extendedProps.gradeLevels.join(
                                  ", "
                                )}학년`
                              : "-"}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap border w-[70px] shrink-0 text-center"
                            style={{
                              backgroundColor: eventColor,
                              borderColor: eventColor,
                              color: "#ffffff",
                            }}
                          >
                            {eventType}
                          </span>
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

      {/* 창의적 체험활동 탭 */}
      <div className={activeTab === "creative" ? "" : "hidden"}>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setSelectedAcademicYear((prev) => prev - 1)
                  }
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="이전 학년도"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[90px] text-center">
                  {selectedAcademicYear}학년도
                </span>
                <button
                  onClick={() =>
                    setSelectedAcademicYear((prev) => prev + 1)
                  }
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
              <button
                type="button"
                onClick={handleDownloadCreativeCSV}
                disabled={creativeEvents.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className="w-4 h-4" />
                CSV 다운로드
              </button>
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
            <p className="text-sm text-gray-500 py-8 text-center">
              일정을 불러오는 중...
            </p>
          ) : creativeEvents.length === 0 ? (
            <p className="text-sm text-gray-500">
              창의적 체험활동 일정이 없습니다.
            </p>
          ) : (
            <>
              <div className="sm:hidden text-xs text-gray-500 mb-2 pl-3 pr-2 mt-4">
                <span>창의적 체험활동 일정 목록</span>
              </div>

              <div className="flex-1 overflow-auto pr-2 max-h-[600px] mt-4">
                <table className="w-full border-collapse table-fixed min-w-[720px]">
                  <colgroup>
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "26%" }} />
                  </colgroup>
                  <thead className="hidden sm:table-header-group">
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        날짜
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        교시
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        부서
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        담당자
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        학년
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        구분
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        활동 응답
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {creativeEvents.map((event) => {
                      const { startDate } = event;
                      const eventType = event.extendedProps.eventType || "교과";
                      const colors: Record<string, string> = {
                        "자율*자치": "#dc2626",
                        동아리: "#2563eb",
                        진로: "#16a34a",
                        봉사: "#ca8a04",
                        학사행사: "#9333ea",
                        "개인 일정": "#0d9488",
                      };
                      const eventColor =
                        eventType in colors ? colors[eventType] : "#6b7280";
                      const activityContent =
                        (event.extendedProps as { activityContent?: string })
                          .activityContent?.trim() ?? "";
                      const hasActivity = activityContent.length > 0;
                      const isAnswered = answeredEventIds[event.id] === true;

                      return (
                        <tr key={event.id} className="hover:bg-gray-50 transition">
                          <td className="px-2 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(startDate)}
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {event.extendedProps.periods?.length
                              ? `${event.extendedProps.periods.join(", ")}교시`
                              : "-"}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 font-medium min-w-0 break-words">
                            {event.title}
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500 text-right truncate max-w-0">
                            {event.extendedProps.department || "-"}
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500 text-right truncate max-w-0">
                            {event.extendedProps.responsiblePerson || "-"}
                          </td>
                          <td className="px-2 py-3 text-xs text-gray-500 text-center whitespace-nowrap">
                            {event.extendedProps.gradeLevels?.length
                              ? `${event.extendedProps.gradeLevels.join(
                                  ", "
                                )}학년`
                              : "-"}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span
                              className="inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap border"
                              style={{
                                backgroundColor: eventColor,
                                borderColor: eventColor,
                                color: "#ffffff",
                              }}
                            >
                              {eventType}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-xs text-center align-middle">
                            {hasActivity ? (
                              <button
                                type="button"
                                className={
                                  isAnswered
                                    ? "inline-flex items-center justify-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-full bg-emerald-500 text-white border border-emerald-500"
                                    : "inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAnswerModalEvent({
                                    id: event.id,
                                    title: event.title,
                                    activityContent,
                                  });
                                }}
                              >
                                {isAnswered ? "응답 완료" : "응답하기"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium rounded-full border border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                              >
                                준비 중
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {answerModalEvent && (
        <ActivityAnswerModal
          isOpen={!!answerModalEvent}
          onClose={() => setAnswerModalEvent(null)}
          eventId={answerModalEvent.id}
          eventTitle={answerModalEvent.title}
          activityContent={answerModalEvent.activityContent}
          onAnswered={(eventId, hasAnswers) => {
            setAnsweredEventIds((prev) => ({ ...prev, [eventId]: hasAnswers }));
            setAnswerModalEvent(null);
          }}
        />
      )}
    </div>
  );
}

