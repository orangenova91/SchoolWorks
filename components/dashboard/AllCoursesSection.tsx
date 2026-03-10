"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAfterSchoolManager } from "./useAfterSchoolManager";
import { AfterSchoolManagerInfo } from "./AfterSchoolManagerInfo";

type AllCoursesSectionProps = {
  currentUserId: string;
};

export default function AllCoursesSection({ currentUserId }: AllCoursesSectionProps) {
  type SortKey = "subject" | "semester" | "schedule" | "instructor" | "students";

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>({
    key: "subject",
    direction: "asc",
  });
  const [courses, setCourses] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    academicYear: "",
    semester: "",
    grade: "",
    classroom: "",
    description: "",
    capacity: "",
    totalSessions: "",
  });
  const [cgPeriod, setCgPeriod] = useState("1");
  const [cgSchedules, setCgSchedules] = useState<Array<{ day: string; period: string }>>([
    { day: "", period: "" },
  ]);
  const [cgErrors, setCgErrors] = useState<{ period?: string; schedules?: string }>({});
  const [classGroupId, setClassGroupId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const {
    managerId,
    managerTeachers,
    isManager,
    loading: managerLoading,
    error: managerError,
    refresh: refreshManager,
  } = useAfterSchoolManager(currentUserId);
  const [managerSaving, setManagerSaving] = useState(false);
  const [isManagerCreateOpen, setIsManagerCreateOpen] = useState(false);
  const [managerCreateSaving, setManagerCreateSaving] = useState(false);
  const [managerCreateError, setManagerCreateError] = useState<string | null>(null);
  const [managerCreateForm, setManagerCreateForm] = useState({
    teacherId: "",
    academicYear: "",
    semester: "",
    grade: "",
    subject: "",
    classroom: "",
    description: "",
    capacity: "",
    totalSessions: "",
  });

  const semesterOptions = [
    { value: "1학기", label: "1학기" },
    { value: "2학기", label: "2학기" },
  ];

  const gradeOptions = [
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
    { value: "무학년제", label: "무학년제" },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/after-school/courses?scope=all");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "강의 목록을 불러오는 데 실패했습니다.");
        }
        const data = await res.json();
        if (!cancelled) setCourses(data.courses || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "강의 목록을 불러오는 데 실패했습니다.");
          setCourses([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (managerId) {
      setSelectedManagerId(managerId);
    }
  }, [managerId]);

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleManagerCreateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setManagerCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const openManagerCreateModal = () => {
    const initialTeacherId = managerId ?? currentUserId;
    setManagerCreateForm({
      teacherId: initialTeacherId,
      academicYear: `${new Date().getFullYear()}`,
      semester: "",
      grade: "",
      subject: "",
      classroom: "",
      description: "",
      capacity: "",
      totalSessions: "",
    });
    setManagerCreateError(null);
    setCgErrors({});
    setCgPeriod("1");
    setCgSchedules([{ day: "", period: "" }]);
    setIsManagerCreateOpen(true);
  };

  const closeManagerCreateModal = () => {
    if (managerCreateSaving) return;
    setIsManagerCreateOpen(false);
  };

  const handleManagerCreateSave = async () => {
    if (!managerCreateForm.teacherId) {
      setManagerCreateError("생성할 교사를 선택해주세요.");
      return;
    }
    if (!managerCreateForm.academicYear?.trim()) {
      setManagerCreateError("학년도를 입력해주세요.");
      return;
    }
    if (!managerCreateForm.semester?.trim()) {
      setManagerCreateError("학기를 선택해주세요.");
      return;
    }
    if (!managerCreateForm.grade?.trim()) {
      setManagerCreateError("대상 학년을 선택해주세요.");
      return;
    }
    if (!managerCreateForm.subject.trim()) {
      setManagerCreateError("강좌명을 입력해주세요.");
      return;
    }
    if (!managerCreateForm.classroom?.trim()) {
      setManagerCreateError("강의실을 입력해주세요.");
      return;
    }
    if (!managerCreateForm.description?.trim()) {
      setManagerCreateError("강의소개를 입력해주세요.");
      return;
    }
    if (!managerCreateForm.capacity?.trim() || parseInt(managerCreateForm.capacity, 10) < 1) {
      setManagerCreateError("정원을 입력해주세요.");
      return;
    }
    if (!managerCreateForm.totalSessions?.trim() || parseInt(managerCreateForm.totalSessions, 10) < 1) {
      setManagerCreateError("총 시수를 입력해주세요.");
      return;
    }
    const periodNum = parseInt(cgPeriod, 10) || 0;
    if (!periodNum || periodNum < 1) {
      setManagerCreateError("주당 차시를 입력해주세요.");
      return;
    }
    const slice = cgSchedules.slice(0, periodNum);
    const incomplete = slice.some((s) => !s.day || !s.period);
    if (incomplete) {
      setCgErrors({ schedules: "모든 차시의 요일과 교시를 입력해주세요." });
      setManagerCreateError("모든 차시의 요일과 교시를 입력해주세요.");
      return;
    }
    const trimmedSchedules = slice.filter((s) => s.day && s.period);

    try {
      setManagerCreateSaving(true);
      setManagerCreateError(null);
      const res = await fetch("/api/after-school/admin-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: managerCreateForm.teacherId,
          academicYear: managerCreateForm.academicYear.trim(),
          semester: managerCreateForm.semester.trim(),
          grade: managerCreateForm.grade.trim(),
          subject: managerCreateForm.subject.trim(),
          classroom: managerCreateForm.classroom.trim(),
          description: managerCreateForm.description.trim(),
          capacity: managerCreateForm.capacity.trim(),
          totalSessions: managerCreateForm.totalSessions.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "강의 생성에 실패했습니다.");
      }

      // 새로 생성된 강의에 차시 스케줄이 있으면 학반도 생성
      const newCourseId = data.course?.id as string | undefined;
      if (newCourseId && trimmedSchedules.length > 0) {
        try {
          const cgRes = await fetch(`/api/courses/${newCourseId}/class-groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: managerCreateForm.subject.trim(),
              period: cgPeriod.trim() || null,
              schedules: trimmedSchedules,
              studentIds: [] as string[],
            }),
          });
          const cgData = await cgRes.json().catch(() => ({}));
          if (!cgRes.ok) {
            console.error("Manager create class-group error:", cgData);
          }
        } catch (err) {
          console.error("Manager create class-group error:", err);
        }
      }

      // 새로 생성된 강의가 전체 목록에 반영되도록 강의 목록 다시 조회
      try {
        setIsLoading(true);
        const listRes = await fetch("/api/after-school/courses?scope=all");
        if (listRes.ok) {
          const listData = await listRes.json().catch(() => ({}));
          setCourses(listData.courses || []);
        }
      } catch {
        // 목록 재조회 실패는致命적이지 않으므로 조용히 무시
      } finally {
        setIsLoading(false);
      }

      setIsManagerCreateOpen(false);
    } catch (err) {
      console.error(err);
      setManagerCreateError(err instanceof Error ? err.message : "강의 생성 중 오류가 발생했습니다.");
    } finally {
      setManagerCreateSaving(false);
    }
  };

  const handleCgPeriodChange = (value: string) => {
    setCgPeriod(value);
    const periodCount = parseInt(value, 10) || 0;
    if (periodCount > 0) {
      setCgSchedules((prev) => {
        const newSchedules = Array.from({ length: periodCount }, (_, index) => {
          return prev[index] || { day: "", period: "" };
        });
        return newSchedules;
      });
    } else {
      setCgSchedules([{ day: "", period: "" }]);
    }
  };

  const handleCgScheduleChange = (index: number, field: "day" | "period", value: string) => {
    setCgSchedules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteCourse = async () => {
    if (!editingCourse) return;
    const id = editingCourse.id as string | undefined;
    if (!id) return;
    if (!window.confirm("정말 이 강좌를 삭제하시겠습니까?")) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "삭제 실패");
      }
      // 삭제된 강좌를 목록에서 제거
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setEditingCourse(null);
    } catch (err) {
      console.error(err);
      window.alert(
        err instanceof Error && err.message
          ? err.message
          : "삭제 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleManagerSave = async () => {
    if (!selectedManagerId) {
      window.alert("담당자로 지정할 교사를 선택해주세요.");
      return;
    }
    try {
      setManagerSaving(true);
      const res = await fetch("/api/after-school/manager", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedManagerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "담당자 설정에 실패했습니다.");
      }
      const managerTeacherId = data.manager?.teacherId as string | undefined;
      setSelectedManagerId(managerTeacherId ?? "");
      // 서버의 담당자 정보가 바뀌었으므로 훅 상태를 즉시 새로고침
      refreshManager();
      window.alert("담당자가 저장되었습니다.");
    } catch (err) {
      console.error(err);
      window.alert(
        err instanceof Error ? err.message : "담당자 설정에 실패했습니다."
      );
    } finally {
      setManagerSaving(false);
    }
  };

  const openEdit = (course: any) => {
    setEditingCourse(course);
    setEditForm({
      subject: course.subject || "",
      academicYear: course.academicYear || "",
      semester: course.semester || "",
      grade: course.grade || "",
      classroom: course.classroom || "",
      description: course.description || "",
      capacity: course.capacity != null ? String(course.capacity) : "",
      totalSessions: course.totalSessions != null ? String(course.totalSessions) : "",
    });
    setEditError(null);
    setCgErrors({});
    setCgPeriod("1");
    setCgSchedules([{ day: "", period: "" }]);
    setClassGroupId(null);

    if (course && course.id) {
      (async () => {
        try {
          const res = await fetch(`/api/courses/${course.id}/class-groups`);
          if (!res.ok) return;
          const data = await res.json().catch(() => null);
          const groups = data?.classGroups || [];
          if (Array.isArray(groups) && groups.length > 0) {
            const g = groups[0];
            setClassGroupId(g.id || null);
            const schedules =
              Array.isArray(g.schedules) && g.schedules.length > 0
                ? g.schedules
                : [{ day: "", period: "" }];
            setCgSchedules(schedules);
            const periodFromGroup =
              typeof g.period === "string" && g.period.trim() !== ""
                ? g.period
                : String(schedules.length || 1);
            setCgPeriod(periodFromGroup);
          }
        } catch (err) {
          console.error("Failed to fetch class-groups for course:", err);
        }
      })();
    }
  };

  const closeEdit = () => {
    if (isSaving) return;
    setEditingCourse(null);
    setEditError(null);
  };

  const handleSave = async () => {
    if (!editingCourse) return;
    // 필수 필드 검증
    if (!editForm.academicYear?.trim()) {
      setEditError("학년도를 입력해주세요.");
      return;
    }
    if (!editForm.semester?.trim()) {
      setEditError("학기를 선택해주세요.");
      return;
    }
    if (!editForm.grade?.trim()) {
      setEditError("대상 학년을 선택해주세요.");
      return;
    }
    if (!editForm.subject.trim()) {
      setEditError("강좌명을 입력해주세요.");
      return;
    }
    if (!editForm.classroom?.trim()) {
      setEditError("강의실을 입력해주세요.");
      return;
    }
    if (!editForm.description?.trim()) {
      setEditError("강의소개를 입력해주세요.");
      return;
    }
    if (!editForm.capacity?.trim() || parseInt(editForm.capacity, 10) < 1) {
      setEditError("정원을 입력해주세요.");
      return;
    }
    if (!editForm.totalSessions?.trim() || parseInt(editForm.totalSessions, 10) < 1) {
      setEditError("총 시수를 입력해주세요.");
      return;
    }
    const periodNum = parseInt(cgPeriod, 10) || 0;
    if (!periodNum || periodNum < 1) {
      setEditError("주당 차시를 입력해주세요.");
      return;
    }
    const incomplete = cgSchedules.slice(0, periodNum).some((s) => !s.day || !s.period);
    if (incomplete) {
      setCgErrors({ schedules: "모든 차시의 요일과 교시를 입력해주세요." });
      setEditError("차시별 요일 및 교시 정보를 확인해주세요.");
      return;
    }

    let shouldUpdateClassGroup = true;
    const trimmedSchedules = cgSchedules.slice(0, periodNum).filter((s) => s.day && s.period);

    try {
      setIsSaving(true);
      setEditError(null);
      setCgErrors({});
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editForm.subject.trim(),
          grade: editForm.grade || undefined,
          classroom: editForm.classroom || undefined,
          description: editForm.description || undefined,
          academicYear: editForm.academicYear || undefined,
          semester: editForm.semester || undefined,
          capacity: editForm.capacity ? String(editForm.capacity) : undefined,
          totalSessions: editForm.totalSessions ? String(editForm.totalSessions) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "강의 수정에 실패했습니다.");
      }

      let updatedScheduleDisplay: string | undefined;

      if (shouldUpdateClassGroup && trimmedSchedules.length > 0) {
        const courseId = editingCourse.id as string;
        const payload: { name: string; period: string | null; schedules: typeof trimmedSchedules; studentIds?: string[] } = {
          name: editForm.subject.trim(),
          period: cgPeriod.trim() || null,
          schedules: trimmedSchedules,
        };
        if (!classGroupId) {
          payload.studentIds = [];
        }

        const cgRes = await fetch(
          classGroupId
            ? `/api/courses/${courseId}/class-groups/${classGroupId}`
            : `/api/courses/${courseId}/class-groups`,
          {
            method: classGroupId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const cgData = await cgRes.json().catch(() => ({}));
        if (!cgRes.ok) {
          throw new Error(cgData.error || "차시별 요일 및 교시 저장에 실패했습니다.");
        }

        updatedScheduleDisplay = trimmedSchedules
          .map((s) => `${s.day} ${s.period}`)
          .join(", ");
      }

      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                subject: editForm.subject,
                grade: editForm.grade,
                classroom: editForm.classroom,
                description: editForm.description,
                academicYear: editForm.academicYear,
                semester: editForm.semester,
                capacity: editForm.capacity ? parseInt(editForm.capacity, 10) : undefined,
                totalSessions: editForm.totalSessions ? parseInt(editForm.totalSessions, 10) : undefined,
                classGroupSchedule:
                  typeof updatedScheduleDisplay === "string"
                    ? updatedScheduleDisplay
                    : c.classGroupSchedule,
              }
            : c
        )
      );

      closeEdit();
    } catch (err) {
      console.error(err);
      const errMessage = err instanceof Error ? err.message : "강의 수정 중 오류가 발생했습니다.";
      if (errMessage.includes("겹칩니다")) {
        window.alert(errMessage);
      }
      setEditError(errMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">전체 강의 보기</h2>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  // 대상학년 기준 분류
  // - grade가 비었거나 "1" → 1학년
  // - "2" → 2학년
  // - "3" → 3학년
  // - "무학년제" → 모든 학년 섹션(1,2,3)에 표시
  const grade1 = courses.filter((c: any) => {
    const g = (c.grade ?? "").toString().trim();
    return !g || g === "1" || g === "무학년제";
  });
  const grade2 = courses.filter((c: any) => {
    const g = (c.grade ?? "").toString().trim();
    return g === "2" || g === "무학년제";
  });
  const grade3 = courses.filter((c: any) => {
    const g = (c.grade ?? "").toString().trim();
    return g === "3" || g === "무학년제";
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig?.key !== key) return null;
    return <span className="ml-1 text-xs">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>;
  };

  const compareString = (a: unknown, b: unknown) => {
    const sa = (a ?? "").toString();
    const sb = (b ?? "").toString();
    if (!sa && !sb) return 0;
    if (!sa) return -1;
    if (!sb) return 1;
    return sa.localeCompare(sb, "ko");
  };

  const compareNumber = (a: number, b: number) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  };

  const sections = [
    { label: "1학년", courses: grade1 },
    { label: "2학년", courses: grade2 },
    { label: "3학년", courses: grade3 },
  ] as const;

  const renderTable = (list: any[]) => {
    let displayList = list;

    if (sortConfig) {
      const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
      displayList = [...list].sort((a, b) => {
        switch (sortConfig.key) {
          case "subject":
            return compareString(a.subject, b.subject) * directionFactor;
          case "semester":
            return compareString(a.semester, b.semester) * directionFactor;
          case "schedule":
            return compareString(a.classGroupSchedule, b.classGroupSchedule) * directionFactor;
          case "instructor":
            return compareString(a.instructor, b.instructor) * directionFactor;
          case "students": {
            const aEnrolled = Array.isArray(a.firstClassGroupStudentIds)
              ? a.firstClassGroupStudentIds.length
              : 0;
            const bEnrolled = Array.isArray(b.firstClassGroupStudentIds)
              ? b.firstClassGroupStudentIds.length
              : 0;
            const enrolledCompare = compareNumber(aEnrolled, bEnrolled);
            if (enrolledCompare !== 0) {
              return enrolledCompare * directionFactor;
            }
            const aCap = a.capacity != null ? Number(a.capacity) : Number.POSITIVE_INFINITY;
            const bCap = b.capacity != null ? Number(b.capacity) : Number.POSITIVE_INFINITY;
            return compareNumber(aCap, bCap) * directionFactor;
          }
          default:
            return 0;
        }
      });
    }

    return (
      <div className="-mx-6 w-[calc(100%+3rem)] min-w-0 overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">번호</th>
              <th className="text-left py-3 px-0 text-sm font-semibold text-gray-700 whitespace-nowrap">
                <button
                  type="button"
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("subject")}
                >
                  <span>강좌명</span>
                  {getSortIndicator("subject")}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">
                <button
                  type="button"
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("semester")}
                >
                  <span>학기</span>
                  {getSortIndicator("semester")}
                </button>
              </th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 whitespace-nowrap">
                <button
                  type="button"
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("schedule")}
                >
                  <span>스케줄</span>
                  {getSortIndicator("schedule")}
                </button>
              </th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 whitespace-nowrap">
                <button
                  type="button"
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("instructor")}
                >
                  <span>강사</span>
                  {getSortIndicator("instructor")}
                </button>
              </th>
              <th className="text-left py-3 px-0 text-sm font-semibold text-gray-700 whitespace-nowrap">
                <button
                  type="button"
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("students")}
                >
                  <span>수강생 수</span>
                  {getSortIndicator("students")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  등록된 강의가 없습니다.
                </td>
              </tr>
            ) : (
              displayList.map((c: any, idx: number) => {
                const canEdit = c.teacherId === currentUserId || isManager;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      canEdit ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!canEdit) {
                        window.alert("수정 권한이 없습니다.");
                        return;
                      }
                      openEdit(c);
                    }}
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">{idx + 1}</td>
                    <td className="py-3 px-0 text-sm text-gray-900">
                      <span className="line-clamp-2 break-words block min-w-0 ml-[-15px]">
                        {c.subject}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{c.semester || "-"}</td>
                    <td className="py-3 px-2 text-sm text-gray-600 text-center">
                      {c.classGroupSchedule || "-"}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">{c.instructor}</td>
                    <td className="py-3 px-2 text-sm text-gray-600 text-center">
                      {(() => {
                        const enrolled = Array.isArray(c.firstClassGroupStudentIds)
                          ? c.firstClassGroupStudentIds.length
                          : 0;
                        const cap = c.capacity != null ? Number(c.capacity) : null;
                        if (cap != null && !Number.isNaN(cap)) {
                          return `${enrolled}/${cap}명`;
                        }
                        return `${enrolled}명`;
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">전체 강의 보기</h2>
            <p className="text-sm text-gray-600">
              같은 학교 교사들이 생성한 방과후 강의 목록입니다. 대상 학년별로 구분되어 있습니다.
            </p>
          </div>
          <div className="mt-2 sm:mt-0 flex flex-col gap-2 sm:items-end">
            <AfterSchoolManagerInfo managerId={managerId} managerTeachers={managerTeachers} />
            {managerTeachers.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                {isManager && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={openManagerCreateModal}
                    className="whitespace-nowrap shrink-0"
                  >
                    강의 생성
                  </Button>
                )}
                <Select
                  name="afterSchoolManager"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  options={[
                    { value: "", label: "담당자 선택" },
                    ...managerTeachers.map((t) => ({
                      value: t.id,
                      label: t.name || t.email || t.id,
                    })),
                  ]}
                  disabled={managerLoading || managerSaving}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleManagerSave}
                  disabled={managerLoading || managerSaving}
                  className="whitespace-nowrap shrink-0"
                >
                  {managerSaving ? "저장 중..." : "담당자 저장"}
                </Button>
              </div>
            )}
          </div>
        </div>
        {managerError && (
          <p className="mt-2 text-sm text-red-600">
            {managerError}
          </p>
        )}

        {isLoading && <div className="mt-4 text-center py-8 text-gray-500">로딩 중...</div>}
        {!isLoading && courses.length === 0 && (
          <div className="mt-4 text-center py-8 text-gray-500">등록된 강의가 없습니다.</div>
        )}
      </div>
      {!isLoading && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {sections.map(({ label, courses: list }) => (
            <section
              key={label}
              className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-800 mb-3">{label}</h3>
              {renderTable(list)}
            </section>
          ))}
        </div>
      )}
      {editingCourse && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
          role="dialog"
          aria-modal="true"
          onClick={closeEdit}
         >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
           >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">강의 정보 수정</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSaving) {
                  handleSave();
                }
              }}
              className="px-6 py-6 overflow-y-auto flex-1 min-h-0"
            >
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학년도 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="academicYear"
                    value={editForm.academicYear}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학기 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    name="semester"
                    value={editForm.semester}
                    onChange={handleEditChange}
                    options={semesterOptions}
                    placeholder="학기 선택"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="sm:w-36 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대상 학년 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    name="grade"
                    value={editForm.grade}
                    onChange={handleEditChange}
                    options={gradeOptions}
                    placeholder="대상 학년 선택"
                  />
                </div>
                <div className="sm:w-24 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    정원 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    name="capacity"
                    value={editForm.capacity}
                    onChange={handleEditChange}
                    required
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    강좌명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="subject"
                    value={editForm.subject}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="sm:w-36 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    강사 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    aria-readonly="true"
                    value={editingCourse?.instructor ?? ""}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 shadow-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의실 <span className="text-red-500">*</span>
                </label>
                <Input
                  name="classroom"
                  value={editForm.classroom}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의소개 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  차시별 요일 및 교시 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <label className="block text-xs text-gray-600 mb-1">
                      총 시수 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      name="totalSessions"
                      value={editForm.totalSessions}
                      onChange={handleEditChange}
                      required
                      className="w-20"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <label
                      htmlFor="cgPeriod"
                      className="block text-xs text-gray-600 mb-1"
                    >
                      주당 차시 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="cgPeriod"
                      type="number"
                      min="1"
                      value={cgPeriod}
                      onChange={(e) => handleCgPeriodChange(e.target.value)}
                      className="w-20"
                    />
                    {cgErrors.period && (
                      <p className="mt-1 text-sm text-red-600" role="alert">
                        {cgErrors.period}
                      </p>
                    )}
                  </div>
                  {cgSchedules.length > 0 && (
                    <div className="flex-1 overflow-y-auto max-h-64">
                      <div className="space-y-2">
                        {cgSchedules.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-700 min-w-[2.5rem]">
                              {idx + 1}차시
                            </span>
                            <Select
                              options={[
                                { value: "", label: "요일 선택" },
                                { value: "월", label: "월요일" },
                                { value: "화", label: "화요일" },
                                { value: "수", label: "수요일" },
                                { value: "목", label: "목요일" },
                                { value: "금", label: "금요일" },
                              ]}
                              value={s.day}
                              onChange={(e) =>
                                handleCgScheduleChange(
                                  idx,
                                  "day",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                            />
                            <Select
                              options={[
                                { value: "", label: "교시 선택" },
                                ...Array.from({ length: 10 }, (_, i) => ({
                                  value: `${i + 1}`,
                                  label: `${i + 1}교시`,
                                })),
                              ]}
                              value={s.period}
                              onChange={(e) =>
                                handleCgScheduleChange(
                                  idx,
                                  "period",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                      {cgErrors.schedules && (
                        <p className="mt-1 text-sm text-red-600" role="alert">
                          {cgErrors.schedules}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  {(editingCourse?.teacherId === currentUserId || isManager) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteCourse}
                      disabled={isSaving}
                    >
                      삭제
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeEdit}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {isManagerCreateOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-4 py-8"
            role="dialog"
            aria-modal="true"
            onClick={closeManagerCreateModal}
          >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">방과후 강의 생성 (담당자)</h2>
              <button
                type="button"
                onClick={closeManagerCreateModal}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!managerCreateSaving) {
                  handleManagerCreateSave();
                }
              }}
              className="px-6 py-6 space-y-6 overflow-y-auto flex-1 min-h-0"
             >
              {managerCreateError && (
                <p className="text-sm text-red-600" role="alert">
                  {managerCreateError}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생성할 교사 <span className="text-red-500">*</span>
                </label>
                <Select
                  name="teacherId"
                  value={managerCreateForm.teacherId}
                  onChange={(e) =>
                    setManagerCreateForm((prev) => ({ ...prev, teacherId: e.target.value }))
                  }
                  options={[
                    { value: "", label: "교사 선택" },
                    ...managerTeachers.map((t) => ({
                      value: t.id,
                      label: t.name || t.email || t.id,
                    })),
                  ]}
                  disabled={managerCreateSaving}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학년도 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="academicYear"
                    value={managerCreateForm.academicYear}
                    onChange={handleManagerCreateChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학기 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    name="semester"
                    value={managerCreateForm.semester}
                    onChange={handleManagerCreateChange}
                    options={semesterOptions}
                    placeholder="학기 선택"
                    disabled={managerCreateSaving}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="sm:w-36 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대상 학년 <span className="text-red-500">*</span>
                  </label>
                  <Select
                    name="grade"
                    value={managerCreateForm.grade}
                    onChange={handleManagerCreateChange}
                    options={gradeOptions}
                    placeholder="대상 학년 선택"
                    disabled={managerCreateSaving}
                  />
                </div>
                <div className="sm:w-24 flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    정원 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    name="capacity"
                    value={managerCreateForm.capacity}
                    onChange={handleManagerCreateChange}
                    required
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    강좌명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="subject"
                    value={managerCreateForm.subject}
                    onChange={handleManagerCreateChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의실 <span className="text-red-500">*</span>
                </label>
                <Input
                  name="classroom"
                  value={managerCreateForm.classroom}
                  onChange={handleManagerCreateChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의소개 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={managerCreateForm.description}
                  onChange={handleManagerCreateChange}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  차시별 요일 및 교시 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <label className="block text-xs text-gray-600 mb-1">
                      총 시수 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      name="totalSessions"
                      value={managerCreateForm.totalSessions}
                      onChange={handleManagerCreateChange}
                      required
                      className="w-20"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <label
                      htmlFor="managerCgPeriod"
                      className="block text-xs text-gray-600 mb-1"
                    >
                      주당 차시 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="managerCgPeriod"
                      type="number"
                      min="1"
                      value={cgPeriod}
                      onChange={(e) => handleCgPeriodChange(e.target.value)}
                      className="w-20"
                    />
                    {cgErrors.period && (
                      <p className="mt-1 text-sm text-red-600" role="alert">
                        {cgErrors.period}
                      </p>
                    )}
                  </div>
                  {cgSchedules.length > 0 && (
                    <div className="flex-1 overflow-y-auto max-h-64">
                      <div className="space-y-2">
                        {cgSchedules.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-700 min-w-[2.5rem]">
                              {idx + 1}차시
                            </span>
                            <Select
                              options={[
                                { value: "", label: "요일 선택" },
                                { value: "월", label: "월요일" },
                                { value: "화", label: "화요일" },
                                { value: "수", label: "수요일" },
                                { value: "목", label: "목요일" },
                                { value: "금", label: "금요일" },
                              ]}
                              value={s.day}
                              onChange={(e) =>
                                handleCgScheduleChange(
                                  idx,
                                  "day",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                              disabled={managerCreateSaving}
                            />
                            <Select
                              options={[
                                { value: "", label: "교시 선택" },
                                ...Array.from({ length: 10 }, (_, i) => ({
                                  value: `${i + 1}`,
                                  label: `${i + 1}교시`,
                                })),
                              ]}
                              value={s.period}
                              onChange={(e) =>
                                handleCgScheduleChange(
                                  idx,
                                  "period",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                              disabled={managerCreateSaving}
                            />
                          </div>
                        ))}
                      </div>
                      {cgErrors.schedules && (
                        <p className="mt-1 text-sm text-red-600" role="alert">
                          {cgErrors.schedules}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeManagerCreateModal}
                  disabled={managerCreateSaving}
                >
                  취소
                </Button>
                <Button type="submit" disabled={managerCreateSaving}>
                  {managerCreateSaving ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
