"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Eye, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AnnouncementDetailModal } from "./AnnouncementDetailModal";

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
  authorId?: string;
  isScheduled: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedClasses: string | null;
  parentSelectedClasses: string | null;
  selectedClassGroupIds?: string[] | null;
  selectedClassGroups?: Array<{ id: string; name: string; period?: string | null }> | null;
  category?: string | null;
  surveyData?: string | null;
  consentData?: string | null;
  attachments?: string | null;
  viewCount?: number;
  editableBy?: string[];
  lastEditedBy?: string | null;
  lastEditedByName?: string | null;
}

interface AnnouncementListProps {
  includeScheduled?: boolean;
  audience?: string;
  courseId?: string;
  boardType?: string;
  /** 담임반 게시판에서 해당 학급만 조회할 때 사용 (e.g. "1-3") */
  homeroomClassKey?: string;
  showGradeTabs?: boolean;
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
  teacher: "교직원",
  students: "학생",
};

const categoryLabels: Record<string, string> = {
  notice: "단순 알림",
  survey: "설문 조사",
  consent: "동의서",
};

const getCategoryBadge = (category: string | null | undefined) => {
  if (!category) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        -
      </span>
    );
  }

  const label = categoryLabels[category] || category;
  
  if (category === "notice") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        {label}
      </span>
    );
  } else if (category === "survey") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
        {label}
      </span>
    );
  } else if (category === "consent") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        {label}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      {label}
    </span>
  );
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

