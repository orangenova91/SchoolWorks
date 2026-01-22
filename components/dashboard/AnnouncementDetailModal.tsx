"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Calendar, Edit, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastContext } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import { CommentSection } from "./CommentSection";

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
  teachers: "교직원",
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
              const surveyQuestions: SurveyQuestion[] = typeof announcement.surveyData === 'string'
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

                        {/* 선택지 표시 (single, multiple 타입인 경우) */}
                        {(question.type === "single" || question.type === "multiple") && question.options && question.options.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200"
                              >
                                {question.type === "single" ? (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded border-2 border-gray-400 flex-shrink-0" />
                                )}
                                <span>{option || `옵션 ${optIndex + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 텍스트 입력 필드 표시 (text, textarea 타입인 경우) */}
                        {(question.type === "text" || question.type === "textarea") && (
                          <div className="mt-3">
                            <div className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-500">
                              {question.type === "text" ? "단답형 답변 입력란" : "서술형 답변 입력란"}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            } catch (error) {
              console.error("Error parsing survey data:", error);
              return null;
            }
          })()}

          {/* 동의서/설문조사 서명 패널 (category가 "consent"이거나 "survey"이고 consentData가 있는 경우) */}
          {(() => {
            const isConsent = announcement.category === "consent";
            const isSurveyWithSignature = announcement.category === "survey" && announcement.consentData;
            const shouldShowSignature = isConsent || isSurveyWithSignature;

            if (!shouldShowSignature) {
              return null;
            }

            try {
              let consentData: ConsentData | null = null;
              
              if (announcement.consentData) {
                consentData = typeof announcement.consentData === 'string'
                  ? JSON.parse(announcement.consentData)
                  : announcement.consentData;
              }

              return (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">서명</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {consentData?.signatureImage ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 서명 이미지 표시 */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">서명 이미지</h4>
                          <div className="border border-gray-300 rounded-lg bg-white p-4 min-h-[200px] flex items-center justify-center">
                            <img 
                              src={consentData.signatureImage} 
                              alt="서명" 
                              className="max-w-full h-auto max-h-[300px]"
                            />
                          </div>
                        </div>
                        
                        {/* 서명 정보 */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">서명 정보</h4>
                          <div className="space-y-3">
                            {consentData.signedAt && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">서명 일시</p>
                                <p className="text-sm text-gray-900">
                                  {formatDate(consentData.signedAt)}
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
                </div>
              );
            } catch (error) {
              console.error("Error parsing consent data:", error);
              console.error("consentData value:", announcement.consentData);
              return (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">서명</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-center py-8">
                      <p className="text-sm text-red-500">
                        서명 데이터를 불러오는 중 오류가 발생했습니다.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        콘솔을 확인하여 자세한 오류 정보를 확인하세요.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          })()}

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

