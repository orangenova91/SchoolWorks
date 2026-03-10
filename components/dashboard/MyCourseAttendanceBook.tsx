"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAfterSchoolManager } from "./useAfterSchoolManager";
import { AfterSchoolManagerInfo } from "./AfterSchoolManagerInfo";

type Course = {
  id: string;
  subject: string;
  instructor?: string | null;
  [key: string]: unknown;
};

type ClassGroup = {
  id: string;
  name: string;
  period: string | null;
  schedules: Array<{ day: string; period: string }>;
  courseId: string;
  studentIds: string[];
  courseSubject?: string; // 강의명 (드롭다운 라벨용)
  courseTotalSessions?: number; // 강의 총 시수
  courseStartDate?: string | Date | null; // 학반별 강의 시작일 (저장된 값)
  dateOverrides?: string | null; // 차시별 날짜 조정 JSON
};

type Student = {
  id: string;
  name: string | null;
  email: string;
  studentProfile?: {
    studentId: string | null;
    classLabel: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "present", label: "출석" },
  { value: "late", label: "지각" },
  { value: "sick_leave", label: "병결" },
  { value: "approved_absence", label: "인정결" },
  { value: "excused", label: "공결" },
];

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 요일 한글 → JS getDay() (일=0, 월=1, ..., 토=6)
const DAY_TO_JS: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type ClassDay = {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  day: string;
  period: string;
  sessionNumber: number; // 1차시, 2차시...
  label: string;
};

/** 강의 시작일 + 총 시수 + schedules 기준으로 N차시별 수업일 계산 */
function getClassDaysByStartDate(
  startDate: Date,
  totalSessions: number,
  schedules: Array<{ day: string; period: string }>
): ClassDay[] {
  const sches = Array.isArray(schedules) ? schedules : [];
  if (sches.length === 0 || totalSessions < 1) return [];

  const scheduleDays = new Set(
    sches.map((s) => DAY_TO_JS[s?.day]).filter((v) => v !== undefined)
  );
  if (scheduleDays.size === 0) return [];

  const result: ClassDay[] = [];
  let current = new Date(startDate);
  current.setHours(12, 0, 0, 0);

  // 강의 시작일이 수업 요일이 아니면 가장 가까운 수업일로 보정
  if (!scheduleDays.has(current.getDay())) {
    for (let j = 1; j <= 7; j++) {
      const next = new Date(current);
      next.setDate(current.getDate() + j);
      if (scheduleDays.has(next.getDay())) {
        current = next;
        break;
      }
    }
  }

  for (let i = 0; i < totalSessions; i++) {
    const sessionNumber = i + 1;
    const dateKey = formatDateForInput(current);
    const m = current.getMonth() + 1;
    const d = current.getDate();
    const dayName = DAY_NAMES[current.getDay()];
    const period = sches.find((s) => s.day === dayName)?.period ?? "";
    const label = period
      ? `${m}/${d}(${dayName}) ${period}교시`
      : `${m}/${d}(${dayName})`;
    result.push({
      date: new Date(current),
      dateKey,
      day: dayName,
      period,
      sessionNumber,
      label,
    });

    if (i < totalSessions - 1) {
      let next = new Date(current);
      for (let j = 1; j <= 7; j++) {
        next.setDate(current.getDate() + j);
        if (scheduleDays.has(next.getDay())) break;
      }
      current = next;
    }
  }
  return result;
}

