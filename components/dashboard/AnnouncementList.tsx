"use client";

import { useEffect, useState, useMemo } from "react";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Calendar, User, Eye, ChevronDown, ChevronUp, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";

interface SelectedClass {
  grade: string;
  classNumber: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  author: string;
  isScheduled: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedClasses: string | null;
  parentSelectedClasses: string | null;
}

interface AnnouncementListProps {
  includeScheduled?: boolean;
  audience?: string;
  refreshKey?: number;
  onEdit?: (id: string) => void;
  showEditButton?: boolean;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
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
const getAudienceDisplayText = (announcement: Announcement): string => {
  const baseLabel = audienceLabels[announcement.audience] || announcement.audience;
  
  // 재학생과 학부모 텍스트 생성
  const getStudentText = (): string | null => {
    if (!announcement.selectedClasses) return null;
    if (isAllClassesSelected(announcement.selectedClasses)) {
      return "모든 재학생";
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

export function AnnouncementList({ includeScheduled = false, audience, refreshKey, onEdit, showEditButton = false, onDelete, showDeleteButton = false }: AnnouncementListProps) {
  const { showToast } = useToastContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (includeScheduled) {
        params.append("includeScheduled", "true");
      }
      if (audience) {
        params.append("audience", audience);
      }

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "공지사항 목록을 불러오는데 실패했습니다.");
      }

      console.log("Announcements fetched:", data.announcements?.length || 0, "items");
      console.log("Sample announcement:", data.announcements?.[0]);
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      console.error("Failed to fetch announcements:", err);
      setError(err.message || "공지사항 목록을 불러오는 중 오류가 발생했습니다.");
      showToast(err.message || "공지사항 목록을 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeScheduled, audience, refreshKey]);

  // 페이지당 항목 수 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // 클라이언트 측 검색 필터링 (StudentEvaluation과 동일한 방식)
  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery.trim()) {
      return announcements;
    }
    const keyword = searchQuery.trim().toLowerCase();
    return announcements.filter((announcement) => {
      const titleMatch = announcement.title.toLowerCase().includes(keyword);
      const authorMatch = announcement.author.toLowerCase().includes(keyword);
      // HTML 태그 제거 후 내용 검색
      const contentText = announcement.content.replace(/<[^>]*>/g, "").toLowerCase();
      const contentMatch = contentText.includes(keyword);
      return titleMatch || authorMatch || contentMatch;
    });
  }, [announcements, searchQuery]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);

