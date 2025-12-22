"use client";

import { useRef } from "react";
import { UsersTable } from "./UsersTable";
import { CsvUploader } from "./CsvUploader";
import type { UsersTableRow } from "./UsersTable";

type UsersTableWrapperProps = {
  rows: UsersTableRow[];
  initialPageSize?: number;
  pageSizeOptions?: number[];
  adminSchool?: string;
};

export function UsersTableWrapper({
  rows,
  initialPageSize = 20,
  pageSizeOptions = [10, 20, 50],
  adminSchool,
}: UsersTableWrapperProps) {
  const usersTableRef = useRef<{ openAddUserModal: () => void }>(null);

  const handleAddUser = () => {
    usersTableRef.current?.openAddUserModal();
  };

  return (
    <>
      <CsvUploader onAddUser={handleAddUser} />
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">전체 사용자</p>
            <p className="text-xs text-gray-500 mt-1">
              프로필과 역할 정보를 포함한 최신 사용자 현황입니다.
            </p>
          </div>
          <span className="text-xs text-gray-500">{rows.length}명</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <UsersTable
            ref={usersTableRef}
            rows={rows}
            initialPageSize={initialPageSize}
            pageSizeOptions={pageSizeOptions}
            adminSchool={adminSchool}
          />
        </div>
      </div>
    </>
  );
}

