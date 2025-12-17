"use client";

import { useEffect, useState } from "react";
import EditClassGroupModal from "./EditClassGroupModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type ClassGroup = {
  id: string;
  name: string;
  period: string | null;
  schedules: Array<{ day: string; period: string }>;
  courseId: string;
  studentIds: string[];
  createdAt: string;
};

type Student = {
  id: string;
  name: string | null;
  email: string;
  studentProfile?: {
    studentId: string | null;
    classLabel: string | null;
  } | null;
};

type ClassGroupListProps = {
  courseId: string;
  students: Student[];
  selectedDate?: Date;
};

export default function ClassGroupList({
  courseId,
  students,
  selectedDate,
}: ClassGroupListProps) {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateTick, setUpdateTick] = useState(0);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  // 출결 상태 관리: { groupId-studentId: 'present' | 'late' | 'sick_leave' | 'approved_absence' | 'excused' }
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  // 저장된 학반 추적: { groupId-dateKey: true }
  const [savedGroups, setSavedGroups] = useState<Record<string, boolean>>({});

  // API에서 학반 데이터 로드
  useEffect(() => {
    const loadClassGroups = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/courses/${courseId}/class-groups`
        );

        if (!response.ok) {
          throw new Error("학반 목록을 불러오는데 실패했습니다.");
        }

        const data = await response.json();
        setClassGroups(data.classGroups || []);
      } catch (err) {
        console.error("학반 목록 로드 실패:", err);
        setError("학반 목록을 불러오는데 실패했습니다.");
        setClassGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassGroups();
  }, [courseId, updateTick]);

  // 선택된 날짜의 출결 데이터 로드
  useEffect(() => {
    if (!selectedDate || classGroups.length === 0) {
      setAttendanceState({});
      setSavedGroups({});
      return;
    }

    const loadAttendances = async () => {
      try {
        const dateKey = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        const newSavedGroups: Record<string, boolean> = {};
        
        const attendancePromises = classGroups.map(async (group) => {
          try {
            const response = await fetch(
              `/api/courses/${courseId}/class-groups/${group.id}/attendance?date=${selectedDate.toISOString()}`
            );

            if (!response.ok) {
              return null;
            }

            const data = await response.json();
            const attendances = data.attendances || [];
            
            // 출결 데이터가 있으면 저장된 것으로 표시
            if (attendances.length > 0) {
              const savedKey = `${group.id}-${dateKey}`;
              newSavedGroups[savedKey] = true;
            }
            
            return { groupId: group.id, attendances };
          } catch (err) {
            console.error(`학반 ${group.id} 출결 로드 실패:`, err);
            return null;
          }
        });

        const results = await Promise.all(attendancePromises);
        const newAttendanceState: Record<string, string> = {};

        results.forEach((result) => {
          if (result) {
            result.attendances.forEach((attendance: { studentId: string; status: string }) => {
              const key = `${result.groupId}-${attendance.studentId}`;
              newAttendanceState[key] = attendance.status;
            });
          }
        });

        setAttendanceState(newAttendanceState);
        setSavedGroups(newSavedGroups);
      } catch (err) {
        console.error("출결 데이터 로드 실패:", err);
      }
    };

    loadAttendances();
  }, [selectedDate, classGroups, courseId]);

  // 학반 생성 이벤트 리스닝
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as
          | { courseId?: string }
          | undefined;
        if (detail?.courseId && detail.courseId !== courseId) return;
        setUpdateTick((prev) => prev + 1);
      } catch {}
    };

    window.addEventListener(
      "course:classGroups:updated",
      handleUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "course:classGroups:updated",
        handleUpdate as EventListener
      );
    };
  }, [courseId]);

  // 학생 ID를 학생 정보로 변환
  const getStudentById = (studentId: string): Student | undefined => {
    return students.find((s) => s.id === studentId);
  };

  // 선택된 날짜의 요일을 한글 약자로 변환 (일: 0, 월: 1, ..., 토: 6)
  const getDayOfWeek = (date: Date): string => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  // 학반이 선택된 날짜의 요일에 수업이 있는지 확인
  const hasClassOnSelectedDay = (group: ClassGroup): boolean => {
    if (!selectedDate) return true; // 날짜가 선택되지 않으면 모든 학반 표시
    
    const selectedDay = getDayOfWeek(selectedDate);
    if (!Array.isArray(group.schedules) || group.schedules.length === 0) {
      return false; // 스케줄이 없으면 표시하지 않음
    }
    
    return group.schedules.some((schedule) => schedule.day === selectedDay);
  };

  // 출결 저장 함수
  const handleSaveAttendance = async (group: ClassGroup, groupStudents: Student[]) => {
    if (!selectedDate) {
      alert("날짜를 선택해주세요.");
      return;
    }

    setSavingGroupId(group.id);

    try {
      // 해당 학반의 모든 학생 출결 데이터 수집
      const attendances = groupStudents.map((student) => {
        const key = `${group.id}-${student.id}`;
        const status = attendanceState[key] || "present"; // 기본값: 출석
        return {
          studentId: student.id,
          status: status as "present" | "late" | "sick_leave" | "approved_absence" | "excused",
        };
      });

      const response = await fetch(
        `/api/courses/${courseId}/class-groups/${group.id}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate.toISOString(),
            attendances,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "출결 저장에 실패했습니다.");
      }

      const result = await response.json();
      
      // 저장 성공 시 저장 상태 업데이트
      const dateKey = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const savedKey = `${group.id}-${dateKey}`;
      setSavedGroups((prev) => ({
        ...prev,
        [savedKey]: true,
      }));
      
      alert(`출결이 성공적으로 저장되었습니다. (${result.count}명)`);
    } catch (error) {
      console.error("출결 저장 오류:", error);
      alert(error instanceof Error ? error.message : "출결 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingGroupId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">학반 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (classGroups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          생성된 학반이 없습니다. 상단의 학반 생성 버튼을 클릭하여 학반을
          만들어보세요.
        </p>
      </div>
    );
  }

  // 선택된 날짜의 요일에 수업이 있는 학반만 필터링
  const filteredClassGroups = classGroups.filter(hasClassOnSelectedDay);

  return (
    <div className="w-full overflow-hidden">
    <div className="flex flex-col md:flex-row md:flex-nowrap gap-4 overflow-x-auto pb-4 md:pb-2">
      {filteredClassGroups.map((group) => {
        const studentIds = Array.isArray(group.studentIds)
          ? group.studentIds
          : [];
        const groupStudents = studentIds
          .map((id) => getStudentById(id))
          .filter((s): s is Student => s !== undefined);

        return (
          <div
            key={group.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm w-full md:w-[350px] md:flex-shrink-0"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.name}
                  {group.period && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (차시: {group.period})
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingGroup(group)}
                  className="text-xs"
                >
                  학반 정보 수정
                </Button>

              </div>
            </div>

            {Array.isArray(group.schedules) && group.schedules.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {group.schedules.map((schedule, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100"
                    >
                      {schedule.day} {schedule.period}교시
                    </span>
                  ))}
                </div>
              </div>
            )}

            {groupStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">
                    수강생 ({groupStudents.length}명)
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedDate && (() => {
                      const dateKey = selectedDate.toISOString().split('T')[0];
                      const savedKey = `${group.id}-${dateKey}`;
                      const isSaved = savedGroups[savedKey];
                      
                      return (
                        <div 
                          className="h-4 w-4 rounded-full border-2 flex items-center justify-center pointer-events-none"
                          style={{
                            borderColor: isSaved ? '#16a34a' : '#9ca3af',
                            backgroundColor: isSaved ? '#16a34a' : 'transparent'
                          }}
                        >
                          {isSaved && (
                            <div 
                              className="h-1.5 w-1.5 rounded-full bg-white"
                            />
                          )}
                        </div>
                      );
                    })()}
                    {!selectedDate && (
                      <input
                        type="radio"
                        name="selected-group"
                        value={group.id}
                        className="h-4 w-4 cursor-pointer"
                        style={{ 
                          accentColor: '#2563eb',
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveAttendance(group, groupStudents)}
                      disabled={savingGroupId === group.id || !selectedDate}
                      className="text-xs"
                    >
                      {savingGroupId === group.id ? "저장 중..." : "출결 저장"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {groupStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-900">
                        {student.name ?? student.email}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${group.id}-${student.id}`}
                            value="present"
                            checked={
                              attendanceState[`${group.id}-${student.id}`] ===
                                "present" ||
                              !attendanceState[`${group.id}-${student.id}`]
                            }
                            onChange={(e) => {
                              const key = `${group.id}-${student.id}`;
                              if (e.target.checked) {
                                setAttendanceState((prev) => ({
                                  ...prev,
                                  [key]: "present",
                                }));
                              }
                            }}
                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                          />
                          <span>출석</span>
                        </label>
                        <div className="w-24">
                          <Select
                            options={[
                              { value: "", label: "선택" },
                              { value: "late", label: "지각" },
                              { value: "sick_leave", label: "병결" },
                              { value: "approved_absence", label: "인정결" },
                              { value: "excused", label: "공결" },
                            ]}
                            value={
                              attendanceState[`${group.id}-${student.id}`] ===
                              "present"
                                ? ""
                                : attendanceState[`${group.id}-${student.id}`] ||
                                  ""
                            }
                            onChange={(e) => {
                              const key = `${group.id}-${student.id}`;
                              const value = e.target.value;
                              if (value) {
                                setAttendanceState((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }));
                              } else {
                                // 드롭다운을 "선택"으로 되돌리면 출석으로 설정
                                setAttendanceState((prev) => ({
                                  ...prev,
                                  [key]: "present",
                                }));
                              }
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {editingGroup && (
        <EditClassGroupModal
          classGroup={editingGroup}
          courseId={courseId}
          students={students}
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onUpdated={() => {
            setEditingGroup(null);
            setUpdateTick((prev) => prev + 1);
          }}
        />
      )}
    </div>
    </div>
  );
}

