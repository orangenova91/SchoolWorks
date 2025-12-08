"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";

type Student = {
  id: string;
  name: string | null;
  studentProfile: {
    studentId: string | null;
  } | null;
};

type AttendanceStatus = "present" | "late" | "sick_leave" | "approved_absence" | "excused";

type AttendanceData = Record<string, Record<string, Record<string, AttendanceStatus>>>;

type WeeklyAttendanceTableProps = {
  students: Student[];
  classLabel: string;
  initialWeekStart?: string; // YYYY-MM-DD 형식
};

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "출석", color: "bg-green-100 text-green-800" },
  { value: "late", label: "지각", color: "bg-yellow-100 text-yellow-800" },
  { value: "sick_leave", label: "병가", color: "bg-blue-100 text-blue-800" },
  { value: "approved_absence", label: "공결", color: "bg-purple-100 text-purple-800" },
  { value: "excused", label: "조퇴", color: "bg-orange-100 text-orange-800" },
];

const periods = [
  { key: "morning", label: "조례" },
  { key: "1", label: "1교시" },
  { key: "2", label: "2교시" },
  { key: "3", label: "3교시" },
  { key: "4", label: "4교시" },
  { key: "5", label: "5교시" },
  { key: "6", label: "6교시" },
  { key: "7", label: "7교시" },
  { key: "closing", label: "종례" },
];

const daysOfWeek = ["월", "화", "수", "목", "금"];

