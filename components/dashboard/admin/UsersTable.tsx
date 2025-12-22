"use client";

import { useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { ChevronDown, ChevronUp, Filter, X, Edit, UserPlus } from "lucide-react";
import { EditUserModal } from "./EditUserModal";

type SortKey = "name" | "school" | "role" | "studentId" | "createdAt" | "email" | "grade" | "className";

export type UsersTableRow = {
  id: string;
  name: string;
  school: string;
  role: string;
  studentId: string;
  grade: string;
  className: string;
  createdAt: string; // ISO string
  email: string;
};

type UsersTableProps = {
  rows: UsersTableRow[];
  initialPageSize?: number;
  pageSizeOptions?: number[];
  adminSchool?: string;
};

const columnConfig: Array<{
  key: SortKey;
  label: string;
  align?: "left" | "center";
}> = [
  { key: "school", label: "학교/조직" },
  { key: "studentId", label: "학번" },
  { key: "name", label: "이름" },
  { key: "role", label: "역할", align: "center" },
  { key: "createdAt", label: "가입일" },
  { key: "email", label: "이메일" },
];

const exportColumns: Array<{ key: keyof UsersTableRow; label: string }> = [
  { key: "name", label: "이름" },
  { key: "school", label: "학교/조직" },
  { key: "role", label: "역할" },
  { key: "grade", label: "학년" },
  { key: "className", label: "학반" },
  { key: "studentId", label: "학번" },
  { key: "createdAt", label: "가입일" },
  { key: "email", label: "이메일" },
];

type FilterState = {
  role: string;
  grade: string;
  className: string;
  name: string;
};

export const UsersTable = forwardRef<
  { openAddUserModal: () => void },
  UsersTableProps
>(({ rows, initialPageSize = 20, pageSizeOptions = [10, 20, 50], adminSchool }, ref) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(initialPageSize);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    role: "",
    grade: "",
    className: "",
    name: "",
  });
  const [editingUser, setEditingUser] = useState<UsersTableRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const normalizedOptions = Array.from(new Set(pageSizeOptions.concat(initialPageSize))).sort(
    (a, b) => a - b,
  );

  // 필터링 로직
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 역할 필터
      if (filters.role && row.role !== filters.role) {
        return false;
      }
      // 학년 필터
      if (filters.grade) {
        const rowGrade = row.grade?.toString().toLowerCase() ?? "";
        if (!rowGrade.includes(filters.grade.toLowerCase())) {
          return false;
        }
      }
      // 학반 필터
      if (filters.className && row.className !== filters.className) {
        return false;
      }
      // 이름 필터
      if (filters.name && !row.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rows, filters]);

  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.max(1, Math.ceil(filteredRows.length / (pageSize as number)));
  }, [filteredRows.length, pageSize]);
  
  // 먼저 현재 페이지의 데이터를 가져온 후 정렬
  const paginatedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => compareValues(a, b, sortConfig));
    
    // '전체' 선택 시 모든 데이터 반환
    if (pageSize === "all") {
      return sorted;
    }
    
    // 페이지네이션 적용
    const start = (currentPage - 1) * (pageSize as number);
    return sorted.slice(start, start + (pageSize as number));
  }, [filteredRows, currentPage, pageSize, sortConfig]);

  // 필터 변경 시 첫 페이지로 이동
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      role: "",
      grade: "",
      className: "",
      name: "",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(nextPage);
  };

  const handlePageSizeChange = (size: string) => {
    const newSize = size === "all" ? "all" : Number(size);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 역할 목록 추출
  const availableRoles = useMemo(() => {
    const roles = new Set(rows.map((row) => row.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [rows]);

  // 역할 한글 매핑 함수
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      student: "학생",
      teacher: "교사",
      admin: "관리자",
      parent: "학부모",
      superadmin: "슈퍼관리자",
    };
    return roleMap[role] || role;
  };

  // 역할 뱃지 색상 매핑 함수
  const getRoleBadgeStyle = (role: string) => {
    const styleMap: Record<string, string> = {
      student: "bg-green-100 text-green-700", // 학생: 초록색
      teacher: "bg-pink-100 text-pink-700", // 교사: 분홍색
      admin: "bg-purple-100 text-purple-700", // 관리자: 보라색
      parent: "bg-blue-100 text-blue-700", // 학부모: 파란색
      superadmin: "bg-red-100 text-red-700", // 슈퍼관리자: 빨간색
    };
    return styleMap[role] || "bg-slate-100 text-slate-700";
  };

  // 학반 목록 추출
  const availableClassNames = useMemo(() => {
    const classNames = new Set(
      rows
        .map((row) => row.className)
        .filter((name) => name && name !== "-")
    );
    return Array.from(classNames).sort();
  }, [rows]);

  const triggerDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (row: UsersTableRow, key: keyof UsersTableRow) => {
    if (key === "createdAt") {
      return new Date(row.createdAt).toLocaleDateString("ko-KR");
    }
    return row[key] ?? "";
  };

  const handleDownloadCsv = () => {
    const header = exportColumns.map((col) => `"${col.label}"`).join(",");
    const lines = filteredRows.map((row) =>
      exportColumns
        .map((col) => {
          const rawValue = formatValue(row, col.key);
          return `"${String(rawValue).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csvContent = [header, ...lines].join("\n");
    triggerDownload("\uFEFF" + csvContent, "text/csv;charset=utf-8;", "users.csv");
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsEditModalOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openAddUserModal: handleAddUser,
  }));

  return (
    <div className="space-y-4">
      {/* 필터 패널 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            <span>필터</span>
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                활성
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              필터 초기화
            </button>
          )}
        </div>
        {showFilters && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">역할</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">학년</label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange("grade", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">학반</label>
              <select
                value={filters.className}
                onChange={(e) => handleFilterChange("className", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">전체</option>
                {availableClassNames.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                placeholder="이름 검색"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        )}
        {/* 필터 결과 정보 및 CSV 다운로드 */}
        <div className="pt-3 border-t border-gray-200 mt-3">
          <div className="flex items-center justify-end gap-4">
            <div className="text-sm text-gray-600">
              {hasActiveFilters ? (
                <>
                  필터 결과: {filteredRows.length}명 / 전체: {rows.length}명
                </>
              ) : (
                <>
                  총 {rows.length}명 · 페이지 {currentPage}/{totalPages}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              CSV 다운로드
            </button>
          </div>
        </div>
      </div>

      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {columnConfig.map((column) => (
              <th key={column.key} className={headerClassName(column.align)}>
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className="flex items-center gap-1 text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  <span>{column.label}</span>
                  <SortIndicator active={sortConfig.key === column.key} direction={sortConfig.direction} />
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {paginatedRows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">{row.school}</td>
              <td className="px-4 py-3 text-gray-600">{row.studentId}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeStyle(
                    row.role,
                  )}`}
                >
                  {getRoleLabel(row.role)}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(row.createdAt).toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-gray-600 break-all">{row.email}</td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(row);
                    setIsEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Edit className="w-3 h-3" />
                  편집
                </button>
              </td>
            </tr>
          ))}
          {paginatedRows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-gray-500" colSpan={columnConfig.length + 1}>
                표시할 사용자가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end text-sm text-gray-600">
        <div className="inline-flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:border-blue-300 hover:text-blue-600"
          >
            이전
          </button>
          <div className="flex items-center gap-1">
            {paginationRange(currentPage, totalPages).map((page) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${Math.random()}`} className="px-2">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:border-blue-300 hover:text-blue-600"
          >
            다음
          </button>
          <label className="flex items-center gap-2 text-xs sm:text-sm">
            <span>표시 수</span>
            <select
              value={pageSize === "all" ? "all" : String(pageSize)}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {normalizedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}명
                </option>
              ))}
              <option value="all">전체</option>
            </select>
          </label>
        </div>
      </div>

      <EditUserModal
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          window.location.reload();
        }}
        adminSchool={adminSchool}
      />
    </div>
  );
});

UsersTable.displayName = "UsersTable";

function compareValues(
  a: UsersTableRow,
  b: UsersTableRow,
  sortConfig: { key: SortKey; direction: "asc" | "desc" },
) {
  const { key, direction } = sortConfig;
  const multiplier = direction === "asc" ? 1 : -1;

  if (key === "createdAt") {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return (aTime - bTime) * multiplier;
  }

  const valueA = (a[key] ?? "").toString().toLowerCase();
  const valueB = (b[key] ?? "").toString().toLowerCase();

  if (valueA < valueB) return -1 * multiplier;
  if (valueA > valueB) return 1 * multiplier;
  return 0;
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  if (!active) {
    return (
      <span className="text-gray-300" aria-hidden="true">
        <ChevronUp className="w-3 h-3 opacity-60 -mb-1" />
      </span>
    );
  }

  return direction === "asc" ? (
    <ChevronUp className="w-3 h-3 text-blue-600" aria-label="오름차순" />
  ) : (
    <ChevronDown className="w-3 h-3 text-blue-600" aria-label="내림차순" />
  );
}

function headerClassName(align: "left" | "center" = "left") {
  const base = "px-4 py-3";
  return align === "center" ? `${base} text-center` : base;
}

function paginationRange(current: number, total: number) {
  const delta = 1;
  const range: Array<number | "ellipsis"> = [];
  const rangeWithDots: Array<number | "ellipsis"> = [];
  let l: number | undefined;

  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l !== undefined) {
      if ((i as number) - l === 2) {
        rangeWithDots.push((l as number) + 1);
      } else if ((i as number) - l > 2) {
        rangeWithDots.push("ellipsis");
      }
    }
    rangeWithDots.push(i);
    l = i as number;
  }

  return rangeWithDots;
}

