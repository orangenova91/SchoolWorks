 "use client";

import type { AfterSchoolTeacher } from "./useAfterSchoolManager";

type Props = {
  managerId: string | null;
  managerTeachers: AfterSchoolTeacher[];
  className?: string;
};

export function AfterSchoolManagerInfo({ managerId, managerTeachers, className }: Props) {
  const label =
    managerTeachers.length === 0
      ? "표시할 교사가 없습니다."
      : managerId
        ? managerTeachers.find((t) => t.id === managerId)?.name ||
          managerTeachers.find((t) => t.id === managerId)?.email ||
          "선택된 담당자"
        : "미지정";

  return (
    <div className={className ?? "text-sm text-gray-700"}>
      <span className="font-medium">담당 교사</span>
      <span className="mx-1">:</span>
      <span className="text-gray-900">{label}</span>
    </div>
  );
}

