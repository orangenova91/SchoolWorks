"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, Edit2, HelpCircle, Plus, Trash2, X } from "lucide-react";
import { StudentAutocomplete } from "./StudentAutocomplete";

type Teacher = {
  id: string;
  name: string;
  email: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
};

type ClubItem = {
  id: string;
  clubName: string;
  teacher: string;
  category: string | null;
  description: string | null;
  maxMembers: number | null;
  location: string | null;
  studentSelections: string | null;
  createdAt: string;
};

type ClubActivityPlanFile = {
  id: string;
  clubId: string;
  originalFileName: string;
  createdAt: string;
};

type ClubBudgetUsagePlanFile = {
  id: string;
  clubId: string;
  originalFileName: string;
  createdAt: string;
};

type ClubForm = {
  clubName: string;
  teacher: string;
  category: string;
  description: string;
  maxMembers: string;
  location: string;
};

const EMPTY_FORM: ClubForm = {
  clubName: "",
  teacher: "",
  category: "",
  description: "",
  maxMembers: "",
  location: "",
};

export default function ClubOrganizationSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAutonomousOpen, setIsAutonomousOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [creativeClubs, setCreativeClubs] = useState<ClubItem[]>([]);
  const [autonomousClubs, setAutonomousClubs] = useState<ClubItem[]>([]);
  const [createForm, setCreateForm] = useState<ClubForm>(EMPTY_FORM);
  const [autonomousForm, setAutonomousForm] = useState<ClubForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClubForm>(EMPTY_FORM);
  const [autonomousEditingId, setAutonomousEditingId] = useState<string | null>(null);
  const [autonomousEditForm, setAutonomousEditForm] = useState<ClubForm>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [autonomousDeletingId, setAutonomousDeletingId] = useState<string | null>(null);
  const [studentSelections, setStudentSelections] = useState<Record<string, string[]>>(
    {}
  );
  const [autonomousStudentSelections, setAutonomousStudentSelections] = useState<
    Record<string, string[]>
  >({});
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentModalType, setStudentModalType] = useState<"creative" | "autonomous">(
    "creative"
  );
  const [studentModalClubId, setStudentModalClubId] = useState<string | null>(null);
  const [studentModalDraftSelections, setStudentModalDraftSelections] = useState<string[]>([]);
  const [showUnassignedStudents, setShowUnassignedStudents] = useState(false);
  const [showUnassignedTeachers, setShowUnassignedTeachers] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [activityPlanByClubId, setActivityPlanByClubId] = useState<
    Record<string, ClubActivityPlanFile | null>
  >({});
  const [activityPlanLoadingClubIds, setActivityPlanLoadingClubIds] = useState<
    Record<string, boolean>
  >({});
  const [activityPlanUploadingClubId, setActivityPlanUploadingClubId] = useState<string | null>(
    null
  );
  const [activityPlanDragOverClubId, setActivityPlanDragOverClubId] = useState<string | null>(
    null
  );
  const [budgetUsagePlanByClubId, setBudgetUsagePlanByClubId] = useState<
    Record<string, ClubBudgetUsagePlanFile | null>
  >({});
  const [budgetUsagePlanLoadingClubIds, setBudgetUsagePlanLoadingClubIds] = useState<
    Record<string, boolean>
  >({});
  const [budgetUsagePlanUploadingClubId, setBudgetUsagePlanUploadingClubId] = useState<
    string | null
  >(null);
  const [budgetUsagePlanDragOverClubId, setBudgetUsagePlanDragOverClubId] = useState<
    string | null
  >(null);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("교사 목록을 불러오는 데 실패했습니다.");
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setTeachers([]);
    }
  };

  const fetchCreativeClubs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs?type=creative");
      if (!res.ok) throw new Error("창체 동아리 목록을 불러오는 데 실패했습니다.");
      const data = await res.json();
      setCreativeClubs(data.clubs || []);

      const loadedSelections: Record<string, string[]> = {};
      data.clubs?.forEach((club: ClubItem) => {
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            if (Array.isArray(parsed)) {
              loadedSelections[club.id] = parsed;
            } else {
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

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/academic-preparation/students");
      if (!res.ok) throw new Error("학생 목록을 불러오는 데 실패했습니다.");
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudents([]);
    }
  };

  const fetchAutonomousClubs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs?type=autonomous");
      if (!res.ok) throw new Error("자율 동아리 목록을 불러오는 데 실패했습니다.");
      const data = await res.json();
      setAutonomousClubs(data.clubs || []);

      const loadedSelections: Record<string, string[]> = {};
      data.clubs?.forEach((club: ClubItem) => {
        if (club.studentSelections) {
          try {
            const parsed = JSON.parse(club.studentSelections);
            if (Array.isArray(parsed)) {
              loadedSelections[club.id] = parsed;
            } else {
              const allStudents: string[] = [];
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudents.push(...studentIds);
                }
              });
              loadedSelections[club.id] = allStudents;
            }
          } catch (e) {
            console.error("Error parsing autonomous studentSelections:", e);
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

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchCreativeClubs();
    fetchAutonomousClubs();
  }, []);

  const teacherNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach((teacher) => {
      const name = teacher.name.trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return counts;
  }, [teachers]);

  const getAssignedTeacherNames = (excludeClubId?: string): string[] => {
    return creativeClubs
      .filter((club) => !excludeClubId || club.id !== excludeClubId)
      .map((club) => club.teacher?.trim())
      .filter((name): name is string => Boolean(name));
  };

  const getCreativeSelectedStudentIds = (
    clubId: string,
    excludeIndex?: number
  ): string[] => {
    const selectedIds: string[] = [];
    const selections = studentSelections[clubId] || [];
    selections.forEach((studentId, idx) => {
      if (studentId && studentId !== "" && idx !== excludeIndex) {
        selectedIds.push(studentId);
      }
    });

    creativeClubs.forEach((club) => {
      if (club.id !== clubId && club.studentSelections) {
        try {
          const parsed = JSON.parse(club.studentSelections);
          if (Array.isArray(parsed)) {
            parsed.forEach((studentId: string) => {
              if (studentId && studentId !== "") selectedIds.push(studentId);
            });
          } else {
            Object.values(parsed).forEach((studentIds: any) => {
              if (Array.isArray(studentIds)) {
                studentIds.forEach((id: string) => {
                  if (id && id !== "") selectedIds.push(id);
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

  const getAllCreativeSelectedStudentIds = (): string[] => {
    const allIds: string[] = [];
    creativeClubs.forEach((club) => {
      if (club.studentSelections) {
        try {
          const parsed = JSON.parse(club.studentSelections);
          if (Array.isArray(parsed)) {
            parsed.forEach((studentId: string) => {
              if (studentId && studentId !== "") allIds.push(studentId);
            });
          } else {
            Object.values(parsed).forEach((studentIds: any) => {
              if (Array.isArray(studentIds)) {
                studentIds.forEach((id: string) => {
                  if (id && id !== "") allIds.push(id);
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

  const unassignedCreativeTeachers = useMemo(() => {
    const selectedNamesSet = new Set(getAssignedTeacherNames());
    return teachers
      .filter((teacher) => !selectedNamesSet.has(teacher.name))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [teachers, creativeClubs]);

  const unassignedCreativeStudents = useMemo(() => {
    const selectedIdsSet = new Set(getAllCreativeSelectedStudentIds());
    return students
      .filter((student) => !selectedIdsSet.has(student.id))
      .sort((a, b) => {
        const aStudentId = a.studentId || "";
        const bStudentId = b.studentId || "";
        if (aStudentId && bStudentId) {
          const aNum = parseInt(aStudentId.replace(/\D/g, "")) || 0;
          const bNum = parseInt(bStudentId.replace(/\D/g, "")) || 0;
          if (aNum !== bNum) return aNum - bNum;
          return aStudentId.localeCompare(bStudentId, "ko");
        }
        if (!aStudentId && !bStudentId) return a.name.localeCompare(b.name, "ko");
        return aStudentId ? -1 : 1;
      });
  }, [students, creativeClubs]);

  const handleCreateToggle = () => {
    setIsCreateOpen((prev) => !prev);
    if (!isCreateOpen) {
      setCreateForm(EMPTY_FORM);
    }
  };

  const handleCreateFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutonomousToggle = () => {
    setIsAutonomousOpen((prev) => !prev);
    if (!isAutonomousOpen) {
      setAutonomousForm(EMPTY_FORM);
    }
  };

  const handleAutonomousFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAutonomousForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutonomousEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAutonomousEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSave = async () => {
    if (!createForm.clubName.trim() || !createForm.teacher.trim()) {
      alert("동아리명과 담당교사를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/academic-preparation/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          clubType: "creative",
          maxMembers: createForm.maxMembers
            ? parseInt(createForm.maxMembers, 10)
            : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

      alert("창체 동아리가 추가되었습니다.");
      setIsCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error creating creative club:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
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
    setEditForm(EMPTY_FORM);
  };

  const handleAutonomousEditCancel = () => {
    setAutonomousEditingId(null);
    setAutonomousEditForm(EMPTY_FORM);
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "수정에 실패했습니다.");

      alert("창체 동아리가 수정되었습니다.");
      handleEditCancel();
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error updating creative club:", err);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "삭제에 실패했습니다.");

      alert("창체 동아리가 삭제되었습니다.");
      await fetchCreativeClubs();
    } catch (err: any) {
      console.error("Error deleting creative club:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
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
          maxMembers: autonomousForm.maxMembers
            ? parseInt(autonomousForm.maxMembers, 10)
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

      alert("자율 동아리가 추가되었습니다.");
      setIsAutonomousOpen(false);
      setAutonomousForm(EMPTY_FORM);
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error creating autonomous club:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
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
      const res = await fetch(
        `/api/academic-preparation/clubs/${autonomousEditingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...autonomousEditForm,
            maxMembers: autonomousEditForm.maxMembers
              ? parseInt(autonomousEditForm.maxMembers, 10)
              : null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "수정에 실패했습니다.");

      alert("자율 동아리가 수정되었습니다.");
      handleAutonomousEditCancel();
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error updating autonomous club:", err);
      alert(err.message || "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutonomousDelete = async (id: string) => {
    if (!confirm("정말 이 동아리를 삭제하시겠습니까?")) return;

    try {
      setAutonomousDeletingId(id);
      const res = await fetch(`/api/academic-preparation/clubs/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "삭제에 실패했습니다.");

      alert("자율 동아리가 삭제되었습니다.");
      await fetchAutonomousClubs();
    } catch (err: any) {
      console.error("Error deleting autonomous club:", err);
      alert(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setAutonomousDeletingId(null);
    }
  };

  const parseClubSelections = (club: ClubItem | undefined): string[] => {
    if (!club?.studentSelections) return [];
    try {
      const parsed = JSON.parse(club.studentSelections);
      if (Array.isArray(parsed)) return parsed.filter((id) => id && id !== "");
      const allStudents: string[] = [];
      Object.values(parsed).forEach((studentIds: any) => {
        if (Array.isArray(studentIds)) {
          allStudents.push(...studentIds.filter((id) => id && id !== ""));
        }
      });
      return allStudents;
    } catch (e) {
      console.error("Error parsing studentSelections:", e);
      return [];
    }
  };

  const openStudentModal = (type: "creative" | "autonomous", clubId: string) => {
    const club =
      type === "creative"
        ? creativeClubs.find((c) => c.id === clubId)
        : autonomousClubs.find((c) => c.id === clubId);
    const selections = parseClubSelections(club);
    setStudentModalType(type);
    setStudentModalClubId(clubId);
    setStudentModalDraftSelections(selections);
    setStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setStudentModalOpen(false);
    setStudentModalClubId(null);
    setStudentModalDraftSelections([]);
  };

  const getAutonomousSelectedStudentIds = (excludeIndex?: number): string[] => {
    return studentModalDraftSelections.filter(
      (studentId, idx) => studentId && studentId !== "" && idx !== excludeIndex
    );
  };

  const getCreativeSelectedStudentIdsForModal = (
    clubId: string,
    excludeIndex?: number
  ): string[] => {
    const selectedIds: string[] = [];
    studentModalDraftSelections.forEach((studentId, idx) => {
      if (studentId && studentId !== "" && idx !== excludeIndex) {
        selectedIds.push(studentId);
      }
    });

    creativeClubs.forEach((club) => {
      if (club.id !== clubId && club.studentSelections) {
        try {
          const parsed = JSON.parse(club.studentSelections);
          if (Array.isArray(parsed)) {
            parsed.forEach((studentId: string) => {
              if (studentId && studentId !== "") selectedIds.push(studentId);
            });
          } else {
            Object.values(parsed).forEach((studentIds: any) => {
              if (Array.isArray(studentIds)) {
                studentIds.forEach((id: string) => {
                  if (id && id !== "") selectedIds.push(id);
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

  const handleStudentModalSelectionChange = (index: number, studentId: string) => {
    setStudentModalDraftSelections((prev) => {
      const next = [...prev];
      next[index] = studentId;
      return next;
    });
  };

  const handleStudentModalAddSlot = () => {
    setStudentModalDraftSelections((prev) => [...prev, ""]);
  };

  const handleStudentModalRemoveSlot = (index: number) => {
    setStudentModalDraftSelections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStudentModalSave = async () => {
    if (!studentModalClubId) return;
    try {
      setIsLoading(true);
      const filteredSelections = studentModalDraftSelections.filter(
        (id) => id && id !== ""
      );
      const payload = {
        studentSelections:
          filteredSelections.length > 0 ? JSON.stringify(filteredSelections) : null,
        maxMembers: filteredSelections.length,
      };
      const res = await fetch(`/api/academic-preparation/clubs/${studentModalClubId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

      alert("학생 선택 정보가 저장되었습니다.");
      if (studentModalType === "creative") {
        await fetchCreativeClubs();
      } else {
        await fetchAutonomousClubs();
      }
      closeStudentModal();
    } catch (err: any) {
      console.error("Error saving modal student selections:", err);
      alert(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentNames = (studentIds: string[]): string => {
    if (!studentIds || studentIds.length === 0) return "";
    const names = studentIds
      .map((id) => {
        const student = students.find((s) => s.id === id);
        if (!student) return null;
        return student.studentId ? `${student.studentId} ${student.name}` : student.name;
      })
      .filter((name) => name !== null);
    return names.join(", ");
  };

  const getStudentGrade = (student: Student): "1" | "2" | "3" | null => {
    const classLabel = (student.classLabel || "").trim();
    const classGradeMatch = classLabel.match(/^([1-3])/);
    if (classGradeMatch) {
      return classGradeMatch[1] as "1" | "2" | "3";
    }
    const studentId = (student.studentId || "").trim();
    const studentIdMatch = studentId.match(/^([1-3])/);
    if (studentIdMatch) {
      return studentIdMatch[1] as "1" | "2" | "3";
    }
    return null;
  };

  const getSortedStudentsForClub = (club: ClubItem): Student[] => {
    const selectedIds = parseClubSelections(club);
    const selectedStudents = selectedIds
      .map((id) => students.find((s) => s.id === id))
      .filter((student): student is Student => Boolean(student));

    selectedStudents.sort((a, b) => {
      const aStudentId = a.studentId || "";
      const bStudentId = b.studentId || "";
      if (aStudentId && bStudentId) {
        const aNum = parseInt(aStudentId.replace(/\D/g, ""), 10) || 0;
        const bNum = parseInt(bStudentId.replace(/\D/g, ""), 10) || 0;
        if (aNum !== bNum) return aNum - bNum;
        return aStudentId.localeCompare(bStudentId, "ko");
      }
      if (!aStudentId && !bStudentId) return a.name.localeCompare(b.name, "ko");
      return aStudentId ? -1 : 1;
    });

    return selectedStudents;
  };

  const getStudentCountTooltip = (club: ClubItem): string => {
    const sortedStudents = getSortedStudentsForClub(club);
    if (sortedStudents.length === 0) return "배정된 학생이 없습니다.";

    const byGrade: Record<"1" | "2" | "3", string[]> = {
      "1": [],
      "2": [],
      "3": [],
    };
    const unknown: string[] = [];

    sortedStudents.forEach((student) => {
      const label = student.studentId
        ? `${student.studentId} ${student.name}`
        : student.name;
      const grade = getStudentGrade(student);
      if (grade) {
        byGrade[grade].push(label);
      } else {
        unknown.push(label);
      }
    });

    const orderedGrades: Array<"3" | "2" | "1"> = ["3", "2", "1"];
    const lines: string[] = [];

    orderedGrades.forEach((grade) => {
      const gradeStudents = byGrade[grade];
      if (gradeStudents.length === 0) return;
      lines.push(`${grade}학년`);
      gradeStudents.forEach((label) => {
        lines.push(`- ${label}`);
      });
    });

    if (unknown.length > 0) {
      lines.push("기타");
      unknown.forEach((label) => {
        lines.push(`- ${label}`);
      });
    }

    return lines.join("\n");
  };

  const handleCreativeDownloadCSV = () => {
    const headers = [
      "순",
      "동아리명",
      "구분",
      "설명",
      "담당교사",
      "활동 장소",
      "정원",
      "학생 명단",
    ];

    const escapeCSV = (value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") return "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvRows = [
      headers.map((h) => `"${h}"`).join(","),
      ...creativeClubs.map((item, index) => {
        let studentNames = "";
        if (item.studentSelections) {
          try {
            const parsed = JSON.parse(item.studentSelections);
            let allStudentIds: string[] = [];
            if (Array.isArray(parsed)) {
              allStudentIds = parsed.filter((id) => id && id !== "");
            } else {
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudentIds.push(...studentIds.filter((id) => id && id !== ""));
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

    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `동아리_조직_창체동아리_${dateStr}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSelectedStudentCount = (club: ClubItem) => parseClubSelections(club).length;

  const loadActivityPlanFile = async (clubId: string) => {
    try {
      setActivityPlanLoadingClubIds((prev) => ({ ...prev, [clubId]: true }));
      const res = await fetch(`/api/club-activity-plan/${clubId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "활동 계획서 목록을 불러오지 못했습니다.");
      const file = Array.isArray(data.files) && data.files.length > 0 ? data.files[0] : null;
      setActivityPlanByClubId((prev) => ({ ...prev, [clubId]: file }));
    } catch (err: any) {
      console.error("Error fetching activity plan files:", err);
      setActivityPlanByClubId((prev) => ({ ...prev, [clubId]: null }));
    } finally {
      setActivityPlanLoadingClubIds((prev) => ({ ...prev, [clubId]: false }));
    }
  };

  const handleActivityPlanUpload = async (clubId: string, selectedFile: File) => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setActivityPlanUploadingClubId(clubId);
      const res = await fetch(`/api/club-activity-plan/${clubId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "활동 계획서 업로드에 실패했습니다.");
      await loadActivityPlanFile(clubId);
    } catch (err: any) {
      console.error("Error uploading activity plan:", err);
      alert(err.message || "활동 계획서 업로드에 실패했습니다.");
    } finally {
      setActivityPlanUploadingClubId(null);
    }
  };

  const handleActivityPlanDownload = (clubId: string, fileId: string) => {
    window.open(`/api/club-activity-plan/${clubId}/file/${fileId}`, "_blank");
  };

  const handleActivityPlanDelete = async (clubId: string, fileId: string) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/club-activity-plan/${clubId}/${fileId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "파일 삭제에 실패했습니다.");
      setActivityPlanByClubId((prev) => ({ ...prev, [clubId]: null }));
    } catch (err: any) {
      console.error("Error deleting activity plan file:", err);
      alert(err.message || "파일 삭제에 실패했습니다.");
    }
  };

  const handleActivityPlanFileSelect = (
    clubId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleActivityPlanUpload(clubId, file);
    e.target.value = "";
  };

  const handleActivityPlanDrop = (clubId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivityPlanDragOverClubId(null);
    if (activityPlanUploadingClubId) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void handleActivityPlanUpload(clubId, file);
  };

  const handleActivityPlanDragOver = (clubId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activityPlanUploadingClubId) return;
    setActivityPlanDragOverClubId(clubId);
  };

  const handleActivityPlanDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget;
    if (related && current.contains(related)) return;
    setActivityPlanDragOverClubId(null);
  };

  const loadBudgetUsagePlanFile = async (clubId: string) => {
    try {
      setBudgetUsagePlanLoadingClubIds((prev) => ({ ...prev, [clubId]: true }));
      const res = await fetch(`/api/club-budget-usage/${clubId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "예산 사용 계획서 목록을 불러오지 못했습니다.");
      const file = Array.isArray(data.files) && data.files.length > 0 ? data.files[0] : null;
      setBudgetUsagePlanByClubId((prev) => ({ ...prev, [clubId]: file }));
    } catch (err: any) {
      console.error("Error fetching budget usage plan files:", err);
      setBudgetUsagePlanByClubId((prev) => ({ ...prev, [clubId]: null }));
    } finally {
      setBudgetUsagePlanLoadingClubIds((prev) => ({ ...prev, [clubId]: false }));
    }
  };

  const handleBudgetUsagePlanUpload = async (clubId: string, selectedFile: File) => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setBudgetUsagePlanUploadingClubId(clubId);
      const res = await fetch(`/api/club-budget-usage/${clubId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "예산 사용 계획서 업로드에 실패했습니다.");
      await loadBudgetUsagePlanFile(clubId);
    } catch (err: any) {
      console.error("Error uploading budget usage plan:", err);
      alert(err.message || "예산 사용 계획서 업로드에 실패했습니다.");
    } finally {
      setBudgetUsagePlanUploadingClubId(null);
    }
  };

  const handleBudgetUsagePlanDownload = (clubId: string, fileId: string) => {
    window.open(`/api/club-budget-usage/${clubId}/file/${fileId}`, "_blank");
  };

  const handleBudgetUsagePlanDelete = async (clubId: string, fileId: string) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/club-budget-usage/${clubId}/${fileId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "파일 삭제에 실패했습니다.");
      setBudgetUsagePlanByClubId((prev) => ({ ...prev, [clubId]: null }));
    } catch (err: any) {
      console.error("Error deleting budget usage plan file:", err);
      alert(err.message || "파일 삭제에 실패했습니다.");
    }
  };

  const handleBudgetUsagePlanFileSelect = (
    clubId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleBudgetUsagePlanUpload(clubId, file);
    e.target.value = "";
  };

  const handleBudgetUsagePlanDrop = (clubId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBudgetUsagePlanDragOverClubId(null);
    if (budgetUsagePlanUploadingClubId) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void handleBudgetUsagePlanUpload(clubId, file);
  };

  const handleBudgetUsagePlanDragOver = (clubId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (budgetUsagePlanUploadingClubId) return;
    setBudgetUsagePlanDragOverClubId(clubId);
  };

  const handleBudgetUsagePlanDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget;
    if (related && current.contains(related)) return;
    setBudgetUsagePlanDragOverClubId(null);
  };

  useEffect(() => {
    const clubIds = [...creativeClubs, ...autonomousClubs].map((club) => club.id);
    if (clubIds.length === 0) {
      setActivityPlanByClubId({});
      return;
    }

    const uniqueClubIds = Array.from(new Set(clubIds));
    uniqueClubIds.forEach((clubId) => {
      if (activityPlanByClubId[clubId] !== undefined) return;
      void loadActivityPlanFile(clubId);
    });
  }, [creativeClubs, autonomousClubs]);

  useEffect(() => {
    const clubIds = [...creativeClubs, ...autonomousClubs].map((club) => club.id);
    if (clubIds.length === 0) {
      setBudgetUsagePlanByClubId({});
      return;
    }

    const uniqueClubIds = Array.from(new Set(clubIds));
    uniqueClubIds.forEach((clubId) => {
      if (budgetUsagePlanByClubId[clubId] !== undefined) return;
      void loadBudgetUsagePlanFile(clubId);
    });
  }, [creativeClubs, autonomousClubs]);

  const handleAutonomousDownloadCSV = () => {
    const headers = [
      "순",
      "동아리명",
      "구분",
      "설명",
      "담당교사",
      "활동 장소",
      "정원",
      "학생 명단",
    ];

    const escapeCSV = (value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") return "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvRows = [
      headers.map((h) => `"${h}"`).join(","),
      ...autonomousClubs.map((item, index) => {
        let studentNames = "";
        if (item.studentSelections) {
          try {
            const parsed = JSON.parse(item.studentSelections);
            let allStudentIds: string[] = [];
            if (Array.isArray(parsed)) {
              allStudentIds = parsed.filter((id) => id && id !== "");
            } else {
              Object.values(parsed).forEach((studentIds: any) => {
                if (Array.isArray(studentIds)) {
                  allStudentIds.push(...studentIds.filter((id) => id && id !== ""));
                }
              });
            }
            studentNames = getStudentNames(allStudentIds);
          } catch (e) {
            console.error("Error parsing autonomous studentSelections:", e);
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

    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `동아리_조직_자율동아리_${dateStr}.csv`;
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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">동아리 조직</h2>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-sm text-gray-600">
              창체 동아리를 생성하고 목록에서 수정/삭제할 수 있습니다.
            </p>
            <div
              className="relative cursor-help"
              onMouseEnter={() => setShowHelpTooltip(true)}
              onMouseLeave={() => setShowHelpTooltip(false)}
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
              {showHelpTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                  학생 배정 열에서 학생 추가(편집) 버튼을 클릭하면 동아리 학생을 추가할 수 있습니다.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
                    {unassignedCreativeStudents.map((student) => (
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
                    {unassignedCreativeTeachers.map((teacher) => {
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
            onClick={handleCreateToggle}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isCreateOpen ? "닫기" : "창체 동아리 추가"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading && creativeClubs.length === 0 && !isCreateOpen ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : (
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-12">
                  순
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">
                  동아리명
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">
                  구분
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-32">
                  설명
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">
                  담당교사
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-48">
                  학생 배정
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                  활동 장소
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[120px]">
                  활동 계획서
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[120px]">
                  예산 사용 계획서
                </th>
                <th className="sticky right-0 z-20 bg-white text-center py-3 px-4 text-sm font-semibold text-gray-700 w-32">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {creativeClubs.length === 0 && !isCreateOpen ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-sm text-gray-600">
                    등록된 창체 동아리가 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {creativeClubs.map((item, idx) => (
                    <Fragment key={item.id}>
                    <tr className="border-b border-gray-100">
                      {editingId === item.id ? (
                        <>
                          <td className="py-2 px-1 text-sm text-gray-600 w-12">{idx + 1}</td>
                          <td className="py-2 px-1 w-[70px]">
                            <input
                              name="clubName"
                              value={editForm.clubName}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </td>
                          <td className="py-2 px-1 w-[70px]">
                            <select
                              name="category"
                              value={editForm.category}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
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
                          <td className="py-2 px-1 w-32">
                            <input
                              name="description"
                              value={editForm.description}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </td>
                          <td className="py-2 px-1 w-[70px]">
                            <select
                              name="teacher"
                              value={editForm.teacher}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="">교사 선택</option>
                              {teachers.map((t) => {
                                const isAssigned = getAssignedTeacherNames(item.id).includes(
                                  t.name
                                );
                                const isDuplicate = (teacherNameCounts.get(t.name) || 0) > 1;
                                const displayName = isDuplicate
                                  ? `${t.name} (${t.email})`
                                  : t.name;
                                return (
                                  <option key={t.id} value={t.name} disabled={isAssigned}>
                                    {displayName}
                                    {isAssigned ? " (배정됨)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="py-2 px-1 w-48 text-sm text-gray-500 text-center">-</td>
                          <td className="py-2 px-1 w-24">
                            <input
                              name="location"
                              value={editForm.location}
                              onChange={handleEditFormChange}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                            />
                          </td>
                          <td className="py-2 px-1 w-[120px] text-sm text-gray-500 text-center">-</td>
                          <td className="py-2 px-1 w-[120px] text-sm text-gray-500 text-center">-</td>
                          <td className="sticky right-0 z-10 bg-white py-2 px-1 w-32">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleEditSave}
                                disabled={isLoading}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50"
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
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-sm text-gray-600 w-12 text-center">{idx + 1}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 w-[70px] text-center">
                            {item.clubName}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-[70px] text-center">
                            {item.category || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-32">
                            <span className="block truncate" title={item.description || "-"}>
                              {item.description || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-[70px] text-center">
                            {item.teacher}
                          </td>
                          <td className="py-3 px-4 w-48 text-center">
                            <div className="inline-flex items-center gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openStudentModal("creative", item.id)}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs border border-blue-200"
                              >
                                {getSelectedStudentCount(item) > 0 ? "학생 편집" : "학생 추가"}
                              </button>
                              {getSelectedStudentCount(item) > 0 && (
                                <span
                                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-700 cursor-help"
                                  title={getStudentCountTooltip(item)}
                                >
                                  {getSelectedStudentCount(item)}명 배정
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 w-24 text-center">
                            {item.location || "-"}
                          </td>
                          <td className="py-3 px-4 w-[120px] text-center">
                            <div
                              onDrop={(e) => handleActivityPlanDrop(item.id, e)}
                              onDragOver={(e) => handleActivityPlanDragOver(item.id, e)}
                              onDragLeave={handleActivityPlanDragLeave}
                              className={`mx-auto w-[120px] h-10 rounded-md border-2 border-dashed px-2 ${
                                activityPlanDragOverClubId === item.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <label className="block h-full cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.webp"
                                  onChange={(e) => handleActivityPlanFileSelect(item.id, e)}
                                  disabled={Boolean(activityPlanUploadingClubId)}
                                />
                                {activityPlanLoadingClubIds[item.id] ? (
                                  <p className="h-full flex items-center text-xs text-gray-500 truncate">
                                    불러오는 중...
                                  </p>
                                ) : (
                                  <div className="h-full flex items-center gap-1 min-w-0">
                                    {activityPlanByClubId[item.id] ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleActivityPlanDownload(
                                              item.id,
                                              activityPlanByClubId[item.id]!.id
                                            );
                                          }}
                                          className="text-xs text-blue-600 hover:underline truncate block text-left flex-1 min-w-0"
                                          title={activityPlanByClubId[item.id]!.originalFileName}
                                        >
                                          {activityPlanByClubId[item.id]!.originalFileName}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleActivityPlanDelete(
                                              item.id,
                                              activityPlanByClubId[item.id]!.id
                                            );
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-red-600 rounded shrink-0"
                                          title="삭제"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <p className="text-xs text-gray-600 truncate">파일 업로드</p>
                                    )}
                                    {activityPlanUploadingClubId === item.id && (
                                      <span className="ml-auto text-[11px] text-gray-500 shrink-0">
                                        업로드 중...
                                      </span>
                                    )}
                                  </div>
                                )}
                              </label>
                            </div>
                          </td>
                          <td className="py-3 px-4 w-[120px] text-center">
                            <div
                              onDrop={(e) => handleBudgetUsagePlanDrop(item.id, e)}
                              onDragOver={(e) => handleBudgetUsagePlanDragOver(item.id, e)}
                              onDragLeave={handleBudgetUsagePlanDragLeave}
                              className={`mx-auto w-[120px] h-10 rounded-md border-2 border-dashed px-2 ${
                                budgetUsagePlanDragOverClubId === item.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <label className="block h-full cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.webp"
                                  onChange={(e) => handleBudgetUsagePlanFileSelect(item.id, e)}
                                  disabled={Boolean(budgetUsagePlanUploadingClubId)}
                                />
                                {budgetUsagePlanLoadingClubIds[item.id] ? (
                                  <p className="h-full flex items-center text-xs text-gray-500 truncate">
                                    불러오는 중...
                                  </p>
                                ) : (
                                  <div className="h-full flex items-center gap-1 min-w-0">
                                    {budgetUsagePlanByClubId[item.id] ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleBudgetUsagePlanDownload(
                                              item.id,
                                              budgetUsagePlanByClubId[item.id]!.id
                                            );
                                          }}
                                          className="text-xs text-blue-600 hover:underline truncate block text-left flex-1 min-w-0"
                                          title={budgetUsagePlanByClubId[item.id]!.originalFileName}
                                        >
                                          {budgetUsagePlanByClubId[item.id]!.originalFileName}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleBudgetUsagePlanDelete(
                                              item.id,
                                              budgetUsagePlanByClubId[item.id]!.id
                                            );
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-red-600 rounded shrink-0"
                                          title="삭제"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <p className="text-xs text-gray-600 truncate">파일 업로드</p>
                                    )}
                                    {budgetUsagePlanUploadingClubId === item.id && (
                                      <span className="ml-auto text-[11px] text-gray-500 shrink-0 whitespace-nowrap">
                                        업로드 중...
                                      </span>
                                    )}
                                  </div>
                                )}
                              </label>
                            </div>
                          </td>
                          <td className="sticky right-0 z-10 bg-white py-3 px-4 w-32">
                            <div className="flex items-center justify-center gap-1">
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
                        </>
                      )}
                    </tr>
                    </Fragment>
                  ))}

                  {isCreateOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 px-1 text-sm text-gray-600 w-12">-</td>
                      <td className="py-2 px-1 w-[70px]">
                        <input
                          name="clubName"
                          value={createForm.clubName}
                          onChange={handleCreateFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="동아리명"
                        />
                      </td>
                      <td className="py-2 px-1 w-[70px]">
                        <select
                          name="category"
                          value={createForm.category}
                          onChange={handleCreateFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
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
                      <td className="py-2 px-1 w-32">
                        <input
                          name="description"
                          value={createForm.description}
                          onChange={handleCreateFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="설명"
                        />
                      </td>
                      <td className="py-2 px-1 w-[70px]">
                        <select
                          name="teacher"
                          value={createForm.teacher}
                          onChange={handleCreateFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">교사 선택</option>
                          {teachers.map((t) => {
                            const isAssigned = getAssignedTeacherNames().includes(t.name);
                            const isDuplicate = (teacherNameCounts.get(t.name) || 0) > 1;
                            const displayName = isDuplicate
                              ? `${t.name} (${t.email})`
                              : t.name;
                            return (
                              <option key={t.id} value={t.name} disabled={isAssigned}>
                                {displayName}
                                {isAssigned ? " (배정됨)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="py-2 px-1 w-48 text-sm text-gray-500">저장 후 추가</td>
                      <td className="py-2 px-1 w-24">
                        <input
                          name="location"
                          value={createForm.location}
                          onChange={handleCreateFormChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="활동 장소"
                        />
                      </td>
                      <td className="py-2 px-1 w-[120px] text-sm text-gray-500">저장 후 추가</td>
                      <td className="py-2 px-1 w-[120px] text-sm text-gray-500">저장 후 추가</td>
                      <td className="sticky right-0 z-10 bg-white py-2 px-1 w-32">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={handleCreateSave}
                            disabled={isLoading}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50"
                          >
                            {isLoading ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateOpen(false);
                              setCreateForm(EMPTY_FORM);
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
        )}
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">자율 동아리</h2>
          <p className="text-sm text-gray-600 mt-1">
            자율 동아리를 생성하고 목록에서 수정/삭제할 수 있습니다.
          </p>
        </div>
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
            onClick={handleAutonomousToggle}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            {isAutonomousOpen ? "닫기" : "자율 동아리 추가"}
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
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-12">순</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">동아리명</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">구분</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-32">설명</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[70px]">담당교사</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-48">학생 배정</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">활동 장소</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[120px]">활동 계획서</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-[120px]">예산 사용 계획서</th>
                <th className="sticky right-0 z-20 bg-white text-center py-3 px-4 text-sm font-semibold text-gray-700 w-32">작업</th>
              </tr>
            </thead>
            <tbody>
              {autonomousClubs.length === 0 && !isAutonomousOpen ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-sm text-gray-600">
                    등록된 자율 동아리가 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {autonomousClubs.map((item, idx) => (
                    <Fragment key={item.id}>
                      <tr className="border-b border-gray-100">
                        {autonomousEditingId === item.id ? (
                          <>
                            <td className="py-2 px-1 text-sm text-gray-600 w-12">{idx + 1}</td>
                            <td className="py-2 px-1 w-[70px]">
                              <input name="clubName" value={autonomousEditForm.clubName} onChange={handleAutonomousEditFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                            </td>
                            <td className="py-2 px-1 w-[70px]">
                              <select name="category" value={autonomousEditForm.category} onChange={handleAutonomousEditFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white">
                                <option value="">구분 선택</option><option value="인문">인문</option><option value="사회">사회</option><option value="수학">수학</option><option value="과학">과학</option><option value="어학">어학</option><option value="독서*토론">독서*토론</option><option value="음악">음악</option><option value="미술">미술</option><option value="체육">체육</option><option value="댄스">댄스</option><option value="기타">기타</option>
                              </select>
                            </td>
                            <td className="py-2 px-1 w-32">
                              <input name="description" value={autonomousEditForm.description} onChange={handleAutonomousEditFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                            </td>
                            <td className="py-2 px-1 w-[70px]">
                              <select name="teacher" value={autonomousEditForm.teacher} onChange={handleAutonomousEditFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white">
                                <option value="">교사 선택</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.name}>{(teacherNameCounts.get(t.name) || 0) > 1 ? `${t.name} (${t.email})` : t.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-1 w-48 text-sm text-gray-500 text-center">-</td>
                            <td className="py-2 px-1 w-24">
                              <input name="location" value={autonomousEditForm.location} onChange={handleAutonomousEditFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                            </td>
                            <td className="py-2 px-1 w-[120px] text-sm text-gray-500 text-center">-</td>
                            <td className="py-2 px-1 w-[120px] text-sm text-gray-500 text-center">-</td>
                            <td className="sticky right-0 z-10 bg-white py-2 px-1 w-32">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={handleAutonomousEditSave} disabled={isLoading} className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50">저장</button>
                                <button type="button" onClick={handleAutonomousEditCancel} disabled={isLoading} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50">취소</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-sm text-gray-600 w-12 text-center">{idx + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-900 w-[70px] text-center">{item.clubName}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 w-[70px] text-center">{item.category || "-"}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 w-32">
                              <span className="block truncate" title={item.description || "-"}>
                                {item.description || "-"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 w-[70px] text-center">{item.teacher}</td>
                            <td className="py-3 px-4 w-48 text-center">
                              <div className="inline-flex items-center gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openStudentModal("autonomous", item.id)}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs border border-blue-200"
                                >
                                  {getSelectedStudentCount(item) > 0 ? "학생 편집" : "학생 추가"}
                                </button>
                                {getSelectedStudentCount(item) > 0 && (
                                  <span
                                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-700 cursor-help"
                                    title={getStudentCountTooltip(item)}
                                  >
                                    {getSelectedStudentCount(item)}명 배정
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 w-24 text-center">{item.location || "-"}</td>
                            <td className="py-3 px-4 w-[120px] text-center">
                              <div
                                onDrop={(e) => handleActivityPlanDrop(item.id, e)}
                                onDragOver={(e) => handleActivityPlanDragOver(item.id, e)}
                                onDragLeave={handleActivityPlanDragLeave}
                                className={`mx-auto w-[120px] h-10 rounded-md border-2 border-dashed px-2 ${
                                  activityPlanDragOverClubId === item.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 bg-white hover:bg-gray-50"
                                }`}
                              >
                                <label className="block h-full cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.webp"
                                    onChange={(e) => handleActivityPlanFileSelect(item.id, e)}
                                    disabled={Boolean(activityPlanUploadingClubId)}
                                  />
                                  {activityPlanLoadingClubIds[item.id] ? (
                                    <p className="h-full flex items-center text-xs text-gray-500 truncate">
                                      불러오는 중...
                                    </p>
                                  ) : (
                                    <div className="h-full flex items-center gap-1 min-w-0">
                                      {activityPlanByClubId[item.id] ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleActivityPlanDownload(
                                                item.id,
                                                activityPlanByClubId[item.id]!.id
                                              );
                                            }}
                                            className="text-xs text-blue-600 hover:underline truncate block text-left flex-1 min-w-0"
                                            title={activityPlanByClubId[item.id]!.originalFileName}
                                          >
                                            {activityPlanByClubId[item.id]!.originalFileName}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleActivityPlanDelete(
                                                item.id,
                                                activityPlanByClubId[item.id]!.id
                                              );
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-600 rounded shrink-0"
                                            title="삭제"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <p className="text-xs text-gray-600 truncate">파일 업로드</p>
                                      )}
                                      {activityPlanUploadingClubId === item.id && (
                                        <span className="ml-auto text-[11px] text-gray-500 shrink-0 whitespace-nowrap">
                                          업로드 중...
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </label>
                              </div>
                            </td>
                            <td className="py-3 px-4 w-[120px] text-center">
                              <div
                                onDrop={(e) => handleBudgetUsagePlanDrop(item.id, e)}
                                onDragOver={(e) => handleBudgetUsagePlanDragOver(item.id, e)}
                                onDragLeave={handleBudgetUsagePlanDragLeave}
                                className={`mx-auto w-[120px] h-10 rounded-md border-2 border-dashed px-2 ${
                                  budgetUsagePlanDragOverClubId === item.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 bg-white hover:bg-gray-50"
                                }`}
                              >
                                <label className="block h-full cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.webp"
                                    onChange={(e) => handleBudgetUsagePlanFileSelect(item.id, e)}
                                    disabled={Boolean(budgetUsagePlanUploadingClubId)}
                                  />
                                  {budgetUsagePlanLoadingClubIds[item.id] ? (
                                    <p className="h-full flex items-center text-xs text-gray-500 truncate">
                                      불러오는 중...
                                    </p>
                                  ) : (
                                    <div className="h-full flex items-center gap-1 min-w-0">
                                      {budgetUsagePlanByClubId[item.id] ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleBudgetUsagePlanDownload(
                                                item.id,
                                                budgetUsagePlanByClubId[item.id]!.id
                                              );
                                            }}
                                            className="text-xs text-blue-600 hover:underline truncate block text-left flex-1 min-w-0"
                                            title={budgetUsagePlanByClubId[item.id]!.originalFileName}
                                          >
                                            {budgetUsagePlanByClubId[item.id]!.originalFileName}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleBudgetUsagePlanDelete(
                                                item.id,
                                                budgetUsagePlanByClubId[item.id]!.id
                                              );
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-600 rounded shrink-0"
                                            title="삭제"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <p className="text-xs text-gray-600 truncate">파일 업로드</p>
                                      )}
                                      {budgetUsagePlanUploadingClubId === item.id && (
                                        <span className="ml-auto text-[11px] text-gray-500 shrink-0 whitespace-nowrap">
                                          업로드 중...
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </label>
                              </div>
                            </td>
                            <td className="sticky right-0 z-10 bg-white py-3 px-4 w-32">
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => handleAutonomousEditStart(item)} disabled={isLoading || autonomousDeletingId === item.id} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50" title="수정">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => handleAutonomousDelete(item.id)} disabled={isLoading || autonomousDeletingId === item.id} className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50" title="삭제">
                                  {autonomousDeletingId === item.id ? <span className="text-xs">삭제 중...</span> : <Trash2 className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    </Fragment>
                  ))}

                  {isAutonomousOpen && (
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 px-1 text-sm text-gray-600 w-12">-</td>
                      <td className="py-2 px-1 w-[70px]"><input name="clubName" value={autonomousForm.clubName} onChange={handleAutonomousFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" placeholder="동아리명" /></td>
                      <td className="py-2 px-1 w-[70px]">
                        <select name="category" value={autonomousForm.category} onChange={handleAutonomousFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white">
                          <option value="">구분 선택</option><option value="인문">인문</option><option value="사회">사회</option><option value="수학">수학</option><option value="과학">과학</option><option value="어학">어학</option><option value="독서*토론">독서*토론</option><option value="음악">음악</option><option value="미술">미술</option><option value="체육">체육</option><option value="댄스">댄스</option><option value="기타">기타</option>
                        </select>
                      </td>
                      <td className="py-2 px-1 w-32"><input name="description" value={autonomousForm.description} onChange={handleAutonomousFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" placeholder="설명" /></td>
                      <td className="py-2 px-1 w-[70px]">
                        <select name="teacher" value={autonomousForm.teacher} onChange={handleAutonomousFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white">
                          <option value="">교사 선택</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.name}>{(teacherNameCounts.get(t.name) || 0) > 1 ? `${t.name} (${t.email})` : t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-1 w-48 text-sm text-gray-500">저장 후 추가</td>
                      <td className="py-2 px-1 w-24"><input name="location" value={autonomousForm.location} onChange={handleAutonomousFormChange} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" placeholder="활동 장소" /></td>
                      <td className="py-2 px-1 w-[120px] text-sm text-gray-500">저장 후 추가</td>
                      <td className="py-2 px-1 w-[120px] text-sm text-gray-500">저장 후 추가</td>
                      <td className="sticky right-0 z-10 bg-white py-2 px-1 w-32">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={handleAutonomousSave} disabled={isLoading} className="inline-flex items-center px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50">{isLoading ? "저장 중..." : "저장"}</button>
                          <button type="button" onClick={() => { setIsAutonomousOpen(false); setAutonomousForm(EMPTY_FORM); }} disabled={isLoading} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs disabled:opacity-50">취소</button>
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

    {studentModalOpen && studentModalClubId && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {studentModalType === "creative" ? "창체 동아리" : "자율 동아리"} 학생 편집
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                학생을 추가/수정/삭제한 뒤 저장하면 정원이 학생 수로 자동 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={closeStudentModal}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
            {studentModalDraftSelections.length === 0 ? (
              <p className="text-sm text-gray-500">추가된 학생이 없습니다. 학생 추가를 눌러 시작하세요.</p>
            ) : (
              studentModalDraftSelections.map((selectedId, index) => (
                <div key={`${studentModalClubId}-${index}`} className="flex items-center gap-2">
                  <div className="flex-1">
                    <StudentAutocomplete
                      value={selectedId || ""}
                      onChange={(studentId) => handleStudentModalSelectionChange(index, studentId)}
                      students={students}
                      disabledStudentIds={
                        studentModalType === "creative"
                          ? getCreativeSelectedStudentIdsForModal(studentModalClubId, index)
                          : getAutonomousSelectedStudentIds(index)
                      }
                      placeholder={`학생 선택 ${index + 1}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStudentModalRemoveSlot(index)}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs"
                    title="입력칸 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleStudentModalAddSlot}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm"
            >
              <Plus className="w-4 h-4" />
              학생 추가
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeStudentModal}
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleStudentModalSave}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
              >
                {isLoading ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
