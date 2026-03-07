"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface StudentOption {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  classLabel: string | null;
}

interface StudentAutocompleteProps {
  value: string;
  onChange: (studentId: string) => void;
  students: StudentOption[];
  disabledStudentIds: string[];
  /** 비활성 옵션 옆에 표시할 텍스트. id → 라벨 (예: 역할명 "학생회장"). 없으면 "(선택됨)" 사용 */
  disabledLabels?: Record<string, string>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

function getStudentDisplay(student: StudentOption): string {
  return student.studentId ? `${student.studentId} ${student.name}` : student.name;
}

function sortStudents(students: StudentOption[]): StudentOption[] {
  return [...students].sort((a, b) => {
    if (!a.studentId && !b.studentId) return 0;
    if (!a.studentId) return 1;
    if (!b.studentId) return -1;
    const numA = parseInt(a.studentId, 10) || 0;
    const numB = parseInt(b.studentId, 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.studentId.localeCompare(b.studentId);
  });
}

export function StudentAutocomplete({
  value,
  onChange,
  students,
  disabledStudentIds,
  disabledLabels,
  placeholder = "학생 선택",
  className,
  inputClassName,
}: StudentAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === value),
    [students, value]
  );
  const displayText = selectedStudent ? getStudentDisplay(selectedStudent) : "";

  const sortedStudents = useMemo(() => sortStudents(students), [students]);

  const filteredStudents = useMemo(() => {
    if (!query.trim()) return sortedStudents;
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return sortedStudents.filter((student) => {
      const searchText = `${student.name} ${student.studentId || ""} ${student.email || ""}`.toLowerCase();
      return terms.every((term) => searchText.includes(term));
    });
  }, [sortedStudents, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleInputFocus = () => {
    setIsOpen(true);
    setQuery("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (!next.trim()) {
      onChange("");
    }
    setIsOpen(true);
  };

  const handleSelect = (student: StudentOption) => {
    if (disabledStudentIds.includes(student.id)) return;
    onChange(student.id);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(true);
  };

  const showDropdown = isOpen;

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-[160px]", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn(
            "w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-white",
            !value ? "text-gray-400" : "text-black",
            inputClassName
          )}
        />
        {value && isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            aria-label="선택 해제"
          >
            ×
          </button>
        )}
      </div>
      {showDropdown &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-[200px] overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg py-1"
            role="listbox"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {filteredStudents.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500">검색 결과가 없습니다.</div>
            ) : (
              filteredStudents.map((student) => {
                const isDisabled = disabledStudentIds.includes(student.id);
                const disabledSuffix = isDisabled
                  ? (disabledLabels?.[student.id] ? ` (${disabledLabels[student.id]})` : " (선택됨)")
                  : "";
                return (
                  <button
                    key={student.id}
                    type="button"
                    role="option"
                    onClick={() => handleSelect(student)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                      isDisabled ? "text-gray-400 cursor-not-allowed italic" : "text-black cursor-pointer"
                    )}
                  >
                    {getStudentDisplay(student)}
                    {disabledSuffix}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