export default function MyCourseAttendanceBook() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const {
    managerId,
    managerTeachers,
    isManager,
    loading: managerLoading,
    // refresh는 현재 컴포넌트에서는 사용하지 않지만, 필요 시를 위해 구조 분해해 둘 수 있다.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refresh: _refreshManager,
  } = useAfterSchoolManager(currentUserId);

  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>("");
  const [pendingStartDate, setPendingStartDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  ); // 강의 시작일 설정 폼용 (저장 전)
  const [savingStartDate, setSavingStartDate] = useState(false);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [dateOverrides, setDateOverrides] = useState<Record<number, string>>({}); // 차시 인덱스 -> YYYY-MM-DD
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({}); // "dateKey-studentId" -> status
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDates, setSavedDates] = useState<Record<string, boolean>>({}); // dateKey -> 저장 완료 여부
  const [savingDateKey, setSavingDateKey] = useState<string | null>(null); // 저장 중인 날짜
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 내 강의 목록 로드 → 각 강의별 학반 조회 후 하나의 목록으로 합침
  useEffect(() => {
    if (!session || managerLoading) {
      return;
    }

    let cancelled = false;
    setIsLoadingGroups(true);
    setError(null);
    (async () => {
      try {
        const scopeQuery = isManager ? "?scope=all" : "";
        const coursesRes = await fetch(`/api/after-school/courses${scopeQuery}`);
        if (!coursesRes.ok) {
          const data = await coursesRes.json().catch(() => ({}));
          throw new Error(data.error || "강의 목록을 불러오지 못했습니다.");
        }
        const coursesData = await coursesRes.json();
        const courses: Course[] = coursesData.courses || [];
        if (cancelled || courses.length === 0) {
          if (!cancelled) setClassGroups([]);
          return;
        }
        const allGroups: ClassGroup[] = [];
        for (const course of courses) {
          const res = await fetch(`/api/courses/${course.id}/class-groups`);
          if (!res.ok) continue;
          const data = await res.json();
          const totalSessions =
            course.totalSessions != null ? Number(course.totalSessions) : undefined;
          const groups: ClassGroup[] = (data.classGroups || []).map((g: ClassGroup) => ({
            ...g,
            courseSubject: course.subject || course.id,
            courseTotalSessions: totalSessions,
          }));
          allGroups.push(...groups);
        }
        if (!cancelled) setClassGroups(allGroups);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "학반 목록을 불러오지 못했습니다.");
          setClassGroups([]);
        }
      } finally {
        if (!cancelled) setIsLoadingGroups(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, isManager, managerLoading]);

  const selectedGroup = classGroups.find((g) => g.id === selectedClassGroupId);
  const studentIds = selectedGroup?.studentIds ?? [];
  const selectedCourseId = selectedGroup?.courseId ?? "";
  const totalSessions = selectedGroup?.courseTotalSessions ?? 0;
  const savedStartDate = selectedGroup?.courseStartDate;
  const effectiveCourseStartDate =
    savedStartDate != null
      ? new Date(typeof savedStartDate === "string" ? savedStartDate : savedStartDate)
      : null;
  const classDays =
    selectedGroup && totalSessions > 0 && effectiveCourseStartDate
      ? getClassDaysByStartDate(
          effectiveCourseStartDate,
          totalSessions,
          Array.isArray(selectedGroup.schedules) ? selectedGroup.schedules : []
        )
      : [];

  // override 적용된 실제 사용 날짜 (조회/저장/표시에 사용)
  const effectiveClassDays = classDays.map((cd, index) => {
    const override = dateOverrides[index];
    if (!override) return cd;
    const date = new Date(override + "T12:00:00");
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const dayName = DAY_NAMES[date.getDay()];
    const period = cd.period;
    const label = period
      ? `${m}/${d}(${dayName}) ${period}교시`
      : `${m}/${d}(${dayName})`;
    return {
      ...cd,
      date,
      dateKey: override,
      day: dayName,
      label,
    };
  });

  // 학반·강의시작일 변경 시: 저장된 날짜 조정 로드 또는 초기화
  useEffect(() => {
    setEditingColumnIndex(null);
    setIsEditingStartDate(false);
    if (!selectedGroup?.dateOverrides?.trim()) {
      setDateOverrides({});
      return;
    }
    try {
      const parsed = JSON.parse(selectedGroup.dateOverrides) as Record<string, string>;
      const next: Record<number, string> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        const idx = Number(k);
        if (!Number.isNaN(idx) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          next[idx] = v;
        }
      });
      setDateOverrides(next);
    } catch {
      setDateOverrides({});
    }
  }, [selectedClassGroupId, effectiveCourseStartDate?.toISOString?.() ?? "", selectedGroup?.dateOverrides]);

  // 날짜 수정 모드 시 인풋 포커스
  useEffect(() => {
    if (editingColumnIndex !== null) {
      const timer = setTimeout(() => dateInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingColumnIndex]);

  // 학반 선택 시 학생 목록 로드
  useEffect(() => {
    if (!selectedClassGroupId || !selectedGroup || studentIds.length === 0) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setIsLoadingStudents(true);
    (async () => {
      try {
        const ids = studentIds.join(",");
        const res = await fetch(`/api/teacher/students/by-ids?ids=${encodeURIComponent(ids)}`);
        if (!res.ok) throw new Error("수강생 목록을 불러오지 못했습니다.");
        const data = await res.json();
        if (!cancelled) setStudents(data.students || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "수강생 목록 로드 실패");
          setStudents([]);
        }
      } finally {
        if (!cancelled) setIsLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassGroupId, selectedCourseId]);

  // 선택 학반·날짜에 해당하는 수업일별 출결 데이터 로드 (effectiveClassDays 사용)
  useEffect(() => {
    if (!selectedCourseId || !selectedClassGroupId || effectiveClassDays.length === 0) {
      setAttendanceState({});
      setSavedDates({});
      return;
    }
    let cancelled = false;
    setIsLoadingAttendance(true);
    (async () => {
      try {
        const next: Record<string, string> = {};
        const savedByDate: Record<string, boolean> = {};
        await Promise.all(
          effectiveClassDays.map(async (cd) => {
            const res = await fetch(
              `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance?date=${cd.date.toISOString()}`
            );
            if (!res.ok) return { cd, attendances: [] as { studentId: string; status: string }[], saved: false };
            const data = await res.json();
            const attendances = data.attendances || [];
            const saved = data.saved === true;
            attendances.forEach((a: { studentId: string; status: string }) => {
              next[`${cd.dateKey}-${a.studentId}`] = a.status;
            });
            savedByDate[cd.dateKey] = saved;
          })
        );
        if (!cancelled) {
          setAttendanceState(next);
          setSavedDates(savedByDate);
        }
      } catch {
        if (!cancelled) setAttendanceState({});
      } finally {
        if (!cancelled) setIsLoadingAttendance(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedCourseId,
    selectedClassGroupId,
    effectiveCourseStartDate?.toISOString?.() ?? "",
    Object.entries(dateOverrides).sort((a, b) => Number(a[0]) - Number(b[0])).join(","),
  ]);

  const handleSaveCourseStartDate = async () => {
    if (!selectedGroup || !selectedCourseId) return;
    setSavingStartDate(true);
    try {
      const res = await fetch(
        `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/course-start-date`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseStartDate: pendingStartDate + "T12:00:00.000Z" }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      const data = await res.json();
      const savedDate = data.courseStartDate;
      setClassGroups((prev) =>
        prev.map((g) =>
          g.id === selectedClassGroupId
            ? { ...g, courseStartDate: savedDate }
            : g
        )
      );
      setIsEditingStartDate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "강의 시작일 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingStartDate(false);
    }
  };

  const handleStatusChange = (dateKey: string, studentId: string, status: string) => {
    const key = `${dateKey}-${studentId}`;
    setAttendanceState((prev) => ({ ...prev, [key]: status }));
  };

  const saveDateOverridesToBackend = async (overrides: Record<number, string>) => {
    if (!selectedCourseId || !selectedClassGroupId) return;
    const payload = Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [String(k), v])
    );
    const res = await fetch(
      `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/date-overrides`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOverrides: payload }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "날짜 조정 저장에 실패했습니다.");
    }
    setClassGroups((prev) =>
      prev.map((g) =>
        g.id === selectedClassGroupId
          ? { ...g, dateOverrides: JSON.stringify(payload) }
          : g
      )
    );
  };

  const handleDateOverride = (index: number, value: string) => {
    if (!value) return;
    const baseDateKey = classDays[index]?.dateKey;
    let next: Record<number, string>;
    setDateOverrides((prev) => {
      if (value === baseDateKey) {
        next = { ...prev };
        delete next[index];
      } else {
        next = { ...prev, [index]: value };
      }
      saveDateOverridesToBackend(next).catch((err) => {
        alert(err instanceof Error ? err.message : "날짜 조정 저장 중 오류가 발생했습니다.");
      });
      return next;
    });
    setEditingColumnIndex(null);
  };

  const handleSave = async () => {
    if (!selectedGroup || effectiveClassDays.length === 0) {
      alert("학반을 선택해주세요.");
      return;
    }
    setSaving(true);
    try {
      let savedCount = 0;
      for (const cd of effectiveClassDays) {
        const attendances = students.map((s) => ({
          studentId: s.id,
          status: (attendanceState[`${cd.dateKey}-${s.id}`] || "present") as
            | "present"
            | "late"
            | "sick_leave"
            | "approved_absence"
            | "excused",
        }));

        const res = await fetch(
          `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: cd.date.toISOString(),
              attendances,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "출결 저장에 실패했습니다.");
        }
        savedCount += attendances.length;
      }
      alert(`출결이 저장되었습니다. (${effectiveClassDays.length}일, ${savedCount}건)`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "출결 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOneDate = async (cd: ClassDay) => {
    if (!selectedGroup || !selectedCourseId || students.length === 0) {
      alert("학반을 선택해주세요.");
      return;
    }
    setSavingDateKey(cd.dateKey);
    try {
      const attendances = students.map((s) => ({
        studentId: s.id,
        status: (attendanceState[`${cd.dateKey}-${s.id}`] || "present") as
          | "present"
          | "late"
          | "sick_leave"
          | "approved_absence"
          | "excused",
      }));
      const res = await fetch(
        `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: cd.date.toISOString(),
            attendances,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "출결 저장에 실패했습니다.");
      }
      setSavedDates((prev) => ({ ...prev, [cd.dateKey]: true }));
      // 저장 후 해당 날짜 출결 재조회 → 드롭다운 선택값 유지
      const refetchRes = await fetch(
        `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance?date=${cd.date.toISOString()}`
      );
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json();
        const attendances = refetchData.attendances || [];
        setAttendanceState((prev) => {
          const next = { ...prev };
          attendances.forEach((a: { studentId: string; status: string }) => {
            next[`${cd.dateKey}-${a.studentId}`] = a.status;
          });
          // 출석(present)은 DB에 없으므로, 저장한 present는 유지 (삭제하지 않음)
          students.forEach((s) => {
            const key = `${cd.dateKey}-${s.id}`;
            if (!(key in next)) next[key] = "present";
          });
          return next;
        });
      }
      (document.activeElement as HTMLElement | null)?.blur();
    } catch (err) {
      alert(err instanceof Error ? err.message : "출결 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingDateKey(null);
    }
  };

  const handleCancelOneDate = async (cd: ClassDay) => {
    if (!selectedGroup || !selectedCourseId) {
      alert("학반을 선택해주세요.");
      return;
    }

    const ok = confirm(
      `${cd.sessionNumber}차시 (${cd.dateKey}) 저장된 출결을 취소할까요?\n취소하면 해당 날짜의 출결 입력 내용이 삭제됩니다.`
    );
    if (!ok) return;

    setSavingDateKey(cd.dateKey);
    try {
      const res = await fetch(
        `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance?date=${encodeURIComponent(
          cd.date.toISOString()
        )}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "출결 저장 취소에 실패했습니다.");
      }

      setSavedDates((prev) => ({ ...prev, [cd.dateKey]: false }));
      // attendanceState는 그대로 유지 (기존 선택값 보존, 재편집·재저장 가능)
    } catch (err) {
      alert(err instanceof Error ? err.message : "출결 저장 취소 중 오류가 발생했습니다.");
    } finally {
      setSavingDateKey(null);
    }
  };

  const openPrintWindow = () => {
    if (!selectedGroup || effectiveClassDays.length === 0) {
      alert("인쇄할 출석부를 먼저 준비해주세요. (학반/강의 시작일/차시 정보 확인)");
      return;
    }
    if (students.length === 0) {
      alert("인쇄할 수강생이 없습니다.");
      return;
    }

    const payload = {
      classGroupName: selectedGroup.name,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        studentId: s.studentProfile?.studentId ?? null,
        classLabel: s.studentProfile?.classLabel ?? null,
      })),
      dates: effectiveClassDays.map((cd, index) => ({
        dateKey: cd.dateKey,
        label: cd.label,
        sessionNumber: index + 1,
      })),
    };

    try {
      const json = JSON.stringify(payload);
      const encoded = encodeURIComponent(json);
      const url = `/dashboard/teacher/after-school/attendance-print?data=${encoded}`;
      window.open(url, "attendancePrintWindow", "width=1000,height=800,noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open print page", err);
      alert("출석부 인쇄 페이지를 여는 중 오류가 발생했습니다.");
    }
  };

  if (isLoadingGroups) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">학반 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error && classGroups.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  let attendanceSection: JSX.Element | null = null;

  if (selectedClassGroupId) {
    if (!selectedGroup) {
      attendanceSection = null;
    } else if (!effectiveCourseStartDate) {
      attendanceSection = (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">강의 시작일 설정</h3>
          <p className="text-sm text-gray-600 mb-4">
            출석부를 사용하려면 이 학반의 강의 시작일(1차시 날짜)을 설정하고 저장해주세요.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                강의 시작일 (1차시)
              </label>
              <input
                type="date"
                value={pendingStartDate}
                onChange={(e) => setPendingStartDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveCourseStartDate}
              disabled={savingStartDate}
            >
              {savingStartDate ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      );
    } else if (isEditingStartDate) {
      attendanceSection = (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2">강의 시작일 수정</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                강의 시작일 (1차시)
              </label>
              <input
                type="date"
                value={pendingStartDate}
                onChange={(e) => setPendingStartDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveCourseStartDate}
              disabled={savingStartDate}
            >
              {savingStartDate ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingStartDate(false)}
            >
              취소
            </Button>
          </div>
        </div>
      );
    } else if (classDays.length === 0) {
      attendanceSection = (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            {totalSessions < 1
              ? "강의에 총 시수가 등록되지 않았습니다. 강의 정보에서 총 시수를 설정해주세요."
              : "이 학반에 수업 요일·교시가 등록되지 않았습니다. 학반 정보에서 차시별 요일·교시를 설정해주세요."}
          </p>
        </div>
      );
    } else if (isLoadingStudents || isLoadingAttendance) {
      attendanceSection = (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">수강생·출결 정보를 불러오는 중...</p>
        </div>
      );
    } else if (students.length === 0) {
      attendanceSection = (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">이 학반에 등록된 수강생이 없습니다.</p>
        </div>
      );
    } else {
      attendanceSection = (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-sm text-gray-600">
              강의 시작일:{" "}
              {effectiveCourseStartDate && formatDateForInput(effectiveCourseStartDate)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openPrintWindow}
                className="text-xs text-gray-700 hover:text-gray-900 border border-gray-300 rounded px-2 py-1 bg-white"
              >
                인쇄
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingStartDate(
                    effectiveCourseStartDate
                      ? formatDateForInput(effectiveCourseStartDate)
                      : new Date().toISOString().slice(0, 10)
                  );
                  setIsEditingStartDate(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                수정
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedCourseId || !selectedClassGroupId) return;
                  const ok = confirm(
                    "출석부를 삭제할까요?\n삭제하면 강의 시작일/날짜 조정이 초기화되고, 저장된 출결과 저장완료 기록이 모두 삭제됩니다."
                  );
                  if (!ok) return;

                  try {
                    const res = await fetch(
                      `/api/courses/${selectedCourseId}/class-groups/${selectedClassGroupId}/attendance-book`,
                      { method: "DELETE" }
                    );
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || "출석부 삭제에 실패했습니다.");
                    }

                    setClassGroups((prev) =>
                      prev.map((g) =>
                        g.id === selectedClassGroupId
                          ? { ...g, courseStartDate: null, dateOverrides: null }
                          : g
                      )
                    );
                    setDateOverrides({});
                    setAttendanceState({});
                    setSavedDates({});
                    setIsEditingStartDate(false);
                    alert("출석부가 삭제되었습니다.");
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "출석부 삭제 중 오류가 발생했습니다."
                    );
                  }
                }}
                className="text-xs text-red-600 hover:text-red-800"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
              {/* HEADER */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-20 px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    이름
                  </th>

                  {effectiveClassDays.map((cd, index) => (
                    <th
                      key={index}
                      className="w-28 px-3 py-2 text-center text-xs font-semibold text-gray-600"
                    >
                      {editingColumnIndex === index ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            ref={editingColumnIndex === index ? dateInputRef : undefined}
                            type="date"
                            defaultValue={cd.dateKey}
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v) handleDateOverride(index, v);
                              setEditingColumnIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = (e.target as HTMLInputElement).value;
                                if (v) handleDateOverride(index, v);
                                setEditingColumnIndex(null);
                              }
                              if (e.key === "Escape") {
                                setEditingColumnIndex(null);
                              }
                            }}
                            autoFocus
                          />
                          <span className="text-[10px] text-gray-500">
                            {index + 1}차시
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingColumnIndex(index)}
                          className="w-full rounded px-1 py-0.5 hover:bg-gray-100"
                          title="날짜 수정"
                          aria-label="날짜 수정"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100 whitespace-nowrap">
                              {cd.sessionNumber}차시
                            </span>
                            <span className="whitespace-nowrap">{cd.label}</span>
                          </div>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY */}
              <tbody className="divide-y divide-gray-100 bg-white">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="w-28 px-3 py-2 text-gray-900 whitespace-nowrap">
                      <span className="mr-2 text-xs text-gray-500">
                        {s.studentProfile?.studentId ?? ""}
                      </span>
                      <span>{s.name ?? s.email ?? "이름 없음"}</span>
                    </td>

                    {effectiveClassDays.map((cd, index) => (
                      <td key={index} className="px-3 py-2 text-center">
                        <Select
                          options={STATUS_OPTIONS}
                          value={attendanceState[`${cd.dateKey}-${s.id}`] || "present"}
                          onChange={(e) =>
                            handleStatusChange(cd.dateKey, s.id, e.target.value)
                          }
                          disabled={savedDates[cd.dateKey]}
                          className="w-20 h-7 px-2 py-1 text-xs mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* FOOTER */}
              <tfoot className="sticky bottom-0 z-10 bg-gray-50 border-t">
                <tr>
                  <td className="px-4 py-2 text-xs font-semibold text-gray-600">
                    저장
                  </td>

                  {effectiveClassDays.map((cd, index) => (
                    <td key={index} className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: savedDates[cd.dateKey] ? "#16a34a" : "#9ca3af",
                            backgroundColor: savedDates[cd.dateKey] ? "#16a34a" : "transparent",
                          }}
                        >
                          {savedDates[cd.dateKey] && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        <Button
                          type="button"
                          variant={savedDates[cd.dateKey] ? "secondary" : "primary"}
                          onClick={() =>
                            savedDates[cd.dateKey]
                              ? handleCancelOneDate(cd)
                              : handleSaveOneDate(cd)
                          }
                          disabled={savingDateKey === cd.dateKey}
                          className="h-6 px-2 text-[11px]"
                        >
                          {savingDateKey === cd.dateKey
                            ? "처리 중..."
                            : savedDates[cd.dateKey]
                              ? "저장됨"
                              : "저장"}
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* 왼쪽: 제목 및 설명 영역 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            내 강의 수강생 출석부
          </h2>
          <p className="text-sm text-gray-600">
            학반을 선택한 뒤 강의 시작일과 총 시수를 기준으로 차시별 출결을 확인·저장할 수 있습니다.
          </p>
        </div>

        {/* 오른쪽: 매니저 정보 영역 */}
        <div className="flex-shrink-0">
          <AfterSchoolManagerInfo
            managerId={managerId}
            managerTeachers={managerTeachers}
            className="text-sm text-gray-700"
          />
        </div>
      </div>

      {classGroups.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            담당 중인 방과후 강의에 학반이 없습니다. 강의를 먼저 만들고 학반을 생성해주세요.
          </p>
        </div>
      )}

      {classGroups.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[280px]">
              <label className="mb-1 block text-xs font-medium text-gray-600">학반</label>
              <Select
                value={selectedClassGroupId}
                onChange={(e) => setSelectedClassGroupId(e.target.value)}
                options={[
                  { value: "", label: "학반 선택" },
                  ...classGroups.map((g) => {
                    const subject = g.courseSubject || "";
                    const namePart =
                      g.name +
                      (g.courseTotalSessions != null && g.courseTotalSessions > 0
                        ? ` (총 ${g.courseTotalSessions} 차시)`
                        : "");
                    const label = subject ? `${namePart}` : namePart;
                    return { value: g.id, label };
                  }),
                ]}
                className="w-full"
              />
            </div>
          </div>

          {attendanceSection}
        </>
      )}

    </div>
  );
}
