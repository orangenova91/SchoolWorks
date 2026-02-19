"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronUp, ChevronDown, Edit2, Trash2, Download } from "lucide-react";

interface CleaningAreaItem {
  id: string;
  classGroup: string;
  area: string;
  teacher: string;
  studentCount: number | null;
  studentIds: string[];
  notes: string | null;
  createdAt: string;
}

type SortField = "classGroup" | "area" | "teacher" | "studentCount" | null;
type SortDirection = "asc" | "desc";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  roleLabel: string | null;
}

export default function CleaningArea() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cleaningAreas, setCleaningAreas] = useState<CleaningAreaItem[]>([]);
  const [sortField, setSortField] = useState<SortField>("classGroup");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [studentSelections, setStudentSelections] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    classGroup: "",
    area: "",
    teacher: "",
    studentCount: "",
    notes: "",
  });
  const [editStudentSelections, setEditStudentSelections] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUnassignedTeachers, setShowUnassignedTeachers] = useState(false);
  const [showUnassignedStudents, setShowUnassignedStudents] = useState(false);
  const [form, setForm] = useState({
    classGroup: "",
    area: "",
    teacher: "",
    studentCount: "",
    notes: "",
  });

  useEffect(() => {
    fetchCleaningAreas();
    fetchStudents();
    fetchTeachers();
  }, []);

  // 학생수 변경 시 드롭다운 필드 개수 조정 (새 항목 추가용)
  useEffect(() => {
    const count = parseInt(form.studentCount) || 0;
    if (count > 0) {
      setStudentSelections(prev => {
        const newSelections = [...prev];
        // 학생수보다 많으면 줄이고, 적으면 빈 값으로 추가
        while (newSelections.length < count) {
          newSelections.push("");
        }
        return newSelections.slice(0, count);
      });
    } else {
      setStudentSelections([]);
    }
  }, [form.studentCount]);

  // 편집 모드 학생수 변경 시 드롭다운 필드 개수 조정
  useEffect(() => {
    if (!editingId) return;
    const count = parseInt(editForm.studentCount) || 0;
    if (count > 0) {
      setEditStudentSelections(prev => {
        const newSelections = [...prev];
        while (newSelections.length < count) {
          newSelections.push("");
        }
        return newSelections.slice(0, count);
      });
    } else {
      setEditStudentSelections([]);
    }
  }, [editForm.studentCount, editingId]);

  // 학생들의 고유한 학반 목록
  const uniqueClassLabels = useMemo(() => {
    const labels = new Set<string>();
    students.forEach((student) => {
      const classLabel = student.classLabel?.trim();
      if (classLabel && classLabel !== "-") {
        labels.add(classLabel);
      }
    });
    return Array.from(labels).sort();
  }, [students]);

  // 교사 이름 중복 체크
  const teacherNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach(teacher => {
      const name = teacher.name.trim();
      if (name) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    });
    return counts;
  }, [teachers]);

  const fetchCleaningAreas = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/cleaning-areas");
      if (!res.ok) {
        throw new Error("목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setCleaningAreas(data.cleaningAreas || []);
    } catch (err) {
      console.error("Error fetching cleaning areas:", err);
      alert("청소구역 목록을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/academic-preparation/students");
      if (!res.ok) {
        throw new Error("학생 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setStudents(data.students || []);
      console.log("Loaded students:", data.students?.length || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (!res.ok) {
        throw new Error("교사 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setTeachers(data.teachers || []);
      console.log("Loaded teachers:", data.teachers?.length || 0);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  // 다른 청소구역 목록에서 선택된 학생 ID들을 수집하는 헬퍼 함수
  const getAllSelectedStudentIds = (excludeId?: string | null): string[] => {
    const allIds: string[] = [];
    cleaningAreas.forEach(area => {
      if (area.id !== excludeId && area.studentIds && Array.isArray(area.studentIds)) {
        allIds.push(...area.studentIds.filter(id => id && id !== ""));
      }
    });
    return allIds;
  };

  // 다른 청소구역 목록에서 선택된 교사 이름들을 수집하는 헬퍼 함수
  const getAllSelectedTeacherNames = (excludeId?: string | null): string[] => {
    const allNames: string[] = [];
    cleaningAreas.forEach(area => {
      if (area.id !== excludeId && area.teacher && area.teacher.trim() !== "") {
        allNames.push(area.teacher.trim());
      }
    });
    return allNames;
  };

  // 선택되지 않은 교사 목록 계산
  const unassignedTeachers = useMemo(() => {
    const allSelectedTeacherNames = getAllSelectedTeacherNames();
    const selectedNamesSet = new Set(allSelectedTeacherNames);
    
    return teachers.filter(teacher => {
      return !selectedNamesSet.has(teacher.name);
    }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [teachers, cleaningAreas]);

  // 선택되지 않은 학생 목록 계산
  const unassignedStudents = useMemo(() => {
    const allSelectedStudentIds = getAllSelectedStudentIds();
    const selectedIdsSet = new Set(allSelectedStudentIds);
    
    return students.filter(student => {
      return !selectedIdsSet.has(student.id);
    }).sort((a, b) => {
      // 학번이 있는 경우 학번 오름차순으로 정렬
      const aStudentId = a.studentId || "";
      const bStudentId = b.studentId || "";
      
      if (aStudentId && bStudentId) {
        // 학번을 숫자로 변환하여 비교 (숫자 부분만 추출)
        const aNum = parseInt(aStudentId.replace(/\D/g, "")) || 0;
        const bNum = parseInt(bStudentId.replace(/\D/g, "")) || 0;
        if (aNum !== bNum) {
          return aNum - bNum;
        }
        // 숫자가 같으면 문자열로 비교
        return aStudentId.localeCompare(bStudentId, "ko");
      }
      
      // 학번이 없는 경우 이름으로 정렬
      if (!aStudentId && !bStudentId) {
        return a.name.localeCompare(b.name, "ko");
      }
      // 학번이 있는 것을 우선
      return aStudentId ? -1 : 1;
    });
  }, [students, cleaningAreas]);

  const handleStudentChange = (index: number, studentId: string) => {
    setStudentSelections(prev => {
      const newSelections = [...prev];
      const previousSelection = newSelections[index];
      
      // 빈 값으로 변경하는 경우는 허용
      if (!studentId || studentId === "") {
        newSelections[index] = studentId;
        return newSelections;
      }
      
      // 새로 선택한 학생이 같은 폼의 다른 드롭다운에서 이미 선택되어 있는지 확인
      const existingIndex = newSelections.findIndex((id, idx) => id === studentId && idx !== index);
      if (existingIndex !== -1) {
        alert("이미 선택된 학생입니다.");
        return prev;
      }
      
      // 다른 청소구역 목록에서 이미 선택된 학생인지 확인
      const allSelectedIds = getAllSelectedStudentIds();
      if (allSelectedIds.includes(studentId)) {
        alert("다른 청소구역에서 이미 선택된 학생입니다.");
        return prev;
      }
      
      newSelections[index] = studentId;
      return newSelections;
    });
  };

  const handleEditStudentChange = (index: number, studentId: string) => {
    setEditStudentSelections(prev => {
      const newSelections = [...prev];
      const previousSelection = newSelections[index];
      
      // 빈 값으로 변경하는 경우는 허용
      if (!studentId || studentId === "") {
        newSelections[index] = studentId;
        return newSelections;
      }
      
      // 새로 선택한 학생이 같은 폼의 다른 드롭다운에서 이미 선택되어 있는지 확인
      const existingIndex = newSelections.findIndex((id, idx) => id === studentId && idx !== index);
      if (existingIndex !== -1) {
        alert("이미 선택된 학생입니다.");
        return prev;
      }
      
      // 다른 청소구역 목록에서 이미 선택된 학생인지 확인 (현재 편집 중인 항목 제외)
      const allSelectedIds = getAllSelectedStudentIds(editingId);
      if (allSelectedIds.includes(studentId)) {
        alert("다른 청소구역에서 이미 선택된 학생입니다.");
        return prev;
      }
      
      newSelections[index] = studentId;
      return newSelections;
    });
  };

  const handleEditStart = (item: CleaningAreaItem) => {
    setEditingId(item.id);
    setEditForm({
      classGroup: item.classGroup,
      area: item.area,
      teacher: item.teacher,
      studentCount: item.studentCount?.toString() || "",
      notes: item.notes || "",
    });
    setEditStudentSelections(item.studentIds || []);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ classGroup: "", area: "", teacher: "", studentCount: "", notes: "" });
    setEditStudentSelections([]);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editForm.classGroup.trim() || !editForm.area.trim() || !editForm.teacher.trim()) {
      alert("학반, 담당구역, 지도교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/cleaning-areas/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroup: editForm.classGroup.trim(),
          area: editForm.area.trim(),
          teacher: editForm.teacher.trim(),
          studentCount: editForm.studentCount ? parseInt(editForm.studentCount, 10) : null,
          studentIds: editStudentSelections.filter(id => id !== ""),
          notes: editForm.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("구역이 수정되었습니다.");
      handleEditCancel();
      await fetchCleaningAreas();
    } catch (err: any) {
      console.error("Error updating cleaning area:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 청소구역을 삭제하시겠습니까?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/academic-preparation/cleaning-areas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      alert("구역이 삭제되었습니다.");
      await fetchCleaningAreas();
    } catch (err: any) {
      console.error("Error deleting cleaning area:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 지도교사 필드 변경 시 중복 체크
    if (name === "teacher" && value && value.trim() !== "") {
      const allSelectedTeacherNames = getAllSelectedTeacherNames(editingId);
      if (allSelectedTeacherNames.includes(value.trim())) {
        alert("다른 청소구역에서 이미 선택된 지도교사입니다.");
        return;
      }
    }
    
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  // 학생 ID를 이름으로 변환하는 함수
  const getStudentNames = (studentIds: string[]): string => {
    if (!studentIds || studentIds.length === 0) return "-";
    const names = studentIds
      .map(id => {
        const student = students.find(s => s.id === id);
        if (!student) return null;
        return student.studentId ? `${student.studentId} ${student.name}` : student.name;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "-";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 지도교사 필드 변경 시 중복 체크
    if (name === "teacher" && value && value.trim() !== "") {
      const allSelectedTeacherNames = getAllSelectedTeacherNames();
      if (allSelectedTeacherNames.includes(value.trim())) {
        alert("다른 청소구역에서 이미 선택된 지도교사입니다.");
        return;
      }
    }
    
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 방향 토글
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 다른 필드를 클릭하면 해당 필드로 정렬
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedCleaningAreas = useMemo(() => {
    if (!sortField) return cleaningAreas;

    const sorted = [...cleaningAreas].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortField) {
        case "classGroup":
          aValue = a.classGroup;
          bValue = b.classGroup;
          break;
        case "area":
          aValue = a.area;
          bValue = b.area;
          break;
        case "teacher":
          aValue = a.teacher;
          bValue = b.teacher;
          break;
        case "studentCount":
          aValue = a.studentCount ?? -1;
          bValue = b.studentCount ?? -1;
          break;
        default:
          return 0;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue, "ko")
          : bValue.localeCompare(aValue, "ko");
      } else {
        return sortDirection === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return sorted;
  }, [cleaningAreas, sortField, sortDirection]);

  const handleSave = async () => {
    if (!form.classGroup.trim() || !form.area.trim() || !form.teacher.trim()) {
      alert("학반, 담당구역, 지도교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/cleaning-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroup: form.classGroup.trim(),
          area: form.area.trim(), 
          teacher: form.teacher.trim(),
          studentCount: form.studentCount ? parseInt(form.studentCount, 10) : null,
          studentIds: studentSelections.filter(id => id !== ""),
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      alert("구역이 추가되었습니다.");
      setIsOpen(false);
      setForm({ classGroup: "", area: "", teacher: "", studentCount: "", notes: "" });
      setStudentSelections([]);
      await fetchCleaningAreas();
    } catch (err: any) {
      console.error("Error saving cleaning area:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더
    const headers = ["번호", "학반", "담당구역", "지도교사", "학생수(권장)", "학생 명단", "비고"];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const escapeCSV = (value: string | number | null | undefined, preventDateConversion = false) => {
      if (value === null || value === undefined || value === "") return "";
      const stringValue = String(value);
      
      // 특수문자 이스케이프
      let escaped = stringValue.replace(/"/g, '""');
      
      // 날짜 변환 방지가 필요한 경우 작은따옴표 추가 (Excel이 텍스트로 인식)
      if (preventDateConversion) {
        escaped = `'${escaped}`;
      }
      
      return `"${escaped}"`;
    };

    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...sortedCleaningAreas.map((item, index) => {
        const studentNames = getStudentNames(item.studentIds || []);
        return [
          escapeCSV(index + 1),
          escapeCSV(item.classGroup, true), // 학반: 텍스트로 강제
          escapeCSV(item.area),
          escapeCSV(item.teacher),
          escapeCSV(item.studentCount ?? ""),
          escapeCSV(studentNames),
          escapeCSV(item.notes ?? ""),
        ].join(",");
      }),
    ];

    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // 파일명 생성
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `청소구역_${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">청소 구역</h3>
            <p className="text-sm text-gray-500 mt-1">
              청소 구역을 배정합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unassignedStudents.length > 0 && (
            <div 
              className="relative cursor-pointer"
              onMouseEnter={() => setShowUnassignedStudents(true)}
              onMouseLeave={() => setShowUnassignedStudents(false)}
            >
              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-md text-xs font-medium">
                미배정 학생 {unassignedStudents.length}명
              </span>
              {showUnassignedStudents && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[400px]">
                  <div className="text-xs font-semibold text-gray-700 mb-2">미배정 학생 명단</div>
                  <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto">
                    {unassignedStudents.map(student => (
                      <span 
                        key={student.id}
                        className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700"
                      >
                        {student.studentId ? `${student.studentId} ${student.name}` : student.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {unassignedTeachers.length > 0 && (
            <div 
              className="relative cursor-pointer"
              onMouseEnter={() => setShowUnassignedTeachers(true)}
              onMouseLeave={() => setShowUnassignedTeachers(false)}
            >
              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-md text-xs font-medium">
                미배정 교사 {unassignedTeachers.length}명
              </span>
              {showUnassignedTeachers && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[400px]">
                  <div className="text-xs font-semibold text-gray-700 mb-2">미배정 교사 명단</div>
                  <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto">
                    {unassignedTeachers.map(teacher => {
                      const isDuplicate = (teacherNameCounts.get(teacher.name) || 0) > 1;
                      const displayName = isDuplicate 
                        ? `${teacher.name} (${teacher.email})`
                        : teacher.name;
                      return (
                        <span 
                          key={teacher.id}
                          className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700"
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={cleaningAreas.length === 0}
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isOpen ? "닫기" : "구역 추가"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {isLoading && cleaningAreas.length === 0 && !isOpen ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-16">번호</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                    <button
                      type="button"
                      onClick={() => handleSort("classGroup")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      학반
                      {sortField === "classGroup" && (
                        sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-48">
                    <button
                      type="button"
                      onClick={() => handleSort("area")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      담당구역
                      {sortField === "area" && (
                        sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                    <button
                      type="button"
                      onClick={() => handleSort("teacher")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      지도교사
                      {sortField === "teacher" && (
                        sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                    <button
                      type="button"
                      onClick={() => handleSort("studentCount")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors whitespace-nowrap"
                    >
                      학생수(권장){sortField === "studentCount" && (
                        sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700" style={{ minWidth: "250px" }}>
                    학생 명단
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-36">
                    비고
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {cleaningAreas.length === 0 && !isOpen ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-gray-600">
                      등록된 청소구역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  <>
                {sortedCleaningAreas.map((item, idx) => (
                  editingId === item.id ? (
                    <tr key={item.id} className="border-b border-gray-200 bg-blue-50">
                      <td className="py-3 px-4 text-sm text-gray-600 w-16">{idx + 1}</td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="classGroup"
                          value={editForm.classGroup}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">학반 선택</option>
                          {uniqueClassLabels.map((label) => (
                            <option key={label} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 w-48">
                        <input
                          name="area"
                          value={editForm.area}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="예: 복도 A구역"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="teacher"
                          value={editForm.teacher}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">지도교사 선택</option>
                          {teachers.map((teacher) => {
                            const allSelectedTeacherNames = getAllSelectedTeacherNames(editingId);
                            const isSelectedInOtherAreas = allSelectedTeacherNames.includes(teacher.name);
                            const isCurrentSelection = editForm.teacher === teacher.name;
                            const isDisabled = isSelectedInOtherAreas && !isCurrentSelection;
                            
                            // 이름이 중복인 경우에만 이메일 표시
                            const isDuplicate = (teacherNameCounts.get(teacher.name) || 0) > 1;
                            const displayName = isDuplicate 
                              ? `${teacher.name} (${teacher.email})`
                              : teacher.name;
                            
                            return (
                              <option 
                                key={teacher.id} 
                                value={teacher.name}
                                disabled={isDisabled}
                              >
                                {displayName}
                                {isDisabled ? " (이미 선택됨)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="studentCount"
                          value={editForm.studentCount}
                          onChange={handleEditChange}
                          type="number"
                          min={0}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="예: 6"
                        />
                      </td>
                      <td className="py-3 px-4" style={{ minWidth: "250px" }}>
                        {editStudentSelections.length > 0 ? (
                          <div className="overflow-x-auto overflow-y-visible">
                            <div className="flex items-center gap-2 min-w-max pb-1">
                              {editStudentSelections.map((selectedId, selIdx) => (
                                <select
                                  key={selIdx}
                                  value={selectedId}
                                  onChange={(e) => handleEditStudentChange(selIdx, e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-[120px] flex-shrink-0 bg-white"
                                  style={{ minHeight: "32px" }}
                                >
                                  <option value="">학생 선택</option>
                                  {students.length > 0 ? (
                                    students
                                      .filter(student => {
                                        // 현재 선택된 학생은 항상 표시
                                        if (selectedId === student.id) return true;
                                        // 학반이 일치하는 학생만 표시
                                        const currentClassGroup = editForm.classGroup?.trim();
                                        if (!currentClassGroup) return false;
                                        return student.classLabel?.trim() === currentClassGroup;
                                      })
                                      .map(student => {
                                        // 같은 폼 내에서 다른 드롭다운에 선택된 경우
                                        const isSelectedInSameForm = editStudentSelections.includes(student.id) && editStudentSelections.indexOf(student.id) !== selIdx;
                                        // 다른 청소구역 목록에서 선택된 경우 (현재 편집 중인 항목 제외)
                                        const allSelectedIds = getAllSelectedStudentIds(editingId);
                                        const isSelectedInOtherAreas = allSelectedIds.includes(student.id);
                                        const isCurrentSelection = selectedId === student.id;
                                        const isDisabled = (isSelectedInSameForm || isSelectedInOtherAreas) && !isCurrentSelection;
                                        
                                        return (
                                          <option 
                                            key={student.id} 
                                            value={student.id}
                                            disabled={isDisabled}
                                          >
                                            {student.studentId ? `${student.studentId} ${student.name}` : student.name}
                                            {isDisabled ? " (이미 선택됨)" : ""}
                                          </option>
                                        );
                                      })
                                  ) : (
                                    <option disabled>학생 목록 로딩 중...</option>
                                  )}
                                </select>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">학생수를 입력하면 드롭다운이 표시됩니다.</span>
                        )}
                      </td>
                      <td className="py-3 px-4 w-36">
                        <input
                          name="notes"
                          value={editForm.notes}
                          onChange={handleEditChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="비고 입력"
                        />
                      </td>
                      <td className="py-3 px-4 w-32">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleEditSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={handleEditCancel}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600 w-16">{idx + 1}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 w-24">{item.classGroup}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 w-48">{item.area}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.teacher}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.studentCount ?? "-"}</td>
                      <td className="py-3 px-4 text-sm text-gray-600" style={{ minWidth: "250px" }}>
                        {getStudentNames(item.studentIds || [])}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 w-36">
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-4 w-32">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditStart(item)}
                            disabled={isLoading || deletingId === item.id}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
                            title="수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={isLoading || deletingId === item.id}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
                            title="삭제"
                          >
                            {deletingId === item.id ? (
                              <span className="text-xs">삭제 중...</span>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {isOpen && (
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600 w-16">-</td>
                    <td className="py-3 px-4 w-24">
                      <select
                        name="classGroup"
                        value={form.classGroup}
                        onChange={handleChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">학반 선택</option>
                        {uniqueClassLabels.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 w-48">
                      <input
                        name="area"
                        value={form.area}
                        onChange={handleChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 복도 A구역"
                      />
                    </td>
                    <td className="py-3 px-4 w-32">
                      <select
                        name="teacher"
                        value={form.teacher}
                        onChange={handleChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">지도교사 선택</option>
                        {teachers.map((teacher) => {
                          const allSelectedTeacherNames = getAllSelectedTeacherNames();
                          const isSelectedInOtherAreas = allSelectedTeacherNames.includes(teacher.name);
                          const isCurrentSelection = form.teacher === teacher.name;
                          const isDisabled = isSelectedInOtherAreas && !isCurrentSelection;
                          
                          // 이름이 중복인 경우에만 이메일 표시
                          const isDuplicate = (teacherNameCounts.get(teacher.name) || 0) > 1;
                          const displayName = isDuplicate 
                            ? `${teacher.name} (${teacher.email})`
                            : teacher.name;
                          
                          return (
                            <option 
                              key={teacher.id} 
                              value={teacher.name}
                              disabled={isDisabled}
                            >
                              {displayName}
                              {isDisabled ? " (이미 선택됨)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="py-3 px-4 w-24">
                      <input
                        name="studentCount"
                        value={form.studentCount}
                        onChange={handleChange}
                        type="number"
                        min={0}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 6"
                      />
                    </td>
                    <td className="py-3 px-4" style={{ minWidth: "250px" }}>
                      {studentSelections.length > 0 ? (
                        <div className="overflow-x-auto overflow-y-visible">
                          <div className="flex items-center gap-2 min-w-max pb-1">
                            {studentSelections.map((selectedId, idx) => (
                              <select
                                key={idx}
                                value={selectedId}
                                onChange={(e) => handleStudentChange(idx, e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-[120px] flex-shrink-0 bg-white"
                                style={{ minHeight: "32px" }}
                              >
                                <option value="">학생 선택</option>
                                {students.length > 0 ? (
                                  students
                                    .filter(student => {
                                      // 현재 선택된 학생은 항상 표시
                                      if (selectedId === student.id) return true;
                                      // 학반이 일치하는 학생만 표시
                                      const currentClassGroup = form.classGroup?.trim();
                                      if (!currentClassGroup) return false;
                                      return student.classLabel?.trim() === currentClassGroup;
                                    })
                                    .map(student => {
                                      // 같은 폼 내에서 다른 드롭다운에 선택된 경우
                                      const isSelectedInSameForm = studentSelections.includes(student.id) && studentSelections.indexOf(student.id) !== idx;
                                      // 다른 청소구역 목록에서 선택된 경우
                                      const allSelectedIds = getAllSelectedStudentIds();
                                      const isSelectedInOtherAreas = allSelectedIds.includes(student.id);
                                      const isCurrentSelection = selectedId === student.id;
                                      const isDisabled = (isSelectedInSameForm || isSelectedInOtherAreas) && !isCurrentSelection;
                                      
                                      return (
                                        <option 
                                          key={student.id} 
                                          value={student.id}
                                          disabled={isDisabled}
                                        >
                                          {student.studentId ? `${student.studentId} ${student.name}` : student.name}
                                        </option>
                                      );
                                    })
                                ) : (
                                  <option disabled>학생 목록 로딩 중...</option>
                                )}
                              </select>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">학반 입력 후 학생수를 입력하면 드롭다운이 표시됩니다.</span>
                      )}
                    </td>
                    <td className="py-3 px-4 w-24">
                      <input
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="비고 입력"
                      />
                    </td>
                    <td className="py-3 px-4 w-32">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isLoading}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? "저장 중..." : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            setForm({ classGroup: "", area: "", teacher: "", studentCount: "", notes: "" });
                            setStudentSelections([]);
                          }}
                          disabled={isLoading}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                  </>
                )}
              </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}


