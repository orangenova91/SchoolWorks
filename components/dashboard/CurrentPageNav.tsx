"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Calendar,
  BookOpen,
  BookOpenCheck,
  GraduationCap,
  FileText,
  Folder,
  BarChart,
  Users,
  Settings,
  TrendingUp,
  Bell,
  HelpCircle,
  Shield,
  User,
  UserCheck,
  MessageCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Newspaper,
  Clipboard,
  ClipboardMinus,
  ClipboardCopy,
  ClipboardList,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  iconName?: string;
  icon?: React.ReactNode;
  external?: boolean;
  dividerBefore?: boolean;
};

interface CurrentPageNavProps {
  items: NavItem[];
}

const rootPaths = ["/dashboard", "/dashboard/teacher", "/dashboard/student", "/dashboard/admin"];

type BreadcrumbItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  BookOpenCheck: <BookOpenCheck className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Folder: <Folder className="w-5 h-5" />,
  BarChart: <BarChart className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Bell: <Bell className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  User: <User className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  MessageCircle: <MessageCircle className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Newspaper: <Newspaper className="w-5 h-5" />,
  Clipboard: <Clipboard className="w-5 h-5" />,
  ClipboardMinus: <ClipboardMinus className="w-5 h-5" />,
  ClipboardCopy: <ClipboardCopy className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  PartyPopper: <PartyPopper className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

const formatGrade = (grade: string | null): string => {
  if (!grade) return "";
  switch (grade.trim()) {
    case "1":
      return "1학년";
    case "2":
      return "2학년";
    case "3":
      return "3학년";
    default:
      return grade;
  }
};

