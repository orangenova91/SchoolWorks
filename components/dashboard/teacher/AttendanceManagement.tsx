"use client";

import { useState } from "react";
import AttendanceRegistrationForm from "./AttendanceRegistrationForm";
import AttendanceRecordList from "./AttendanceRecordList";

type AttendanceManagementProps = {
  hasHomeroom: boolean;
  students?: any[];
  classLabel?: string;
};

export default function AttendanceManagement({
  hasHomeroom,
  students = [],
  classLabel = "",
}: AttendanceManagementProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!hasHomeroom) {
    return (
      <div className="text-sm text-gray-600">
        <p>담임반 정보가 없습니다. 담임반을 먼저 설정해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      <div className="flex-1 shrink-0 overflow-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">학생 출결 등록</h3>
        <AttendanceRegistrationForm
          students={students}
          onSuccess={() => setRefreshTrigger((n) => n + 1)}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 shrink-0 text-base font-semibold text-gray-900">출결 목록</h3>
        <div className="min-h-0 flex-1">
          <AttendanceRecordList
            classLabel={classLabel}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}
