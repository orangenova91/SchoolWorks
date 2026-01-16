"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarView, { CalendarEvent, CalendarViewHandle } from "./CalendarView";
import { Button } from "@/components/ui/Button";

type TeacherScheduleClientProps = {
  initialEvents: CalendarEvent[];
  title: string;
  description: string;
};

type CalendarEventWithDate = CalendarEvent & { startDate: Date };

export default function TeacherScheduleClient({ initialEvents, title, description }: TeacherScheduleClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const calendarRef = useRef<CalendarViewHandle>(null);
  const router = useRouter();
  const today = new Date();
  // 현재 캘린더 뷰에 표시되는 날짜 (기본값: 오늘)
  const [viewDate, setViewDate] = useState<Date>(today);

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
  const handleViewChange = useCallback((date: Date) => {
    setViewDate(date);
  }, []);

  // 현재 캘린더 뷰에 표시되는 월의 이벤트 필터링
  const currentMonthEvents = useMemo<CalendarEventWithDate[]>(() => {
    const viewMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const nextMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

    return events
      .map<CalendarEventWithDate>((event) => ({
        ...event,
        startDate: new Date(event.start),
      }))
      .filter(
        (event) =>
          event.startDate >= viewMonthStart && event.startDate < nextMonthStart
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, viewDate]);

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
          </div>
          <Button onClick={handleAddEvent}>
            일정 추가
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:w-1/2">
          <CalendarView
            ref={calendarRef}
            initialEvents={initialEvents}
            onEventsChange={handleEventsChange}
            hideAddButton={true}
            onViewChange={handleViewChange}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm w-full lg:flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {viewDate.getMonth() + 1}월 일정
          </h3>
          {currentMonthEvents.length === 0 ? (
            <p className="text-sm text-gray-500">이번 달 예정된 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
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
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{formatDate(startDate)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {event.extendedProps.eventType || "교과"}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-900 font-medium">{event.title}</p>
                    {event.extendedProps.department && (
                      <p className="text-xs text-gray-500 mt-1">
                        담당 부서: {event.extendedProps.department}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

