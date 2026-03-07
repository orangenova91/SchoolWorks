"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit2, Trash2, Download, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
  roleLabel: string | null;
}

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
}

interface VolunteerItem {
  id: string;
  department: string;
  teacher: string;
  activityName: string;
  activityContent: string | null;
  volunteerArea: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  selectionCount: number | null;
  volunteerHours: number | null;
  location: string | null;
  studentSelections: string | null; // JSON 문자열: { "classLabel": ["studentId1", "studentId2", ...] }
  createdAt: string;
}

export default function Volunteer() {
  const [isHomeroomOpen, setIsHomeroomOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  // 각 봉사활동의 각 학반별 학생 선택 상태: { [volunteerId-classLabel]: string[] }
  const [studentSelectionsByClass, setStudentSelectionsByClass] = useState<Record<string, string[]>>({});
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // 담임 선발 테이블 정렬
  type HomeroomSortKey = "department" | "teacher" | "activityName" | "volunteerArea" | "activityContent" | "startDate" | "endDate" | "grade" | "selectionCount" | "volunteerHours" | "location";
  const [homeroomSortKey, setHomeroomSortKey] = useState<HomeroomSortKey | null>(null);
  const [homeroomSortDir, setHomeroomSortDir] = useState<"asc" | "desc">("asc");

  // 담당자 선발 테이블 정렬
  type ManagerSortKey = "department" | "teacher" | "activityName" | "volunteerArea" | "activityContent" | "startDate" | "endDate" | "grade" | "selectionCount" | "volunteerHours" | "location";
  const [managerSortKey, setManagerSortKey] = useState<ManagerSortKey | null>(null);
  const [managerSortDir, setManagerSortDir] = useState<"asc" | "desc">("asc");
  
  // 담당자 선발용 상태
  const [managerVolunteers, setManagerVolunteers] = useState<VolunteerItem[]>([]);
  const [managerEditingId, setManagerEditingId] = useState<string | null>(null);
  const [managerDeletingId, setManagerDeletingId] = useState<string | null>(null);
  const [managerExpandedIds, setManagerExpandedIds] = useState<string[]>([]);
  const [managerStudentSelectionsByClass, setManagerStudentSelectionsByClass] = useState<Record<string, string[]>>({});
  
  const [homeroomForm, setHomeroomForm] = useState({
    department: "",
    teacher: "",
    activityName: "",
    activityContent: "",
    volunteerArea: "",
    startDate: "",
    endDate: "",
    grade: "",
    selectionCount: "",
    volunteerHours: "",
    location: "",
  });
  const [editForm, setEditForm] = useState({
    department: "",
    teacher: "",
    activityName: "",
    activityContent: "",
    volunteerArea: "",
    startDate: "",
    endDate: "",
    grade: "",
    selectionCount: "",
    volunteerHours: "",
    location: "",
  });
  const [managerForm, setManagerForm] = useState({
    department: "",
    teacher: "",
    activityName: "",
    activityContent: "",
    volunteerArea: "",
    startDate: "",
    endDate: "",
    grade: "",
    selectionCount: "",
    volunteerHours: "",
    location: "",
  });

  const [isHomeroomVolunteerAreaCustom, setIsHomeroomVolunteerAreaCustom] = useState(false);
  const [isManagerVolunteerAreaCustom, setIsManagerVolunteerAreaCustom] = useState(false);
  const [managerEditForm, setManagerEditForm] = useState({
    department: "",
    teacher: "",
    activityName: "",
    activityContent: "",
    volunteerArea: "",
    startDate: "",
    endDate: "",
    grade: "",
    selectionCount: "",
    volunteerHours: "",
    location: "",
  });

  const volunteerAreaOptions = [
    "환경보호활동",
    "이웃돕기활동",
    "캠페인 활동",
    "기타(직접 입력)",
  ];

  function getHomeroomSortValue(item: VolunteerItem, key: HomeroomSortKey): string | number {
    switch (key) {
      case "department": return item.department ?? "";
      case "teacher": return item.teacher ?? "";
      case "activityName": return item.activityName ?? "";
      case "volunteerArea": return item.volunteerArea ?? "";
      case "activityContent": return item.activityContent ?? "";
      case "startDate": return item.startDate ?? "";
      case "endDate": return item.endDate ?? "";
      case "grade": return item.grade ?? "";
      case "selectionCount": return item.selectionCount ?? 0;
      case "volunteerHours": return item.volunteerHours ?? 0;
      case "location": return item.location ?? "";
      default: return "";
    }
  }

  const sortedHomeroomVolunteers = useMemo(() => {
    if (!homeroomSortKey) return [...volunteers];
    return [...volunteers].sort((a, b) => {
      const va = getHomeroomSortValue(a, homeroomSortKey);
      const vb = getHomeroomSortValue(b, homeroomSortKey);
      const mul = homeroomSortDir === "asc" ? 1 : -1;
      const emptyA = va === null || va === "";
      const emptyB = vb === null || vb === "";
      if (emptyA && emptyB) return 0;
      if (emptyA) return mul;
      if (emptyB) return -mul;
      if (typeof va === "number" && typeof vb === "number") return mul * (va - vb);
      return mul * String(va).localeCompare(String(vb));
    });
  }, [volunteers, homeroomSortKey, homeroomSortDir]);

  function getManagerSortValue(item: VolunteerItem, key: ManagerSortKey): string | number {
    switch (key) {
      case "department": return item.department ?? "";
      case "teacher": return item.teacher ?? "";
      case "activityName": return item.activityName ?? "";
      case "volunteerArea": return item.volunteerArea ?? "";
      case "activityContent": return item.activityContent ?? "";
      case "startDate": return item.startDate ?? "";
      case "endDate": return item.endDate ?? "";
      case "grade": return item.grade ?? "";
      case "selectionCount": return item.selectionCount ?? 0;
      case "volunteerHours": return item.volunteerHours ?? 0;
      case "location": return item.location ?? "";
      default: return "";
    }
  }

  const sortedManagerVolunteers = useMemo(() => {
    if (!managerSortKey) return [...managerVolunteers];
    return [...managerVolunteers].sort((a, b) => {
      const va = getManagerSortValue(a, managerSortKey);
      const vb = getManagerSortValue(b, managerSortKey);
      const mul = managerSortDir === "asc" ? 1 : -1;
      const emptyA = va === null || va === "";
      const emptyB = vb === null || vb === "";
      if (emptyA && emptyB) return 0;
      if (emptyA) return mul;
      if (emptyB) return -mul;
      if (typeof va === "number" && typeof vb === "number") return mul * (va - vb);
      return mul * String(va).localeCompare(String(vb));
    });
  }, [managerVolunteers, managerSortKey, managerSortDir]);

  const handleHomeroomSort = (key: HomeroomSortKey) => {
    if (homeroomSortKey === key) {
      setHomeroomSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setHomeroomSortKey(key);
      setHomeroomSortDir("asc");
    }
  };

  const handleManagerSort = (key: ManagerSortKey) => {
    if (managerSortKey === key) {
      setManagerSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setManagerSortKey(key);
      setManagerSortDir("asc");
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchHomeroomVolunteers();
    fetchManagerVolunteers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (!res.ok) {
        throw new Error("교사 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      console.error("Error fetching teachers:", err);
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
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const fetchHomeroomVolunteers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/volunteers?type=homeroom");
      if (!res.ok) {
        throw new Error("봉사활동 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setVolunteers(data.volunteers || []);
      
      // 저장된 학생 선택 정보를 state에 로드
      const loadedSelections: Record<string, string[]> = {};
      data.volunteers?.forEach((volunteer: VolunteerItem) => {
        if (volunteer.studentSelections) {
          try {
            const parsed = JSON.parse(volunteer.studentSelections);
            Object.keys(parsed).forEach((classLabel) => {
              const key = `${volunteer.id}-${classLabel}`;
              loadedSelections[key] = parsed[classLabel] || [];
            });
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
      });
      setStudentSelectionsByClass(loadedSelections);
    } catch (err) {
      console.error("Error fetching volunteers:", err);
      setVolunteers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagerVolunteers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/volunteers?type=manager");
      if (!res.ok) {
        throw new Error("봉사활동 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setManagerVolunteers(data.volunteers || []);
      
      // 저장된 학생 선택 정보를 state에 로드
      const loadedSelections: Record<string, string[]> = {};
      data.volunteers?.forEach((volunteer: VolunteerItem) => {
        if (volunteer.studentSelections) {
          try {
            const parsed = JSON.parse(volunteer.studentSelections);
            Object.keys(parsed).forEach((classLabel) => {
              const key = `${volunteer.id}-${classLabel}`;
              loadedSelections[key] = parsed[classLabel] || [];
            });
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
      });
      setManagerStudentSelectionsByClass(loadedSelections);
    } catch (err) {
      console.error("Error fetching manager volunteers:", err);
      setManagerVolunteers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHomeroomAddClick = () => {
    setIsHomeroomOpen((v) => !v);
    if (!isHomeroomOpen) {
      // 폼 열 때 초기화
      setHomeroomForm({
        department: "",
        teacher: "",
        activityName: "",
        activityContent: "",
        volunteerArea: "",
        startDate: "",
        endDate: "",
        grade: "",
        selectionCount: "",
        volunteerHours: "",
        location: "",
      });
      setIsHomeroomVolunteerAreaCustom(false);
    }
  };

  const handleManagerAddClick = () => {
    setIsManagerOpen((v) => !v);
    if (!isManagerOpen) {
      // 폼 열 때 초기화
      setManagerForm({
        department: "",
        teacher: "",
        activityName: "",
        activityContent: "",
        volunteerArea: "",
        startDate: "",
        endDate: "",
        grade: "",
        selectionCount: "",
        volunteerHours: "",
        location: "",
      });
      setIsManagerVolunteerAreaCustom(false);
    }
  };

  const handleManagerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let next = value;
    if (name === "selectionCount" || name === "volunteerHours") {
      const n = value === "" ? NaN : parseInt(value, 10);
      if (!isNaN(n) && n < 1) next = "1";
    }
    setManagerForm((prev) => ({
      ...prev,
      [name]: next,
    }));
  };

  const handleManagerSave = async () => {
    const f = managerForm;
    const missing: string[] = [];
    if (!f.department.trim()) missing.push("부서명");
    if (!f.teacher.trim()) missing.push("담당교사");
    if (!f.activityName.trim()) missing.push("봉사활동명");
    if (!f.activityContent.trim()) missing.push("활동 내용");
    if (!f.volunteerArea.trim()) missing.push("봉사 영역");
    if (!f.startDate.trim()) missing.push("시작 날짜");
    if (!f.endDate.trim()) missing.push("종료 날짜");
    if (!f.grade.trim()) missing.push("활동 학년");
    if (!f.location.trim()) missing.push("활동 장소");
    if (missing.length) {
      alert("다음 필드를 입력해주세요: " + missing.join(", "));
      return;
    }
    const sc = f.selectionCount ? parseInt(f.selectionCount, 10) : null;
    const vh = f.volunteerHours ? parseInt(f.volunteerHours, 10) : null;
    if (sc === null || isNaN(sc) || sc < 1) {
      alert("선발 인원은 1 이상의 숫자를 입력해주세요.");
      return;
    }
    if (vh === null || isNaN(vh) || vh < 1) {
      alert("봉사 시간은 1 이상의 숫자를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...managerForm,
          type: "manager",
          selectionCount: sc,
          volunteerHours: vh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      
      alert("봉사활동이 추가되었습니다.");
      setIsManagerOpen(false);
      setManagerForm({
        department: "",
        teacher: "",
        activityName: "",
        activityContent: "",
        volunteerArea: "",
        startDate: "",
        endDate: "",
        grade: "",
        selectionCount: "",
        volunteerHours: "",
        location: "",
      });
      await fetchManagerVolunteers();
    } catch (err: any) {
      console.error("Error saving volunteer:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerCancel = () => {
    setIsManagerOpen(false);
    setManagerForm({
      department: "",
      teacher: "",
      activityName: "",
      activityContent: "",
      volunteerArea: "",
      startDate: "",
      endDate: "",
      grade: "",
      selectionCount: "",
      volunteerHours: "",
      location: "",
    });
  };

  const handleManagerEditStart = (item: VolunteerItem) => {
    setManagerEditingId(item.id);
    setManagerEditForm({
      department: item.department,
      teacher: item.teacher,
      activityName: item.activityName,
      activityContent: item.activityContent || "",
      volunteerArea: item.volunteerArea || "",
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      grade: item.grade || "",
      selectionCount: item.selectionCount?.toString() || "",
      volunteerHours: item.volunteerHours?.toString() || "",
      location: item.location || "",
    });
  };

  const handleManagerEditCancel = () => {
    setManagerEditingId(null);
    setManagerEditForm({
      department: "",
      teacher: "",
      activityName: "",
      activityContent: "",
      volunteerArea: "",
      startDate: "",
      endDate: "",
      grade: "",
      selectionCount: "",
      volunteerHours: "",
      location: "",
    });
  };

  const handleManagerEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let next = value;
    if (name === "selectionCount" || name === "volunteerHours") {
      const n = value === "" ? NaN : parseInt(value, 10);
      if (!isNaN(n) && n < 1) next = "1";
    }
    setManagerEditForm((prev) => ({
      ...prev,
      [name]: next,
    }));
  };

  const handleManagerEditSave = async () => {
    if (!managerEditingId) return;
    const f = managerEditForm;
    const missing: string[] = [];
    if (!f.department.trim()) missing.push("부서명");
    if (!f.teacher.trim()) missing.push("담당교사");
    if (!f.activityName.trim()) missing.push("봉사활동명");
    if (!f.activityContent.trim()) missing.push("활동 내용");
    if (!f.volunteerArea.trim()) missing.push("봉사 영역");
    if (!f.startDate.trim()) missing.push("시작 날짜");
    if (!f.endDate.trim()) missing.push("종료 날짜");
    if (!f.grade.trim()) missing.push("활동 학년");
    if (!f.location.trim()) missing.push("활동 장소");
    if (missing.length) {
      alert("다음 필드를 입력해주세요: " + missing.join(", "));
      return;
    }
    const sc = f.selectionCount ? parseInt(f.selectionCount, 10) : null;
    const vh = f.volunteerHours ? parseInt(f.volunteerHours, 10) : null;
    if (sc === null || isNaN(sc) || sc < 1) {
      alert("선발 인원은 1 이상의 숫자를 입력해주세요.");
      return;
    }
    if (vh === null || isNaN(vh) || vh < 1) {
      alert("봉사 시간은 1 이상의 숫자를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/volunteers/${managerEditingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...managerEditForm,
          selectionCount: sc,
          volunteerHours: vh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("봉사활동이 수정되었습니다.");
      handleManagerEditCancel();
      await fetchManagerVolunteers();
    } catch (err: any) {
      console.error("Error updating volunteer:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerDelete = async (id: string) => {
    if (!confirm("정말 이 봉사활동을 삭제하시겠습니까?")) return;

    try {
      setManagerDeletingId(id);
      const res = await fetch(`/api/academic-preparation/volunteers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      alert("봉사활동이 삭제되었습니다.");
      await fetchManagerVolunteers();
    } catch (err: any) {
      console.error("Error deleting volunteer:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setManagerDeletingId(null);
    }
  };

  // 담당자 선발 행 클릭 핸들러 (아코디언 확장/축소, 여러 개 동시 확장 가능)
  const handleManagerRowClick = (id: string, e: React.MouseEvent) => {
    if (managerEditingId === id) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }

    const isCurrentlyExpanded = managerExpandedIds.includes(id);
    const newExpandedIds = isCurrentlyExpanded
      ? managerExpandedIds.filter((x) => x !== id)
      : [...managerExpandedIds, id];
    setManagerExpandedIds(newExpandedIds);

    if (!isCurrentlyExpanded) {
      const volunteer = managerVolunteers.find((v) => v.id === id);
      if (volunteer) {
        const selectionCount = volunteer.selectionCount || 0;
        const classLabels = getClassLabelsByGrade(volunteer.grade);
        const newSelections: Record<string, string[]> = {};

        if (volunteer.studentSelections) {
          try {
            const parsed = JSON.parse(volunteer.studentSelections);
            classLabels.forEach((classLabel) => {
              const key = `${id}-${classLabel}`;
              const savedSelections = parsed[classLabel] || [];
              newSelections[key] = Array.from({ length: selectionCount }, (_, idx) =>
                savedSelections[idx] || ""
              );
            });
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
            classLabels.forEach((classLabel) => {
              const key = `${id}-${classLabel}`;
              newSelections[key] = Array(selectionCount).fill("");
            });
          }
        } else {
          classLabels.forEach((classLabel) => {
            const key = `${id}-${classLabel}`;
            newSelections[key] = Array(selectionCount).fill("");
          });
        }

        if (Object.keys(newSelections).length > 0) {
          setManagerStudentSelectionsByClass((prev) => ({ ...prev, ...newSelections }));
        }
      }
    }
  };

  // 담당자 선발 학반별 학생 선택 변경 핸들러
  const handleManagerStudentSelectionChange = (
    volunteerId: string,
    classLabel: string,
    index: number,
    studentId: string
  ) => {
    const key = `${volunteerId}-${classLabel}`;
    setManagerStudentSelectionsByClass(prev => {
      const current = prev[key] || [];
      const updated = [...current];
      updated[index] = studentId;
      return { ...prev, [key]: updated };
    });
  };

  // 담당자 선발에서 이미 선택된 학생 ID 목록 가져오기
  const getManagerSelectedStudentIds = (volunteerId: string, excludeClassLabel?: string, excludeIndex?: number): string[] => {
    const selectedIds: string[] = [];
    const volunteer = managerVolunteers.find(v => v.id === volunteerId);
    if (!volunteer) return selectedIds;

    const classLabels = getClassLabelsByGrade(volunteer.grade);
    classLabels.forEach(classLabel => {
      const key = `${volunteerId}-${classLabel}`;
      const selections = managerStudentSelectionsByClass[key] || [];
      selections.forEach((studentId, idx) => {
        if (studentId && studentId !== "" && !(classLabel === excludeClassLabel && idx === excludeIndex)) {
          selectedIds.push(studentId);
        }
      });
    });
    return selectedIds;
  };

  // 담당자 선발 학생 선택 정보 저장 핸들러
  const handleManagerSaveStudentSelections = async (volunteerId: string) => {
    try {
      setIsLoading(true);
      
      const volunteer = managerVolunteers.find(v => v.id === volunteerId);
      if (!volunteer) return;
      
      const classLabels = getClassLabelsByGrade(volunteer.grade);
      const selectionsToSave: Record<string, string[]> = {};
      
      classLabels.forEach(classLabel => {
        const key = `${volunteerId}-${classLabel}`;
        const selections = managerStudentSelectionsByClass[key] || [];
        const filteredSelections = selections.filter(id => id && id !== "");
        if (filteredSelections.length > 0) {
          selectionsToSave[classLabel] = filteredSelections;
        }
      });
      
      const studentSelectionsJson = Object.keys(selectionsToSave).length > 0 
        ? JSON.stringify(selectionsToSave) 
        : null;
      
      const res = await fetch(`/api/academic-preparation/volunteers/${volunteerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentSelections: studentSelectionsJson,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      alert("학생 선택 정보가 저장되었습니다.");
      await fetchManagerVolunteers();
    } catch (err: any) {
      console.error("Error saving student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHomeroomFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let next = value;
    if (name === "selectionCount" || name === "volunteerHours") {
      const n = value === "" ? NaN : parseInt(value, 10);
      if (!isNaN(n) && n < 1) next = "1";
    }
    setHomeroomForm((prev) => ({
      ...prev,
      [name]: next,
    }));
  };

  const handleHomeroomSave = async () => {
    const f = homeroomForm;
    const missing: string[] = [];
    if (!f.department.trim()) missing.push("부서명");
    if (!f.teacher.trim()) missing.push("담당교사");
    if (!f.activityName.trim()) missing.push("봉사활동명");
    if (!f.activityContent.trim()) missing.push("활동 내용");
    if (!f.volunteerArea.trim()) missing.push("봉사 영역");
    if (!f.startDate.trim()) missing.push("시작 날짜");
    if (!f.endDate.trim()) missing.push("종료 날짜");
    if (!f.grade.trim()) missing.push("활동 학년");
    if (!f.location.trim()) missing.push("활동 장소");
    if (missing.length) {
      alert("다음 필드를 입력해주세요: " + missing.join(", "));
      return;
    }
    const sc = f.selectionCount ? parseInt(f.selectionCount, 10) : null;
    const vh = f.volunteerHours ? parseInt(f.volunteerHours, 10) : null;
    if (sc === null || isNaN(sc) || sc < 1) {
      alert("선발 인원은 1 이상의 숫자를 입력해주세요.");
      return;
    }
    if (vh === null || isNaN(vh) || vh < 1) {
      alert("봉사 시간은 1 이상의 숫자를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...homeroomForm,
          type: "homeroom",
          selectionCount: sc,
          volunteerHours: vh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      
      alert("봉사활동이 추가되었습니다.");
      setIsHomeroomOpen(false);
      setHomeroomForm({
        department: "",
        teacher: "",
        activityName: "",
        activityContent: "",
        volunteerArea: "",
        startDate: "",
        endDate: "",
        grade: "",
        selectionCount: "",
        volunteerHours: "",
        location: "",
      });
      await fetchHomeroomVolunteers();
    } catch (err: any) {
      console.error("Error saving volunteer:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHomeroomCancel = () => {
    setIsHomeroomOpen(false);
    setHomeroomForm({
      department: "",
      teacher: "",
      activityName: "",
      activityContent: "",
      volunteerArea: "",
      startDate: "",
      endDate: "",
      grade: "",
      selectionCount: "",
      volunteerHours: "",
      location: "",
    });
  };

  const handleEditStart = (item: VolunteerItem) => {
    setEditingId(item.id);
    setEditForm({
      department: item.department,
      teacher: item.teacher,
      activityName: item.activityName,
      activityContent: item.activityContent || "",
      volunteerArea: item.volunteerArea || "",
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      grade: item.grade || "",
      selectionCount: item.selectionCount?.toString() || "",
      volunteerHours: item.volunteerHours?.toString() || "",
      location: item.location || "",
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({
      department: "",
      teacher: "",
      activityName: "",
      activityContent: "",
      volunteerArea: "",
      startDate: "",
      endDate: "",
      grade: "",
      selectionCount: "",
      volunteerHours: "",
      location: "",
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let next = value;
    if (name === "selectionCount" || name === "volunteerHours") {
      const n = value === "" ? NaN : parseInt(value, 10);
      if (!isNaN(n) && n < 1) next = "1";
    }
    setEditForm((prev) => ({
      ...prev,
      [name]: next,
    }));
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const f = editForm;
    const missing: string[] = [];
    if (!f.department.trim()) missing.push("부서명");
    if (!f.teacher.trim()) missing.push("담당교사");
    if (!f.activityName.trim()) missing.push("봉사활동명");
    if (!f.activityContent.trim()) missing.push("활동 내용");
    if (!f.volunteerArea.trim()) missing.push("봉사 영역");
    if (!f.startDate.trim()) missing.push("시작 날짜");
    if (!f.endDate.trim()) missing.push("종료 날짜");
    if (!f.grade.trim()) missing.push("활동 학년");
    if (!f.location.trim()) missing.push("활동 장소");
    if (missing.length) {
      alert("다음 필드를 입력해주세요: " + missing.join(", "));
      return;
    }
    const sc = f.selectionCount ? parseInt(f.selectionCount, 10) : null;
    const vh = f.volunteerHours ? parseInt(f.volunteerHours, 10) : null;
    if (sc === null || isNaN(sc) || sc < 1) {
      alert("선발 인원은 1 이상의 숫자를 입력해주세요.");
      return;
    }
    if (vh === null || isNaN(vh) || vh < 1) {
      alert("봉사 시간은 1 이상의 숫자를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/volunteers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          selectionCount: sc,
          volunteerHours: vh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("봉사활동이 수정되었습니다.");
      handleEditCancel();
      await fetchHomeroomVolunteers();
    } catch (err: any) {
      console.error("Error updating volunteer:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 봉사활동을 삭제하시겠습니까?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/academic-preparation/volunteers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      alert("봉사활동이 삭제되었습니다.");
      await fetchHomeroomVolunteers();
    } catch (err: any) {
      console.error("Error deleting volunteer:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  // 활동학년 표시 형식 변환 함수
  const formatGrade = (grade: string | null | undefined): string => {
    if (!grade) return "-";
    if (grade === "전체") return "전체";
    if (grade === "1" || grade === "2" || grade === "3") return `${grade}학년`;
    return grade; // 이미 "1학년" 형식인 경우 그대로 반환
  };

  // 활동 학년에 따른 classLabel 필터링 함수
  const getClassLabelsByGrade = (grade: string | null | undefined): string[] => {
    if (!grade) return [];
    
    const labels = new Set<string>();
    
    students.forEach((student) => {
      const classLabel = student.classLabel?.trim();
      if (!classLabel || classLabel === "-") return;
      
      // classLabel에서 학년 추출 (예: "1-1" -> "1", "2-3" -> "2")
      const gradeFromLabel = classLabel.split("-")[0]?.trim();
      
      if (grade === "전체") {
        // 전체인 경우 모든 classLabel 포함
        labels.add(classLabel);
      } else if (gradeFromLabel === grade) {
        // 학년이 일치하는 경우만 포함
        labels.add(classLabel);
      }
    });
    
    // 오름차순 정렬
    return Array.from(labels).sort();
  };

  // 학년별로 classLabel 그룹화하는 함수
  const getClassLabelsByGradeGrouped = (grade: string | null | undefined): Record<string, string[]> => {
    if (!grade) return {};
    
    const grouped: Record<string, string[]> = {
      "1": [],
      "2": [],
      "3": [],
    };
    
    students.forEach((student) => {
      const classLabel = student.classLabel?.trim();
      if (!classLabel || classLabel === "-") return;
      
      // classLabel에서 학년 추출 (예: "1-1" -> "1", "2-3" -> "2")
      const gradeFromLabel = classLabel.split("-")[0]?.trim();
      
      if (grade === "전체") {
        // 전체인 경우 모든 학년에 포함
        if (gradeFromLabel === "1" || gradeFromLabel === "2" || gradeFromLabel === "3") {
          if (!grouped[gradeFromLabel].includes(classLabel)) {
            grouped[gradeFromLabel].push(classLabel);
          }
        }
      } else if (gradeFromLabel === grade) {
        // 학년이 일치하는 경우만 포함
        if (!grouped[grade].includes(classLabel)) {
          grouped[grade].push(classLabel);
        }
      }
    });
    
    // 각 학년별로 정렬
    Object.keys(grouped).forEach(g => {
      grouped[g].sort();
    });
    
    return grouped;
  };

  // 행 클릭 핸들러 (아코디언 확장/축소, 여러 개 동시 확장 가능)
  const handleRowClick = (id: string, e: React.MouseEvent) => {
    if (editingId === id) return;

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }

    const isCurrentlyExpanded = expandedIds.includes(id);
    const newExpandedIds = isCurrentlyExpanded
      ? expandedIds.filter((x) => x !== id)
      : [...expandedIds, id];
    setExpandedIds(newExpandedIds);

    if (!isCurrentlyExpanded) {
      const volunteer = volunteers.find((v) => v.id === id);
      if (volunteer) {
        const selectionCount = volunteer.selectionCount || 0;
        const classLabels = getClassLabelsByGrade(volunteer.grade);
        const newSelections: Record<string, string[]> = {};

        if (volunteer.studentSelections) {
          try {
            const parsed = JSON.parse(volunteer.studentSelections);
            classLabels.forEach((classLabel) => {
              const key = `${id}-${classLabel}`;
              const savedSelections = parsed[classLabel] || [];
              newSelections[key] = Array.from({ length: selectionCount }, (_, idx) =>
                savedSelections[idx] || ""
              );
            });
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
            classLabels.forEach((classLabel) => {
              const key = `${id}-${classLabel}`;
              newSelections[key] = Array(selectionCount).fill("");
            });
          }
        } else {
          classLabels.forEach((classLabel) => {
            const key = `${id}-${classLabel}`;
            newSelections[key] = Array(selectionCount).fill("");
          });
        }

        if (Object.keys(newSelections).length > 0) {
          setStudentSelectionsByClass((prev) => ({ ...prev, ...newSelections }));
        }
      }
    }
  };

  // 학반별 학생 선택 변경 핸들러
  const handleStudentSelectionChange = (
    volunteerId: string,
    classLabel: string,
    index: number,
    studentId: string
  ) => {
    const key = `${volunteerId}-${classLabel}`;
    setStudentSelectionsByClass(prev => {
      const current = prev[key] || [];
      const updated = [...current];
      updated[index] = studentId;
      return { ...prev, [key]: updated };
    });
  };

  // 특정 학반의 학생 목록 가져오기
  const getStudentsByClassLabel = (classLabel: string): Student[] => {
    return students.filter(student => student.classLabel?.trim() === classLabel);
  };

  // 현재 봉사활동에서 이미 선택된 학생 ID 목록 가져오기 (현재 학반과 인덱스 제외)
  const getSelectedStudentIds = (volunteerId: string, excludeClassLabel?: string, excludeIndex?: number): string[] => {
    const selectedIds: string[] = [];
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (!volunteer) return selectedIds;

    const classLabels = getClassLabelsByGrade(volunteer.grade);
    classLabels.forEach(classLabel => {
      const key = `${volunteerId}-${classLabel}`;
      const selections = studentSelectionsByClass[key] || [];
      selections.forEach((studentId, idx) => {
        // 현재 학반과 인덱스는 제외
        if (studentId && studentId !== "" && !(classLabel === excludeClassLabel && idx === excludeIndex)) {
          selectedIds.push(studentId);
        }
      });
    });
    return selectedIds;
  };

  // 학생 선택 정보 저장 핸들러
  const handleSaveStudentSelections = async (volunteerId: string) => {
    try {
      setIsLoading(true);
      
      // 현재 봉사활동의 모든 학반별 학생 선택 정보 수집
      const volunteer = volunteers.find(v => v.id === volunteerId);
      if (!volunteer) return;
      
      const classLabels = getClassLabelsByGrade(volunteer.grade);
      const selectionsToSave: Record<string, string[]> = {};
      
      classLabels.forEach(classLabel => {
        const key = `${volunteerId}-${classLabel}`;
        const selections = studentSelectionsByClass[key] || [];
        // 빈 값 제거
        const filteredSelections = selections.filter(id => id && id !== "");
        if (filteredSelections.length > 0) {
          selectionsToSave[classLabel] = filteredSelections;
        }
      });
      
      // JSON 문자열로 변환
      const studentSelectionsJson = Object.keys(selectionsToSave).length > 0 
        ? JSON.stringify(selectionsToSave) 
        : null;
      
      const res = await fetch(`/api/academic-preparation/volunteers/${volunteerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentSelections: studentSelectionsJson,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      alert("학생 선택 정보가 저장되었습니다.");
      await fetchHomeroomVolunteers();
    } catch (err: any) {
      console.error("Error saving student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 학생 ID 배열을 학생 이름 문자열로 변환
  const getStudentNames = (studentIds: string[]): string => {
    if (!studentIds || studentIds.length === 0) return "";
    
    const names = studentIds
      .map(id => {
        const student = students.find(s => s.id === id);
        if (!student) return null;
        return student.studentId 
          ? `${student.studentId} ${student.name}` 
          : student.name;
      })
      .filter(name => name !== null);
    
    return names.join(", ");
  };

  // 활동 학년 포맷팅
  const formatGradeForCSV = (grade: string | null | undefined): string => {
    if (!grade) return "";
    if (grade === "전체") return "전체";
    if (grade === "1" || grade === "2" || grade === "3") return `${grade}학년`;
    return grade;
  };

  // 날짜 포맷: yyyy-mm-dd(요일)
  const formatDateWithDay = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const s = String(dateStr).trim();
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    if (match) {
      const [, y, m, d] = match;
      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return `${y}-${m}-${d}(${dayNames[dObj.getDay()]})`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}(${dayNames[d.getDay()]})`;
  };

  // 담임 선발 CSV 다운로드 함수
  const handleHomeroomDownloadCSV = () => {
    // CSV 헤더 (테이블 헤더 순서와 일치)
    const headers = [
      "순", 
      "부서명", 
      "담당교사", 
      "봉사활동명", 
      "봉사 영역", 
      "활동 내용", 
      "시작 날짜", 
      "종료 날짜", 
      "활동 학년", 
      "봉사 시간", 
      "활동 장소", 
      "학생 명단"
    ];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const escapeCSV = (value: string | number | null | undefined, preventDateConversion = false) => {
      if (value === null || value === undefined || value === "") return "";
      const stringValue = String(value);
      
      // 특수문자 이스케이프
      let escaped = stringValue.replace(/"/g, '""');
      
      // 날짜 변환 방지가 필요한 경우 작은따옴표 추가 (Excel이 텍스트로 인식)
      // 작은따옴표는 Excel에서 보이지 않으며 텍스트로 강제함
      if (preventDateConversion) {
        escaped = `'${escaped}`;
      }
      
      return `"${escaped}"`;
    };

    // 한 봉사활동당 학생 수만큼 행 생성 (학생 명단 열에는 한 명만, 번호는 행마다 1씩 증가)
    const dataRows: string[] = [];
    let rowNumber = 1;
    volunteers.forEach((item) => {
      let allStudentIds: string[] = [];
      if (item.studentSelections) {
        try {
          const parsed = JSON.parse(item.studentSelections);
          Object.values(parsed).forEach((studentIds: any) => {
            if (Array.isArray(studentIds)) {
              allStudentIds.push(...studentIds.filter((id: string) => id && id !== ""));
            }
          });
        } catch (e) {
          console.error("Error parsing studentSelections:", e);
        }
      }
      const activityRow = [
        escapeCSV(item.department),
        escapeCSV(item.teacher),
        escapeCSV(item.activityName),
        escapeCSV(item.volunteerArea ?? ""),
        escapeCSV(item.activityContent ?? ""),
        escapeCSV(formatDateWithDay(item.startDate)),
        escapeCSV(formatDateWithDay(item.endDate)),
        escapeCSV(formatGradeForCSV(item.grade)),
        escapeCSV(item.volunteerHours ?? ""),
        escapeCSV(item.location ?? ""),
      ];
      if (allStudentIds.length === 0) {
        dataRows.push([escapeCSV(rowNumber++), ...activityRow, escapeCSV("")].join(","));
      } else {
        allStudentIds.forEach((studentId) => {
          const studentName = getStudentNames([studentId]);
          dataRows.push([escapeCSV(rowNumber++), ...activityRow, escapeCSV(studentName)].join(","));
        });
      }
    });

    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...dataRows,
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
    const csvDateStr = now.toISOString().split("T")[0];
    const filename = `봉사활동_담임선발_${csvDateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 담당자 선발 CSV 다운로드 함수
  const handleManagerDownloadCSV = () => {
    // CSV 헤더 (테이블 헤더 순서와 일치)
    const headers = [
      "순", 
      "부서명", 
      "담당교사", 
      "봉사활동명", 
      "봉사 영역", 
      "활동 내용", 
      "시작 날짜", 
      "종료 날짜", 
      "활동 학년", 
      "봉사 시간", 
      "활동 장소", 
      "학생 명단"
    ];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const escapeCSV = (value: string | number | null | undefined, preventDateConversion = false) => {
      if (value === null || value === undefined || value === "") return "";
      const stringValue = String(value);
      
      // 특수문자 이스케이프
      let escaped = stringValue.replace(/"/g, '""');
      
      // 날짜 변환 방지가 필요한 경우 작은따옴표 추가 (Excel이 텍스트로 인식)
      // 작은따옴표는 Excel에서 보이지 않으며 텍스트로 강제함
      if (preventDateConversion) {
        escaped = `'${escaped}`;
      }
      
      return `"${escaped}"`;
    };

    // 한 봉사활동당 학생 수만큼 행 생성 (학생 명단 열에는 한 명만, 번호는 행마다 1씩 증가)
    const dataRows: string[] = [];
    let rowNumber = 1;
    managerVolunteers.forEach((item) => {
      let allStudentIds: string[] = [];
      if (item.studentSelections) {
        try {
          const parsed = JSON.parse(item.studentSelections);
          Object.values(parsed).forEach((studentIds: any) => {
            if (Array.isArray(studentIds)) {
              allStudentIds.push(...studentIds.filter((id: string) => id && id !== ""));
            }
          });
        } catch (e) {
          console.error("Error parsing studentSelections:", e);
        }
      }
      const activityRow = [
        escapeCSV(item.department),
        escapeCSV(item.teacher),
        escapeCSV(item.activityName),
        escapeCSV(item.volunteerArea ?? ""),
        escapeCSV(item.activityContent ?? ""),
        escapeCSV(formatDateWithDay(item.startDate)),
        escapeCSV(formatDateWithDay(item.endDate)),
        escapeCSV(formatGradeForCSV(item.grade)),
        escapeCSV(item.volunteerHours ?? ""),
        escapeCSV(item.location ?? ""),
      ];
      if (allStudentIds.length === 0) {
        dataRows.push([escapeCSV(rowNumber++), ...activityRow, escapeCSV("")].join(","));
      } else {
        allStudentIds.forEach((studentId) => {
          const studentName = getStudentNames([studentId]);
          dataRows.push([escapeCSV(rowNumber++), ...activityRow, escapeCSV(studentName)].join(","));
        });
      }
    });

    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...dataRows,
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
    const csvDateStr = now.toISOString().split("T")[0];
    const filename = `봉사활동_담당자선발_${csvDateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">봉사활동</h2>
        <div className="flex items-center gap-1 mt-1">
          <p className="text-sm text-gray-500">
            봉사활동을 생성하고 학생 명단을 입력합니다.
          </p>
          <div 
            className="relative cursor-help"
            onMouseEnter={() => setShowHelpTooltip(true)}
            onMouseLeave={() => setShowHelpTooltip(false)}
            >
            <HelpCircle className="w-4 h-4 text-gray-400" />
            {showHelpTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                목록을 클릭하면 학생 입력 모달이 뜹니다.
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 담임 선발 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">담임 선발</h3>
          {/* 설명 문구 추가 시작 */}
          <p className="text-sm text-gray-500 mt-1">
            담임 선발은 담임이 학생을 입력합니다.
          </p>
          {/* 설명 문구 추가 끝 */}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHomeroomDownloadCSV}
            disabled={volunteers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </button>
          <button
            type="button"
            onClick={handleHomeroomAddClick}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isHomeroomOpen ? "닫기" : "봉사활동 추가"}
          </button>
        </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && volunteers.length === 0 && !isHomeroomOpen ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-0 px-0 font-semibold text-gray-700 w-10">순</th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("department")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        부서명
                        {homeroomSortKey === "department" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("teacher")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        담당교사
                        {homeroomSortKey === "teacher" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-32 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("activityName")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사활동명
                        {homeroomSortKey === "activityName" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("volunteerArea")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사 영역
                        {homeroomSortKey === "volunteerArea" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                      style={{ minWidth: "180px" }}
                      onClick={() => handleHomeroomSort("activityContent")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 내용
                        {homeroomSortKey === "activityContent" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("startDate")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        시작 날짜
                        {homeroomSortKey === "startDate" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("endDate")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        종료 날짜
                        {homeroomSortKey === "endDate" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("grade")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 학년
                        {homeroomSortKey === "grade" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("selectionCount")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        선발 인원
                        {homeroomSortKey === "selectionCount" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("volunteerHours")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사 시간
                        {homeroomSortKey === "volunteerHours" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleHomeroomSort("location")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 장소
                        {homeroomSortKey === "location" && (homeroomSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th className="text-center py-0 px-0 font-semibold text-gray-700 w-28">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.length === 0 && !isHomeroomOpen ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-sm text-gray-600">
                        등록된 봉사활동이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                  {isHomeroomOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 px-0 text-gray-600 w-10 text-center">-</td>
                      <td className="py-2 px-0">
                        <input
                          name="department"
                          value={homeroomForm.department}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="부서명"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <select
                          name="teacher"
                          value={homeroomForm.teacher}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">교사 선택</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-0 w-28">
                        <input
                          name="activityName"
                          value={homeroomForm.activityName}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="봉사활동명"
                        />
                      </td>
                      <td className="py-2 px-0 w-28">
                        {/* 봉사 영역 선택 (담임 선발) */}
                        <select
                          name="volunteerArea"
                          value={
                            volunteerAreaOptions.includes(homeroomForm.volunteerArea)
                              ? homeroomForm.volunteerArea
                              : isHomeroomVolunteerAreaCustom
                              ? "기타(직접 입력)"
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "기타(직접 입력)") {
                              setIsHomeroomVolunteerAreaCustom(true);
                              setHomeroomForm((prev) => ({
                                ...prev,
                                volunteerArea: "",
                              }));
                            } else {
                              setIsHomeroomVolunteerAreaCustom(false);
                              setHomeroomForm((prev) => ({
                                ...prev,
                                volunteerArea: value,
                              }));
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">봉사 영역 선택</option>
                          {volunteerAreaOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {isHomeroomVolunteerAreaCustom && (
                          <input
                            name="volunteerArea"
                            value={homeroomForm.volunteerArea}
                            onChange={handleHomeroomFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="기타 봉사 영역을 입력하세요"
                          />
                        )}
                      </td>
                      <td className="py-2 px-0" style={{ minWidth: "220px" }}>
                        <input
                          name="activityContent"
                          value={homeroomForm.activityContent}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 내용"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <input
                          name="startDate"
                          type="date"
                          value={homeroomForm.startDate}
                          max={homeroomForm.endDate || undefined}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <input
                          name="endDate"
                          type="date"
                          value={homeroomForm.endDate}
                          min={homeroomForm.startDate || undefined}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-0">
                        <select
                          name="grade"
                          value={homeroomForm.grade}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">학년</option>
                          <option value="1">1학년</option>
                          <option value="2">2학년</option>
                          <option value="3">3학년</option>
                          <option value="전체">전체</option>
                        </select>
                      </td>
                      <td className="py-2 px-0 w-20">
                        <input
                          name="selectionCount"
                          type="number"
                          min={1}
                          step={1}
                          value={homeroomForm.selectionCount}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="명"
                        />
                      </td>
                      <td className="py-2 px-0 w-30">
                        <input
                          name="volunteerHours"
                          type="number"
                          min={1}
                          step={1}
                          value={homeroomForm.volunteerHours}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="시간"
                        />
                      </td>
                      <td className="py-2 px-0">
                        <input
                          name="location"
                          value={homeroomForm.location}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-2 px-0 w-28">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleHomeroomSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={handleHomeroomCancel}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedHomeroomVolunteers.map((item, idx) => (
                    <React.Fragment key={item.id}>
                    {editingId === item.id ? (
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="py-2 px-0 text-sm text-gray-600 w-12 text-center">{idx + 1}</td>
                        <td className="py-2 px-0 w-20">
                          <input
                            name="department"
                            value={editForm.department}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-24">
                          <select
                            name="teacher"
                            value={editForm.teacher}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">교사 선택</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-0 w-28">
                          <input
                            name="activityName"
                            value={editForm.activityName}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-28">
                          <select
                            name="volunteerArea"
                            value={editForm.volunteerArea}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">봉사 영역 선택</option>
                            {volunteerAreaOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {editForm.volunteerArea &&
                            !volunteerAreaOptions.includes(editForm.volunteerArea) && (
                              <input
                                name="volunteerArea"
                                value={editForm.volunteerArea}
                                onChange={handleEditFormChange}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="기타 봉사 영역을 입력하세요"
                              />
                            )}
                        </td>
                        <td className="py-2 px-0" style={{ minWidth: "180px" }}>
                          <input
                            name="activityContent"
                            value={editForm.activityContent}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-24">
                          <input
                            name="startDate"
                            type="date"
                            value={editForm.startDate}
                            max={editForm.endDate || undefined}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-24">
                          <input
                            name="endDate"
                            type="date"
                            value={editForm.endDate}
                            min={editForm.startDate || undefined}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-24">
                          <select
                            name="grade"
                            value={editForm.grade}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">학년</option>
                            <option value="1">1학년</option>
                            <option value="2">2학년</option>
                            <option value="3">3학년</option>
                            <option value="전체">전체</option>
                          </select>
                        </td>
                        <td className="py-2 px-0 w-20">
                          <input
                            name="selectionCount"
                            type="number"
                            min={1}
                            step={1}
                            value={editForm.selectionCount}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-20">
                          <input
                            name="volunteerHours"
                            type="number"
                            min={1}
                            step={1}
                            value={editForm.volunteerHours}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-24">
                          <input
                            name="location"
                            value={editForm.location}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-28">
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
                      <>
                        <tr 
                          onClick={(e) => handleRowClick(item.id, e)}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            expandedIds.includes(item.id) ? 'bg-blue-50' : ''
                          } cursor-pointer`}
                        >
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-12 text-center">{idx + 1}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-900 w-24">{item.department}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24 whitespace-nowrap">{item.teacher}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-32">{item.activityName}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24">{item.volunteerArea || "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600" style={{ minWidth: "200px" }}>
                            {item.activityContent || "-"}
                          </td>
                        <td className="py-1.5 px-2 text-sm text-gray-600 text-center w-24 whitespace-nowrap">
                            {item.startDate ? new Date(item.startDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                        <td className="py-1.5 px-2 text-sm text-gray-600 text-center w-24 whitespace-nowrap">
                            {item.endDate ? new Date(item.endDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24 whitespace-nowrap">
                            {formatGrade(item.grade)}
                          </td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-20">{item.selectionCount ?? "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-20">{item.volunteerHours ?? "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-32">{item.location || "-"}</td>
                          <td className="py-1.5 px-4 w-32">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditStart(item);
                                }}
                                disabled={isLoading || deletingId === item.id}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
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
                        {expandedIds.includes(item.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={13} className="py-6 px-4">
                              <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-start gap-8">
                                  {/* 좌측: 활동 학년과 선발 인원 */}
                                  <div className="flex flex-col gap-4 min-w-[200px]">
                                    
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          학생 입력
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveStudentSelections(item.id)}
                                          disabled={isLoading}
                                          className="inline-flex items-center px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isLoading ? "저장 중..." : "학생 선택 저장"}
                                        </button>
                                      </div>
                                      <div className="flex flex-col gap-4">
                                        {(() => {
                                          const grouped = getClassLabelsByGradeGrouped(item.grade);
                                          const hasData = Object.values(grouped).some(classes => classes.length > 0);
                                          
                                          if (!hasData) {
                                            return <span className="text-sm text-gray-400">학반 정보가 없습니다.</span>;
                                          }
                                          
                                          return ["1", "2", "3"].map((gradeKey) => {
                                            const classLabels = grouped[gradeKey];
                                            if (classLabels.length === 0) return null;
                                            
                                            return (
                                              <div key={gradeKey} className="flex flex-wrap gap-4">
                                                {classLabels.map((classLabel) => {
                                                  const selectionKey = `${item.id}-${classLabel}`;
                                                  const selections = studentSelectionsByClass[selectionKey] || [];
                                                  const selectionCount = item.selectionCount || 0;
                                                  const classStudents = getStudentsByClassLabel(classLabel);
                                                  
                                                  return (
                                                    <div key={classLabel} className="flex flex-col gap-2">
                                                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200 w-fit">
                                                        {classLabel}
                                                      </span>
                                                      <div className="flex flex-col gap-2">
                                                        {Array.from({ length: selectionCount }).map((_, idx) => {
                                                          // 현재 드롭다운을 제외한 이미 선택된 학생 ID 목록
                                                          const selectedIds = getSelectedStudentIds(item.id, classLabel, idx);
                                                          
                                                          return (
                                                            <select
                                                              key={idx}
                                                              // 1. 선택된 값이 없을 때(빈 문자열) text-gray-400 클래스를 추가합니다.
                                                              value={selections[idx] || ""}
                                                              onChange={(e) => handleStudentSelectionChange(item.id, classLabel, idx, e.target.value)}
                                                              className={`w-[120px] px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                                                                !(selections[idx]) ? "text-gray-400" : "text-black"
                                                              }`}
                                                            >
                                                              {/* 2. "학생 선택" 옵션은 첫 화면에서만 회색으로 보이게 유도합니다. */}
                                                              <option value="" className="text-gray-400">학생 선택</option>
                                                              
                                                              {classStudents.map((student) => {
                                                                const isSelected = selectedIds.includes(student.id);
                                                                return (
                                                                  <option 
                                                                    key={student.id} 
                                                                    value={student.id}
                                                                    disabled={isSelected}
                                                                    className="text-black" // 선택 목록은 다시 검은색으로 표시
                                                                    style={isSelected ? { color: '#999', fontStyle: 'italic' } : {}}
                                                                  >
                                                                    {student.studentId ? `${student.studentId} ${student.name}` : student.name}
                                                                    {isSelected ? ' (선택됨)' : ''}
                                                                  </option>
                                                                );
                                                              })}
                                                            </select>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  {/* 우측: 추후 추가 정보 입력 공간 */}
                                  <div className="flex-1">
                                    {/* 추가 정보 입력 필드들이 들어갈 공간 */}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    </React.Fragment>
                  ))}
                    </>
                  )}
                </tbody>
              </table>
          )}
        </div>
      </section>

      {/* 담당자 선발 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">담당자 선발</h3>
            {/* 설명 문구 추가 시작 */}
            <p className="text-sm text-gray-500 mt-1">
              담당자 선발은 담당자가 학생을 입력합니다.
            </p>
            {/* 설명 문구 추가 끝 */}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManagerDownloadCSV}
              disabled={managerVolunteers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
            <button
              type="button"
              onClick={handleManagerAddClick}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {isManagerOpen ? "닫기" : "봉사활동 추가"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && managerVolunteers.length === 0 && !isManagerOpen ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-0 px-0 font-semibold text-gray-700 w-10">순</th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("department")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        부서명
                        {managerSortKey === "department" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("teacher")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        담당교사
                        {managerSortKey === "teacher" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-32 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("activityName")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사활동명
                        {managerSortKey === "activityName" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("volunteerArea")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사 영역
                        {managerSortKey === "volunteerArea" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                      style={{ minWidth: "180px" }}
                      onClick={() => handleManagerSort("activityContent")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 내용
                        {managerSortKey === "activityContent" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("startDate")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        시작 날짜
                        {managerSortKey === "startDate" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("endDate")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        종료 날짜
                        {managerSortKey === "endDate" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("grade")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 학년
                        {managerSortKey === "grade" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("selectionCount")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        선발 인원
                        {managerSortKey === "selectionCount" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-20 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("volunteerHours")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        봉사 시간
                        {managerSortKey === "volunteerHours" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th
                      className="text-center py-0 px-0 font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleManagerSort("location")}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        활동 장소
                        {managerSortKey === "location" && (managerSortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </span>
                    </th>
                    <th className="text-center py-0 px-0 font-semibold text-gray-700 w-28">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {managerVolunteers.length === 0 && !isManagerOpen ? (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-sm text-gray-600">
                        등록된 봉사활동이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                  {isManagerOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 px-0 text-gray-600 w-10">-</td>
                      <td className="py-2 px-0 w-20">
                        <input
                          name="department"
                          value={managerForm.department}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="부서명"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <select
                          name="teacher"
                          value={managerForm.teacher}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">교사 선택</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-0 w-28">
                        <input
                          name="activityName"
                          value={managerForm.activityName}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="봉사활동명"
                        />
                      </td>
                      <td className="py-2 px-0 w-28">
                        {/* 봉사 영역 선택 (담당자 선발) */}
                        <select
                          name="volunteerArea"
                          value={
                            volunteerAreaOptions.includes(managerForm.volunteerArea)
                              ? managerForm.volunteerArea
                              : isManagerVolunteerAreaCustom
                              ? "기타(직접 입력)"
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "기타(직접 입력)") {
                              setIsManagerVolunteerAreaCustom(true);
                              setManagerForm((prev) => ({
                                ...prev,
                                volunteerArea: "",
                              }));
                            } else {
                              setIsManagerVolunteerAreaCustom(false);
                              setManagerForm((prev) => ({
                                ...prev,
                                volunteerArea: value,
                              }));
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">봉사 영역 선택</option>
                          {volunteerAreaOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {isManagerVolunteerAreaCustom && (
                          <input
                            name="volunteerArea"
                            value={managerForm.volunteerArea}
                            onChange={handleManagerFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="기타 봉사 영역을 입력하세요"
                          />
                        )}
                      </td>
                      <td className="py-2 px-0" style={{ minWidth: "220px" }}>
                        <input
                          name="activityContent"
                          value={managerForm.activityContent}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 내용"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <input
                          name="startDate"
                          type="date"
                          value={managerForm.startDate}
                          max={managerForm.endDate || undefined}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <input
                          name="endDate"
                          type="date"
                          value={managerForm.endDate}
                          min={managerForm.startDate || undefined}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-0 w-20">
                        <select
                          name="grade"
                          value={managerForm.grade}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">학년</option>
                          <option value="1">1학년</option>
                          <option value="2">2학년</option>
                          <option value="3">3학년</option>
                          <option value="전체">전체</option>
                        </select>
                      </td>
                      <td className="py-2 px-0 w-20">
                        <input
                          name="selectionCount"
                          type="number"
                          min={1}
                          step={1}
                          value={managerForm.selectionCount}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="명"
                        />
                      </td>
                      <td className="py-2 px-0">
                        <input
                          name="volunteerHours"
                          type="number"
                          min={1}
                          step={1}
                          value={managerForm.volunteerHours}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="시간"
                        />
                      </td>
                      <td className="py-2 px-0 w-24">
                        <input
                          name="location"
                          value={managerForm.location}
                          onChange={handleManagerFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-2 px-0 w-28">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleManagerSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={handleManagerCancel}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedManagerVolunteers.map((item, idx) => (
                    <React.Fragment key={item.id}>
                    {managerEditingId === item.id ? (
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="py-2 px-0 text-sm text-gray-600 w-12 text-center">{idx + 1}</td>
                        <td className="py-0 px-0 w-20">
                          <input
                            name="department"
                            value={managerEditForm.department}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-24">
                          <select
                            name="teacher"
                            value={managerEditForm.teacher}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">교사 선택</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-0 px-0 w-28">
                          <input
                            name="activityName"
                            value={managerEditForm.activityName}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-28">
                          <select
                            name="volunteerArea"
                            value={managerEditForm.volunteerArea}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">봉사 영역 선택</option>
                            {volunteerAreaOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {managerEditForm.volunteerArea &&
                            !volunteerAreaOptions.includes(managerEditForm.volunteerArea) && (
                              <input
                                name="volunteerArea"
                                value={managerEditForm.volunteerArea}
                                onChange={handleManagerEditFormChange}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="기타 봉사 영역을 입력하세요"
                              />
                            )}
                        </td>
                        <td className="py-0 px-0" style={{ minWidth: "180px" }}>
                          <input
                            name="activityContent"
                            value={managerEditForm.activityContent}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-24">
                          <input
                            name="startDate"
                            type="date"
                            value={managerEditForm.startDate}
                            max={managerEditForm.endDate || undefined}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-24">
                          <input
                            name="endDate"
                            type="date"
                            value={managerEditForm.endDate}
                            min={managerEditForm.startDate || undefined}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-24">
                          <select
                            name="grade"
                            value={managerEditForm.grade}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">학년</option>
                            <option value="1">1학년</option>
                            <option value="2">2학년</option>
                            <option value="3">3학년</option>
                            <option value="전체">전체</option>
                          </select>
                        </td>
                        <td className="py-0 px-0 w-20">
                          <input
                            name="selectionCount"
                            type="number"
                            min={1}
                            step={1}
                            value={managerEditForm.selectionCount}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-20">
                          <input
                            name="volunteerHours"
                            type="number"
                            min={1}
                            step={1}
                            value={managerEditForm.volunteerHours}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-0 px-0 w-24">
                          <input
                            name="location"
                            value={managerEditForm.location}
                            onChange={handleManagerEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-0 w-28">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleManagerEditSave}
                              disabled={isLoading}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={handleManagerEditCancel}
                              disabled={isLoading}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50"
                            >
                              취소
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr 
                          onClick={(e) => handleManagerRowClick(item.id, e)}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            managerExpandedIds.includes(item.id) ? 'bg-blue-50' : ''
                          } cursor-pointer`}
                        >
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-900 w-24">{item.department}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24 whitespace-nowrap">{item.teacher}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-32">{item.activityName}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24">{item.volunteerArea || "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600" style={{ minWidth: "200px" }}>
                            {item.activityContent || "-"}
                          </td>
                          <td className="py-1.5 px-2 text-sm text-gray-600 text-center w-24 whitespace-nowrap">
                            {item.startDate ? new Date(item.startDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="py-1.5 px-2 text-sm text-gray-600 text-center w-24 whitespace-nowrap">
                            {item.endDate ? new Date(item.endDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-24 whitespace-nowrap">
                            {formatGrade(item.grade)}
                          </td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-20">{item.selectionCount ?? "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-20">{item.volunteerHours ?? "-"}</td>
                          <td className="py-1.5 px-4 text-sm text-gray-600 w-32">{item.location || "-"}</td>
                          <td className="py-1.5 px-4 w-32">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManagerEditStart(item);
                                }}
                                disabled={isLoading || managerDeletingId === item.id}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManagerDelete(item.id);
                                }}
                                disabled={isLoading || managerDeletingId === item.id}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
                                title="삭제"
                              >
                                {managerDeletingId === item.id ? (
                                  <span className="text-xs">삭제 중...</span>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {managerExpandedIds.includes(item.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={13} className="py-6 px-4">
                              <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-start gap-8">
                                  <div className="flex flex-col gap-4 min-w-[200px]">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-semibold text-gray-700">
                                          학생 입력
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleManagerSaveStudentSelections(item.id)}
                                          disabled={isLoading}
                                          className="inline-flex items-center px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isLoading ? "저장 중..." : "학생 선택 저장"}
                                        </button>
                                      </div>
                                      <div className="flex flex-col gap-4">
                                        {(() => {
                                          const grouped = getClassLabelsByGradeGrouped(item.grade);
                                          const hasData = Object.values(grouped).some(classes => classes.length > 0);
                                          
                                          if (!hasData) {
                                            return <span className="text-sm text-gray-400">학반 정보가 없습니다.</span>;
                                          }
                                          
                                          return ["1", "2", "3"].map((gradeKey) => {
                                            const classLabels = grouped[gradeKey];
                                            if (classLabels.length === 0) return null;
                                            
                                            return (
                                              <div key={gradeKey} className="flex flex-wrap gap-4">
                                                {classLabels.map((classLabel) => {
                                                  const selectionKey = `${item.id}-${classLabel}`;
                                                  const selections = managerStudentSelectionsByClass[selectionKey] || [];
                                                  const selectionCount = item.selectionCount || 0;
                                                  const classStudents = getStudentsByClassLabel(classLabel);
                                                  
                                                  return (
                                                    <div key={classLabel} className="flex flex-col gap-2">
                                                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200 w-fit">
                                                        {classLabel}
                                                      </span>
                                                      <div className="flex flex-col gap-2">
                                                        {Array.from({ length: selectionCount }).map((_, idx) => {
                                                          const selectedIds = getManagerSelectedStudentIds(item.id, classLabel, idx);
                                                          
                                                          return (
                                                            <select
                                                              key={idx}
                                                              value={selections[idx] || ""}
                                                              onChange={(e) => handleManagerStudentSelectionChange(item.id, classLabel, idx, e.target.value)}
                                                              className={`w-[120px] px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                                                                !(selections[idx]) ? "text-gray-400" : "text-black"
                                                              }`}
                                                            >
                                                              <option value="" className="text-gray-400">학생 선택</option>
                                                              
                                                              {classStudents.map((student) => {
                                                                const isSelected = selectedIds.includes(student.id);
                                                                return (
                                                                  <option 
                                                                    key={student.id} 
                                                                    value={student.id}
                                                                    disabled={isSelected}
                                                                    className="text-black"
                                                                    style={isSelected ? { color: '#999', fontStyle: 'italic' } : {}}
                                                                  >
                                                                    {student.studentId ? `${student.studentId} ${student.name}` : student.name}
                                                                    {isSelected ? ' (선택됨)' : ''}
                                                                  </option>
                                                                );
                                                              })}
                                                            </select>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    {/* 추가 정보 입력 필드들이 들어갈 공간 */}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    </React.Fragment>
                  ))}
                    </>
                  )}
                </tbody>
              </table>
          )}
        </div>
      </section>
    </div>
  );
}

