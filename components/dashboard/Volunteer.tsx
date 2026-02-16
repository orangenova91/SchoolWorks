"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Trash2 } from "lucide-react";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 각 봉사활동의 각 학반별 학생 선택 상태: { [volunteerId-classLabel]: string[] }
  const [studentSelectionsByClass, setStudentSelectionsByClass] = useState<Record<string, string[]>>({});
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

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchVolunteers();
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

  const fetchVolunteers = async () => {
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
      // API가 아직 구현되지 않은 경우를 위해 빈 배열로 설정
      setVolunteers([]);
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
    }
  };

  const handleManagerAddClick = () => {
    // 버튼 동작은 추후 구현 예정
    setIsManagerOpen((v) => !v);
  };

  const handleHomeroomFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHomeroomForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleHomeroomSave = async () => {
    // 필수 필드 검증
    if (!homeroomForm.department.trim() || !homeroomForm.teacher.trim() || !homeroomForm.activityName.trim()) {
      alert("부서명, 담당교사, 봉사활동명을 모두 입력해주세요.");
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
          selectionCount: homeroomForm.selectionCount ? parseInt(homeroomForm.selectionCount, 10) : null,
          volunteerHours: homeroomForm.volunteerHours ? parseInt(homeroomForm.volunteerHours, 10) : null,
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
      await fetchVolunteers();
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
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editForm.department.trim() || !editForm.teacher.trim() || !editForm.activityName.trim()) {
      alert("부서명, 담당교사, 봉사활동명을 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/volunteers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          selectionCount: editForm.selectionCount ? parseInt(editForm.selectionCount, 10) : null,
          volunteerHours: editForm.volunteerHours ? parseInt(editForm.volunteerHours, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("봉사활동이 수정되었습니다.");
      handleEditCancel();
      await fetchVolunteers();
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
      await fetchVolunteers();
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

  // 행 클릭 핸들러 (아코디언 확장/축소)
  const handleRowClick = (id: string, e: React.MouseEvent) => {
    // 편집 모드이거나 버튼 클릭 시에는 확장하지 않음
    if (editingId === id) return;
    
    // 버튼 클릭 이벤트는 확장하지 않음
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }

    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    
    // 확장 시 저장된 학생 선택 정보를 로드하거나 초기화
    if (newExpandedId) {
      const volunteer = volunteers.find(v => v.id === newExpandedId);
      if (volunteer) {
        const selectionCount = volunteer.selectionCount || 0;
        const classLabels = getClassLabelsByGrade(volunteer.grade);
        const newSelections: Record<string, string[]> = {};
        
        // 저장된 학생 선택 정보가 있으면 로드
        if (volunteer.studentSelections) {
          try {
            const parsed = JSON.parse(volunteer.studentSelections);
            classLabels.forEach(classLabel => {
              const key = `${newExpandedId}-${classLabel}`;
              const savedSelections = parsed[classLabel] || [];
              // 선발 인원 수만큼 배열 생성 (저장된 값이 있으면 사용, 없으면 빈 문자열)
              newSelections[key] = Array.from({ length: selectionCount }, (_, idx) => 
                savedSelections[idx] || ""
              );
            });
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
            // 파싱 실패 시 초기화
            classLabels.forEach(classLabel => {
              const key = `${newExpandedId}-${classLabel}`;
              newSelections[key] = Array(selectionCount).fill("");
            });
          }
        } else {
          // 저장된 정보가 없으면 초기화
          classLabels.forEach(classLabel => {
            const key = `${newExpandedId}-${classLabel}`;
            newSelections[key] = Array(selectionCount).fill("");
          });
        }
        
        if (Object.keys(newSelections).length > 0) {
          setStudentSelectionsByClass(prev => ({ ...prev, ...newSelections }));
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
      await fetchVolunteers();
    } catch (err: any) {
      console.error("Error saving student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">봉사활동</h2>
      </div>

      {/* 담임 선발 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">담임 선발</h3>
          <button
            type="button"
            onClick={handleHomeroomAddClick}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isHomeroomOpen ? "닫기" : "봉사활동 추가"}
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading && volunteers.length === 0 && !isHomeroomOpen ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-12">번호</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-20">부서명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">담당교사</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">봉사활동명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">봉사 영역</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700" style={{ minWidth: "200px" }}>활동 내용</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">시작 날짜</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">종료 날짜</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">활동 학년</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-20">선발 인원</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-20">봉사 시간</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">활동 장소</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">작업</th>
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
                  {volunteers.map((item, idx) => (
                    <React.Fragment key={item.id}>
                    {editingId === item.id ? (
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                        <td className="py-3 px-4 w-20">
                          <input
                            name="department"
                            value={editForm.department}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
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
                        <td className="py-3 px-4 w-24">
                          <input
                            name="activityName"
                            value={editForm.activityName}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <input
                            name="volunteerArea"
                            value={editForm.volunteerArea}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                          <input
                            name="activityContent"
                            value={editForm.activityContent}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <input
                            name="startDate"
                            type="date"
                            value={editForm.startDate}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <input
                            name="endDate"
                            type="date"
                            value={editForm.endDate}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
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
                        <td className="py-3 px-4 w-20">
                          <input
                            name="selectionCount"
                            type="number"
                            value={editForm.selectionCount}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-20">
                          <input
                            name="volunteerHours"
                            type="number"
                            value={editForm.volunteerHours}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <input
                            name="location"
                            value={editForm.location}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <>
                        <tr 
                          onClick={(e) => handleRowClick(item.id, e)}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            expandedId === item.id ? 'bg-blue-50' : ''
                          } cursor-pointer`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 w-24">{item.department}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.teacher}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-32">{item.activityName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.volunteerArea || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600" style={{ minWidth: "200px" }}>
                            {item.activityContent || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">
                            {item.startDate ? new Date(item.startDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">
                            {item.endDate ? new Date(item.endDate).toLocaleDateString("ko-KR") : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{formatGrade(item.grade)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-20">{item.selectionCount ?? "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-20">{item.volunteerHours ?? "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-32">{item.location || "-"}</td>
                          <td className="py-3 px-4 w-32">
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
                        {expandedId === item.id && (
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
                  {isHomeroomOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600 w-12">-</td>
                      <td className="py-3 px-4 w-20">
                        <input
                          name="department"
                          value={homeroomForm.department}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="부서명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
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
                      <td className="py-3 px-4 w-24">
                        <input
                          name="activityName"
                          value={homeroomForm.activityName}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="봉사활동명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="volunteerArea"
                          value={homeroomForm.volunteerArea}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="봉사 영역"
                        />
                      </td>
                      <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                        <input
                          name="activityContent"
                          value={homeroomForm.activityContent}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 내용"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="startDate"
                          type="date"
                          value={homeroomForm.startDate}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="endDate"
                          type="date"
                          value={homeroomForm.endDate}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
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
                      <td className="py-3 px-4 w-20">
                        <input
                          name="selectionCount"
                          type="number"
                          value={homeroomForm.selectionCount}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="명"
                        />
                      </td>
                      <td className="py-3 px-4 w-20">
                        <input
                          name="volunteerHours"
                          type="number"
                          value={homeroomForm.volunteerHours}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="시간"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="location"
                          value={homeroomForm.location}
                          onChange={handleHomeroomFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-3 px-4 w-32">
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
          <h3 className="text-lg font-semibold text-gray-900">담당자 선발</h3>
          <button
            type="button"
            onClick={handleManagerAddClick}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isManagerOpen ? "닫기" : "봉사활동 추가"}
          </button>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">내용이 준비 중입니다.</p>
        </div>
      </section>
    </div>
  );
}