const parseSelectedClassGroupIds = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((id) => typeof id === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatClassGroupLabels = (
  groups: Array<{ id: string; name: string; period?: string | null }> | null | undefined
): string => {
  if (!groups || groups.length === 0) return "수강생 전체";
  return [...groups]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((group) => group.name)
    .join(", ");
};

// 대상 필드 텍스트 생성
const getAudienceDisplayText = (announcement: Announcement, isCourseContext: boolean): string => {
  if (isCourseContext) {
    if (announcement.selectedClassGroups && announcement.selectedClassGroups.length > 0) {
      return formatClassGroupLabels(announcement.selectedClassGroups);
    }
    const classGroupIds = parseSelectedClassGroupIds(announcement.selectedClassGroupIds);
    if (classGroupIds.length > 0) {
      return `수강생 (${classGroupIds.length}개 학반)`;
    }
    return "수강생 전체";
  }
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

const getStudentGradeBadgeClass = (grade: string): string => {
  if (grade === "1") return "bg-green-100 text-green-800";
  if (grade === "2") return "bg-blue-100 text-blue-800";
  if (grade === "3") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-700";
};

const getStudentGradeBadges = (announcement: Announcement): Array<{ label: string; className: string }> => {
  const badges: Array<{ label: string; className: string }> = [];
  const totalClassesPerGrade = 7;

  if (announcement.audience?.startsWith("grade-")) {
    const grade = announcement.audience.split("-")[1];
    badges.push({ label: `${grade}학년`, className: getStudentGradeBadgeClass(grade) });
    return badges;
  }

  if (!announcement.selectedClasses) {
    return [{ label: "전체", className: "bg-gray-100 text-gray-700" }];
  }

  try {
    const classes: SelectedClass[] = JSON.parse(announcement.selectedClasses);
    if (classes.length === 0) {
      return [{ label: "전체", className: "bg-gray-100 text-gray-700" }];
    }
    const grades = Array.from(new Set(classes.map((cls) => cls.grade?.trim()))).filter(Boolean);
    if (grades.length === 0) {
      return [{ label: "전체", className: "bg-gray-100 text-gray-700" }];
    }
    const gradesWithClasses = grades
      .map((grade) => {
        const classNumbers = classes
          .filter((cls) => cls.grade?.trim() === grade)
          .map((cls) => cls.classNumber?.trim())
          .filter(Boolean)
          .map((num) => num.replace(/^0+/, ""))
          .sort((a, b) => Number(a) - Number(b));

        const hasAllClasses = classNumbers.length >= totalClassesPerGrade;
        const suffix = hasAllClasses
          ? " 전체"
          : ` (${classNumbers.map((num) => `${grade}-${num}`).join(", ")})`;
        return {
          label: `${grade}학년${suffix}`,
          className: getStudentGradeBadgeClass(grade),
          grade,
          hasAllClasses,
        };
      })
      .filter((badge) => badge.label);

    const allGrades = ["1", "2", "3"];
    const isAllGradesFullySelected = allGrades.every(
      (grade) =>
        gradesWithClasses.some(
          (badge) => badge.grade === grade && badge.hasAllClasses
        )
    );
    if (isAllGradesFullySelected) {
      return [{ label: "1,2,3학년 전체", className: "bg-gray-100 text-gray-700" }];
    }

    if (gradesWithClasses.length === 0) {
      return [{ label: "전체", className: "bg-gray-100 text-gray-700" }];
    }

    return gradesWithClasses.map(({ label, className }) => ({ label, className }));
  } catch {
    return [{ label: "전체", className: "bg-gray-100 text-gray-700" }];
  }
};

export function AnnouncementList({ includeScheduled = false, audience, courseId, boardType, homeroomClassKey, showGradeTabs = false, refreshKey, onEdit, showEditButton = false, onDelete, showDeleteButton = false }: AnnouncementListProps) {
  const { data: session } = useSession();
  const { showToast } = useToastContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const announcementIdFromUrl = searchParams.get("announcement");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeTab, setGradeTab] = useState<"all" | "1" | "2" | "3">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

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
      if (courseId) {
        params.append("courseId", courseId);
      }
      if (boardType) {
        params.append("boardType", boardType);
      }
      if (homeroomClassKey) {
        params.append("classKey", homeroomClassKey);
      }

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "안내문 목록을 불러오는데 실패했습니다.");
      }

      console.log("Announcements fetched:", data.announcements?.length || 0, "items");
      console.log("Sample announcement:", data.announcements?.[0]);
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      console.error("Failed to fetch announcements:", err);
      setError(err.message || "안내문 목록을 불러오는 중 오류가 발생했습니다.");
      showToast(err.message || "안내문 목록을 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeScheduled, audience, boardType, homeroomClassKey, refreshKey]);

  // 페이지당 항목 수 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // URL 쿼리(?announcement=id)가 있으면 해당 안내문 모달 열기
  useEffect(() => {
    if (!announcementIdFromUrl || isLoading) return;

    const found = announcements.find((a) => a.id === announcementIdFromUrl);
    if (found) {
      setSelectedAnnouncement(found);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/announcements/${announcementIdFromUrl}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          showToast(data.error || "안내문을 불러올 수 없습니다.", "error");
          return;
        }
        if (data.announcement) {
          setSelectedAnnouncement(data.announcement as Announcement);
        }
      } catch {
        if (!cancelled) showToast("안내문을 불러오는 중 오류가 발생했습니다.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [announcementIdFromUrl, isLoading, announcements, showToast]);

  // 클라이언트 측 검색 필터링 및 내가 쓴 글 필터
  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;

    if (showGradeTabs && gradeTab !== "all") {
      filtered = filtered.filter((announcement) => {
        const matchesAudienceGrade = announcement.audience === `grade-${gradeTab}`;
        if (matchesAudienceGrade) return true;

        const audienceAllStudents =
          announcement.audience === "all" || announcement.audience === "students";
        if (audienceAllStudents && (!announcement.selectedClasses || announcement.selectedClasses === "[]")) {
          return true;
        }

        if (!announcement.selectedClasses) return false;
        try {
          const classes: SelectedClass[] = JSON.parse(announcement.selectedClasses);
          return classes.some((cls) => cls.grade?.trim() === gradeTab);
        } catch {
          return false;
        }
      });
    }

    // 구분 필터
    if (categoryFilter) {
      filtered = filtered.filter((announcement) => {
        return announcement.category === categoryFilter;
      });
    }
    
    // 내가 쓴 글 필터
    if (showMyPostsOnly && session?.user?.name) {
      filtered = filtered.filter((announcement) => {
        return announcement.author === session.user.name;
      });
    }
    
    // 검색 필터링
    if (searchQuery.trim()) {
      const keyword = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((announcement) => {
        const titleMatch = announcement.title.toLowerCase().includes(keyword);
        const authorMatch = announcement.author.toLowerCase().includes(keyword);
        // HTML 태그 제거 후 내용 검색
        const contentText = announcement.content.replace(/<[^>]*>/g, "").toLowerCase();
        const contentMatch = contentText.includes(keyword);
        return titleMatch || authorMatch || contentMatch;
      });
    }
    
    return filtered;
  }, [announcements, searchQuery, showMyPostsOnly, categoryFilter, session, showGradeTabs, gradeTab]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);

  // 검색어 또는 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showMyPostsOnly, categoryFilter, gradeTab]);

  const renderGradeTabs = () => {
    if (!showGradeTabs) return null;
    const tabs: Array<{ value: "all" | "1" | "2" | "3"; label: string }> = [
      { value: "all", label: "전체" },
      { value: "1", label: "1학년" },
      { value: "2", label: "2학년" },
      { value: "3", label: "3학년" },
    ];

    return (
      <div className="border-b border-gray-200 bg-white px-4 pt-3 pb-0">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const isActive = gradeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setGradeTab(tab.value)}
                className={cn(
                  "group relative min-w-[64px] px-4 py-2 text-sm font-medium transition-colors rounded-t-md",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
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

  // 첨부 파일이 있는지 확인하는 함수
  const hasAttachments = (attachments: string | null | undefined): boolean => {
    if (!attachments) return false;
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  const handleAnnouncementClick = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    const params = new URLSearchParams(searchParams.toString());
    params.set("announcement", announcement.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // 조회수 증가 API 호출
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        const data = await response.json();
        // 로컬 상태 업데이트
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcement.id
              ? { ...a, viewCount: data.viewCount }
              : a
          )
        );
      } else {
        // 에러 응답 처리
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to increment view count:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">안내문을 불러오는 중...</div>
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
      {renderGradeTabs()}
      {/* 검색 바 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="announcement-search-empty" className="sr-only">
              안내문 검색
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
          <div className="w-28">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: "", label: "전체" },
                { value: "notice", label: "단순 알림" },
                { value: "survey", label: "설문 조사" },
                { value: "consent", label: "동의서" },
              ]}
              className="text-sm"
            />
          </div>
          <Button
            type="button"
            variant={showMyPostsOnly ? "primary" : "outline"}
            onClick={() => setShowMyPostsOnly(!showMyPostsOnly)}
            className="whitespace-nowrap text-sm"
          >
            내가 쓴 글
          </Button>
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
              {searchQuery ? "검색 결과가 없습니다" : "안내문이 없습니다"}
            </p>
            <p className="text-xs text-gray-500">
              {searchQuery 
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`
                : "새로운 안내문이 등록되면 여기에 표시됩니다."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {renderGradeTabs()}
      {/* 검색 바 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="announcement-search" className="sr-only">
              안내문 검색
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
          <div className="w-28">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: "", label: "구분 검색" },
                { value: "notice", label: "단순 알림" },
                { value: "survey", label: "설문 조사" },
                { value: "consent", label: "동의서" },
              ]}
              className="text-sm"
            />
          </div>
          <Button
            type="button"
            variant={showMyPostsOnly ? "primary" : "outline"}
            onClick={() => setShowMyPostsOnly(!showMyPostsOnly)}
            className="whitespace-nowrap text-sm"
          >
            내가 쓴 글
          </Button>
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
          <div className="col-span-1 text-center">구분</div>
          <div className="col-span-4">제목</div>
          <div className="col-span-1 text-center">첨부</div>
          <div className="col-span-2 text-center">알림 대상</div>
          <div className="col-span-1 text-center">작성자</div>
          <div className="col-span-1 text-center">작성일</div>
          <div className="col-span-1 text-center">조회수</div>
        </div>
      </div>

      {/* 게시판 본문 */}
      <div className="divide-y divide-gray-200">
        {paginatedAnnouncements.map((announcement, index) => {
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
                onClick={() => handleAnnouncementClick(announcement)}
              >
                <div className="col-span-1 text-center text-gray-500">
                  {filteredAnnouncements.length - globalIndex}
                </div>
                <div className="col-span-1 text-center flex items-center justify-center">
                  {getCategoryBadge(announcement.category)}
                </div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{announcement.title}</span>
                  {isScheduled && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                      예약
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-center flex items-center justify-center">
                  {hasAttachments(announcement.attachments) && (
                    <Paperclip className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="col-span-2 text-center min-w-0 flex items-center justify-center gap-1 flex-wrap">
                  {(() => {
                    const isCourseContext = Boolean(courseId);
                    const hasCourseStudents = isCourseContext;
                    const hasStudents = hasCourseStudents || (announcement.selectedClasses && 
                      (isAllClassesSelected(announcement.selectedClasses) || formatSelectedClasses(announcement.selectedClasses)));
                    const hasParents = announcement.parentSelectedClasses && 
                      (isAllClassesSelected(announcement.parentSelectedClasses) || formatSelectedClasses(announcement.parentSelectedClasses));
                    
                    const displayText = getAudienceDisplayText(announcement, isCourseContext);

                    if (isCourseContext) {
                      return (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 max-w-full truncate"
                          title={displayText}
                        >
                          {displayText}
                        </span>
                      );
                    }
                    
                    // 재학생과 학부모가 모두 있는 경우 두 개의 뱃지로 표시
                    if (hasStudents && hasParents) {
                      const studentText = (() => {
                        if (isAllClassesSelected(announcement.selectedClasses)) {
                          return courseId ? "수강생 전체" : "모든 재학생";
                        }
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
                          {studentText && boardType === "board_students" ? (
                            getStudentGradeBadges(announcement).map((badge) => (
                              <span
                                key={badge.label}
                                className={cn(
                                  "inline-block px-1.5 py-0.5 rounded text-xs font-medium max-w-full truncate",
                                  badge.className
                                )}
                                title={studentText}
                              >
                                {badge.label}
                              </span>
                            ))
                          ) : (
                            studentText && (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 max-w-full truncate"
                                title={studentText}
                              >
                                {studentText}
                              </span>
                            )
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
                    if (hasStudents && boardType === "board_students") {
                      return (
                        <>
                          {getStudentGradeBadges(announcement).map((badge) => (
                            <span
                              key={badge.label}
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-xs font-medium max-w-full truncate",
                                badge.className
                              )}
                              title={displayText}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </>
                      );
                    }

                    return (
                      <span 
                        className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-xs font-medium max-w-full truncate",
                          hasStudents ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        )}
                        title={displayText}
                      >
                        {displayText}
                      </span>
                    );
                  })()}
                </div>
                <div className="col-span-1 text-center text-gray-600 text-xs truncate">
                  {announcement.lastEditedByName 
                    ? `${announcement.author} (${announcement.lastEditedByName})`
                    : announcement.author}
                </div>
                <div className="col-span-1 text-center text-gray-500 text-xs">
                  {formatDateShort(displayDate)}
                </div>
                <div className="col-span-1 text-center text-gray-500 text-xs">
                  {announcement.viewCount || 0}
                </div>
              </div>
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

      {/* 안내문 상세 모달 */}
      <AnnouncementDetailModal
        isOpen={selectedAnnouncement !== null}
        announcement={selectedAnnouncement}
        onClose={() => {
          setSelectedAnnouncement(null);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("announcement");
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        onEdit={onEdit}
        onDelete={onDelete}
        showEditButton={showEditButton}
        showDeleteButton={showDeleteButton}
        courseId={courseId}
        onDeleteConfirm={async (id) => {
          await fetchAnnouncements();
          onDelete?.(id);
        }}
      />
    </div>
  );
}

