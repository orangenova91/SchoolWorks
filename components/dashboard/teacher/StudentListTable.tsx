"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Download, Edit2, ArrowUp, ArrowDown } from "lucide-react";
import { EditStudentModal, type StudentWithProfile } from "./EditStudentModal";
import { ENROLLMENT_STATUS_BADGE_CLASS } from "@/lib/constants/enrollmentStatus";

type StudentListTableProps = {
  students: StudentWithProfile[];
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export default function StudentListTable({ 
  students,
  initialPageSize = 20,
  pageSizeOptions = [10, 20, 50],
}: StudentListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("");
  const [selectedClassLabelFilter, setSelectedClassLabelFilter] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(initialPageSize);
  type SortKey = "studentId" | "name" | "sex" | "studentCouncilRole" | "classOfficer" | "email" | "phoneNumber" | "enrollmentStatus";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const normalizedOptions = Array.from(new Set(pageSizeOptions.concat(initialPageSize))).sort(
    (a, b) => a - b,
  );

  // 학생들의 고유한 학년 목록
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((student) => {
      const grade = student.grade?.trim();
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
  }, [students]);

  // 학생들의 고유한 학반 목록
  const uniqueClassLabels = useMemo(() => {
    const labels = new Set<string>();
    students.forEach((student) => {
      const classLabel = student.classLabel?.trim();
      if (classLabel && classLabel !== "-") {
        labels.add(classLabel);
      }
    });
    return Array.from(labels).sort();
  }, [students]);

  // 검색 및 학년/학반 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    let result = students;

    // 학년 필터 적용
    if (selectedGradeFilter) {
      result = result.filter((student) => {
        const studentGrade = student.grade?.trim() || "";
        return studentGrade === selectedGradeFilter;
      });
    }

    // 학반 필터 적용
    if (selectedClassLabelFilter) {
      result = result.filter((student) => {
        const studentClassLabel = student.classLabel?.trim() || "";
        return studentClassLabel === selectedClassLabelFilter;
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
          const studentId = student.studentId?.toLowerCase() || '';
          
          // 여러 검색어 중 하나라도 포함되면 표시 (OR 검색)
          return searchTerms.some(term => 
            studentName.includes(term) || 
            studentEmail.includes(term) ||
            studentId.includes(term)
          );
        });
      }
    }

    return result;
  }, [students, searchQuery, selectedGradeFilter, selectedClassLabelFilter]);

  // 정렬된 학생 목록 (컬럼 헤더 클릭 시 사용)
  const sortedStudents = useMemo(() => {
    if (!sortKey) return filteredStudents;
    const key = sortKey;
    return [...filteredStudents].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[key] ?? "").trim();
      const bVal = String((b as Record<string, unknown>)[key] ?? "").trim();
      // 학번은 숫자로 변환 가능하면 숫자 순
      if (key === "studentId") {
        const aNum = parseInt(aVal, 10);
        const bNum = parseInt(bVal, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          const diff = aNum - bNum;
          return sortOrder === "asc" ? diff : -diff;
        }
      }
      const cmp = aVal.localeCompare(bVal, "ko");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredStudents, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.max(1, Math.ceil(sortedStudents.length / (pageSize as number)));
  }, [sortedStudents.length, pageSize]);

  const paginatedStudents = useMemo(() => {
    if (pageSize === "all") return sortedStudents;
    const start = (currentPage - 1) * (pageSize as number);
    return sortedStudents.slice(start, start + (pageSize as number));
  }, [sortedStudents, currentPage, pageSize]);

  // 필터 변경 시 첫 페이지로 이동
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
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

  // 편집 시작
  const handleStartEdit = (student: StudentWithProfile) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  // 저장 성공 핸들러
  const handleSaveSuccess = () => {
    router.refresh();
    handleCloseModal();
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더
    const headers = ["학번", "이름", "성별", "학생회직", "학급직", "학반", "이메일", "연락처", "학적상태"];
    
    // CSV 데이터 생성 (Excel 날짜 변환 방지)
    const csvRows = [
      headers.map(h => `"${h}"`).join(","),
      ...sortedStudents.map((student) => {
        // CSV에서 특수문자 처리 및 Excel 날짜 변환 방지
        const escapeCSV = (value: string, preventDateConversion = false) => {
          if (value === "-") return '""';
          const stringValue = String(value);
          
          // Excel이 날짜로 변환할 수 있는 패턴 감지 (숫자-하이픈-숫자, 숫자/숫자 등)
          const mightBeDate = /^\d+[-/]\d+/.test(stringValue.trim());
          
          // 날짜로 변환될 수 있는 값이거나 강제 방지가 필요한 경우
          if (preventDateConversion || mightBeDate) {
            // 값 앞에 작은따옴표를 추가하고 큰따옴표로 감싸기
            // Excel은 값 앞의 작은따옴표를 인식하여 텍스트로 강제함
            return `"\t${stringValue.replace(/"/g, '""')}"`;
          }
          
          // 일반적인 경우 큰따옴표로 감싸기
          return `"${stringValue.replace(/"/g, '""')}"`;
        };

        return [
          escapeCSV(student.studentId, true), // 학번: 텍스트로 강제
          escapeCSV(student.name),
          escapeCSV(student.sex),
          escapeCSV(student.studentCouncilRole === "-" ? "" : student.studentCouncilRole),
          escapeCSV(student.classOfficer === "-" ? "" : student.classOfficer),
          escapeCSV(student.classLabel, true), // 학반: 텍스트로 강제 (날짜 변환 방지)
          escapeCSV(student.email),
          escapeCSV(student.phoneNumber, true), // 연락처: 텍스트로 강제
          escapeCSV(student.enrollmentStatus && student.enrollmentStatus !== "-" ? student.enrollmentStatus : ""),
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
    let filename = `학생명렬_${dateStr}`;
    
    if (selectedGradeFilter || selectedClassLabelFilter || searchQuery.trim()) {
      const filters = [];
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
              placeholder="학생 이름, 이메일 또는 학번으로 검색 (콤마로 구분: 김철수, 이영희)"
              className="w-full"
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
          <span className="font-medium text-gray-700">총 {students.length}명</span>
          <span className="mx-2">중</span>
          <span className="font-semibold text-orange-600">{filteredStudents.length}명</span>
          <span className="ml-1">표시됨</span>
          {pageSize !== "all" && (
            <>
              <span className="mx-2">·</span>
              <span className="text-gray-500">페이지 {currentPage}/{totalPages}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(searchQuery.trim() || selectedGradeFilter || selectedClassLabelFilter) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {searchQuery.trim() && (
                <span className="px-2 py-1 bg-white rounded border border-gray-300">
                  검색: "{searchQuery}"
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
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV 다운로드
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                순
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("studentId")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">학번</span>
                  {sortKey === "studentId" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">이름</span>
                  {sortKey === "name" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("sex")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">성별</span>
                  {sortKey === "sex" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("studentCouncilRole")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">학생회직</span>
                  {sortKey === "studentCouncilRole" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("classOfficer")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">학급직</span>
                  {sortKey === "classOfficer" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("email")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">이메일</span>
                  {sortKey === "email" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("phoneNumber")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">연락처</span>
                  {sortKey === "phoneNumber" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none overflow-hidden text-ellipsis"
                onClick={() => handleSort("enrollmentStatus")}
              >
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">학적상태</span>
                  {sortKey === "enrollmentStatus" && (sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 shrink-0" />)}
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  {searchQuery.trim() || selectedGradeFilter || selectedClassLabelFilter
                    ? "검색 결과가 없습니다."
                    : "등록된 학생이 없습니다."}
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student, index) => {
                const rowNumber = (currentPage - 1) * (pageSize === "all" ? sortedStudents.length : (pageSize as number)) + index + 1;
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {rowNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900">
                      {student.studentId}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.sex}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.studentCouncilRole && student.studentCouncilRole !== "-" ? student.studentCouncilRole : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.classOfficer && student.classOfficer !== "-" ? student.classOfficer : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.enrollmentStatus && student.enrollmentStatus !== "-" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ENROLLMENT_STATUS_BADGE_CLASS[student.enrollmentStatus] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {student.enrollmentStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(student)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="편집"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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

      <EditStudentModal
        student={selectedStudent}
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

