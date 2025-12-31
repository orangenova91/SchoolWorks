"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ClockArrowDown } from "lucide-react";

type Student = {
  id: string;
  name: string | null;
  email: string;
};

type AttendanceHeaderProps = {
  courseId: string;
  students: Student[];
  onDateChange?: (date: Date) => void;
};

export default function AttendanceHeader({
  courseId,
  students,
  onDateChange,
}: AttendanceHeaderProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  const weekdays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getWeekday = (date: Date) => {
    return weekdays[date.getDay()];
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDate(today);
    onDateChange?.(today);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  // 달력 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  // 달력 날짜 생성
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일로 조정

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // 6주치 날짜 생성 (42일)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
    onDateChange?.(date);
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const calendarDays = getCalendarDays();
  const monthYear = currentMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">학생 출결</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousDay}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="이전 날짜"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="relative" ref={calendarRef}>
            <button
              type="button"
              onClick={() => {
                setIsCalendarOpen(!isCalendarOpen);
                setCurrentMonth(selectedDate);
              }}
              className="text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 min-w-[140px] text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formatDate(selectedDate)} ({getWeekday(selectedDate)})
            </button>
            {isCalendarOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
                {/* 달력 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-1 rounded-md hover:bg-gray-100"
                    aria-label="이전 달"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {monthYear}
                  </h3>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded-md hover:bg-gray-100"
                    aria-label="다음 달"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-600"
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
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["일", "월", "화", "수", "목", "금", "토"].map(
                    (day, index) => (
                      <div
                        key={day}
                        className={`text-center text-xs font-medium py-2 ${
                          index === 0
                            ? "text-red-500"
                            : index === 6
                            ? "text-blue-500"
                            : "text-gray-600"
                        }`}
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, index) => {
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isSelectedDay = isSelected(date);
                    const isTodayDay = isToday(date);
                    const dayOfWeek = date.getDay();

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateSelect(date)}
                        className={`
                          h-8 text-xs rounded-md transition-colors
                          ${
                            !isCurrentMonthDay
                              ? "text-gray-300 hover:bg-gray-50"
                              : "text-gray-700 hover:bg-gray-100"
                          }
                          ${
                            isSelectedDay
                              ? "bg-blue-500 text-white hover:bg-blue-600 font-semibold"
                              : ""
                          }
                          ${
                            isTodayDay && !isSelectedDay
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : ""
                          }
                          ${
                            dayOfWeek === 0 && isCurrentMonthDay && !isSelectedDay
                              ? "text-red-500"
                              : ""
                          }
                          ${
                            dayOfWeek === 6 && isCurrentMonthDay && !isSelectedDay
                              ? "text-blue-500"
                              : ""
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleNextDay}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="다음 날짜"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
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
          </button>
          {selectedDate.toDateString() !== new Date().toDateString() && (
            <button
              onClick={handleTodayClick}
              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="오늘로"
              title="오늘로"
            >
              <ClockArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

