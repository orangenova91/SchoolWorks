"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Student = {
  id: string;
  name: string | null;
  email: string;
  studentProfile?: {
    studentId: string | null;
    classLabel: string | null;
  } | null;
};

type ClassGroup = {
  id: string;
  name: string;
  period: string | null;
  schedules: Array<{ day: string; period: string }>;
  courseId: string;
  studentIds: string[];
  createdAt: string;
};

type CreateClassGroupButtonProps = {
  courseId: string;
  students?: Student[];
  initialOpen?: boolean;
  hideStudents?: boolean;
  showTrigger?: boolean;
  onCreated?: () => void;
  onClose?: () => void;
};

export default function CreateClassGroupButton({
  courseId,
  students,
  initialOpen = false,
  hideStudents = false,
  showTrigger = true,
  onCreated,
  onClose,
}: CreateClassGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(Boolean(initialOpen));
  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);
  const studentsList = (students && students.length > 0) ? students : fetchedStudents;
  const [mounted, setMounted] = useState(false);
  const [className, setClassName] = useState("");
  const [period, setPeriod] = useState("1");
  const [schedules, setSchedules] = useState<Array<{ day: string; period: string }>>([
    { day: "", period: "" },
  ]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassGroupFilter, setSelectedClassGroupFilter] = useState<string>("");
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 학반 목록 로드
  useEffect(() => {
    if (!isOpen) return;

    const loadClassGroups = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/class-groups`);
        if (response.ok) {
          const data = await response.json();
          setClassGroups(data.classGroups || []);
        }
      } catch (error) {
        console.error("학반 목록 로드 실패:", error);
      }
    };

    loadClassGroups();
  }, [courseId, isOpen]);

  // 학생 목록이 전달되지 않으면 모달 열릴 때 학생 목록을 시도해서 로드
  useEffect(() => {
    if (!isOpen) return;
    if (students && students.length > 0) return;

    const loadStudents = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/students`);
        if (!res.ok) {
          // no-op: parent should provide students if endpoint unavailable
          return;
        }
        const data = await res.json();
        setFetchedStudents(data.students || []);
      } catch (err) {
        console.error("학생 목록 로드 실패:", err);
      }
    };

    loadStudents();
  }, [courseId, isOpen, students]);

  // body 스크롤 잠금
  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 body 스크롤 잠금
      document.body.style.overflow = 'hidden';
    } else {
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = '';
    }
    
    // cleanup: 컴포넌트 언마운트 시에도 복원
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const daysOfWeek = [
    { value: "", label: "요일 선택" },
    { value: "월", label: "월요일" },
    { value: "화", label: "화요일" },
    { value: "수", label: "수요일" },
    { value: "목", label: "목요일" },
    { value: "금", label: "금요일" },
  ];

  const periods = Array.from({ length: 10 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}교시`,
  }));

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setClassName("");
    setPeriod("1");
    setSchedules([{ day: "", period: "" }]);
    setSelectedStudentIds(new Set());
    setSearchQuery("");
    setSelectedClassGroupFilter("");
    setValidationError(null);
    try {
      onClose?.();
    } catch (err) {
      // ignore
    }
  }, [onClose]);

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPeriod = e.target.value;
    setPeriod(newPeriod);
    
    // 차시 개수에 맞춰 schedules 배열 조정
    const periodCount = parseInt(newPeriod, 10) || 0;
    if (periodCount > 0) {
      setSchedules((prev) => {
        const newSchedules = Array.from({ length: periodCount }, (_, index) => {
          return prev[index] || { day: "", period: "" };
        });
        return newSchedules;
      });
    }
  }, []);

  const handleScheduleDayChange = useCallback((index: number, day: string) => {
    setSchedules((prev) => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], day };
      return newSchedules;
    });
  }, []);

  const handleSchedulePeriodChange = useCallback((index: number, period: string) => {
    setSchedules((prev) => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], period };
      return newSchedules;
    });
  }, []);

  const periodCount = useMemo(() => {
    return parseInt(period, 10) || 0;
  }, [period]);

  // 학생들의 고유한 classLabel 목록
  const uniqueClassLabels = useMemo(() => {
    const labels = new Set<string>();
    studentsList.forEach((student) => {
      const classLabel = student.studentProfile?.classLabel?.trim();
      if (classLabel) {
        labels.add(classLabel);
      }
    });
    return Array.from(labels).sort();
  }, [studentsList]);

  // 학생이 속한 학반 매핑
  const studentClassGroupMap = useMemo(() => {
    const map = new Map<string, string>(); // studentId -> classGroupName
    classGroups.forEach((group) => {
      group.studentIds.forEach((studentId) => {
        map.set(studentId, group.name);
      });
    });
    return map;
  }, [classGroups]);

  const filteredStudents = useMemo(() => {
    let result = studentsList;

    // classLabel 필터 적용
    if (selectedClassGroupFilter) {
      result = result.filter((student) => {
        const studentClassLabel = student.studentProfile?.classLabel?.trim() || "";
        return studentClassLabel === selectedClassGroupFilter;
      });
    }

    // 검색 필터 적용 (콤마로 구분된 다중 검색어 지원)
    if (searchQuery.trim()) {
      // 콤마로 구분하여 검색어 배열 생성
      const searchTerms = searchQuery
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0); // 빈 검색어 제거

      if (searchTerms.length > 0) {
        result = result.filter((student) => {
          const studentName = student.name?.toLowerCase() || '';
          const studentEmail = student.email.toLowerCase();
          
          // 여러 검색어 중 하나라도 포함되면 표시 (OR 검색)
          return searchTerms.some(term => 
            studentName.includes(term) || studentEmail.includes(term)
          );
        });
      }
    }

    // 학번 순서로 정렬
    result = [...result].sort((a, b) => {
      const aStudentId = a.studentProfile?.studentId || "";
      const bStudentId = b.studentProfile?.studentId || "";
      
      // 학번이 둘 다 있으면 숫자로 비교, 없으면 뒤로
      if (aStudentId && bStudentId) {
        // 숫자 부분 추출하여 비교
        const aNum = parseInt(aStudentId.replace(/\D/g, "")) || 0;
        const bNum = parseInt(bStudentId.replace(/\D/g, "")) || 0;
        if (aNum !== bNum) {
          return aNum - bNum;
        }
        // 숫자가 같으면 문자열로 비교
        return aStudentId.localeCompare(bStudentId);
      }
      // 하나만 있으면 있는 것을 앞으로
      if (aStudentId && !bStudentId) return -1;
      if (!aStudentId && bStudentId) return 1;
      // 둘 다 없으면 이름으로 정렬
      return (a.name || "").localeCompare(b.name || "");
    });

    return result;
  }, [studentsList, searchQuery, selectedClassGroupFilter]);

  const toggleStudent = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  // 필터링된 학생들 전체 선택
  const selectAllFiltered = useCallback(() => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((student) => {
        next.add(student.id);
      });
      return next;
    });
  }, [filteredStudents]);

  // 필터링된 학생들 전체 해제
  const deselectAllFiltered = useCallback(() => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((student) => {
        next.delete(student.id);
      });
      return next;
    });
  }, [filteredStudents]);

  // 필터링된 학생 중 선택된 학생 수
  const selectedFilteredCount = useMemo(() => {
    return filteredStudents.filter((student) =>
      selectedStudentIds.has(student.id)
    ).length;
  }, [filteredStudents, selectedStudentIds]);

  // 필터링된 학생들이 모두 선택되었는지 확인
  const allFilteredSelected = useMemo(() => {
    return (
      filteredStudents.length > 0 &&
      filteredStudents.every((student) => selectedStudentIds.has(student.id))
    );
  }, [filteredStudents, selectedStudentIds]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      setValidationError(null);

      // 학반명 검증
      if (!className.trim()) {
        setValidationError("학반명을 입력해주세요.");
        return;
      }

      // 차시 검증
      const periodNum = parseInt(period, 10);
      if (!period || isNaN(periodNum) || periodNum < 1) {
        setValidationError("차시를 올바르게 입력해주세요.");
        return;
      }

      // 스케줄 검증 - 모든 차시에 요일과 교시가 입력되어야 함
      if (schedules.length !== periodNum) {
        setValidationError("차시 개수와 스케줄 개수가 일치하지 않습니다.");
        return;
      }

      const incompleteSchedules = schedules.filter(
        (schedule) => !schedule.day || !schedule.period
      );
      if (incompleteSchedules.length > 0) {
        setValidationError("모든 차시의 요일과 교시를 입력해주세요.");
        return;
      }

      // 수강생 검증 (hideStudents가 true면 선택 검증 스킵)
      if (!hideStudents && selectedStudentIds.size === 0) {
        setValidationError("최소 1명 이상의 수강생을 선택해주세요.");
        return;
      }

      setIsSubmitting(true);
      
      try {
        // API를 통해 MongoDB에 학반 정보 저장
        const response = await fetch(
          `/api/courses/${courseId}/class-groups`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: className.trim(),
              period: period.trim() || null,
              schedules: schedules.filter((s) => s.day && s.period),
              studentIds: hideStudents ? [] : Array.from(selectedStudentIds),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          setValidationError(
            errorData.error || "학반 생성 중 오류가 발생했습니다."
          );
          return;
        }

        // 이벤트 발생으로 다른 컴포넌트에 알림 (나중에 읽기 기능 구현 시 사용)
        window.dispatchEvent(
          new CustomEvent("course:classGroups:updated", {
            detail: { courseId },
          })
        );

        handleClose();
        onCreated?.();
      } catch (error) {
        console.error("학반 생성 실패:", error);
        setValidationError("학반 생성 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [className, period, schedules, courseId, selectedStudentIds, handleClose, onCreated]
  );

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">학반 생성</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4 flex flex-col flex-1 overflow-hidden">
              {validationError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">{validationError}</p>
                </div>
              )}
              
              <div>
                <label
                  htmlFor="className"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  학반명
                </label>
                <Input
                  id="className"
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="예: 1반, 2반, A반 등"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  차시별 요일 및 교시 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <label
                      htmlFor="period"
                      className="block text-xs text-gray-600 mb-1"
                    >
                      차시
                    </label>
                    <Input
                      id="period"
                      type="number"
                      min="1"
                      value={period}
                      onChange={handlePeriodChange}
                      placeholder="차시"
                      className="w-20"
                    />
                  </div>
                  
                  {periodCount > 0 && (
                    <div className="flex-1 overflow-y-auto max-h-64">
                      <div className="space-y-2">
                        {schedules.map((schedule, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-700 min-w-[2.5rem]">
                              {index + 1}차시
                            </span>
                            <Select
                              options={daysOfWeek}
                              value={schedule.day}
                              onChange={(e) =>
                                handleScheduleDayChange(index, e.target.value)
                              }
                              className="flex-1"
                            />
                            <Select
                              options={[
                                { value: "", label: "교시 선택" },
                                ...periods,
                              ]}
                              value={schedule.period}
                              onChange={(e) =>
                                handleSchedulePeriodChange(index, e.target.value)
                              }
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {!hideStudents && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        수강생 추가하기 <span className="text-red-500">*</span>
                      </label>
                      {filteredStudents.length > 0 && (
                        <div className="flex items-center gap-2">
                          {allFilteredSelected ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deselectAllFiltered}
                              className="text-xs"
                            >
                              전체 해제
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={selectAllFiltered}
                              className="text-xs"
                            >
                              전체 선택
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mb-2 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="학생 이름 또는 이메일로 검색 (콤마로 구분: 김철수, 이영희)"
                            className="w-full"
                          />
                        </div>
                        <div className="w-40">
                          <Select
                            options={[
                              { value: "", label: "전체 학반" },
                              ...uniqueClassLabels.map((label) => ({
                                value: label,
                                label: label,
                              })),
                            ]}
                            value={selectedClassGroupFilter}
                            onChange={(e) => setSelectedClassGroupFilter(e.target.value)}
                            disabled={uniqueClassLabels.length === 0}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
                      {studentsList.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          학생 계정이 없습니다.
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          검색 결과가 없습니다.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredStudents.map((student) => (
                            <label
                              key={student.id}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.has(student.id)}
                                onChange={() => toggleStudent(student.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.studentProfile?.studentId && (
                                      <span className="text-gray-500 mr-1">
                                        {student.studentProfile.studentId}
                                      </span>
                                    )}
                                    {student.name ?? "이름 없음"}
                                  </div>
                                  {studentClassGroupMap.has(student.id) && (
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                                      {studentClassGroupMap.get(student.id)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {student.email}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {studentsList.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedStudentIds.size}명 선택됨
                    {(searchQuery || selectedClassGroupFilter) && (
                      <span className="ml-2">
                        ({filteredStudents.length}명 표시됨
                        {selectedFilteredCount > 0 && ` / ${selectedFilteredCount}명 선택됨`}
                        {searchQuery && ` / 검색: "${searchQuery}"`}
                        {selectedClassGroupFilter && 
                          ` / 학반: ${selectedClassGroupFilter}`}
                        )
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !className.trim()}
                  isLoading={isSubmitting}
                >
                  생성
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null;

  return (
    <>
      {showTrigger && (
        <Button variant="primary" type="button" onClick={handleOpen}>
          학반 생성
        </Button>
      )}

      {mounted && typeof window !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}

