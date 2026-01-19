"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { EventClickArg, DateSelectArg, EventInput, DatesSetArg } from "@fullcalendar/core";
import EventModal from "./EventModal";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import "@/app/calendar.css"; // FullCalendar 스타일

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string | null;
  allDay: boolean;
  extendedProps: {
    eventType: string | null;
    scope: string;
    school?: string;
    courseId?: string;
    department?: string;
    responsiblePerson?: string;
    gradeLevels?: string[];
    periods?: string[];
    description?: string;
  };
}

type CalendarViewProps = {
  initialEvents?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
  hideAddButton?: boolean;
  onViewChange?: (viewDate: Date, viewType: string) => void;
  allowedScheduleAreas?: string[];
  editableScopes?: string[];
};

export type CalendarViewHandle = {
  openEventModal: (event: CalendarEvent) => void;
};

const CalendarView = forwardRef<CalendarViewHandle, CalendarViewProps>(
  (
    {
      initialEvents = [],
      onEventsChange,
      hideAddButton = false,
      onViewChange,
      allowedScheduleAreas,
      editableScopes,
    },
    ref
  ) => {
  const { showToast } = useToastContext();
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

    const openEventModal = useCallback((eventData: CalendarEvent) => {
      // 새 일정 추가인 경우 (id가 없거나 빈 문자열)
      if (!eventData.id) {
        setSelectedEvent(null);
        setSelectedDate(eventData.start ? new Date(eventData.start) : new Date());
        setSelectedEndDate(eventData.end ? new Date(eventData.end) : null);
      } else {
        // 기존 일정 수정
        setSelectedEvent(eventData);
        setSelectedDate(null);
        setSelectedEndDate(null);
      }
      setIsModalOpen(true);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openEventModal,
      }),
      [openEventModal]
    );

    // 일정 목록 새로고침
  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!calendarRef.current) return;

      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart.toISOString();
      const end = calendarApi.view.activeEnd.toISOString();

      const response = await fetch(
        `/api/calendar-events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&scope=all`
      );

      if (!response.ok) {
        throw new Error("일정을 불러올 수 없습니다.");
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to refresh events:", error);
      showToast("일정을 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [calendarRef, showToast]);

  // 날짜 범위 변경 시 일정 새로고침 및 뷰 변경 알림
  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    refreshEvents();
    // view.currentStart를 사용 - FullCalendar의 title에 표시되는 기준 날짜
    if (onViewChange && dateInfo.view.currentStart) {
      onViewChange(dateInfo.view.currentStart, dateInfo.view.type);
    }
    requestAnimationFrame(() => {
      const titleEl = calendarContainerRef.current?.querySelector(".fc-toolbar-title");
      if (!titleEl) return;
      const title = dateInfo.view.title;
      const parts = title.split(/(\d{4}년)/g).filter(Boolean);
      titleEl.textContent = "";
      parts.forEach((part, index) => {
        const span = document.createElement("span");
        span.className = /^\d{4}년$/.test(part) ? "fc-title-year" : "fc-title-rest";
        span.textContent = part;
        span.dataset.key = String(index);
        titleEl.append(span);
      });
    });
  }, [refreshEvents, onViewChange]);

    // 일정 클릭
    const handleEventClick = (clickInfo: EventClickArg) => {
      const eventData: CalendarEvent = {
        id: clickInfo.event.id,
        title: clickInfo.event.title,
        description: clickInfo.event.extendedProps.description,
        start: clickInfo.event.start?.toISOString() || "",
        end: clickInfo.event.end?.toISOString() || null,
        allDay: clickInfo.event.allDay,
        extendedProps: clickInfo.event.extendedProps as CalendarEvent["extendedProps"],
      };
      openEventModal(eventData);
    };

  // 날짜/시간 선택 (일정 추가)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start);
    
    // 종료 날짜 처리: FullCalendar의 end는 exclusive이므로 하루를 빼야 실제 종료 날짜가 됨
    if (selectInfo.end) {
      const endDate = new Date(selectInfo.end);
      endDate.setDate(endDate.getDate() - 1); // 하루 빼서 실제 종료 날짜로 만듦
      setSelectedEndDate(endDate);
    } else {
      setSelectedEndDate(null);
    }
    
    setSelectedEvent(null);
    setIsModalOpen(true);
    // 선택 해제
    selectInfo.view.calendar.unselect();
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
    setSelectedEndDate(null);
  };

  // 일정 저장 성공
  const handleEventSaved = () => {
    handleCloseModal();
    refreshEvents();
    showToast("일정이 저장되었습니다.", "success");
  };

  // 일정 삭제 성공
  const handleEventDeleted = () => {
    handleCloseModal();
    refreshEvents();
    showToast("일정이 삭제되었습니다.", "success");
  };

  // FullCalendar 이벤트 형식으로 변환
  const calendarEvents: EventInput[] = events.map((event) => {
    // 일정 유형별 색상
    const colors: Record<string, string> = {
      "자율*자치": "#dc2626", // red
      "동아리": "#2563eb", // blue
      "진로": "#16a34a", // green
      "봉사": "#ca8a04", // yellow
      "개인 일정": "#0d9488", // teal
    };
    
    // eventType이 null인 경우 (교과 일정) 기본 색상 사용
    const eventType = event.extendedProps.eventType;
    const defaultColor = "#6b7280"; // gray for 교과 (subject) events
    const eventColor = eventType && colors[eventType] ? colors[eventType] : defaultColor;

    return {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end || undefined,
      allDay: event.allDay,
      backgroundColor: eventColor,
      borderColor: eventColor,
      extendedProps: event.extendedProps,
      description: event.description,
    };
  });

  // 마운트 상태 설정
  useEffect(() => {
    setMounted(true);
  }, []);

  // initialEvents가 변경될 때 events 상태 업데이트
  useEffect(() => {
    setEvents(initialEvents);
    // FullCalendar에 이벤트 업데이트 알림
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  }, [initialEvents]);

  useEffect(() => {
    onEventsChange?.(events);
  }, [events, onEventsChange]);

  const getSemesterStartDate = (type: "first" | "second", baseDate: Date) => {
    const year = baseDate.getFullYear();

    if (type === "first") {
      // 1학기: 3~7월 (항상 현재 연도 기준)
      return new Date(year, 2, 1); // Mar 1
    }

    // 2학기: 8~다음해 2월 (항상 현재 연도 기준)
    return new Date(year, 7, 1); // Aug 1
  };

  return (
      <div className="w-full">
        {!hideAddButton && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">학사일정</h2>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedDate(new Date());
                setSelectedEndDate(null);
                setSelectedEvent(null);
                setIsModalOpen(true);
              }}
            >
              일정 추가
            </Button>
          </div>
        )}

        <div ref={calendarContainerRef} className="rounded-lg border border-gray-200 bg-white p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,semester1,semester2",
            }}
            views={{
              semester1: {
                type: "multiMonth",
                duration: { months: 5 },
                multiMonthMaxColumns: 3,
                multiMonthTitleFormat: { month: "long" },
              },
              semester2: {
                type: "multiMonth",
                duration: { months: 7 },
                multiMonthMaxColumns: 3,
                multiMonthTitleFormat: { month: "long" },
              },
            }}
            customButtons={{
              semester1: {
                text: "1학기",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const startDate = getSemesterStartDate("first", calendarApi.getDate());
                  calendarApi.changeView("semester1", startDate);
                },
              },
              semester2: {
                text: "2학기",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const startDate = getSemesterStartDate("second", calendarApi.getDate());
                  calendarApi.changeView("semester2", startDate);
                },
              },
            }}
            locale="ko"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={calendarEvents}
            eventClick={handleEventClick}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            height="auto"
            eventDisplay="block"
            dayHeaderFormat={{ weekday: "short" }}
            buttonText={{
              today: "오늘",
              month: "월",
              week: "주",
              day: "일",
            }}
          />
        </div>

        {mounted && typeof window !== "undefined" && isModalOpen && createPortal(
          <EventModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={selectedEvent}
            selectedDate={selectedDate}
            selectedEndDate={selectedEndDate}
            onSaved={handleEventSaved}
            onDeleted={handleEventDeleted}
            allowedScheduleAreas={allowedScheduleAreas}
            editableScopes={editableScopes}
          />,
          document.body
        )}
      </div>
    );
  }
);

CalendarView.displayName = "CalendarView";

export default CalendarView;

