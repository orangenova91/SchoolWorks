"use client";

import { useState, useEffect } from "react";
import EditClassGroupModal from "./EditClassGroupModal";

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

type ClassGroupBadgesProps = {
  classGroups: Array<{ id: string; name: string }>;
  courseId: string;
  students: Student[];
};

export default function ClassGroupBadges({
  classGroups,
  courseId,
  students,
}: ClassGroupBadgesProps) {
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBadgeClick = async (groupId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/class-groups`);
      if (response.ok) {
        const data = await response.json();
        const fullGroup = data.classGroups?.find(
          (g: ClassGroup) => g.id === groupId
        );
        if (fullGroup) {
          setEditingGroup(fullGroup);
        }
      }
    } catch (error) {
      console.error("학반 정보 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {classGroups.map((group: { id: string; name: string }) => (
          <button
            key={group.id}
            type="button"
            onClick={() => handleBadgeClick(group.id)}
            disabled={isLoading}
            className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {group.name}
          </button>
        ))}
      </div>

      {editingGroup && (
        <EditClassGroupModal
          classGroup={editingGroup}
          courseId={courseId}
          students={students}
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onUpdated={() => {
            setEditingGroup(null);
            // 페이지 새로고침을 위해 이벤트 발생
            window.dispatchEvent(
              new CustomEvent("course:classGroups:updated", {
                detail: { courseId },
              })
            );
          }}
        />
      )}
    </>
  );
}

