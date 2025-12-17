"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

type Course = {
  id: string;
  subject: string;
};

type CourseDropdownProps = {
  courses: Course[];
  currentCourseId: string;
  currentCourseName: string;
};

export default function CourseDropdown({
  courses,
  currentCourseId,
  currentCourseName,
}: CourseDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCourseSelect = (courseId: string) => {
    if (courseId !== currentCourseId) {
      router.push(`/dashboard/teacher/manage-classes/${courseId}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-gray-700 font-medium hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-1 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="truncate max-w-[200px]">{currentCourseName}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="py-1">
            {courses.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                수업이 없습니다.
              </div>
            ) : (
              courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleCourseSelect(course.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                    course.id === currentCourseId
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  <div className="truncate">{course.subject}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

