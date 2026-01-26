 "use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Calendar, Edit, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastContext } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import { CommentSection } from "./CommentSection";
import { Button } from "@/components/ui/Button";

interface SelectedClass {
  grade: string;
  classNumber: string;
}

interface SurveyQuestion {
  id: string;
  type: "single" | "multiple" | "text" | "textarea";
  question: string;
  options?: string[];
  required: boolean;
}

interface ConsentData {
  signatureImage?: string; // Base64 이미지 (선택사항)
  signedAt?: string; // 서명 일시 (선택사항)
  requiresSignature?: boolean; // 서명이 필요한지 여부 (설문 조사에서 서명 포함 체크 시)
}

interface ConsentRecord {
  signatureImage?: string;
  signatureUrl?: string;
  signedAt?: string;
  submittedAt?: string;
  returnedAt?: string;
  returnReason?: string | null;
}

interface ConsentListItem {
  userId: string;
  signatureUrl?: string | null;
  signedAt?: string | null;
  submittedAt?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  studentId?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    studentProfile: {
      grade?: string | null;
      classLabel?: string | null;
      section?: string | null;
      studentId?: string | null;
    } | null;
    parentProfile: {
      studentIds: string[];
    } | null;
    children: Array<{
      id: string;
      name: string | null;
      studentProfile: {
        grade?: string | null;
        classLabel?: string | null;
        section?: string | null;
        studentId?: string | null;
      } | null;
    }>;
  } | null;
}

interface PendingListItem {
  userId: string;
  name: string | null;
  email: string | null;
  studentId: string | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  author: string;
  authorId?: string;
  isScheduled: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedClasses: string | null;
  parentSelectedClasses: string | null;
  category?: string | null;
  surveyData?: string | null;
  consentData?: string | null;
  attachments?: string | null;
  editableBy?: string[];
}

interface AnnouncementDetailModalProps {
  isOpen: boolean;
  announcement: Announcement | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  onDeleteConfirm?: (id: string) => void;
  courseId?: string;
}

const audienceLabels: Record<string, string> = {
  all: "전교생",
  "grade-1": "1학년",
  "grade-2": "2학년",
  "grade-3": "3학년",
  parents: "학부모",
  teacher: "교직원",
  teachers: "교직원",
  students: "학생",
};

// 선택된 학반 정보를 텍스트로 변환
const formatSelectedClasses = (selectedClassesStr: string | null): string | null => {
  if (!selectedClassesStr) return null;
  try {
    const classes: SelectedClass[] = JSON.parse(selectedClassesStr);
    if (classes.length === 0) return null;

    // 학년별로 그룹화
    const groupedByGrade: Record<string, string[]> = {};
    classes.forEach((cls) => {
      if (!groupedByGrade[cls.grade]) {
        groupedByGrade[cls.grade] = [];
      }
      groupedByGrade[cls.grade].push(cls.classNumber);
    });

    // 전체 반 수: 7개
    const TOTAL_CLASSES_PER_GRADE = 7;

    // 학년별로 정렬하고 텍스트 생성
    const gradeTexts = Object.keys(groupedByGrade)
      .sort()
      .map((grade) => {
        const classNumbers = groupedByGrade[grade].sort();
        // 해당 학년의 모든 반(7개)이 선택된 경우 "X학년 전체"로 표시
        if (classNumbers.length === TOTAL_CLASSES_PER_GRADE) {
          return `${grade}학년 전체`;
        }
        // 일부 반만 선택된 경우
        // 반 번호를 숫자로 변환하여 정렬 (01 -> 1)
        const sortedClassNumbers = classNumbers.sort((a, b) => parseInt(a) - parseInt(b));
        return `${grade}학년 ${sortedClassNumbers.join(", ")}반`;
      });

    return gradeTexts.join(" / ");
  } catch (error) {
    console.error("Error parsing selectedClasses:", error);
    return null;
  }
};

// 모든 학반이 선택되었는지 확인 (3학년 * 7반 = 21개)
const isAllClassesSelected = (selectedClassesStr: string | null): boolean => {
  if (!selectedClassesStr) return false;
  try {
    const classes: SelectedClass[] = JSON.parse(selectedClassesStr);
    // 전체 학반 수: 3학년 * 7반 = 21개
    return classes.length === 21;
  } catch (error) {
    return false;
  }
};

// 대상 필드 텍스트 생성
const getAudienceDisplayText = (announcement: Announcement, isCourseContext: boolean): string => {
  const baseLabel =
    isCourseContext && announcement.audience === "all"
      ? "수강생 전체"
      : audienceLabels[announcement.audience] || announcement.audience;
  
  // 재학생과 학부모 텍스트 생성
  const getStudentText = (): string | null => {
    if (!announcement.selectedClasses) return null;
    if (isAllClassesSelected(announcement.selectedClasses)) {
      return isCourseContext ? "수강생 전체" : "모든 재학생";
    }
    const selectedClassesText = formatSelectedClasses(announcement.selectedClasses);
    if (selectedClassesText) {
      return `재학생 (${selectedClassesText})`;
    }
    return null;
  };

  const getParentText = (): string | null => {
    if (!announcement.parentSelectedClasses) return null;
    if (isAllClassesSelected(announcement.parentSelectedClasses)) {
      return "모든 학부모";
    }
    const parentSelectedClassesText = formatSelectedClasses(announcement.parentSelectedClasses);
    if (parentSelectedClassesText) {
      return `학부모 (${parentSelectedClassesText})`;
    }
    return null;
  };

  const studentText = getStudentText();
  const parentText = getParentText();

  // 재학생과 학부모가 모두 있는 경우
  if (studentText && parentText) {
    return `${studentText} / ${parentText}`;
  }

  // 재학생만 있는 경우
  if (studentText) {
    return studentText;
  }

  // 학부모만 있는 경우
  if (parentText) {
    return parentText;
  }

  // 둘 다 없는 경우 (기존 데이터일 수 있음)
  return baseLabel;
};

