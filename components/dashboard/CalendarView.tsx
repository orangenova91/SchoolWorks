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
    scheduleArea?: string;
    gradeLevels?: string[];
    periods?: string[];
    description?: string;
    activityContent?: string;
  };
}

export type DateExtraInfo = Record<
  string,
  { eveningSupervision: string[]; mealGuidance: string[] }
>;

type CalendarViewProps = {
  initialEvents?: CalendarEvent[];
  onEventsChange?: (events: CalendarEvent[]) => void;
  onEventSaved?: () => void;
  onEventDeleted?: () => void;
  hideAddButton?: boolean;
  onViewChange?: (viewDate: Date, viewType: string) => void;
  allowedScheduleAreas?: string[];
  editableScopes?: string[];
  /** 급식지도/야자감독 명단 - 해당 날짜 셀에 표시 (날짜 문자열 YYYY-MM-DD 키) */
  dateExtraInfo?: DateExtraInfo;
  currentTeacherName?: string;
  currentTeacherEmail?: string;
};

export type CalendarViewHandle = {
  openEventModal: (event: CalendarEvent) => void;
};

const MOON_ICON =
  '<span class="fc-sm-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></span>';
const MEAL_ICON =
  '<span class="fc-sm-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg></span>';

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CalendarView = forwardRef<CalendarViewHandle, CalendarViewProps>(
  (
    {
      initialEvents = [],
      onEventsChange,
      onEventSaved,
      onEventDeleted,
      hideAddButton = false,
      onViewChange,
      allowedScheduleAreas,
      editableScopes,
      dateExtraInfo,
      currentTeacherName,
      currentTeacherEmail,
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
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());

  const matchesCurrentTeacher = useCallback(
    (raw: string): boolean => {
      const value = raw?.trim().toLowerCase();
      if (!value) return false;

      const name = currentTeacherName?.trim().toLowerCase();
      const email = currentTeacherEmail?.trim().toLowerCase();

      if (name && value === name) return true;
      if (email && value === email) return true;
      return false;
    },
    [currentTeacherName, currentTeacherEmail]
  );

  const formatNamesWithBadges = useCallback(
    (names: string[]): string => {
      const escapeHtml = (str: string): string =>
        String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      return names
        .filter(Boolean)
        .map((name) => {
          const isMe = matchesCurrentTeacher(String(name));
          const safeName = escapeHtml(String(name));

          if (isMe) {
            return `<span class="inline-flex items-center gap-1"><span class="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-[12px] px-1.5 py-0.5 font-semibold">${safeName}</span></span>`;
          }

          return `<span class="inline-flex items-center gap-1">${safeName}</span>`;
        })
        .join('<span class="mx-0.5">,</span>');
    },
    [matchesCurrentTeacher]
  );

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
    // update current view date for header controls
    if (dateInfo.view && dateInfo.view.currentStart) {
      setCurrentViewDate(dateInfo.view.currentStart);
    }
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
    onEventSaved?.();
    showToast("일정이 저장되었습니다.", "success");
  };

  // 일정 삭제 성공
  const handleEventDeleted = () => {
    handleCloseModal();
    refreshEvents();
    onEventDeleted?.();
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
      "학사행사": "#9333ea", // purple
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

  const dayCellDidMount = useCallback(
    (arg: { el: HTMLElement; date: Date }) => {
      if (!dateExtraInfo) return;
      const dateStr = toDateStr(arg.date);
      const row = dateExtraInfo[dateStr];
      if (!row) return;
      const ev = (row.eveningSupervision || []).filter(Boolean);
      const mg = (row.mealGuidance || []).filter(Boolean);
      if (ev.length === 0 && mg.length === 0) return;

      const wrap = document.createElement("div");
      wrap.className = "fc-supervision-meal-cell";
      wrap.dataset.dateKey = dateStr;
      const parts: string[] = [];
      if (mg.length) parts.push(`${MEAL_ICON} ${formatNamesWithBadges(mg)}`);
      if (ev.length) parts.push(`${MOON_ICON} ${formatNamesWithBadges(ev)}`);
      wrap.innerHTML = parts.join("<br>");

      const frame = arg.el.querySelector(".fc-daygrid-day-frame");
      if (frame) {
        frame.appendChild(wrap);
      } else {
        arg.el.appendChild(wrap);
      }
    },
    [dateExtraInfo]
  );

  const dayCellWillUnmount = useCallback((arg: { el: HTMLElement }) => {
    const wrap = arg.el.querySelector(".fc-supervision-meal-cell");
    wrap?.remove();
  }, []);

  // dateExtraInfo 변경 시(저장 후, fetch 후) 기존 셀 내용 갱신
  useEffect(() => {
    if (!dateExtraInfo || !calendarContainerRef.current) return;
    const container = calendarContainerRef.current;
    const dayCells = container.querySelectorAll(".fc-daygrid-day");
    dayCells.forEach((td) => {
      const frame = td.querySelector(".fc-daygrid-day-frame");
      if (!frame) return;
      const dateStr = (td as HTMLElement).getAttribute("data-date") || "";
      const row = dateStr ? dateExtraInfo[dateStr] : null;
      const existing = td.querySelector(".fc-supervision-meal-cell");
      const ev = row ? (row.eveningSupervision || []).filter(Boolean) : [];
      const mg = row ? (row.mealGuidance || []).filter(Boolean) : [];
      if (ev.length === 0 && mg.length === 0) {
        existing?.remove();
        return;
      }
      const parts: string[] = [];
      if (mg.length) parts.push(`${MEAL_ICON} ${formatNamesWithBadges(mg)}`);
      if (ev.length) parts.push(`${MOON_ICON} ${formatNamesWithBadges(ev)}`);
      const html = parts.join("<br>");
      if (existing) {
        existing.innerHTML = html;
      } else {
        const wrap = document.createElement("div");
        wrap.className = "fc-supervision-meal-cell";
        wrap.innerHTML = html;
        frame.appendChild(wrap);
      }
    });
  }, [dateExtraInfo]);

  const getSemesterStartDate = (type: "first" | "second", baseDate: Date) => {
    // Use the current year so semester buttons always jump to the academic semester
    // for the current year: 1학기 -> Mar 1 ~ Jul, 2학기 -> Aug 1 ~ next Feb
    const year = new Date().getFullYear();

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
              left: (() => {
                const today = new Date();
                const isSameMonth =
                  currentViewDate.getFullYear() === today.getFullYear() &&
                  currentViewDate.getMonth() === today.getMonth();
                return isSameMonth ? "prevNav,nextNav" : "prevNav,nextNav today";
              })(),
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
              prevNav: {
                text: "<",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const viewType = calendarApi.view.type;
                  if (viewType === "semester1" || viewType === "semester2") {
                    const sem = viewType === "semester1" ? "first" : "second";
                    const start = getSemesterStartDate(sem as "first" | "second", calendarApi.getDate());
                    start.setFullYear(start.getFullYear() - 1);
                    calendarApi.changeView(viewType);
                    calendarApi.gotoDate(start);
                  } else {
                    calendarApi.prev();
                  }
                },
              },
              nextNav: {
                text: ">",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const viewType = calendarApi.view.type;
                  if (viewType === "semester1" || viewType === "semester2") {
                    const sem = viewType === "semester1" ? "first" : "second";
                    const start = getSemesterStartDate(sem as "first" | "second", calendarApi.getDate());
                    start.setFullYear(start.getFullYear() + 1);
                    calendarApi.changeView(viewType);
                    calendarApi.gotoDate(start);
                  } else {
                    calendarApi.next();
                  }
                },
              },
              today: {
                text: "오늘",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  // always switch to month view and go to today
                  calendarApi.changeView("dayGridMonth");
                  calendarApi.gotoDate(new Date());
                },
              },
              semester1: {
                text: "1학기",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const startDate = getSemesterStartDate("first", calendarApi.getDate());
                  // ensure view is set first then navigate to the desired start date
                  calendarApi.changeView("semester1");
                  calendarApi.gotoDate(startDate);
                },
              },
              semester2: {
                text: "2학기",
                click: () => {
                  if (!calendarRef.current) return;
                  const calendarApi = calendarRef.current.getApi();
                  const startDate = getSemesterStartDate("second", calendarApi.getDate());
                  // ensure view is set first then navigate to the desired start date
                  calendarApi.changeView("semester2");
                  calendarApi.gotoDate(startDate);
                },
              },
            }}
            locale="ko"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={false}
            dayMaxEventRows={false}
            expandRows={false}
            weekends={true}
            events={calendarEvents}
            eventClick={handleEventClick}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            height="auto"
            eventDisplay="block"
            dayHeaderFormat={{ weekday: "short" }}
            dayCellDidMount={dayCellDidMount}
            dayCellWillUnmount={dayCellWillUnmount}
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