export default function CurrentPageNav({ items }: CurrentPageNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 마우스가 영역을 벗어날 때 지연 후 닫기
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms 지연
  };

  // 마우스가 영역에 들어올 때 즉시 열기
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  // 현재 경로와 매칭되는 메뉴 항목 찾기
  const findCurrentItem = (): NavItem | null => {
    for (const item of items) {
      if (item.external) continue;
      
      const targetPath = item.href.split("#")[0];
      const isBasePath = rootPaths.includes(targetPath);
      
      // 정확히 일치하거나 하위 경로인 경우
      if (
        pathname === targetPath ||
        (!isBasePath && pathname.startsWith(targetPath + "/"))
      ) {
        return item;
      }
    }
    return null;
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.external) return false;
    
    const targetPath = item.href.split("#")[0];
    const isBasePath = rootPaths.includes(targetPath);
    
    return (
      pathname === targetPath ||
      (!isBasePath && pathname.startsWith(targetPath + "/"))
    );
  };

  // 현재 경로와 매칭되는 메뉴 항목 찾기
  const currentItem = findCurrentItem();

  // Breadcrumb 생성 함수
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];
    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments.length === 0 || !currentItem) {
      return breadcrumbs;
    }

    // 현재 항목의 경로 찾기
    const currentItemPath = currentItem.href.split("#")[0];
    const currentItemPathSegments = currentItemPath.split("/").filter(Boolean);

    // 현재 항목보다 깊은 경로만 breadcrumb에 추가
    if (pathSegments.length > currentItemPathSegments.length) {
      // 현재 항목 다음의 경로들만 처리
      for (let i = currentItemPathSegments.length; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        
        // 동적 라우트 파라미터 (MongoDB ObjectId 또는 UUID)는 건너뛰기 (나중에 API로 가져올 것)
        if (segment.match(/^[a-f0-9]{24}$/i) || segment.match(/^[a-f0-9-]{36}$/i)) {
          continue;
        }

        // 경로 구성
        let segmentPath = "";
        for (let j = 0; j <= i; j++) {
          segmentPath += `/${pathSegments[j]}`;
        }

        // 사이드바 메뉴에서 매칭되는 항목 찾기
        const matchedItem = items.find((item) => {
          if (item.external) return false;
          const targetPath = item.href.split("#")[0];
          return segmentPath === targetPath;
        });

        if (matchedItem) {
          const itemIcon = matchedItem.iconName ? iconMap[matchedItem.iconName] : matchedItem.icon;
          breadcrumbs.push({
            label: matchedItem.label,
            href: matchedItem.href,
            icon: itemIcon,
          });
        }
      }
    }

    return breadcrumbs;
  };

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [dynamicLabel, setDynamicLabel] = useState<string | null>(null);
  const [currentCourseGrade, setCurrentCourseGrade] = useState<string | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [courseContext, setCourseContext] = useState<"teacher" | "student" | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; subject: string; grade: string }>>([]);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const courseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 수업 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses");
        if (response.ok) {
          const data = await response.json();
          setCourses(data);
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };

    if (pathname.startsWith("/dashboard/teacher") || pathname.startsWith("/dashboard/student")) {
      fetchCourses();
    }
  }, [pathname]);

  // 동적 경로의 라벨 가져오기 (예: courseId에서 수업명 가져오기)
  useEffect(() => {
    const fetchDynamicLabel = async () => {
      const pathSegments = pathname.split("/").filter(Boolean);
      
      const isTeacherCoursePath =
        pathSegments.length >= 4 &&
        pathSegments[0] === "dashboard" &&
        pathSegments[1] === "teacher" &&
        pathSegments[2] === "manage-classes" &&
        (pathSegments[3].match(/^[a-f0-9]{24}$/i) || pathSegments[3].match(/^[a-f0-9-]{36}$/i));

      const isStudentCoursePath =
        pathSegments.length >= 4 &&
        pathSegments[0] === "dashboard" &&
        pathSegments[1] === "student" &&
        pathSegments[2] === "classroom" &&
        (pathSegments[3].match(/^[a-f0-9]{24}$/i) || pathSegments[3].match(/^[a-f0-9-]{36}$/i));

      // /dashboard/teacher/manage-classes/[courseId] 또는 /dashboard/student/classroom/[courseId] 패턴 확인
      if (
        pathSegments.length >= 4 &&
        (isTeacherCoursePath || isStudentCoursePath)
      ) {
        try {
          const courseId = pathSegments[3];
          setCurrentCourseId(courseId);
          setCourseContext(isStudentCoursePath ? "student" : "teacher");
          const response = await fetch(`/api/courses/${courseId}`);
          if (response.ok) {
            const data = await response.json();
            setDynamicLabel(data.subject || "수업 상세");
            setCurrentCourseGrade(data.grade || null);
          }
        } catch (error) {
          console.error("Failed to fetch course:", error);
        }
      } else {
        setDynamicLabel(null);
        setCurrentCourseId(null);
        setCurrentCourseGrade(null);
        setCourseContext(null);
      }
    };

    fetchDynamicLabel();
  }, [pathname]);

  // Breadcrumb 업데이트
  useEffect(() => {
    const newBreadcrumbs = generateBreadcrumbs();
    setBreadcrumbs(newBreadcrumbs);
  }, [pathname, items, currentItem]);

  // 수업 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    };

    if (isCourseDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (courseTimeoutRef.current) {
        clearTimeout(courseTimeoutRef.current);
      }
    };
  }, [isCourseDropdownOpen]);

  // 수업 드롭다운 마우스 이벤트
  const handleCourseMouseLeave = () => {
    if (courseTimeoutRef.current) {
      clearTimeout(courseTimeoutRef.current);
    }
    courseTimeoutRef.current = setTimeout(() => {
      setIsCourseDropdownOpen(false);
    }, 200);
  };

  const handleCourseMouseEnter = () => {
    if (courseTimeoutRef.current) {
      clearTimeout(courseTimeoutRef.current);
      courseTimeoutRef.current = null;
    }
    setIsCourseDropdownOpen(true);
  };

  if (!currentItem || !currentItem.iconName) {
    return null;
  }

  const icon = iconMap[currentItem.iconName];

  if (!icon) {
    return null;
  }

  return (
    <div className="flex items-center ml-4">
      <div 
        ref={navRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2 cursor-pointer">
          <span className="text-gray-600">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{currentItem.label}</span>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>

        {isOpen && (
          <div 
            className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = isItemActive(item);
                const itemIcon = item.iconName ? iconMap[item.iconName] : item.icon;

                return (
                  <li
                    key={item.href}
                    className={cn(item.dividerBefore && "mt-1 pt-2 border-t border-gray-200")}
                  >
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {itemIcon && (
                          <span className="w-5 h-5 flex-shrink-0 text-inherit">{itemIcon}</span>
                        )}
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {itemIcon && (
                          <span className="w-5 h-5 flex-shrink-0 text-inherit">{itemIcon}</span>
                        )}
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Breadcrumb 표시 */}
      {(breadcrumbs.length > 0 || dynamicLabel) && (
        <div className="flex items-center gap-2 ml-4">
          {breadcrumbs.slice(1).map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <Link
                href={crumb.href}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {crumb.icon && (
                  <span className="w-4 h-4 text-gray-500">{crumb.icon}</span>
                )}
                <span>{crumb.label}</span>
              </Link>
            </div>
          ))}
          {dynamicLabel && (
            <div 
              ref={courseDropdownRef}
              className="relative"
              onMouseEnter={handleCourseMouseEnter}
              onMouseLeave={handleCourseMouseLeave}
            >
              <div className="flex items-center gap-2 cursor-pointer">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {currentCourseGrade && (
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                    {formatGrade(currentCourseGrade)}
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900">{dynamicLabel}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-500 transition-transform duration-200",
                  isCourseDropdownOpen && "rotate-180"
                )} />
              </div>

              {isCourseDropdownOpen && courses.length > 0 && (
                <div 
                  className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  onMouseEnter={handleCourseMouseEnter}
                  onMouseLeave={handleCourseMouseLeave}
                >
                  <ul className="space-y-1">
                    {courses.map((course) => {
                      const isActive = course.id === currentCourseId;
                      const courseLink =
                        courseContext === "student"
                          ? `/dashboard/student/classroom/${course.id}`
                          : `/dashboard/teacher/manage-classes/${course.id}`;
                      return (
                        <li key={course.id}>
                          <Link
                            href={courseLink}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                            onClick={() => setIsCourseDropdownOpen(false)}
                          >
                            {course.grade && (
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
                                {formatGrade(course.grade)}
                              </span>
                            )}
                            <span>{course.subject}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