const parseConsentData = (raw: unknown): ConsentData | null => {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as ConsentData);
  } catch (error) {
    console.error("Error parsing consent data:", error);
    return null;
  }
};

export function AnnouncementDetailModal({
  isOpen,
  announcement,
  onClose,
  onEdit,
  onDelete,
  showEditButton,
  showDeleteButton,
  onDeleteConfirm,
  courseId,
}: AnnouncementDetailModalProps) {
  const { showToast } = useToastContext();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<ConsentRecord | null>(null);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [isSignatureLoading, setIsSignatureLoading] = useState(false);
  const [isSignatureSaving, setIsSignatureSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [consentList, setConsentList] = useState<ConsentListItem[]>([]);
  const [isConsentListLoading, setIsConsentListLoading] = useState(false);
  const [consentListError, setConsentListError] = useState<string | null>(null);
  const [isConsentListVisible, setIsConsentListVisible] = useState(false);
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [returningUserIds, setReturningUserIds] = useState<Set<string>>(new Set());
  const [consentStats, setConsentStats] = useState<{
    totalStudents: number;
    totalParents: number;
    submittedStudents: number;
    submittedParents: number;
    returnedStudents: number;
    returnedParents: number;
  } | null>(null);
  const [pendingLists, setPendingLists] = useState<{
    students: PendingListItem[];
    parents: PendingListItem[];
  } | null>(null);
  const [isPendingLoading, setIsPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [isPendingVisible, setIsPendingVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ESC 키 처리
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canSign =
    session?.user?.role === "parent" || session?.user?.role === "student";

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const getCanvasCoordinates = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEditingSignature) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isEditingSignature) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    setSignatureData(dataURL);
  };

  const loadSignature = async (announcementId: string) => {
    setIsSignatureLoading(true);
    try {
      const response = await fetch(`/api/announcements/${announcementId}/consent`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "서명 정보를 불러오지 못했습니다.");
      }
      if (data?.consent) {
        setExistingSignature({
          signatureImage: data.consent.signatureImage || undefined,
          signatureUrl: data.consent.signatureUrl || undefined,
          signedAt: data.consent.signedAt || undefined,
          submittedAt: data.consent.submittedAt || undefined,
          returnedAt: data.consent.returnedAt || undefined,
          returnReason: data.consent.returnReason ?? null,
        });
        const canEditSignature =
          !data.consent.submittedAt || !!data.consent.returnedAt;
        setIsEditingSignature(canEditSignature);
      } else {
        setExistingSignature(null);
        setIsEditingSignature(true);
      }
    } catch (error: any) {
      setExistingSignature(null);
      setIsEditingSignature(true);
      showToast(error.message || "서명 정보를 불러오지 못했습니다.", "error");
    } finally {
      setIsSignatureLoading(false);
    }
  };

  const saveSignature = async (
    announcementId: string,
    mode: "submit" | "update"
  ) => {
    if (!signatureData) return;
    setIsSignatureSaving(true);
    try {
      const endpoint = `/api/announcements/${announcementId}/consent`;
      const method = mode === "update" ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImage: signatureData }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            (mode === "update" ? "수정 저장에 실패했습니다." : "제출에 실패했습니다.")
        );
      }
      setExistingSignature({
        signatureImage: data.consent?.signatureImage || signatureData,
        signatureUrl: data.consent?.signatureUrl || existingSignature?.signatureUrl,
        signedAt: data.consent?.signedAt || new Date().toISOString(),
        submittedAt: data.consent?.submittedAt || existingSignature?.submittedAt,
        returnedAt: data.consent?.returnedAt ?? null,
        returnReason: data.consent?.returnReason ?? null,
      });
      setIsEditingSignature(false);
      setSignatureData(null);
      showToast(
        mode === "update" ? "수정이 저장되었습니다." : "동의서가 제출되었습니다.",
        "success"
      );
    } catch (error: any) {
      showToast(error.message || "처리 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSignatureSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSignatureData(null);
      setExistingSignature(null);
      setIsEditingSignature(false);
      setIsSignatureLoading(false);
      setIsSignatureSaving(false);
      setIsDrawing(false);
      setConsentList([]);
      setConsentListError(null);
      setIsConsentListVisible(false);
      setReturnReasons({});
      setReturningUserIds(new Set());
      setConsentStats(null);
      setPendingLists(null);
      setPendingError(null);
      setIsPendingLoading(false);
      setIsPendingVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!announcement) return;
    setSignatureData(null);
    setExistingSignature(null);
    setIsEditingSignature(false);
    setConsentList([]);
    setConsentListError(null);
    setIsConsentListVisible(false);
    setReturnReasons({});
    setReturningUserIds(new Set());
    setConsentStats(null);
    setPendingLists(null);
    setPendingError(null);
    setIsPendingLoading(false);
    setIsPendingVisible(false);
  }, [announcement?.id]);

  useEffect(() => {
    if (!isOpen || !announcement || !canSign) return;
    const consentMeta = parseConsentData(announcement.consentData);
    const requiresSignature =
      announcement.category === "consent" ||
      (announcement.category === "survey" && consentMeta?.requiresSignature);
    if (!requiresSignature) return;
    loadSignature(announcement.id);
  }, [isOpen, announcement, canSign]);

  useEffect(() => {
    const isTeacher = session?.user?.role === "teacher";
    if (!isOpen || !announcement || !isTeacher) return;
    const consentMeta = parseConsentData(announcement.consentData);
    const requiresSignature =
      announcement.category === "consent" ||
      (announcement.category === "survey" && consentMeta?.requiresSignature);
    if (!requiresSignature) return;

    const fetchStats = async () => {
      setIsConsentListLoading(true);
      setConsentListError(null);
      try {
        const response = await fetch(`/api/announcements/${announcement.id}/consents/stats`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "통계를 불러오지 못했습니다.");
        }
        setConsentStats(data.stats || null);
      } catch (error: any) {
        setConsentStats(null);
      } finally {
        setIsConsentListLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, announcement, session?.user?.role]);

  useEffect(() => {
    if (!isOpen || !isEditingSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [isOpen, isEditingSignature]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (announcement) {
      setDeleteConfirmId(announcement.id);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/announcements/${deleteConfirmId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "공지사항 삭제에 실패했습니다.");
      }

      showToast("공지사항이 삭제되었습니다.", "success");
      setDeleteConfirmId(null);
      onClose();
      onDelete?.(deleteConfirmId);
      onDeleteConfirm?.(deleteConfirmId);
    } catch (err: any) {
      console.error("Failed to delete announcement:", err);
      showToast(err.message || "공지사항 삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReturnConsent = async (userId: string) => {
    if (!announcement) return;
    setReturningUserIds((prev) => new Set(prev).add(userId));
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/consent/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          reason: returnReasons[userId] || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "동의서 반환에 실패했습니다.");
      }
      setConsentList((prev) =>
        prev.map((item) =>
          item.userId === userId
            ? {
                ...item,
                returnedAt: data.consent?.returnedAt || new Date().toISOString(),
                returnReason: data.consent?.returnReason ?? returnReasons[userId] ?? null,
              }
            : item
        )
      );
      setConsentStats((prev) => {
        if (!prev) return prev;
        const target = consentList.find((item) => item.userId === userId);
        if (!target || target.returnedAt) return prev;
        const isStudent = target.user?.role === "student";
        const isParent = target.user?.role === "parent";
        return {
          ...prev,
          submittedStudents: isStudent ? Math.max(0, prev.submittedStudents - 1) : prev.submittedStudents,
          submittedParents: isParent ? Math.max(0, prev.submittedParents - 1) : prev.submittedParents,
          returnedStudents: isStudent ? prev.returnedStudents + 1 : prev.returnedStudents,
          returnedParents: isParent ? prev.returnedParents + 1 : prev.returnedParents,
        };
      });
      showToast("동의서가 반환되었습니다.", "success");
    } catch (error: any) {
      showToast(error.message || "동의서 반환에 실패했습니다.", "error");
    } finally {
      setReturningUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleToggleConsents = async () => {
    if (!announcement) return;
    if (isConsentListVisible) {
      setIsConsentListVisible(false);
      return;
    }
    if (consentList.length > 0) {
      setIsConsentListVisible(true);
      return;
    }
    setIsConsentListLoading(true);
    setConsentListError(null);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/consents`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "제출자 목록을 불러오지 못했습니다.");
      }
      setConsentList(Array.isArray(data.consents) ? data.consents : []);
      setIsConsentListVisible(true);
    } catch (error: any) {
      setConsentList([]);
      setConsentListError(error.message || "제출자 목록을 불러오지 못했습니다.");
    } finally {
      setIsConsentListLoading(false);
    }
  };

  const handleTogglePending = async () => {
    if (!announcement) return;
    if (isPendingVisible) {
      setIsPendingVisible(false);
      return;
    }
    if (pendingLists) {
      setIsPendingVisible(true);
      return;
    }
    setIsPendingLoading(true);
    setPendingError(null);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/consents/pending`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "미제출자 목록을 불러오지 못했습니다.");
      }
      setPendingLists(data.pending || { students: [], parents: [] });
      setIsPendingVisible(true);
    } catch (error: any) {
      setPendingError(error.message || "미제출자 목록을 불러오지 못했습니다.");
    } finally {
      setIsPendingLoading(false);
    }
  };

  
  // Survey state
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});
  const [isSurveyLoading, setIsSurveyLoading] = useState(false);
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false);
  const [existingSurveyResponse, setExistingSurveyResponse] = useState<{ id: string; answers: any[] } | null>(null);
 
  // Load existing survey response when modal opens
  useEffect(() => {
    if (!isOpen || !announcement || announcement.category !== "survey") return;
    let mounted = true;
    const loadResponse = async () => {
      setIsSurveyLoading(true);
      try {
        const res = await fetch(`/api/announcements/${announcement.id}/survey`);
        const data = await res.json();
        if (!mounted) return;
        if (res.ok && data) {
          if (data?.response?.answers) {
            setExistingSurveyResponse({ id: data.response.id, answers: data.response.answers });
            const map: Record<string, any> = {};
            (data.response.answers || []).forEach((a: any) => {
              map[a.id] = a.answer;
            });
            setSurveyAnswers(map);
          } else {
            setExistingSurveyResponse(null);
            setSurveyAnswers({});
          }
        }
      } catch (err) {
        console.error("Failed to load survey response:", err);
      } finally {
        if (mounted) setIsSurveyLoading(false);
      }
    };
    loadResponse();
    return () => { mounted = false; };
  }, [isOpen, announcement?.id]);

  const handleChange = (questionId: string, value: any) => {
    setSurveyAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMulti = (questionId: string, option: string) => {
    setSurveyAnswers((prev) => {
      const cur = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [];
      const idx = cur.indexOf(option);
      if (idx >= 0) {
        cur.splice(idx, 1);
      } else {
        cur.push(option);
      }
      return { ...prev, [questionId]: cur };
    });
  };

  const handleSubmitSurvey = async () => {
    if (!announcement) return;
    try {
      const surveyQuestions: SurveyQuestion[] = typeof announcement.surveyData === "string"
        ? JSON.parse(announcement.surveyData)
        : announcement.surveyData || [];

      // validation
      for (const q of surveyQuestions) {
        if (q.required) {
          const val = surveyAnswers[q.id];
          if (val === undefined || val === null || (Array.isArray(val) && val.length === 0) || val === "") {
            showToast("필수 질문을 모두 답해주세요.", "error");
            return;
          }
        }
      }

      setIsSurveySubmitting(true);
      const payload = {
        answers: surveyQuestions.map((q) => ({ id: q.id, answer: surveyAnswers[q.id] ?? null })),
      };
      const res = await fetch(`/api/announcements/${announcement.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "제출 실패");
      showToast("설문이 제출되었습니다.", "success");
      setExistingSurveyResponse({ id: data.response?.id || "", answers: payload.answers });
    } catch (err: any) {
      console.error("Submit survey error:", err);
      showToast(err.message || "제출 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSurveySubmitting(false);
    }
  };

  // Teacher: survey responses view
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [isSurveyResponsesVisible, setIsSurveyResponsesVisible] = useState(false);
  const [isSurveyResponsesLoading, setIsSurveyResponsesLoading] = useState(false);
  const [surveyResponsesError, setSurveyResponsesError] = useState<string | null>(null);
  const [surveyStats, setSurveyStats] = useState<any | null>(null);
  const [selectedSurveyResponse, setSelectedSurveyResponse] = useState<any | null>(null);

  const handleToggleSurveyResponses = async () => {
    if (!announcement) return;
    if (isSurveyResponsesVisible) {
      setIsSurveyResponsesVisible(false);
      return;
    }
    if (surveyResponses.length > 0) {
      setIsSurveyResponsesVisible(true);
      return;
    }
    setIsSurveyResponsesLoading(true);
    setSurveyResponsesError(null);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}/survey/responses`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "응답을 불러오지 못했습니다.");
      }
      setSurveyResponses(Array.isArray(data.responses) ? data.responses : []);
      setSurveyStats(data.stats || null);
      setIsSurveyResponsesVisible(true);
    } catch (error: any) {
      setSurveyResponses([]);
      setSurveyResponsesError(error.message || "응답을 불러오지 못했습니다.");
    } finally {
      setIsSurveyResponsesLoading(false);
    }
  };
 
  const handleDownloadCSV = () => {
    if (!announcement) return;
    try {
      const surveyQuestions: SurveyQuestion[] = typeof announcement.surveyData === "string"
        ? JSON.parse(announcement.surveyData)
        : announcement.surveyData || [];

      // headers
      const headers = [
        "번호",
        "학번",
        "이름",
        "계정",
        "구분",
        "제출일",
        ...surveyQuestions.map((q, idx) => `질문 ${idx + 1}: ${q.question}`),
      ];

      const rows: string[][] = surveyResponses.map((r: any, i: number) => {
        const base = [
          String(i + 1),
          r.studentId || "",
          r.user?.name || "",
          r.user?.email || "",
          r.user?.role || "",
          r.createdAt || "",
        ];
        const answersMap: Record<string, any> = {};
        (r.answers || []).forEach((a: any) => {
          answersMap[a.id] = a.answer;
        });
        const answerCells = surveyQuestions.map((q) => {
          const a = answersMap[q.id];
          if (a == null) return "";
          if (Array.isArray(a)) return a.join("; ");
          return String(a);
        });
        return [...base, ...answerCells];
      });

      const escape = (v: string) => {
        const s = String(v ?? "");
        if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const csv = [
        headers.map(escape).join(","),
        ...rows.map((r) => r.map((c) => escape(c)).join(",")),
      ].join("\r\n");

      // prepend UTF-8 BOM to help Excel/Windows correctly detect UTF-8 (prevents Korean garbling)
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `survey_responses_${announcement.id}.csv`;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV 다운로드 실패:", err);
      showToast("CSV 생성에 실패했습니다.", "error");
    }
  };

  if (!isOpen || !announcement || !mounted) return null;

  // 작성자 확인
  const isAuthor = announcement.authorId && session?.user?.id 
    ? announcement.authorId === session.user.id 
    : false;
  
  // 수정 권한 확인
  const editableBy = announcement.editableBy || [];
  const hasEditPermission = isAuthor || 
    (session?.user?.id && editableBy.includes(session.user.id));

  const isScheduled = announcement.isScheduled && !announcement.publishedAt;
  const displayDate = isScheduled
    ? announcement.publishAt
    : announcement.publishedAt || announcement.createdAt;

  const hasStudents = announcement.selectedClasses && 
    (isAllClassesSelected(announcement.selectedClasses) || formatSelectedClasses(announcement.selectedClasses));
  const hasParents = announcement.parentSelectedClasses && 
    (isAllClassesSelected(announcement.parentSelectedClasses) || formatSelectedClasses(announcement.parentSelectedClasses));
  
  const displayText = getAudienceDisplayText(announcement, Boolean(courseId));
  const consentMeta = parseConsentData(announcement.consentData);
  const isConsentCategory = announcement.category === "consent";
  const isSurveySignatureRequired =
    announcement.category === "survey" &&
    (consentMeta?.requiresSignature || !!consentMeta?.signatureImage);
  const shouldShowSignature = isConsentCategory || isSurveySignatureRequired;
  const hasSubmitted = Boolean(existingSignature?.submittedAt);
  const isReturned = Boolean(existingSignature?.returnedAt);
  const isTeacher = session?.user?.role === "teacher";
  const canReviewConsents = isTeacher && isAuthor && shouldShowSignature;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full my-auto max-h-[90vh] overflow-hidden flex flex-col z-[100]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {announcement.title}
            </h2>
            {isScheduled && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap flex-shrink-0">
                예약
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-4"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 메타데이터 */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>작성자: {announcement.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span className="text-gray-600">대상:</span>
                {hasStudents && hasParents ? (
                  <>
                    {(() => {
                      const studentText = isAllClassesSelected(announcement.selectedClasses)
                        ? (courseId ? "수강생 전체" : "모든 재학생")
                        : formatSelectedClasses(announcement.selectedClasses)
                          ? `재학생 (${formatSelectedClasses(announcement.selectedClasses)})`
                          : null;
                      const parentText = isAllClassesSelected(announcement.parentSelectedClasses)
                        ? "모든 학부모"
                        : formatSelectedClasses(announcement.parentSelectedClasses)
                          ? `학부모 (${formatSelectedClasses(announcement.parentSelectedClasses)})`
                          : null;
                      
                      return (
                        <>
                          {studentText && (
                            <span className="inline-block px-2 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
                              {studentText}
                            </span>
                          )}
                          {parentText && (
                            <span className="inline-block px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                              {parentText}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <span
                    className={cn(
                      "inline-block px-2 py-1 rounded text-sm font-medium",
                      hasStudents
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    )}
                  >
                    {displayText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {isScheduled
                    ? `예약 발행: ${formatDate(announcement.publishAt)}`
                    : `발행일: ${formatDate(displayDate)}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showEditButton && onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasEditPermission) {
                      onEdit(announcement.id);
                      onClose();
                    }
                  }}
                  disabled={!hasEditPermission}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    hasEditPermission
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                      : "text-gray-400 bg-gray-50 cursor-not-allowed"
                  )}
                  title={!hasEditPermission ? "수정 권한이 없습니다." : ""}
                >
                  <Edit className="h-4 w-4" />
                  수정
                </button>
              )}
              {showDeleteButton && (
                <button
                  onClick={handleDeleteClick}
                  disabled={!isAuthor}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    isAuthor
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-gray-400 bg-gray-50 cursor-not-allowed"
                  )}
                  title={!isAuthor ? "본인이 작성한 안내문만 삭제할 수 있습니다." : ""}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              )}
            </div>
          </div>

          {/* 본문 내용 */}
          <div
            className="prose prose-sm max-w-none text-gray-700 mb-6"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />

          {/* 설문조사 질문 (category가 "survey"이고 surveyData가 있는 경우) */}
          {announcement.category === "survey" && announcement.surveyData && (() => {
            try {
              const surveyQuestions: SurveyQuestion[] = typeof announcement.surveyData === "string"
                ? JSON.parse(announcement.surveyData)
                : announcement.surveyData;

              if (!Array.isArray(surveyQuestions) || surveyQuestions.length === 0) {
                return null;
              }

              const getQuestionTypeLabel = (type: string) => {
                switch (type) {
                  case "single":
                    return "단일 선택";
                  case "multiple":
                    return "다중 선택";
                  case "text":
                    return "단답형";
                  case "textarea":
                    return "서술형";
                  default:
                    return type;
                }
              };

              

              return (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">설문 조사 항목</h3>
                  <div className="space-y-6">
                    {surveyQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                질문 {index + 1}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                {getQuestionTypeLabel(question.type)}
                              </span>
                              {question.required && (
                                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                  필수
                                </span>
                              )}
                            </div>
                            <p className="text-base font-medium text-gray-900">
                              {question.question || "(질문 없음)"}
                            </p>
                          </div>
                        </div>

                        {(question.type === "single" || question.type === "multiple") && question.options && question.options.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optIndex) => {
                              const value = option || `옵션 ${optIndex + 1}`;
                              if (question.type === "single") {
                                return (
                                  <label
                                    key={optIndex}
                                    className={`flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200 ${isTeacher ? "cursor-default opacity-60" : "cursor-pointer"}`}
                                  >
                                    <input
                                      type="radio"
                                      name={question.id}
                                      value={value}
                                      checked={surveyAnswers[question.id] === value}
                                      onChange={() => handleChange(question.id, value)}
                                      className="w-4 h-4"
                                      disabled={isTeacher}
                                    />
                                    <span>{value}</span>
                                  </label>
                                );
                              }
                              return (
                                <label
                                  key={optIndex}
                                  className={`flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200 ${isTeacher ? "cursor-default opacity-60" : "cursor-pointer"}`}
                                >
                                  <input
                                    type="checkbox"
                                    name={`${question.id}-${optIndex}`}
                                    value={value}
                                    checked={Array.isArray(surveyAnswers[question.id]) && surveyAnswers[question.id].includes(value)}
                                    onChange={() => toggleMulti(question.id, value)}
                                    className="w-4 h-4"
                                    disabled={isTeacher}
                                  />
                                  <span>{value}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {(question.type === "text" || question.type === "textarea") && (
                          <div className="mt-3">
                            {question.type === "text" ? (
                              <input
                                type="text"
                                value={surveyAnswers[question.id] ?? ""}
                                onChange={(e) => handleChange(question.id, e.target.value)}
                                className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${isTeacher ? "opacity-60" : ""}`}
                                placeholder="답변을 입력하세요"
                                disabled={isTeacher}
                              />
                            ) : (
                              <textarea
                                value={surveyAnswers[question.id] ?? ""}
                                onChange={(e) => handleChange(question.id, e.target.value)}
                                className={`w-full border border-gray-300 rounded px-3 py-2 text-sm ${isTeacher ? "opacity-60" : ""}`}
                                placeholder="서술형 답변을 입력하세요"
                                rows={5}
                                disabled={isTeacher}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center justify-end gap-3">
                      {!isTeacher ? (
                        <>
                          <Button variant="outline" onClick={() => { setSurveyAnswers({}); setExistingSurveyResponse(null); }}>
                            초기화
                          </Button>
                          <Button
                            onClick={handleSubmitSurvey}
                            disabled={isSurveySubmitting || isSurveyLoading}
                          >
                            {isSurveySubmitting ? "제출 중..." : existingSurveyResponse ? "다시 제출" : "제출"}
                          </Button>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">교사 계정은 설문에 응답할 수 없습니다. 응답 현황은 아래에서 확인하세요.</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } catch (error) {
              console.error("Error parsing survey data:", error);
              return null;
            }
          })()}

          {/* 교사용: 설문 응답 확인 섹션 */}
          {isTeacher && announcement.category === "survey" && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">응답 현황</h3>
                <div className="flex items-center gap-3">
                  {surveyStats && (
                    <span className="text-sm text-gray-600">
                      총 응답: {surveyStats.totalResponses}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleSurveyResponses}
                    disabled={isSurveyResponsesLoading}
                    className={cn(
                      "inline-flex items-center rounded px-3 py-1.5 text-sm text-gray-700 border border-gray-200",
                      isSurveyResponsesLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                    )}
                  >
                    {isSurveyResponsesLoading ? "로딩 중..." : isSurveyResponsesVisible ? "응답자 닫기" : "응답자 보기"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    disabled={surveyResponses.length === 0}
                    className={cn(
                      "inline-flex items-center rounded px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700",
                      surveyResponses.length === 0 ? "opacity-60 cursor-not-allowed bg-green-400" : ""
                    )}
                  >
                    CSV 다운로드
                  </button>
                </div>
              </div>

              {isSurveyResponsesVisible && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {isSurveyResponsesLoading ? (
                    <p className="text-sm text-gray-500">응답을 불러오는 중...</p>
                  ) : surveyResponsesError ? (
                    <p className="text-sm text-red-500">{surveyResponsesError}</p>
                  ) : surveyResponses.length === 0 ? (
                    <p className="text-sm text-gray-500">응답이 없습니다.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-[700px] w-full text-xs text-left border-separate border-spacing-y-2">
                          <thead className="text-[11px] uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">번호</th>
                              <th className="px-3 py-2">구분</th>
                              <th className="px-3 py-2">학번</th>
                              <th className="px-3 py-2">응답자</th>
                              <th className="px-3 py-2">제출일</th>
                              <th className="px-3 py-2">작업</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            {surveyResponses.map((item, index) => {
                              const user = item.user;
                              const roleLabel = user?.role === "student" ? "학생" : user?.role === "parent" ? "학부모" : user?.role || "-";
                              const roleBadgeClass = user?.role === "student" ? "bg-green-100 text-green-700" : user?.role === "parent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";
                              const studentId = item.studentId || "-";
                              return (
                                <tr key={item.id} className="bg-white border border-gray-200 shadow-sm">
                                  <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded ${roleBadgeClass}`}>{roleLabel}</span>
                                  </td>
                                  <td className="px-3 py-3 text-gray-600">{studentId}</td>
                                  <td className="px-3 py-3">
                                    <div className="font-semibold text-gray-900">{user?.name || "이름 없음"}</div>
                                  </td>
                                  <td className="px-3 py-3">{item.createdAt ? new Date(item.createdAt).toLocaleString("ko-KR") : "-"}</td>
                                  <td className="px-3 py-3">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSurveyResponse(item)}
                                      className="px-3 py-2 text-xs font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                                    >
                                      보기
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {surveyStats && (
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900">질문별 통계</h4>
                          <div className="space-y-2 text-sm text-gray-700">
                            {Object.values(surveyStats.questions || {}).map((q: any, idx: number) => (
                              <div key={q.id} className="bg-white border border-gray-200 p-3 rounded">
                                <div className="font-medium">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 mr-2">
                                    질문 {idx + 1}
                                  </span>
                                  {q.question}
                                </div>
                                {q.type === "single" || q.type === "multiple" ? (
                                  <ul className="mt-2 list-disc list-inside text-xs">
                                    {Object.entries(q.optionCounts || {}).map(([opt, cnt]) => (
                                      <li key={String(opt)}>{String(opt)}: {String(cnt)}명</li>
                                    ))}
                                  </ul>
                                ) : (
                                  (() => {
                                    const answersForQ = (surveyResponses || [])
                                      .flatMap((r: any) =>
                                        (r.answers || [])
                                          .filter((a: any) => a.id === q.id)
                                          .map((a: any) => ({
                                            answer: a.answer,
                                            respondent: r.user?.name || r.userId,
                                          }))
                                      )
                                      .filter((a: any) => a.answer !== null && a.answer !== undefined && String(a.answer).trim() !== "");

                                    return (
                                      <div className="text-xs mt-2">
                                        <div>응답 수: {answersForQ.length}</div>
                                        {answersForQ.length > 0 && (
                                          <ul className="mt-2 space-y-2">
                                            {answersForQ.map((ans: any, idx: number) => (
                                              <li key={idx} className="bg-gray-50 p-2 rounded border border-gray-100">
                                                <div className="text-[11px] text-gray-500">{ans.respondent}</div>
                                                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{String(ans.answer)}</div>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedSurveyResponse && (
                <div className="mt-4 bg-white border border-gray-200 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">응답 상세</h4>
                    <button className="text-xs text-gray-500" onClick={() => setSelectedSurveyResponse(null)}>닫기</button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    {(selectedSurveyResponse.answers || []).map((a: any, idx: number) => {
                      let qText = a.id;
                      try {
                        const surveyQuestions: SurveyQuestion[] = typeof announcement.surveyData === "string" ? JSON.parse(announcement.surveyData) : announcement.surveyData;
                        const q = (surveyQuestions || []).find((qq: any) => qq.id === a.id);
                        if (q) qText = q.question;
                      } catch {}
                      return (
                        <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="text-xs text-gray-500">{qText}</div>
                          <div className="mt-1 text-sm text-gray-900">{Array.isArray(a.answer) ? a.answer.join(", ") : String(a.answer ?? "-")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 동의서/설문조사 서명 패널 */}
          {shouldShowSignature && !isTeacher && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">서명</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {canSign ? (
                  <div className="space-y-4">
                    {isSignatureLoading && (
                      <p className="text-sm text-gray-500">서명 정보를 불러오는 중...</p>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">서명 입력</h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={clearSignature}
                              disabled={!isEditingSignature || isSignatureSaving}
                              className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                !isEditingSignature || isSignatureSaving
                                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                  : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              초기화
                            </button>
                          </div>
                        </div>
                        <div className="border border-dashed border-gray-300 rounded-lg bg-white overflow-hidden relative">
                          <canvas
                            ref={canvasRef}
                            onPointerDown={startDrawing}
                            onPointerMove={draw}
                            onPointerUp={stopDrawing}
                            onPointerLeave={stopDrawing}
                            className={cn(
                              "w-full h-[200px]",
                              isEditingSignature
                                ? "cursor-crosshair"
                                : "cursor-not-allowed opacity-50"
                            )}
                            style={{
                              pointerEvents: isEditingSignature ? "auto" : "none",
                              touchAction: "none",
                            }}
                          />
                          {!isEditingSignature && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                              <p className="text-xs text-gray-500 text-center px-4">
                                {isSignatureLoading
                                  ? "서명 정보를 불러오는 중입니다."
                                  : isReturned
                                  ? "반환된 서명은 수정할 수 있습니다."
                                  : "제출이 완료되어 수정할 수 없습니다."}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-500">
                            {isReturned
                              ? "반환된 상태입니다. 수정 후 저장하세요."
                              : hasSubmitted
                              ? "제출 완료 상태입니다. 수정할 수 없습니다."
                              : "서명 후 제출 버튼을 눌러주세요."}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              saveSignature(
                                announcement.id,
                                isReturned ? "update" : "submit"
                              )
                            }
                            disabled={
                              !signatureData ||
                              isSignatureSaving ||
                              !isEditingSignature ||
                              (hasSubmitted && !isReturned)
                            }
                            className={cn(
                              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                              !signatureData ||
                              isSignatureSaving ||
                              !isEditingSignature ||
                              (hasSubmitted && !isReturned)
                                ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                : "text-white bg-blue-600 hover:bg-blue-700"
                            )}
                          >
                            {isSignatureSaving
                              ? "처리 중..."
                              : isReturned
                              ? "수정 저장"
                              : "동의서 제출"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">서명 미리보기</h4>
                        <div className="border border-gray-300 rounded-lg bg-white p-4 min-h-[200px] flex items-center justify-center">
                          {signatureData ? (
                            <img
                              src={signatureData}
                              alt="서명 미리보기"
                              className="max-w-full h-auto max-h-[300px]"
                            />
                          ) : existingSignature?.signatureUrl || existingSignature?.signatureImage ? (
                            <img
                              src={existingSignature.signatureUrl || existingSignature.signatureImage}
                              alt="서명"
                              className="max-w-full h-auto max-h-[300px]"
                            />
                          ) : (
                            <p className="text-xs text-gray-400 text-center">
                              아직 서명이 없습니다.
                            </p>
                          )}
                        </div>
                        {existingSignature?.signedAt && !isEditingSignature && (
                          <p className="text-xs text-gray-500 mt-2">
                            서명 일시: {formatDate(existingSignature.signedAt)}
                          </p>
                        )}
                        {existingSignature?.submittedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            제출 일시: {formatDate(existingSignature.submittedAt)}
                          </p>
                        )}
                        {existingSignature?.returnedAt && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-amber-600">
                              반환 일시: {formatDate(existingSignature.returnedAt)}
                            </p>
                            {existingSignature.returnReason && (
                              <p className="text-xs text-gray-600">
                                반환 사유: {existingSignature.returnReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {consentMeta?.signatureImage ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">서명 이미지</h4>
                          <div className="border border-gray-300 rounded-lg bg-white p-4 min-h-[200px] flex items-center justify-center">
                            <img
                              src={consentMeta.signatureImage}
                              alt="서명"
                              className="max-w-full h-auto max-h-[300px]"
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">서명 정보</h4>
                          <div className="space-y-3">
                            {consentMeta.signedAt && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">서명 일시</p>
                                <p className="text-sm text-gray-900">
                                  {formatDate(consentMeta.signedAt)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500 mb-1">서명 상태</p>
                              <p className="text-sm text-green-600 font-medium">
                                서명 완료
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          아직 서명이 없습니다.
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          알림 대상자가 공지사항을 확인하고 서명할 수 있습니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {canReviewConsents && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">제출된 현황</h3>
                {consentStats && (() => {
                  const studentPercent = consentStats.totalStudents
                    ? Math.round((consentStats.submittedStudents / consentStats.totalStudents) * 100)
                    : 0;
                  const parentPercent = consentStats.totalParents
                    ? Math.round((consentStats.submittedParents / consentStats.totalParents) * 100)
                    : 0;
                  return (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-green-50 px-2 py-0.5 text-green-700">
                          학생 {consentStats.submittedStudents}/{consentStats.totalStudents}
                        </span>
                        <div className="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${studentPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500">{studentPercent}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                          학부모 {consentStats.submittedParents}/{consentStats.totalParents}
                        </span>
                        <div className="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${parentPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500">{parentPercent}%</span>
                      </div>
                      <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                        반환 {consentStats.returnedStudents + consentStats.returnedParents}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleConsents}
                        disabled={isConsentListLoading}
                        className={cn(
                          "inline-flex items-center rounded px-2 py-0.5 text-gray-700 border border-gray-200",
                          isConsentListLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                        )}
                      >
                        {isConsentListLoading ? "로딩 중..." : isConsentListVisible ? "제출자 닫기" : "제출자 보기"}
                      </button>
                      <button
                        type="button"
                        onClick={handleTogglePending}
                        disabled={isPendingLoading}
                        className={cn(
                          "inline-flex items-center rounded px-2 py-0.5 text-gray-700 border border-gray-200",
                          isPendingLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                        )}
                      >
                        {isPendingLoading ? "로딩 중..." : isPendingVisible ? "미제출자 닫기" : "미제출자 보기"}
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {isConsentListVisible && (
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    제출자 {consentList.length}명
                  </h4>
                )}
                {isConsentListVisible && (
                  isConsentListLoading ? (
                    <p className="text-sm text-gray-500">제출자 목록을 불러오는 중...</p>
                  ) : consentListError ? (
                    <p className="text-sm text-red-500">{consentListError}</p>
                  ) : consentList.length === 0 ? (
                    <p className="text-sm text-gray-500">제출된 동의서가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[700px] w-full text-xs text-left border-separate border-spacing-y-2">
                        <thead className="text-[11px] uppercase text-gray-500">
                          <tr>
                            <th className="px-3 py-2">번호</th>
                            <th className="px-3 py-2">구분</th>
                            <th className="px-3 py-2">학번</th>
                            <th className="px-3 py-2">제출자</th>
                            <th className="px-3 py-2">제출일(반환일)</th>
                            <th className="px-3 py-2">서명</th>
                            <th className="px-3 py-2">반환 사유</th>
                            <th className="px-3 py-2">작업</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          {consentList.map((item, index) => {
                            const user = item.user;
                            const isReturnedItem = Boolean(item.returnedAt);
                            const isReturning = returningUserIds.has(item.userId);
                            const roleLabel =
                              user?.role === "student"
                                ? "학생"
                                : user?.role === "parent"
                                ? "학부모"
                                : user?.role || "-";
                            const roleBadgeClass =
                              user?.role === "student"
                                ? "bg-green-100 text-green-700"
                                : user?.role === "parent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600";
                            const studentId = item.studentId || "-";
                            return (
                              <tr
                                key={item.userId}
                                className="bg-white border border-gray-200 shadow-sm"
                              >
                                <td className="px-3 py-3 text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded ${roleBadgeClass}`}
                                  >
                                    {roleLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-gray-600">
                                  {studentId}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-semibold text-gray-900">
                                    {user?.name || "이름 없음"}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    <div>{item.submittedAt ? formatDate(item.submittedAt) : "-"}</div>
                                    {item.returnedAt && (
                                      <div className="text-amber-600">
                                        {formatDate(item.returnedAt)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="border border-gray-200 rounded-md bg-white w-[70px] h-[45px] flex items-center justify-center">
                                    {item.signatureUrl ? (
                                      <img
                                        src={item.signatureUrl}
                                        alt="제출 서명"
                                        className="max-w-full max-h-full"
                                      />
                                    ) : (
                                      <span className="text-[11px] text-gray-400">
                                        서명 없음
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={returnReasons[item.userId] || ""}
                                    onChange={(event) =>
                                      setReturnReasons((prev) => ({
                                        ...prev,
                                        [item.userId]: event.target.value,
                                      }))
                                    }
                                    placeholder="반환 사유 (선택)"
                                    className="w-[100px] text-xs border border-gray-200 rounded-md px-2 py-1"
                                  />
                                  {item.returnReason && (
                                    <div className="mt-1 text-[11px] text-gray-500">
                                      기존: {item.returnReason}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => handleReturnConsent(item.userId)}
                                    disabled={isReturnedItem || isReturning}
                                    className={cn(
                                      "px-3 py-2 text-xs font-medium rounded-md transition-colors",
                                      isReturnedItem || isReturning
                                        ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                        : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                    )}
                                  >
                                    {isReturning
                                      ? "반환 중..."
                                      : isReturnedItem
                                      ? "반환 완료"
                                      : "반환하기"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
              {isPendingVisible && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-6 space-y-4">
                  {pendingError && (
                    <p className="text-sm text-red-500">{pendingError}</p>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      미제출자 (학생) {pendingLists?.students.length || 0}명
                    </h4>
                    {pendingLists && pendingLists.students.length === 0 ? (
                      <p className="text-sm text-gray-500">미제출 학생이 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-[400px] w-full text-xs text-left border-separate border-spacing-y-2">
                          <thead className="text-[11px] uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">번호</th>
                              <th className="px-3 py-2">학번</th>
                              <th className="px-3 py-2">이름</th>
                              <th className="px-3 py-2">이메일</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            {pendingLists?.students.map((item, index) => (
                              <tr key={item.userId} className="bg-white border border-gray-200 shadow-sm">
                                <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                                <td className="px-3 py-3 text-gray-600">{item.studentId || "-"}</td>
                                <td className="px-3 py-3">{item.name || "이름 없음"}</td>
                                <td className="px-3 py-3">{item.email || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      미제출자 (학부모) {pendingLists?.parents.length || 0}명
                    </h4>
                    {pendingLists && pendingLists.parents.length === 0 ? (
                      <p className="text-sm text-gray-500">미제출 학부모가 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-[400px] w-full text-xs text-left border-separate border-spacing-y-2">
                          <thead className="text-[11px] uppercase text-gray-500">
                            <tr>
                              <th className="px-3 py-2">번호</th>
                              <th className="px-3 py-2">학번</th>
                              <th className="px-3 py-2">이름</th>
                              <th className="px-3 py-2">이메일</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            {pendingLists?.parents.map((item, index) => (
                              <tr key={item.userId} className="bg-white border border-gray-200 shadow-sm">
                                <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                                <td className="px-3 py-3 text-gray-600">{item.studentId || "-"}</td>
                                <td className="px-3 py-3">{item.name || "이름 없음"}</td>
                                <td className="px-3 py-3">{item.email || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 첨부 파일 표시 */}
          {(() => {
            if (!announcement.attachments) {
              return null;
            }

            try {
              const attachments = typeof announcement.attachments === 'string'
                ? JSON.parse(announcement.attachments)
                : announcement.attachments;

              if (!Array.isArray(attachments) || attachments.length === 0) {
                return null;
              }

              return (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">첨부 파일</h3>
                  <div className="space-y-2">
                    {attachments.map((att: {
                      filePath: string;
                      originalFileName: string;
                      fileSize: number | null;
                      mimeType: string | null;
                    }, idx: number) => (
                      <div
                        key={`${att.filePath}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {att.originalFileName}
                            </p>
                            {att.fileSize && (
                              <p className="text-xs text-gray-500">
                                {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={att.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          다운로드
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } catch (error) {
              console.error("Error parsing attachments:", error);
              return null;
            }
          })()}

          {/* 댓글 섹션 */}
          <CommentSection announcementId={announcement.id} />
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">공지사항 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              정말로 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

