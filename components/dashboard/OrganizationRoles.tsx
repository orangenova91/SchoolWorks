"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StudentAutocomplete } from "@/components/dashboard/StudentAutocomplete";
import { useToastContext } from "@/components/providers/ToastProvider";

type StudentItem = {
  id: string;
  name: string | null;
  email: string;
  studentId: string | null;
  grade: string | null;
  classLabel: string | null;
  classOfficer: string | null;
  officerAssists: string[];
  studentCouncilRole: string | null;
};

function toStudentOptions(items: StudentItem[]): { id: string; name: string; email: string; studentId: string | null; classLabel: string | null }[] {
  return items.map((s) => ({
    id: s.id,
    name: s.name ?? "",
    email: s.email,
    studentId: s.studentId,
    classLabel: s.classLabel,
  }));
}

export default function OrganizationRoles() {
  const { showToast } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [savingClassOfficer, setSavingClassOfficer] = useState(false);
  const [savingStudentCouncil, setSavingStudentCouncil] = useState(false);
  const [classOfficerRoles, setClassOfficerRoles] = useState<string[]>([]);
  const [savedClassOfficerRoles, setSavedClassOfficerRoles] = useState<string[]>([]); // 저장된 것만 아래 테이블에 사용
  const [studentCouncilRoles, setStudentCouncilRoles] = useState<string[]>([]);
  const [savedStudentCouncilRoles, setSavedStudentCouncilRoles] = useState<string[]>([]);
  const [newClassRole, setNewClassRole] = useState("");
  const [newCouncilRole, setNewCouncilRole] = useState("");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<{
    grade: string;
    classLabel: string;
  } | null>(null);
  const [patchingRole, setPatchingRole] = useState<string | null>(null);
  const [patchingDeptRole, setPatchingDeptRole] = useState<string | null>(null);
  const [patchingCouncilRole, setPatchingCouncilRole] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/academic-preparation/organization-roles").then((res) =>
        res.ok ? res.json() : null
      ),
      fetch("/api/academic-preparation/students").then((res) =>
        res.ok ? res.json() : null
      ),
    ])
      .then(([rolesData, studentsData]) => {
        if (rolesData) {
          const classRoles = Array.isArray(rolesData.classOfficerRoles)
            ? rolesData.classOfficerRoles
            : [];
          setClassOfficerRoles(classRoles);
          setSavedClassOfficerRoles(classRoles);
          const councilRoles = Array.isArray(rolesData.studentCouncilRoles)
            ? rolesData.studentCouncilRoles
            : [];
          setStudentCouncilRoles(councilRoles);
          setSavedStudentCouncilRoles(councilRoles);
        }
        if (studentsData?.students) {
          setStudents(studentsData.students);
        }
      })
      .catch(() => showToast("설정을 불러오는 데 실패했습니다.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const addClassRole = () => {
    const trimmed = newClassRole.trim();
    if (!trimmed) return;
    if (classOfficerRoles.includes(trimmed)) {
      showToast("이미 추가된 명칭입니다.", "error");
      return;
    }
    if (classOfficerRoles.length >= 30) {
      showToast("학급직 명칭은 최대 30개까지 추가할 수 있습니다.", "error");
      return;
    }
    setClassOfficerRoles((prev) => [...prev, trimmed]);
    setNewClassRole("");
  };

  const removeClassRole = (index: number) => {
    setClassOfficerRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const addCouncilRole = () => {
    const trimmed = newCouncilRole.trim();
    if (!trimmed) return;
    if (studentCouncilRoles.includes(trimmed)) {
      showToast("이미 추가된 명칭입니다.", "error");
      return;
    }
    if (studentCouncilRoles.length >= 30) {
      showToast("학생회 직위 명칭은 최대 30개까지 추가할 수 있습니다.", "error");
      return;
    }
    setStudentCouncilRoles((prev) => [...prev, trimmed]);
    setNewCouncilRole("");
  };

  const removeCouncilRole = (index: number) => {
    setStudentCouncilRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const saveClassOfficerRoles = async () => {
    setSavingClassOfficer(true);
    try {
      const res = await fetch("/api/academic-preparation/organization-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classOfficerRoles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "저장에 실패했습니다.");
      }
      showToast("학급 조직 설정이 저장되었습니다.", "success");
      setSavedClassOfficerRoles(classOfficerRoles);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장에 실패했습니다.", "error");
    } finally {
      setSavingClassOfficer(false);
    }
  };

  const saveStudentCouncilRoles = async () => {
    setSavingStudentCouncil(true);
    try {
      const res = await fetch("/api/academic-preparation/organization-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCouncilRoles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "저장에 실패했습니다.");
      }
      showToast("학생회 조직 설정이 저장되었습니다.", "success");
      setSavedStudentCouncilRoles(studentCouncilRoles);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장에 실패했습니다.", "error");
    } finally {
      setSavingStudentCouncil(false);
    }
  };

  // 변경 여부: 현재 편집값과 저장된 값이 다르면 true
  const hasClassOfficerChanges = useMemo(() => {
    if (classOfficerRoles.length !== savedClassOfficerRoles.length) return true;
    return classOfficerRoles.some((r, i) => r !== savedClassOfficerRoles[i]);
  }, [classOfficerRoles, savedClassOfficerRoles]);

  const hasStudentCouncilChanges = useMemo(() => {
    if (studentCouncilRoles.length !== savedStudentCouncilRoles.length) return true;
    return studentCouncilRoles.some((r, i) => r !== savedStudentCouncilRoles[i]);
  }, [studentCouncilRoles, savedStudentCouncilRoles]);

  // 학년 목록 (학생 데이터에서 추출, 정렬)
  const grades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.grade?.trim()) set.add(s.grade.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // 학년별 학급 목록 { "1": ["1-1", "1-2"], "2": ["2-1"], ... }
  const classesByGrade = useMemo(() => {
    const map: Record<string, string[]> = {};
    students.forEach((s) => {
      if (!s.grade?.trim() || !s.classLabel?.trim()) return;
      const g = s.grade.trim();
      const c = s.classLabel.trim();
      if (!map[g]) map[g] = [];
      if (!map[g].includes(c)) map[g].push(c);
    });
    Object.keys(map).forEach((g) =>
      map[g].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    );
    return map;
  }, [students]);

  // 모든 학반 목록 (학년·학급 순 정렬) — 한 줄 탭용
  const classList = useMemo(() => {
    return grades.flatMap((g) =>
      (classesByGrade[g] ?? []).map((classLabel) => ({ grade: g, classLabel }))
    );
  }, [grades, classesByGrade]);

  // 선택된 학급의 학생 목록
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(
      (s) =>
        s.grade?.trim() === selectedClass.grade &&
        s.classLabel?.trim() === selectedClass.classLabel
    );
  }, [students, selectedClass]);

  // 학급직 선택 변경 시 즉시 PATCH 후 로컬 상태 반영
  const handleClassOfficerChange = async (
    role: string,
    userId: string | null
  ) => {
    if (!selectedClass) return;
    setPatchingRole(role);
    try {
      const res = await fetch("/api/academic-preparation/class-officer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedClass.grade,
          classLabel: selectedClass.classLabel,
          role,
          userId: userId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "저장에 실패했습니다.");
      }
      setStudents((prev) =>
        prev.map((s) => {
          const inClass =
            s.grade?.trim() === selectedClass.grade &&
            s.classLabel?.trim() === selectedClass.classLabel;
          if (!inClass) return s;
          if (s.id === userId) return { ...s, classOfficer: role, officerAssists: [] };
          if (s.classOfficer === role) return { ...s, classOfficer: null };
          return s;
        })
      );
      showToast("저장되었습니다.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장에 실패했습니다.", "error");
    } finally {
      setPatchingRole(null);
    }
  };

  // 부서원 변경 시 즉시 PATCH 후 로컬 상태 반영 (한 학생당 부서원 1개만)
  const handleDepartmentChange = async (role: string, memberUserIds: string[]) => {
    if (!selectedClass) return;
    setPatchingDeptRole(role);
    try {
      const res = await fetch("/api/academic-preparation/class-officer-department", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedClass.grade,
          classLabel: selectedClass.classLabel,
          role,
          memberUserIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "저장에 실패했습니다.");
      }
      setStudents((prev) =>
        prev.map((s) => {
          const inClass =
            s.grade?.trim() === selectedClass.grade &&
            s.classLabel?.trim() === selectedClass.classLabel;
          if (!inClass) return s;
          const wasInRole = s.officerAssists?.includes(role);
          const isNowInRole = memberUserIds.includes(s.id);
          if (wasInRole && !isNowInRole) {
            return { ...s, officerAssists: (s.officerAssists || []).filter((r) => r !== role) };
          }
          if (!wasInRole && isNowInRole) {
            return { ...s, officerAssists: [role], classOfficer: null };
          }
          return s;
        })
      );
      showToast("저장되었습니다.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장에 실패했습니다.", "error");
    } finally {
      setPatchingDeptRole(null);
    }
  };

  // 학생회 직위 선택 변경 시 즉시 PATCH (학교 단위, 담당만)
  const handleStudentCouncilOfficerChange = async (role: string, userId: string | null) => {
    setPatchingCouncilRole(role);
    try {
      const res = await fetch("/api/academic-preparation/student-council-officer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, userId: userId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "저장에 실패했습니다.");
      }
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === userId) return { ...s, studentCouncilRole: role };
          if (s.studentCouncilRole === role) return { ...s, studentCouncilRole: null };
          return s;
        })
      );
      showToast("저장되었습니다.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장에 실패했습니다.", "error");
    } finally {
      setPatchingCouncilRole(null);
    }
  };

  // 선택된 학급 조직 CSV 다운로드 (형식 1: 역할 기준)
  const downloadClassOrganizationCsv = () => {
    if (!selectedClass) return;
    if (savedClassOfficerRoles.length === 0) {
      showToast("먼저 위에서 학급 조직 설정을 저장한 뒤 다운로드할 수 있습니다.", "error");
      return;
    }
    const escape = (v: string) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    // Excel이 학년·학급을 날짜로 해석하지 않도록 ="값" 텍스트 수식으로 출력
    const asTextFormula = (v: string) => `="${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["학년", "학급", "역할", "담당학번", "담당이름", "부서원"];
    const rows: string[][] = savedClassOfficerRoles.map((role) => {
      const officer = classStudents.find((s) => s.classOfficer === role);
      const deptMembers = classStudents.filter((s) => s.officerAssists?.includes(role));
      const deptStr = deptMembers
        .map((s) => `${s.studentId ?? ""} ${s.name || s.email || s.id}`.trim())
        .join(", ");
      return [
        asTextFormula(selectedClass.grade),
        asTextFormula(selectedClass.classLabel),
        role,
        officer?.studentId ?? "",
        officer?.name ?? officer?.email ?? officer?.id ?? "",
        deptStr,
      ];
    });
    const csvContent =
      "\uFEFF" +
      [
        header.map(escape).join(","),
        ...rows.map((r) => r.map((cell) => escape(cell)).join(",")),
      ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `학급조직_${selectedClass.grade}학년_${selectedClass.classLabel}반_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV 파일이 다운로드되었습니다.", "success");
  };

  // 전학년 학급 조직 CSV 한 번에 다운로드 (단일 CSV, 모든 학급 행 포함)
  const downloadAllClassesOrganizationCsv = () => {
    if (savedClassOfficerRoles.length === 0) {
      showToast("먼저 위에서 학급 조직 설정을 저장한 뒤 다운로드할 수 있습니다.", "error");
      return;
    }
    if (classList.length === 0) {
      showToast("학급 데이터가 없습니다.", "error");
      return;
    }
    const escape = (v: string) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const asTextFormula = (v: string) => `="${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["학년", "학급", "역할", "담당학번", "담당이름", "부서원"];
    const allRows: string[][] = [];
    for (const { grade, classLabel } of classList) {
      const classStudentsForCsv = students.filter(
        (s) => s.grade?.trim() === grade && s.classLabel?.trim() === classLabel
      );
      for (const role of savedClassOfficerRoles) {
        const officer = classStudentsForCsv.find((s) => s.classOfficer === role);
        const deptMembers = classStudentsForCsv.filter((s) => s.officerAssists?.includes(role));
        const deptStr = deptMembers
          .map((s) => `${s.studentId ?? ""} ${s.name || s.email || s.id}`.trim())
          .join(", ");
        allRows.push([
          asTextFormula(grade),
          asTextFormula(classLabel),
          role,
          officer?.studentId ?? "",
          officer?.name ?? officer?.email ?? officer?.id ?? "",
          deptStr,
        ]);
      }
    }
    const csvContent =
      "\uFEFF" +
      [
        header.map(escape).join(","),
        ...allRows.map((r) => r.map((cell) => escape(cell)).join(",")),
      ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `학급조직_전학년_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("전학년 CSV 파일이 다운로드되었습니다.", "success");
  };

  // 학생회 조직 배치 CSV 다운로드
  const downloadStudentCouncilCsv = () => {
    if (savedStudentCouncilRoles.length === 0) {
      showToast("먼저 위에서 학생회 조직 설정을 저장한 뒤 다운로드할 수 있습니다.", "error");
      return;
    }
    const escape = (v: string) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const header = ["역할", "학번", "담당이름"];
    const rows: string[][] = savedStudentCouncilRoles.map((role) => {
      const officer = students.find((s) => s.studentCouncilRole === role);
      return [
        role,
        officer?.studentId ?? "",
        officer?.name ?? officer?.email ?? officer?.id ?? "",
      ];
    });
    const csvContent =
      "\uFEFF" +
      [
        header.map(escape).join(","),
        ...rows.map((r) => r.map((cell) => escape(cell)).join(",")),
      ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `학생회조직_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV 파일이 다운로드되었습니다.", "success");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-gray-500">설정을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">학급 및 학생회 조직</h2>
        <p className="text-sm text-gray-600">
          학교별로 학급 조직·학생회 조직에서 사용할 직위 명칭을 설정합니다. 여기서 설정한 명칭은 학생 정보의 학급직 선택 등에서 사용됩니다.
        </p>
      </div>

      {/* 가로 배치를 위한 컨테이너 추가 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 학급 조직 설정 */}
        <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
          {/* 헤더 부분: 제목/설명과 버튼을 양 옆으로 배치 */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">학급 조직 설정</h3>
              <p className="text-sm text-gray-600">
                학급에서 사용할 직위 명칭을 추가하거나 삭제하세요.
              </p>
            </div>
            <Button 
              onClick={saveClassOfficerRoles} 
              disabled={savingClassOfficer || !hasClassOfficerChanges} 
              isLoading={savingClassOfficer}
              className="shrink-0"
            >
              설정 저장
            </Button>
          </div>

          {/* 역할 태그 목록 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {classOfficerRoles.map((role, index) => (
              <span
                key={`${role}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-300 px-3 py-1.5 text-sm text-gray-800 shadow-sm"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeClassRole(index)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`${role} 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>

          {/* 입력 영역 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-48">
              <Input
                value={newClassRole}
                onChange={(e) => setNewClassRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addClassRole())}
                placeholder="명칭 입력"
                maxLength={50}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addClassRole}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
        </section>

        {/* 학생회 조직 설정 */}
        <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
          {/* 헤더 부분: 제목/설명과 버튼을 양 옆으로 배치 */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">학생회 조직 설정</h3>
              <p className="text-sm text-gray-600">
                학생회에서 사용할 직위 명칭을 추가하거나 삭제하세요.
              </p>
            </div>
            <Button 
              onClick={saveStudentCouncilRoles} 
              disabled={savingStudentCouncil || !hasStudentCouncilChanges} 
              isLoading={savingStudentCouncil}
              className="shrink-0"
            >
              설정 저장
            </Button>
          </div>

          {/* 학생회 역할 태그 목록 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {studentCouncilRoles.map((role, index) => (
              <span
                key={`${role}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-300 px-3 py-1.5 text-sm text-gray-800 shadow-sm"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeCouncilRole(index)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`${role} 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>

          {/* 입력 영역 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-48">
              <Input
                value={newCouncilRole}
                onChange={(e) => setNewCouncilRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCouncilRole())}
                placeholder="명칭 입력"
                maxLength={50}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCouncilRole}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </div>
        </section>
      </div>

      {/* 학급별 학급 조직 배치 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-1">학급별 학급 조직 배치</h3>
            <p className="text-sm text-gray-600">
              학급을 선택한 뒤, 각 역할별로 담당 학생을 지정하세요. 선택 즉시 저장됩니다.
            </p>
          </div>
          {classList.length > 0 && savedClassOfficerRoles.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadAllClassesOrganizationCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              전학년 CSV 다운로드
            </Button>
          )}
        </div>

        {/* 학반 탭 (학년별 한 줄씩) */}
        <div className="mb-4 space-y-3">
          {grades.length === 0 ? (
            <div className="text-sm text-gray-500 space-y-1">
              {students.length === 0 ? (
                <p>등록된 학생이 없습니다. 학생을 등록한 뒤 이용해 주세요.</p>
              ) : (
                <p>학년·학반이 설정된 학생이 없습니다. 학생 관리 또는 학급 관리에서 각 학생의 학년·학반을 입력해 주세요.</p>
              )}
            </div>
          ) : (
            grades.map((grade) => (
              <div key={grade} className="flex flex-wrap items-center gap-2">
                <span className="w-14 shrink-0 text-sm font-medium text-gray-700">
                  {grade}학년
                </span>
                <div className="flex flex-wrap gap-2">
                  {(classesByGrade[grade] ?? []).map((classLabel) => {
                    const isSelected =
                      selectedClass?.grade === grade &&
                      selectedClass?.classLabel === classLabel;
                    return (
                      <button
                        key={`${grade}-${classLabel}`}
                        type="button"
                        onClick={() => setSelectedClass({ grade, classLabel })}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {classLabel}반
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 선택된 학급의 역할별 담당 학생 테이블 */}
        {selectedClass && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-gray-800 flex-1 min-w-0">
                {selectedClass.grade}학년 {selectedClass.classLabel}반 학급 조직
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={downloadClassOrganizationCsv}
                disabled={savedClassOfficerRoles.length === 0}
                title={savedClassOfficerRoles.length === 0 ? "역할을 저장한 뒤 다운로드할 수 있습니다" : undefined}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV 다운로드
              </Button>
            </div>
            {savedClassOfficerRoles.length === 0 ? (
              <p className="text-sm text-gray-500">
                위 &quot;학급 조직 설정&quot;에서 역할 명칭을 추가한 뒤 &quot;설정 저장&quot;을 눌러 주세요.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        역할
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        담당 학생
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        부서원
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {savedClassOfficerRoles.map((role) => {
                      const currentUserId =
                        classStudents.find((s) => s.classOfficer === role)?.id ?? "";
                      const deptMemberIds = classStudents
                        .filter((s) => s.officerAssists?.includes(role))
                        .map((s) => s.id);
                      // 담당 학생 드롭다운: 다른 역할 지정된 학생은 비활성화
                      const options = [
                        { value: "", label: "미지정(없음)" },
                        ...classStudents.map((s) => {
                          const assignedRole = s.classOfficer?.trim() || null;
                          const isAssignedElsewhere = Boolean(
                            assignedRole && assignedRole !== role
                          );
                          const namePart = s.name || s.email || s.id;
                          const prefix = s.studentId ? `${s.studentId} ` : "";
                          const label = isAssignedElsewhere
                            ? `${prefix}${namePart} (${assignedRole})`
                            : `${prefix}${namePart}`;
                          return {
                            value: s.id,
                            label,
                            disabled: isAssignedElsewhere,
                          };
                        }),
                      ];
                      // 부서원 추가 가능: 담당 없음 + (부서원 없음 또는 이 역할 부서원) + 아직 이 역할 부서원 아님
                      const availableForDept = classStudents.filter(
                        (s) =>
                          !s.classOfficer &&
                          (s.officerAssists?.length === 0 || s.officerAssists?.includes(role)) &&
                          !deptMemberIds.includes(s.id)
                      );
                      const deptAddOptions = [
                        { value: "", label: "부서원 추가…" },
                        ...availableForDept.map((s) => ({
                          value: s.id,
                          label: `${s.studentId ? `${s.studentId} ` : ""}${s.name || s.email || s.id}`,
                        })),
                      ];
                      const isDeptPatching = patchingDeptRole === role;

                      return (
                        <tr key={role}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {role}
                          </td>
                          <td className="px-4 py-2">
                            <div className="max-w-xs">
                              <Select
                                value={currentUserId}
                                options={options}
                                disabled={patchingRole === role}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleClassOfficerChange(
                                    role,
                                    val === "" ? null : val
                                  );
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="min-w-[200px] max-w-md">
                              <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {deptMemberIds.map((uid) => {
                                  const st = classStudents.find((s) => s.id === uid);
                                  if (!st) return null;
                                  const label = `${st.studentId ? `${st.studentId} ` : ""}${st.name || st.email || st.id}`;
                                  return (
                                    <span
                                      key={uid}
                                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-xs"
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDepartmentChange(
                                            role,
                                            deptMemberIds.filter((id) => id !== uid)
                                          )
                                        }
                                        disabled={isDeptPatching}
                                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
                                        aria-label={`${label} 제거`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                              {availableForDept.length > 0 && (
                                <Select
                                  value=""
                                  options={deptAddOptions}
                                  disabled={isDeptPatching}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val)
                                      handleDepartmentChange(role, [...deptMemberIds, val]);
                                    e.target.value = "";
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {classList.length > 0 && !selectedClass && (
          <p className="mt-4 text-sm text-gray-500">학급을 선택해 주세요.</p>
        )}
      </section>

      {/* 학생회 조직 배치 (학교 단위, 담당만) */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="text-base font-medium text-gray-900 flex-1 min-w-0">학생회 조직 배치</h3>
          {savedStudentCouncilRoles.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              onClick={downloadStudentCouncilCsv}
              title="학생회 조직 배치를 CSV로 다운로드합니다"
            >
              <Download className="h-4 w-4 mr-1" />
              CSV 다운로드
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          각 학생회 직위별 담당 학생을 지정하세요. 선택 즉시 저장됩니다.
        </p>
        {savedStudentCouncilRoles.length === 0 ? (
          <p className="text-sm text-gray-500">
            위 &quot;학생회 조직 설정&quot;에서 직위 명칭을 추가한 뒤 &quot;설정 저장&quot;을 눌러 주세요.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 max-w-2xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">역할</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">담당 학생</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {savedStudentCouncilRoles.map((role) => {
                  const currentUserId =
                    students.find((s) => s.studentCouncilRole === role)?.id ?? "";
                  const disabledCouncilIds = students
                    .filter((s) => {
                      const r = s.studentCouncilRole?.trim();
                      return r && r !== role;
                    })
                    .map((s) => s.id);
                  const disabledLabels: Record<string, string> = {};
                  students.forEach((s) => {
                    const r = s.studentCouncilRole?.trim();
                    if (r && r !== role) disabledLabels[s.id] = r;
                  });
                  return (
                    <tr key={role}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{role}</td>
                      <td className="px-4 py-2">
                        <div
                          className={`max-w-xs ${patchingCouncilRole === role ? "pointer-events-none opacity-60" : ""}`}
                        >
                          <StudentAutocomplete
                            value={currentUserId}
                            onChange={(val) =>
                              handleStudentCouncilOfficerChange(
                                role,
                                val === "" ? null : val
                              )
                            }
                            students={toStudentOptions(students)}
                            disabledStudentIds={disabledCouncilIds}
                            disabledLabels={disabledLabels}
                            placeholder="담당 학생 선택"
                            className="w-full"
                            inputClassName="h-10 px-3 py-2 rounded-md border border-gray-300 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
