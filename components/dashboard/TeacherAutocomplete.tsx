"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TeacherOption {
  id: string;
  name: string | null;
  email: string;
  roleLabel: string | null;
}

interface TeacherAutocompleteProps {
  value: string;
  onChange: (teacherName: string) => void;
  teachers: TeacherOption[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

function getTeacherDisplay(teacher: TeacherOption): string {
  return teacher.name || teacher.email;
}

function sortTeachers(teachers: TeacherOption[]): TeacherOption[] {
  return [...teachers].sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, "ko")
  );
}

export function TeacherAutocomplete({
  value,
  onChange,
  teachers,
  placeholder = "교사 선택",
  className,
  inputClassName,
  disabled = false,
}: TeacherAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const selectedTeacher = useMemo(
    () => teachers.find((t) => (t.name || t.email) === value),
    [teachers, value]
  );
  const displayText = selectedTeacher ? getTeacherDisplay(selectedTeacher) : value || "";

  const sortedTeachers = useMemo(() => sortTeachers(teachers), [teachers]);

  const filteredTeachers = useMemo(() => {
    if (!query.trim()) return sortedTeachers;
    const terms = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return sortedTeachers.filter((teacher) => {
      const searchText = `${teacher.name || ""} ${teacher.email || ""} ${teacher.roleLabel || ""}`.toLowerCase();
      return terms.every((term) => searchText.includes(term));
    });
  }, [sortedTeachers, query]);

  useEffect(() => {
    if (filteredTeachers.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredTeachers]);

  useEffect(() => {
    if (!isOpen) setHighlightedIndex(-1);
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

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
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const next = e.target.value;
    setQuery(next);
    if (!next.trim()) {
      onChange("");
    }
    setIsOpen(true);
  };

  const handleSelect = (teacher: TeacherOption) => {
    const name = teacher.name || teacher.email;
    onChange(name);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
    if (filteredTeachers.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) =>
          i >= filteredTeachers.length - 1 ? 0 : i + 1
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) =>
          i <= 0 ? filteredTeachers.length - 1 : i - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredTeachers[highlightedIndex]) {
          handleSelect(filteredTeachers[highlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  const showDropdown = isOpen && !disabled;

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-[120px]", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-60 disabled:cursor-not-allowed",
            !value ? "text-gray-400" : "text-black",
            inputClassName
          )}
        />
        {value && isOpen && !disabled && (
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
            {filteredTeachers.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500">검색 결과가 없습니다.</div>
            ) : (
              filteredTeachers.map((teacher, index) => (
                <button
                  key={teacher.id}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onClick={() => handleSelect(teacher)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 focus:outline-none text-black cursor-pointer",
                    index === highlightedIndex && "bg-blue-100 hover:bg-blue-100"
                  )}
                >
                  {getTeacherDisplay(teacher)}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