export default function WeeklyAttendanceTable({
  students,
  classLabel,
  initialWeekStart,
}: WeeklyAttendanceTableProps) {
  const router = useRouter();
  const { showToast } = useToastContext();
  const [weekStart, setWeekStart] = useState<string>(() => {
    if (initialWeekStart) return initialWeekStart;
    // 이번 주 월요일 계산
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 월요일
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [attendance, setAttendance] = useState<AttendanceData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 주 시작일로부터 날짜 배열 생성
  const getWeekDates = () => {
    const start = new Date(weekStart);
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  };

  // 출결 데이터 로드
  useEffect(() => {
    const loadAttendance = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/teacher/attendance?weekStart=${weekStart}&classLabel=${encodeURIComponent(classLabel)}`
        );
        const data = await response.json();
        
        if (response.ok) {
          setAttendance(data.attendance || {});
        } else {
          showToast(data.error || "출결 데이터를 불러오는데 실패했습니다.", "error");
        }
      } catch (error) {
        console.error(error);
        showToast("출결 데이터를 불러오는데 실패했습니다.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendance();
  }, [weekStart, classLabel, showToast]);

  // 출결 상태 변경
  const handleStatusChange = (
    studentId: string,
    date: string,
    period: string,
    status: AttendanceStatus
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [date]: {
          ...prev[studentId]?.[date],
          [period]: status,
        },
      },
    }));
  };

  // 출결 데이터 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Array<{
        studentId: string;
        date: string;
        period: string;
        status: AttendanceStatus;
      }> = [];

      Object.entries(attendance).forEach(([studentId, dates]) => {
        Object.entries(dates).forEach(([date, periods]) => {
          Object.entries(periods).forEach(([period, status]) => {
            updates.push({
              studentId,
              date,
              period,
              status,
            });
          });
        });
      });

      // 각 업데이트를 API로 전송
      for (const update of updates) {
        const response = await fetch("/api/teacher/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(update),
        });

        if (!response.ok) {
          throw new Error("출결 정보 저장에 실패했습니다.");
        }
      }

      showToast("출결 정보가 저장되었습니다.", "success");
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast("출결 정보 저장에 실패했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 주 변경
  const handleWeekChange = (direction: "prev" | "next") => {
    const current = new Date(weekStart);
    if (direction === "prev") {
      current.setDate(current.getDate() - 7);
    } else {
      current.setDate(current.getDate() + 7);
    }
    setWeekStart(current.toISOString().split('T')[0]);
  };

  // 오늘 날짜로 돌아가기
  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 월요일
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split('T')[0]);
  };

  const weekDates = getWeekDates();

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>출결 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 주 선택 컨트롤 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleWeekChange("prev")}
          >
            이전 주
          </Button>
          <span className="text-sm font-medium text-gray-700">
            {new Date(weekStart).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            ~{" "}
            {new Date(weekDates[4]).toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleWeekChange("next")}
          >
            다음 주
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
          >
            오늘
          </Button>
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
            <span className="text-xs text-gray-500">범례:</span>
            {statusOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-1"
                title={option.label}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${option.color}`}
                >
                  {option.value === "present" ? (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-[8px] font-medium leading-none">
                      {option.label.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
        >
          저장하기
        </Button>
      </div>

      {/* 출결 테이블 */}
      <div className="border border-gray-200 rounded-lg max-h-[calc(100vh-300px)] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th
                rowSpan={2}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 border-gray-400 sticky left-0 top-0 bg-gray-50 z-30"
              >
                학생
              </th>
              {weekDates.map((date, dayIndex) => (
                <th
                  key={date}
                  colSpan={periods.length}
                  className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r-2 ${
                    dayIndex < weekDates.length - 1 ? "border-gray-400" : "border-gray-200"
                  } bg-gray-100 sticky top-0 z-20`}
                >
                  {daysOfWeek[dayIndex]}요일
                  <br />
                  <span className="text-xs font-normal">
                    {new Date(date).toLocaleDateString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                </th>
              ))}
            </tr>
            <tr>
              {weekDates.map((date, dayIndex) =>
                periods.map((period, periodIndex) => (
                  <th
                    key={`${date}-${period.key}`}
                    className={`px-1 py-2 text-center text-xs font-medium text-gray-500 border-r sticky top-0 z-20 ${
                      periodIndex === periods.length - 1 && dayIndex < weekDates.length - 1
                        ? "border-r-2 border-gray-400"
                        : "border-gray-200"
                    } bg-gray-50`}
                  >
                    {period.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="group hover:bg-gray-200 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r-2 border-gray-400 sticky left-0 bg-white group-hover:bg-gray-200 transition-colors z-10">
                  <div>
                    <div className="font-semibold">{student.name || "-"}</div>
                    <div className="text-xs text-gray-500">
                      {student.studentProfile?.studentId || "-"}
                    </div>
                  </div>
                </td>
                {weekDates.map((date, dayIndex) =>
                  periods.map((period, periodIndex) => {
                    const currentStatus =
                      attendance[student.id]?.[date]?.[period.key] || "present";
                    const isPresent = currentStatus === "present";
                    const statusOption = statusOptions.find((opt) => opt.value === currentStatus);
                    const isLastPeriodOfDay = periodIndex === periods.length - 1;
                    const isLastDay = dayIndex === weekDates.length - 1;
                    
                    return (
                      <td
                        key={`${student.id}-${date}-${period.key}`}
                        className={`px-1 py-2 text-center border-r transition-colors ${
                          isLastPeriodOfDay && !isLastDay
                            ? "border-r-2 border-gray-400"
                            : "border-gray-200"
                        } ${dayIndex % 2 === 0 ? "bg-white group-hover:bg-gray-200" : "bg-gray-50 group-hover:bg-gray-200"}`}
                      >
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              // 클릭 시 상태 순환: present -> late -> sick_leave -> approved_absence -> excused -> present
                              const statusOrder: AttendanceStatus[] = [
                                "present",
                                "late",
                                "sick_leave",
                                "approved_absence",
                                "excused",
                              ];
                              const currentIndex = statusOrder.indexOf(currentStatus);
                              const nextIndex = (currentIndex + 1) % statusOrder.length;
                              handleStatusChange(
                                student.id,
                                date,
                                period.key,
                                statusOrder[nextIndex]
                              );
                            }}
                            className={`
                              w-4 h-4 rounded border-2 flex items-center justify-center
                              transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500
                              ${
                                isPresent
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : statusOption?.color || "bg-gray-100 border-gray-300 text-gray-700"
                              }
                              hover:opacity-80
                            `}
                            title={statusOption?.label || "출석"}
                          >
                            {isPresent ? (
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <span className="text-[8px] font-medium leading-none">
                                {statusOption?.label.charAt(0) || "○"}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

