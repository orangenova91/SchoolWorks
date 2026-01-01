"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Download, Edit2, ArrowUp, ArrowDown } from "lucide-react";
import { EditStaffModal, type StaffWithProfile } from "./EditStaffModal";

type StaffListTableProps = {
  staff: StaffWithProfile[];
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export default function StaffListTable({ 
  staff,
  initialPageSize = 20,
  pageSizeOptions = [10, 20, 50],
}: StaffListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("");
  const [selectedClassLabelFilter, setSelectedClassLabelFilter] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<StaffWithProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(initialPageSize);

  const normalizedOptions = Array.from(new Set(pageSizeOptions.concat(initialPageSize))).sort(
    (a, b) => a - b,
  );

  // 교직원들의 고유한 직책 목록
  const uniqueRoleLabels = useMemo(() => {
    const roleLabels = new Set<string>();
    staff.forEach((member) => {
      const roleLabel = member.roleLabel?.trim();
      if (roleLabel && roleLabel !== "-") {
        roleLabels.add(roleLabel);
      }
    });
    return Array.from(roleLabels).sort();
  }, [staff]);

  // 교직원들의 고유한 학년 목록
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    staff.forEach((member) => {
      const grade = member.grade?.trim();
      if (grade && grade !== "-") {
        grades.add(grade);
      }
    });
    return Array.from(grades).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }, [staff]);

  // 교직원들의 고유한 학반 목록
  const uniqueClassLabels = useMemo(() => {
    const labels = new Set<string>();
    staff.forEach((member) => {
      const classLabel = member.classLabel?.trim();
      if (classLabel && classLabel !== "-") {
        labels.add(classLabel);
      }
    });
    return Array.from(labels).sort();
  }, [staff]);

  // 검색 및 필터링된 교직원 목록
  const filteredStaff = useMemo(() => {
    let result = staff;

    // 직책 필터 적용
    if (selectedRoleFilter) {
      result = result.filter((member) => {
        const memberRoleLabel = member.roleLabel?.trim() || "";
        return memberRoleLabel === selectedRoleFilter;
      });
    }

    // 학년 필터 적용
    if (selectedGradeFilter) {
      result = result.filter((member) => {
        const memberGrade = member.grade?.trim() || "";
        return memberGrade === selectedGradeFilter;
      });
    }

    // 학반 필터 적용
    if (selectedClassLabelFilter) {
      result = result.filter((member) => {
        const memberClassLabel = member.classLabel?.trim() || "";
        return memberClassLabel === selectedClassLabelFilter;
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
        result = result.filter((member) => {
          const memberName = member.name?.toLowerCase() || '';
          const memberEmail = member.email.toLowerCase();
          const memberRoleLabel = member.roleLabel?.toLowerCase() || '';
          const memberMajor = member.major?.toLowerCase() || '';
          
          // 여러 검색어 중 하나라도 포함되면 표시 (OR 검색)
          return searchTerms.some(term => 
            memberName.includes(term) || 
            memberEmail.includes(term) ||
            memberRoleLabel.includes(term) ||
            memberMajor.includes(term)
          );
        });
      }
    }

    // 정렬 적용
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aValue: string = "";
        let bValue: string = "";

        switch (sortColumn) {
          case "roleLabel":
            aValue = (a.roleLabel || "").trim();
            bValue = (b.roleLabel || "").trim();
            break;
          case "name":
            aValue = (a.name || "").trim();
            bValue = (b.name || "").trim();
            break;
          case "major":
            aValue = (a.major || "").trim();
            bValue = (b.major || "").trim();
            break;
          case "classLabel":
            aValue = (a.classLabel || "").trim();
            bValue = (b.classLabel || "").trim();
            break;
          case "email":
            aValue = (a.email || "").trim().toLowerCase();
            bValue = (b.email || "").trim().toLowerCase();
            break;
          case "phoneNumber":
            aValue = (a.phoneNumber || "").trim();
            bValue = (b.phoneNumber || "").trim();
            break;
          default:
            return 0;
        }

        // 빈 값 처리
        if (aValue === "-") aValue = "";
        if (bValue === "-") bValue = "";

        // 문자열 비교
        const comparison = aValue.localeCompare(bValue, "ko", { numeric: true, sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [staff, searchQuery, selectedRoleFilter, selectedGradeFilter, selectedClassLabelFilter, sortColumn, sortDirection]);

  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.max(1, Math.ceil(filteredStaff.length / (pageSize as number)));
  }, [filteredStaff.length, pageSize]);

  const paginatedStaff = useMemo(() => {
    if (pageSize === "all") return filteredStaff;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredStaff.slice(start, start + (pageSize as number));
  }, [filteredStaff, currentPage, pageSize]);

  // 필터 변경 시 첫 페이지로 이동
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setSelectedRoleFilter(value);
    setCurrentPage(1);
  };

  const handleGradeFilterChange = (value: string) => {
    setSelectedGradeFilter(value);
    setCurrentPage(1);
  };

  const handleClassLabelFilterChange = (value: string) => {
    setSelectedClassLabelFilter(value);
    setCurrentPage(1);
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(nextPage);
  };

  // 페이지 크기 변경
  const handlePageSizeChange = (size: string) => {
    const newSize = size === "all" ? "all" : Number(size);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 정렬 핸들러
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // 같은 컬럼이면 방향 토글
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 다른 컬럼이면 오름차순으로 설정
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // 편집 시작
  const handleStartEdit = (member: StaffWithProfile) => {
    setSelectedStaff(member);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  // 저장 성공 핸들러
  const handleSaveSuccess = () => {
    router.refresh();
    handleCloseModal();
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더
    const headers = ["직책", "이름", "담당 과목/분야", "담당 학반", "이메일", "전화번호"];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...filteredStaff.map((member) => {
        // CSV에서 특수문자 처리 및 Excel 날짜 변환 방지
        const escapeCSV = (value: string, preventDateConversion = false) => {
          if (value === "-") return '""';
          const stringValue = String(value);
          
          // Excel이 날짜로 변환할 수 있는 패턴 감지
          const mightBeDate = /^\d+[-/]\d+/.test(stringValue.trim());
          
          // 날짜로 변환될 수 있는 값이거나 강제 방지가 필요한 경우
          if (preventDateConversion || mightBeDate) {
            return `"\t${stringValue.replace(/"/g, '""')}"`;
          }
          
          // 일반적인 경우 큰따옴표로 감싸기
          return `"${stringValue.replace(/"/g, '""')}"`;
        };

        return [
          escapeCSV(member.roleLabel),
          escapeCSV(member.name),
          escapeCSV(member.major),
          escapeCSV(member.classLabel !== "-" ? member.classLabel : "-", true),
          escapeCSV(member.email),
          escapeCSV(member.phoneNumber, true),
        ].join(",");
      }),
    ];

    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // 파일명 생성 (필터 정보 포함)
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    let filename = `교직원명렬_${dateStr}`;
    
    if (selectedRoleFilter || selectedGradeFilter || selectedClassLabelFilter || searchQuery.trim()) {
      const filters = [];
      if (selectedRoleFilter) filters.push(selectedRoleFilter);
      if (selectedGradeFilter) filters.push(`${selectedGradeFilter}학년`);
      if (selectedClassLabelFilter) filters.push(`${selectedClassLabelFilter}학반`);
      if (searchQuery.trim()) filters.push(`검색_${searchQuery.substring(0, 10)}`);
      filename += `_${filters.join("_")}`;
    }
    
    filename += ".csv";

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="이름, 이메일, 직책 또는 담당 과목으로 검색 (콤마로 구분: 김선생, 수학)"
              className="w-full"
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { value: "", label: "전체 직책" },
                ...uniqueRoleLabels.map((roleLabel) => ({
                  value: roleLabel,
                  label: roleLabel,
                })),
              ]}
              value={selectedRoleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              disabled={uniqueRoleLabels.length === 0}
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { value: "", label: "전체 학년" },
                ...uniqueGrades.map((grade) => ({
                  value: grade,
                  label: `${grade}학년`,
                })),
              ]}
              value={selectedGradeFilter}
              onChange={(e) => handleGradeFilterChange(e.target.value)}
              disabled={uniqueGrades.length === 0}
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
              value={selectedClassLabelFilter}
              onChange={(e) => handleClassLabelFilterChange(e.target.value)}
              disabled={uniqueClassLabels.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">총 {staff.length}명</span>
          <span className="mx-2">중</span>
          <span className="font-semibold text-orange-600">{filteredStaff.length}명</span>
          <span className="ml-1">표시됨</span>
          {pageSize !== "all" && (
            <>
              <span className="mx-2">·</span>
              <span className="text-gray-500">페이지 {currentPage}/{totalPages}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(searchQuery.trim() || selectedRoleFilter || selectedGradeFilter || selectedClassLabelFilter) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {searchQuery.trim() && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  검색: "{searchQuery}"
                </span>
              )}
              {selectedRoleFilter && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  {selectedRoleFilter}
                </span>
              )}
              {selectedGradeFilter && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  {selectedGradeFilter}학년
                </span>
              )}
              {selectedClassLabelFilter && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  {selectedClassLabelFilter}학반
                </span>
              )}
            </div>
          )}
          {filteredStaff.length > 0 && (
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("roleLabel")}
              >
                <div className="flex items-center gap-1">
                  직책
                  {sortColumn === "roleLabel" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  이름
                  {sortColumn === "name" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("major")}
              >
                <div className="flex items-center gap-1">
                  담당 과목/분야
                  {sortColumn === "major" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("classLabel")}
              >
                <div className="flex items-center gap-1">
                  담당 학반
                  {sortColumn === "classLabel" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center gap-1">
                  이메일
                  {sortColumn === "email" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => handleSort("phoneNumber")}
              >
                <div className="flex items-center gap-1">
                  전화번호
                  {sortColumn === "phoneNumber" && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchQuery.trim() || selectedRoleFilter || selectedGradeFilter || selectedClassLabelFilter
                    ? "검색 결과가 없습니다."
                    : "등록된 교직원이 없습니다."}
                </td>
              </tr>
            ) : (
              paginatedStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {member.roleLabel}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {member.major}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {member.classLabel !== "-" ? member.classLabel : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.phoneNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStartEdit(member)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 UI */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end text-sm text-gray-600 mt-4">
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

      <EditStaffModal
        staff={selectedStaff}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSaveSuccess}
      />
    </section>
  );
}

// 페이지네이션 범위 계산 함수
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