  // 검색어 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getContentPreview = (html: string, maxLength: number = 100) => {
    // HTML 태그 제거하고 텍스트만 추출
    const text = html.replace(/<[^>]*>/g, "").trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "공지사항 삭제에 실패했습니다.");
      }

      showToast("공지사항이 삭제되었습니다.", "success");
      setDeleteConfirmId(null);
      
      // 목록 새로고침
      await fetchAnnouncements();
      
      // onDelete 콜백 호출 (부모 컴포넌트에서 목록 새로고침 트리거)
      onDelete?.(id);
    } catch (err: any) {
      console.error("Failed to delete announcement:", err);
      showToast(err.message || "공지사항 삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">공지사항을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (filteredAnnouncements.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* 검색 바 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="announcement-search-empty" className="sr-only">
              공지사항 검색
            </label>
            <input
              id="announcement-search-empty"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 내용, 작성자로 검색..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div className="w-32">
            <Select
              value={itemsPerPage.toString()}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              options={[
                { value: "10", label: "10개" },
                { value: "20", label: "20개" },
                { value: "30", label: "30개" },
                { value: "50", label: "50개" },
              ]}
              className="text-sm"
            />
          </div>
        </div>
      </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {searchQuery ? "검색 결과가 없습니다" : "공지사항이 없습니다"}
            </p>
            <p className="text-xs text-gray-500">
              {searchQuery 
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`
                : "새로운 공지사항이 등록되면 여기에 표시됩니다."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* 검색 바 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="announcement-search" className="sr-only">
              공지사항 검색
            </label>
            <input
              id="announcement-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 내용, 작성자로 검색..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div className="w-32">
            <Select
              value={itemsPerPage.toString()}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              options={[
                { value: "10", label: "10개" },
                { value: "20", label: "20개" },
                { value: "30", label: "30개" },
                { value: "50", label: "50개" },
              ]}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* 게시판 헤더 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-gray-700">
          <div className="col-span-1 text-center">번호</div>
          <div className="col-span-5">제목</div>
          <div className="col-span-2 text-center">작성자</div>
          <div className="col-span-2 text-center">작성일</div>
          <div className="col-span-2 text-center">대상</div>
        </div>
      </div>

      {/* 게시판 본문 */}
      <div className="divide-y divide-gray-200">
        {paginatedAnnouncements.map((announcement, index) => {
          const isExpanded = expandedId === announcement.id;
          const isScheduled = announcement.isScheduled && !announcement.publishedAt;
          const displayDate = isScheduled
            ? announcement.publishAt
            : announcement.publishedAt || announcement.createdAt;
          // 전체 목록에서의 번호 계산
          const globalIndex = startIndex + index;

          return (
            <div
              key={announcement.id}
              className={cn(
                "transition-colors",
                isScheduled && "bg-amber-50/30",
                !isScheduled && "hover:bg-gray-50"
              )}
            >
              {/* 게시판 행 */}
              <div
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-sm cursor-pointer"
                onClick={() => toggleExpand(announcement.id)}
              >
                <div className="col-span-1 text-center text-gray-500">
                  {filteredAnnouncements.length - globalIndex}
                </div>
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{announcement.title}</span>
                  {isScheduled && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                      예약
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <div className="col-span-2 text-center text-gray-600">{announcement.author}</div>
                <div className="col-span-2 text-center text-gray-500 text-xs">
                  {formatDateShort(displayDate)}
                </div>
                <div className="col-span-2 text-center min-w-0 flex items-center justify-center gap-1 flex-wrap">
                  {(() => {
                    const hasStudents = announcement.selectedClasses && 
                      (isAllClassesSelected(announcement.selectedClasses) || formatSelectedClasses(announcement.selectedClasses));
                    const hasParents = announcement.parentSelectedClasses && 
                      (isAllClassesSelected(announcement.parentSelectedClasses) || formatSelectedClasses(announcement.parentSelectedClasses));
                    
                    const displayText = getAudienceDisplayText(announcement);
                    
                    // 재학생과 학부모가 모두 있는 경우 두 개의 뱃지로 표시
                    if (hasStudents && hasParents) {
                      const studentText = (() => {
                        if (isAllClassesSelected(announcement.selectedClasses)) return "모든 재학생";
                        const text = formatSelectedClasses(announcement.selectedClasses);
                        return text ? `재학생 (${text})` : null;
                      })();
                      const parentText = (() => {
                        if (isAllClassesSelected(announcement.parentSelectedClasses)) return "모든 학부모";
                        const text = formatSelectedClasses(announcement.parentSelectedClasses);
                        return text ? `학부모 (${text})` : null;
                      })();
                      
                      return (
                        <>
                          {studentText && (
                            <span 
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 max-w-full truncate" 
                              title={studentText}
                            >
                              {studentText}
                            </span>
                          )}
                          {parentText && (
                            <span 
                              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 max-w-full truncate" 
                              title={parentText}
                            >
                              {parentText}
                            </span>
                          )}
                        </>
                      );
                    }
                    
                    // 하나만 있는 경우 하나의 뱃지로 표시
                    return (
                      <span 
                        className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-xs font-medium max-w-full truncate",
                          hasStudents
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                        title={displayText}
                      >
                        {displayText}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* 확장된 내용 */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>작성자: {announcement.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
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
                            onEdit(announcement.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          수정
                        </button>
                      )}
                      {showDeleteButton && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(announcement.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>
              전체 {filteredAnnouncements.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredAnnouncements.length)}개 표시
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                
                if (totalPages <= 7) {
                  // 페이지가 7개 이하일 때 모두 표시
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // 페이지가 많을 때: 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                  pages.push(1);
                  
                  if (currentPage > 3) {
                    pages.push("...");
                  }
                  
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  
                  for (let i = start; i <= end; i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(i);
                    }
                  }
                  
                  if (currentPage < totalPages - 2) {
                    pages.push("...");
                  }
                  
                  pages.push(totalPages);
                }
                
                return pages.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  
                  const pageNum = page as number;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "min-w-[32px] px-2 py-1 text-sm rounded-md border transition-colors",
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
                onClick={() => handleDelete(deleteConfirmId)}
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
}

