"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit2, Trash2, Download, HelpCircle } from "lucide-react";
import { StudentAutocomplete } from "./StudentAutocomplete";

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

interface ClubItem {
  id: string;
  clubName: string;
  teacher: string;
  category: string | null; // 구분: 인문, 사회, 수학, 과학, 어학, 독서*토론, 음악, 미술, 체육, 댄스, 기타
  clubType: string; // "창체" | "자율"
  description: string | null;
  grade: string | null;
  maxMembers: number | null;
  location: string | null;
  studentSelections: string | null; // JSON 문자열: { "classLabel": ["studentId1", "studentId2", ...] }
  createdAt: string;
}

export default function Club() {
  const [isCreativeOpen, setIsCreativeOpen] = useState(false);
  const [isAutonomousOpen, setIsAutonomousOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [creativeClubs, setCreativeClubs] = useState<ClubItem[]>([]);
  const [autonomousClubs, setAutonomousClubs] = useState<ClubItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentSelections, setStudentSelections] = useState<Record<string, string[]>>({}); // { clubId: [studentId1, studentId2, ...] }
  
  // 자율 동아리용 상태
  const [autonomousEditingId, setAutonomousEditingId] = useState<string | null>(null);
  const [autonomousDeletingId, setAutonomousDeletingId] = useState<string | null>(null);
  const [autonomousExpandedId, setAutonomousExpandedId] = useState<string | null>(null);
  const [autonomousStudentSelections, setAutonomousStudentSelections] = useState<Record<string, string[]>>({}); // { clubId: [studentId1, studentId2, ...] }
  
  // 미배정 학생/교사 표시용 상태
  const [showUnassignedStudents, setShowUnassignedStudents] = useState(false);
  const [showUnassignedTeachers, setShowUnassignedTeachers] = useState(false);
  const [showClubHelpTooltip, setShowClubHelpTooltip] = useState(false);
  
  const [creativeForm, setCreativeForm] = useState({
    clubName: "",
    teacher: "",
    category: "",
    description: "",
    maxMembers: "",
    location: "",
  });
  const [editForm, setEditForm] = useState({
    clubName: "",
    teacher: "",
    category: "",
    description: "",
    maxMembers: "",
    location: "",
  });
  const [autonomousForm, setAutonomousForm] = useState({
    clubName: "",
    teacher: "",
    category: "",
    description: "",
    maxMembers: "",
    location: "",
  });
  const [autonomousEditForm, setAutonomousEditForm] = useState({
    clubName: "",
    teacher: "",
    category: "",
    description: "",
    maxMembers: "",
    location: "",
  });

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchCreativeClubs();
    fetchAutonomousClubs();
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

  const fetchCreativeClubs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs?type=creative");
      if (!res.ok) {
        throw new Error("동아리 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setCreativeClubs(data.clubs || []);
      
      const loadedSelections: Record<string, string[]> = {};
      data.clubs?.forEach((club: ClubItem) => {
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            // 기존 형식이 학반별이었을 수도 있으므로, 배열로 변환
            if (Array.isArray(parsed)) {
              loadedSelections[club.id] = parsed;
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              const allStudents: string[] = [];
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudents.push(...studentIds);
                }
              });
              loadedSelections[club.id] = allStudents;
            }
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
      });
      setStudentSelections(loadedSelections);
    } catch (err) {
      console.error("Error fetching creative clubs:", err);
      setCreativeClubs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAutonomousClubs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs?type=autonomous");
      if (!res.ok) {
        throw new Error("동아리 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setAutonomousClubs(data.clubs || []);
      
      const loadedSelections: Record<string, string[]> = {};
      data.clubs?.forEach((club: ClubItem) => {
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            // 기존 형식이 학반별이었을 수도 있으므로, 배열로 변환
            if (Array.isArray(parsed)) {
              loadedSelections[club.id] = parsed;
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              const allStudents: string[] = [];
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudents.push(...studentIds);
                }
              });
              loadedSelections[club.id] = allStudents;
            }
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
      });
      setAutonomousStudentSelections(loadedSelections);
    } catch (err) {
      console.error("Error fetching autonomous clubs:", err);
      setAutonomousClubs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreativeAddClick = () => {
    setIsCreativeOpen((v) => !v);
    if (!isCreativeOpen) {
      setCreativeForm({
        clubName: "",
        teacher: "",
        category: "",
        description: "",
        maxMembers: "",
        location: "",
      });
    }
  };

  const handleAutonomousAddClick = () => {
    setIsAutonomousOpen((v) => !v);
    if (!isAutonomousOpen) {
      setAutonomousForm({
        clubName: "",
        teacher: "",
        category: "",
        description: "",
        maxMembers: "",
        location: "",
      });
    }
  };

  const handleCreativeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreativeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutonomousFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAutonomousForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreativeSave = async () => {
    if (!creativeForm.clubName.trim() || !creativeForm.teacher.trim()) {
      alert("동아리명과 담당교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...creativeForm,
          clubType: "creative",
          maxMembers: creativeForm.maxMembers ? parseInt(creativeForm.maxMembers, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      
      alert("동아리가 추가되었습니다.");
      setIsCreativeOpen(false);
      setCreativeForm({
        clubName: "",
        teacher: "",
        category: "",
        description: "",
        maxMembers: "",
        location: "",
      });
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error saving club:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutonomousSave = async () => {
    if (!autonomousForm.clubName.trim() || !autonomousForm.teacher.trim()) {
      alert("동아리명과 담당교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...autonomousForm,
          clubType: "autonomous",
          maxMembers: autonomousForm.maxMembers ? parseInt(autonomousForm.maxMembers, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      
      alert("동아리가 추가되었습니다.");
      setIsAutonomousOpen(false);
      setAutonomousForm({
        clubName: "",
        teacher: "",
        category: "",
        description: "",
        maxMembers: "",
        location: "",
      });
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error saving club:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreativeCancel = () => {
    setIsCreativeOpen(false);
    setCreativeForm({
      clubName: "",
      teacher: "",
      category: "",
      description: "",
      maxMembers: "",
      location: "",
    });
  };

  const handleAutonomousCancel = () => {
    setIsAutonomousOpen(false);
    setAutonomousForm({
      clubName: "",
      teacher: "",
      category: "",
      description: "",
      maxMembers: "",
      location: "",
    });
  };

  const handleEditStart = (item: ClubItem) => {
    setEditingId(item.id);
    setEditForm({
      clubName: item.clubName,
      teacher: item.teacher,
      category: item.category || "",
      description: item.description || "",
      maxMembers: item.maxMembers?.toString() || "",
      location: item.location || "",
    });
  };

  const handleAutonomousEditStart = (item: ClubItem) => {
    setAutonomousEditingId(item.id);
    setAutonomousEditForm({
      clubName: item.clubName,
      teacher: item.teacher,
      category: item.category || "",
      description: item.description || "",
      maxMembers: item.maxMembers?.toString() || "",
      location: item.location || "",
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({
      clubName: "",
      teacher: "",
      category: "",
      description: "",
      maxMembers: "",
      location: "",
    });
  };

  const handleAutonomousEditCancel = () => {
    setAutonomousEditingId(null);
    setAutonomousEditForm({
      clubName: "",
      teacher: "",
      category: "",
      description: "",
      maxMembers: "",
      location: "",
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutonomousEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAutonomousEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editForm.clubName.trim() || !editForm.teacher.trim()) {
      alert("동아리명과 담당교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/clubs/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          maxMembers: editForm.maxMembers ? parseInt(editForm.maxMembers, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("동아리가 수정되었습니다.");
      handleEditCancel();
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error updating club:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutonomousEditSave = async () => {
    if (!autonomousEditingId) return;
    if (!autonomousEditForm.clubName.trim() || !autonomousEditForm.teacher.trim()) {
      alert("동아리명과 담당교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/academic-preparation/clubs/${autonomousEditingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...autonomousEditForm,
          maxMembers: autonomousEditForm.maxMembers ? parseInt(autonomousEditForm.maxMembers, 10) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      alert("동아리가 수정되었습니다.");
      handleAutonomousEditCancel();
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error updating club:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 동아리를 삭제하시겠습니까?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/academic-preparation/clubs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      alert("동아리가 삭제되었습니다.");
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error deleting club:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAutonomousDelete = async (id: string) => {
    if (!confirm("정말 이 동아리를 삭제하시겠습니까?")) return;

    try {
      setAutonomousDeletingId(id);
      const res = await fetch(`/api/academic-preparation/clubs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      alert("동아리가 삭제되었습니다.");
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error deleting club:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setAutonomousDeletingId(null);
    }
  };


  // 창체 동아리 행 클릭 핸들러 (아코디언 확장/축소)
  const handleCreativeRowClick = (id: string, e: React.MouseEvent) => {
    if (editingId === id) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }

    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    
    if (newExpandedId) {
      const club = creativeClubs.find(c => c.id === newExpandedId);
      if (club) {
        const maxMembers = club.maxMembers || 0;
        
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            let savedSelections: string[] = [];
            
            if (Array.isArray(parsed)) {
              savedSelections = parsed;
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  savedSelections.push(...studentIds);
                }
              });
            }
            
            // 정원 수만큼 배열 생성 (저장된 값이 있으면 사용, 없으면 빈 문자열)
            const selections = Array.from({ length: maxMembers }, (_, idx) => 
              savedSelections[idx] || ""
            );
            setStudentSelections(prev => ({ ...prev, [newExpandedId]: selections }));
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
            setStudentSelections(prev => ({ 
              ...prev, 
              [newExpandedId]: Array(maxMembers).fill("") 
            }));
          }
        } else {
          setStudentSelections(prev => ({ 
            ...prev, 
            [newExpandedId]: Array(maxMembers).fill("") 
          }));
        }
      }
    }
  };

  // 자율 동아리 행 클릭 핸들러 (아코디언 확장/축소)
  const handleAutonomousRowClick = (id: string, e: React.MouseEvent) => {
    if (autonomousEditingId === id) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }

    const newExpandedId = autonomousExpandedId === id ? null : id;
    setAutonomousExpandedId(newExpandedId);
    
    if (newExpandedId) {
      const club = autonomousClubs.find(c => c.id === newExpandedId);
      if (club) {
        const maxMembers = club.maxMembers || 0;
        
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            let savedSelections: string[] = [];
            
            if (Array.isArray(parsed)) {
              savedSelections = parsed;
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  savedSelections.push(...studentIds);
                }
              });
            }
            
            // 정원 수만큼 배열 생성 (저장된 값이 있으면 사용, 없으면 빈 문자열)
            const selections = Array.from({ length: maxMembers }, (_, idx) => 
              savedSelections[idx] || ""
            );
            setAutonomousStudentSelections(prev => ({ ...prev, [newExpandedId]: selections }));
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
            setAutonomousStudentSelections(prev => ({ 
              ...prev, 
              [newExpandedId]: Array(maxMembers).fill("") 
            }));
          }
        } else {
          setAutonomousStudentSelections(prev => ({ 
            ...prev, 
            [newExpandedId]: Array(maxMembers).fill("") 
          }));
        }
      }
    }
  };

  // 창체 동아리 학생 선택 변경 핸들러
  const handleCreativeStudentSelectionChange = (
    clubId: string,
    index: number,
    studentId: string
  ) => {
    setStudentSelections(prev => {
      const current = prev[clubId] || [];
      const updated = [...current];
      updated[index] = studentId;
      return { ...prev, [clubId]: updated };
    });
  };

  // 자율 동아리 학생 선택 변경 핸들러
  const handleAutonomousStudentSelectionChange = (
    clubId: string,
    index: number,
    studentId: string
  ) => {
    setAutonomousStudentSelections(prev => {
      const current = prev[clubId] || [];
      const updated = [...current];
      updated[index] = studentId;
      return { ...prev, [clubId]: updated };
    });
  };

  // 창체 동아리에서 이미 선택된 학생 ID 목록 가져오기 (현재 인덱스 제외)
  // 다른 창체 동아리 목록에서 선택된 학생도 포함
  const getCreativeSelectedStudentIds = (clubId: string, excludeIndex?: number): string[] => {
    const selectedIds: string[] = [];
    
    // 현재 편집 중인 창체 동아리 내의 선택 상태 확인
    const selections = studentSelections[clubId] || [];
    selections.forEach((studentId, idx) => {
      if (studentId && studentId !== "" && idx !== excludeIndex) {
        selectedIds.push(studentId);
      }
    });
    
    // 다른 창체 동아리들의 저장된 선택 상태 확인
    creativeClubs.forEach(club => {
      if (club.id !== clubId && club.studentSelections) {
        try {
          const parsed = JSON.parse(club.studentSelections);
          if (Array.isArray(parsed)) {
            parsed.forEach((studentId: string) => {
              if (studentId && studentId !== "") {
                selectedIds.push(studentId);
              }
            });
          } else {
            // 학반별 형식인 경우 모든 학생을 합침 (하위 호환성)
            Object.values(parsed).forEach((studentIds: any) => {
              if (Array.isArray(studentIds)) {
                studentIds.forEach((id: string) => {
                  if (id && id !== "") {
                    selectedIds.push(id);
                  }
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing studentSelections:", e);
        }
      }
    });
    
    return selectedIds;
  };

  // 자율 동아리에서 이미 선택된 학생 ID 목록 가져오기 (현재 인덱스 제외)
  const getAutonomousSelectedStudentIds = (clubId: string, excludeIndex?: number): string[] => {
    const selections = autonomousStudentSelections[clubId] || [];
    return selections.filter((studentId, idx) => 
      studentId && studentId !== "" && idx !== excludeIndex
    );
  };

  // 창체 동아리 학생 선택 정보 저장 핸들러
  const handleCreativeSaveStudentSelections = async (clubId: string) => {
    try {
      setIsLoading(true);
      
      const club = creativeClubs.find(c => c.id === clubId);
      if (!club) return;
      
      const selections = studentSelections[clubId] || [];
      const filteredSelections = selections.filter(id => id && id !== "");
      
      const studentSelectionsJson = filteredSelections.length > 0 
        ? JSON.stringify(filteredSelections) 
        : null;
      
      const res = await fetch(`/api/academic-preparation/clubs/${clubId}`, {
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
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error saving student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 자율 동아리 학생 선택 정보 저장 핸들러
  const handleAutonomousSaveStudentSelections = async (clubId: string) => {
    try {
      setIsLoading(true);
      
      const club = autonomousClubs.find(c => c.id === clubId);
      if (!club) return;
      
      const selections = autonomousStudentSelections[clubId] || [];
      const filteredSelections = selections.filter(id => id && id !== "");
      
      const studentSelectionsJson = filteredSelections.length > 0 
        ? JSON.stringify(filteredSelections) 
        : null;
      
      const res = await fetch(`/api/academic-preparation/clubs/${clubId}`, {
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
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error saving student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 창체 동아리 목록에서 선택된 학생 ID들을 수집하는 헬퍼 함수
  const getAllCreativeSelectedStudentIds = (): string[] => {
    const allIds: string[] = [];
    creativeClubs.forEach(club => {
      if (club.studentSelections) {
        try {
          const parsed = JSON.parse(club.studentSelections);
          if (Array.isArray(parsed)) {
            parsed.forEach((studentId: string) => {
              if (studentId && studentId !== "") {
                allIds.push(studentId);
              }
            });
          } else {
            // 학반별 형식인 경우 모든 학생을 합침 (하위 호환성)
            Object.values(parsed).forEach((studentIds: any) => {
              if (Array.isArray(studentIds)) {
                studentIds.forEach((id: string) => {
                  if (id && id !== "") {
                    allIds.push(id);
                  }
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing studentSelections:", e);
        }
      }
    });
    return allIds;
  };

  // 창체 동아리 목록에서 선택된 교사 이름들을 수집하는 헬퍼 함수
  const getAllCreativeSelectedTeacherNames = (): string[] => {
    const allNames: string[] = [];
    creativeClubs.forEach(club => {
      if (club.teacher && club.teacher.trim() !== "") {
        allNames.push(club.teacher.trim());
      }
    });
    return allNames;
  };

  // 교사 이름 중복 카운트 (동명이인 처리용)
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

  // 선택되지 않은 교사 목록 계산 (창체 동아리 기준)
  const unassignedCreativeTeachers = useMemo(() => {
    const allSelectedTeacherNames = getAllCreativeSelectedTeacherNames();
    const selectedNamesSet = new Set(allSelectedTeacherNames);
    
    return teachers.filter(teacher => {
      return !selectedNamesSet.has(teacher.name);
    }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [teachers, creativeClubs]);

  // 선택되지 않은 학생 목록 계산 (창체 동아리 기준)
  const unassignedCreativeStudents = useMemo(() => {
    const allSelectedStudentIds = getAllCreativeSelectedStudentIds();
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
  }, [students, creativeClubs]);

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

  // 창체 동아리 CSV 다운로드 함수
  const handleCreativeDownloadCSV = () => {
    // CSV 헤더 (테이블 헤더 순서와 일치)
    const headers = [
      "순", 
      "동아리명", 
      "구분", 
      "설명", 
      "담당교사", 
      "활동 장소", 
      "정원", 
      "학생 명단"
    ];
    
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
      ...creativeClubs.map((item, index) => {
        // 학생 선택 정보 파싱 및 이름 변환
        let studentNames = "";
        if (item.studentSelections) {
          try {
            const parsed = JSON.parse(item.studentSelections);
            let allStudentIds: string[] = [];
            
            if (Array.isArray(parsed)) {
              allStudentIds = parsed.filter(id => id && id !== "");
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudentIds.push(...studentIds.filter(id => id && id !== ""));
                }
              });
            }
            studentNames = getStudentNames(allStudentIds);
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
        
        return [
          escapeCSV(index + 1),
          escapeCSV(item.clubName),
          escapeCSV(item.category ?? ""),
          escapeCSV(item.description ?? ""),
          escapeCSV(item.teacher),
          escapeCSV(item.location ?? ""),
          escapeCSV(item.maxMembers ?? ""),
          escapeCSV(studentNames),
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
    const filename = `동아리_창체동아리_${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 자율 동아리 CSV 다운로드 함수
  const handleAutonomousDownloadCSV = () => {
    // CSV 헤더 (테이블 헤더 순서와 일치)
    const headers = [
      "순", 
      "동아리명", 
      "구분", 
      "설명", 
      "담당교사", 
      "활동 장소", 
      "정원", 
      "학생 명단"
    ];
    
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
      ...autonomousClubs.map((item, index) => {
        // 학생 선택 정보 파싱 및 이름 변환
        let studentNames = "";
        if (item.studentSelections) {
          try {
            const parsed = JSON.parse(item.studentSelections);
            let allStudentIds: string[] = [];
            
            if (Array.isArray(parsed)) {
              allStudentIds = parsed.filter(id => id && id !== "");
            } else {
              // 학반별 형식인 경우 모든 학생을 하나의 배열로 합침
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudentIds.push(...studentIds.filter(id => id && id !== ""));
                }
              });
            }
            studentNames = getStudentNames(allStudentIds);
          } catch (e) {
            console.error("Error parsing studentSelections:", e);
          }
        }
        
        return [
          escapeCSV(index + 1),
          escapeCSV(item.clubName),
          escapeCSV(item.category ?? ""),
          escapeCSV(item.description ?? ""),
          escapeCSV(item.teacher),
          escapeCSV(item.location ?? ""),
          escapeCSV(item.maxMembers ?? ""),
          escapeCSV(studentNames),
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
    const filename = `동아리_자율동아리_${dateStr}.csv`;

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
        <h2 className="text-lg font-semibold text-gray-900">동아리</h2>
        <div className="flex items-center gap-1 mt-1">
          <p className="text-sm text-gray-500">
            동아리를 생성하고 학생 명단을 입력합니다.
          </p>
          <div 
            className="relative cursor-help"
            onMouseEnter={() => setShowClubHelpTooltip(true)}
            onMouseLeave={() => setShowClubHelpTooltip(false)}
          >
            <HelpCircle className="w-4 h-4 text-gray-400" />
            {showClubHelpTooltip && (
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

      {/* 창체 동아리 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">창체 동아리</h3>
          <div className="flex items-center gap-2">
            {unassignedCreativeStudents.length > 0 && (
              <div 
                className="relative cursor-pointer"
                onMouseEnter={() => setShowUnassignedStudents(true)}
                onMouseLeave={() => setShowUnassignedStudents(false)}
              >
                <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-md text-xs font-medium">
                  미배정 학생 {unassignedCreativeStudents.length}명
                </span>
                {showUnassignedStudents && (
                  <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[400px]">
                    <div className="text-xs font-semibold text-gray-700 mb-2">미배정 학생 명단</div>
                    <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto">
                      {unassignedCreativeStudents.map(student => (
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
            {unassignedCreativeTeachers.length > 0 && (
              <div 
                className="relative cursor-pointer"
                onMouseEnter={() => setShowUnassignedTeachers(true)}
                onMouseLeave={() => setShowUnassignedTeachers(false)}
              >
                <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-md text-xs font-medium">
                  미배정 교사 {unassignedCreativeTeachers.length}명
                </span>
                {showUnassignedTeachers && (
                  <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[400px]">
                    <div className="text-xs font-semibold text-gray-700 mb-2">미배정 교사 명단</div>
                    <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto">
                      {unassignedCreativeTeachers.map(teacher => {
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
              onClick={handleCreativeDownloadCSV}
              disabled={creativeClubs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
            <button
              type="button"
              onClick={handleCreativeAddClick}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {isCreativeOpen ? "닫기" : "동아리 추가"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && creativeClubs.length === 0 && !isCreativeOpen ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-12">순</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">동아리명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">구분</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700" style={{ minWidth: "200px" }}>설명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">담당교사</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">활동 장소</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-20">정원</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {creativeClubs.length === 0 && !isCreativeOpen ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-sm text-gray-600">
                        등록된 동아리가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                  {creativeClubs.map((item, idx) => (
                    <React.Fragment key={item.id}>
                    {editingId === item.id ? (
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                        <td className="py-3 px-4 w-32">
                          <input
                            name="clubName"
                            value={editForm.clubName}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <select
                            name="category"
                            value={editForm.category}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">구분 선택</option>
                            <option value="인문">인문</option>
                            <option value="사회">사회</option>
                            <option value="수학">수학</option>
                            <option value="과학">과학</option>
                            <option value="어학">어학</option>
                            <option value="독서*토론">독서*토론</option>
                            <option value="음악">음악</option>
                            <option value="미술">미술</option>
                            <option value="체육">체육</option>
                            <option value="댄스">댄스</option>
                            <option value="기타">기타</option>
                          </select>
                        </td>
                        <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                          <input
                            name="description"
                            value={editForm.description}
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
                            name="location"
                            value={editForm.location}
                            onChange={handleEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-20">
                          <input
                            name="maxMembers"
                            type="number"
                            value={editForm.maxMembers}
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
                          onClick={(e) => handleCreativeRowClick(item.id, e)}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            expandedId === item.id ? 'bg-blue-50' : ''
                          } cursor-pointer`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 w-32">{item.clubName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.category || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600" style={{ minWidth: "200px" }}>
                            {item.description || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.teacher}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.location || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-20">{item.maxMembers ?? "-"}</td>
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
                            <td colSpan={8} className="py-6 px-4">
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
                                          onClick={() => handleCreativeSaveStudentSelections(item.id)}
                                          disabled={isLoading}
                                          className="inline-flex items-center px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isLoading ? "저장 중..." : "학생 선택 저장"}
                                        </button>
                                      </div>
                                      <div className="flex flex-row flex-wrap gap-2">
                                        {(() => {
                                          const maxMembers = item.maxMembers || 0;
                                          const selections = studentSelections[item.id] || [];
                                          
                                          if (maxMembers === 0) {
                                            return <span className="text-sm text-gray-400">정원이 설정되지 않았습니다.</span>;
                                          }
                                          
                                          return Array.from({ length: maxMembers }).map((_, idx) => {
                                            const selectedIds = getCreativeSelectedStudentIds(item.id, idx);
                                            
                                            return (
                                              <StudentAutocomplete
                                                key={idx}
                                                value={selections[idx] || ""}
                                                onChange={(studentId) => handleCreativeStudentSelectionChange(item.id, idx, studentId)}
                                                students={students}
                                                disabledStudentIds={selectedIds}
                                                placeholder="학생 선택"
                                              />
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
                  {isCreativeOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600 w-12">-</td>
                      <td className="py-3 px-4 w-32">
                        <input
                          name="clubName"
                          value={creativeForm.clubName}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="동아리명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="category"
                          value={creativeForm.category}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">구분 선택</option>
                          <option value="인문">인문</option>
                          <option value="사회">사회</option>
                          <option value="수학">수학</option>
                          <option value="과학">과학</option>
                          <option value="어학">어학</option>
                          <option value="독서*토론">독서*토론</option>
                          <option value="음악">음악</option>
                          <option value="미술">미술</option>
                          <option value="체육">체육</option>
                          <option value="댄스">댄스</option>
                          <option value="기타">기타</option>
                        </select>
                      </td>
                      <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                        <input
                          name="description"
                          value={creativeForm.description}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="설명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="teacher"
                          value={creativeForm.teacher}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">교사 선택</option>
                          {teachers.map((t) => {
                            const selectedTeacherNames = getAllCreativeSelectedTeacherNames();
                            const isAssigned = selectedTeacherNames.includes(t.name);
                            const isDuplicate = (teacherNameCounts.get(t.name) || 0) > 1;
                            const displayName = isDuplicate 
                              ? `${t.name} (${t.email})`
                              : t.name;
                            
                            return (
                              <option 
                                key={t.id} 
                                value={t.name}
                                disabled={isAssigned}
                                className="text-black"
                                style={isAssigned ? { color: '#999', fontStyle: 'italic' } : {}}
                              >
                                {displayName}
                                {isAssigned ? ' (배정됨)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="py-3 px-4 w-24">
                        <input
                          name="location"
                          value={creativeForm.location}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-3 px-4 w-20">
                        <input
                          name="maxMembers"
                          type="number"
                          value={creativeForm.maxMembers}
                          onChange={handleCreativeFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="명"
                        />
                      </td>
                      <td className="py-3 px-4 w-32">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleCreativeSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCreativeCancel}
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

      {/* 자율 동아리 섹션 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">자율 동아리</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutonomousDownloadCSV}
              disabled={autonomousClubs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </button>
            <button
              type="button"
              onClick={handleAutonomousAddClick}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {isAutonomousOpen ? "닫기" : "동아리 추가"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && autonomousClubs.length === 0 && !isAutonomousOpen ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-12">순</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">동아리명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">구분</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700" style={{ minWidth: "200px" }}>설명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">담당교사</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-24">활동 장소</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-20">정원</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-32">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {autonomousClubs.length === 0 && !isAutonomousOpen ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-sm text-gray-600">
                        등록된 동아리가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                  {autonomousClubs.map((item, idx) => (
                    <React.Fragment key={item.id}>
                    {autonomousEditingId === item.id ? (
                      <tr className="border-b border-gray-200 bg-blue-50">
                        <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                        <td className="py-3 px-4 w-32">
                          <input
                            name="clubName"
                            value={autonomousEditForm.clubName}
                            onChange={handleAutonomousEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <select
                            name="category"
                            value={autonomousEditForm.category}
                            onChange={handleAutonomousEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">구분 선택</option>
                            <option value="인문">인문</option>
                            <option value="사회">사회</option>
                            <option value="수학">수학</option>
                            <option value="과학">과학</option>
                            <option value="어학">어학</option>
                            <option value="독서*토론">독서*토론</option>
                            <option value="음악">음악</option>
                            <option value="미술">미술</option>
                            <option value="체육">체육</option>
                            <option value="댄스">댄스</option>
                            <option value="기타">기타</option>
                          </select>
                        </td>
                        <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                          <input
                            name="description"
                            value={autonomousEditForm.description}
                            onChange={handleAutonomousEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-24">
                          <select
                            name="teacher"
                            value={autonomousEditForm.teacher}
                            onChange={handleAutonomousEditFormChange}
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
                            name="location"
                            value={autonomousEditForm.location}
                            onChange={handleAutonomousEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-20">
                          <input
                            name="maxMembers"
                            type="number"
                            value={autonomousEditForm.maxMembers}
                            onChange={handleAutonomousEditFormChange}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 w-32">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleAutonomousEditSave}
                              disabled={isLoading}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={handleAutonomousEditCancel}
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
                          onClick={(e) => handleAutonomousRowClick(item.id, e)}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            autonomousExpandedId === item.id ? 'bg-blue-50' : ''
                          } cursor-pointer`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-600 w-12">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 w-32">{item.clubName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.category || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600" style={{ minWidth: "200px" }}>
                            {item.description || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.teacher}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24">{item.location || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-20">{item.maxMembers ?? "-"}</td>
                          <td className="py-3 px-4 w-32">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAutonomousEditStart(item);
                                }}
                                disabled={isLoading || autonomousDeletingId === item.id}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAutonomousDelete(item.id);
                                }}
                                disabled={isLoading || autonomousDeletingId === item.id}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
                                title="삭제"
                              >
                                {autonomousDeletingId === item.id ? (
                                  <span className="text-xs">삭제 중...</span>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {autonomousExpandedId === item.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="py-6 px-4">
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
                                          onClick={() => handleAutonomousSaveStudentSelections(item.id)}
                                          disabled={isLoading}
                                          className="inline-flex items-center px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isLoading ? "저장 중..." : "학생 선택 저장"}
                                        </button>
                                      </div>
                                      <div className="flex flex-row flex-wrap gap-2">
                                        {(() => {
                                          const maxMembers = item.maxMembers || 0;
                                          const selections = autonomousStudentSelections[item.id] || [];
                                          
                                          if (maxMembers === 0) {
                                            return <span className="text-sm text-gray-400">정원이 설정되지 않았습니다.</span>;
                                          }
                                          
                                          return Array.from({ length: maxMembers }).map((_, idx) => {
                                            const selectedIds = getAutonomousSelectedStudentIds(item.id, idx);
                                            
                                            return (
                                              <StudentAutocomplete
                                                key={idx}
                                                value={selections[idx] || ""}
                                                onChange={(studentId) => handleAutonomousStudentSelectionChange(item.id, idx, studentId)}
                                                students={students}
                                                disabledStudentIds={selectedIds}
                                                placeholder="학생 선택"
                                              />
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
                  {isAutonomousOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600 w-12">-</td>
                      <td className="py-3 px-4 w-32">
                        <input
                          name="clubName"
                          value={autonomousForm.clubName}
                          onChange={handleAutonomousFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="동아리명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="category"
                          value={autonomousForm.category}
                          onChange={handleAutonomousFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">구분 선택</option>
                          <option value="인문">인문</option>
                          <option value="사회">사회</option>
                          <option value="수학">수학</option>
                          <option value="과학">과학</option>
                          <option value="어학">어학</option>
                          <option value="독서*토론">독서*토론</option>
                          <option value="음악">음악</option>
                          <option value="미술">미술</option>
                          <option value="체육">체육</option>
                          <option value="댄스">댄스</option>
                          <option value="기타">기타</option>
                        </select>
                      </td>
                      <td className="py-3 px-4" style={{ minWidth: "200px" }}>
                        <input
                          name="description"
                          value={autonomousForm.description}
                          onChange={handleAutonomousFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="설명"
                        />
                      </td>
                      <td className="py-3 px-4 w-24">
                        <select
                          name="teacher"
                          value={autonomousForm.teacher}
                          onChange={handleAutonomousFormChange}
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
                          name="location"
                          value={autonomousForm.location}
                          onChange={handleAutonomousFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-3 px-4 w-20">
                        <input
                          name="maxMembers"
                          type="number"
                          value={autonomousForm.maxMembers}
                          onChange={handleAutonomousFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="명"
                        />
                      </td>
                      <td className="py-3 px-4 w-32">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleAutonomousSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={handleAutonomousCancel}
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
    </div>
  );
}

