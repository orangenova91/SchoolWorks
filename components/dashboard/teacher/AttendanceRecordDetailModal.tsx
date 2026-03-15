"use client";

import { useEffect } from "react";
import { X, Printer } from "lucide-react";

export type AttendanceRecordForModal = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentNumber: string | null;
  type: string;
  reason: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  period: string | null;
  startDate: string;
  endDate: string;
  writtenAt: string;
  studentSignUrl: string | null;
  guardianSignUrl: string | null;
  teacherSignUrl: string | null;
  attachments: string | null; // JSON: [{url, name}]
  teacherName?: string | null;
  school?: string | null;
  createdAt: string;
};

type AttendanceRecordDetailModalProps = {
  record: AttendanceRecordForModal | null;
  isOpen: boolean;
  onClose: () => void;
};

// 기존 DB 데이터("질병" 등) 및 새 데이터("결석 (질병)" 등) 모두 올바르게 표시
const TYPE_LABELS: Record<string, string> = {
  질병: "결석 (질병)",
  인정: "결석 (인정)",
  기타: "결석 (기타)",
  "결석 (질병)": "결석 (질병)",
  "결석 (인정)": "결석 (인정)",
  "결석 (기타)": "결석 (기타)",
  조퇴: "조퇴",
  지각: "지각",
  결과: "결과",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

function getAbsenceDays(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.round((end - start) / 86400000) + 1;
}

export default function AttendanceRecordDetailModal({
  record,
  isOpen,
  onClose,
}: AttendanceRecordDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("attendance-print-active");
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("attendance-print-active");
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAbsenceType = [
    "결석 (질병)",
    "결석 (인정)",
    "결석 (기타)",
    "질병",
    "인정",
    "기타",
  ].includes(record?.type ?? "");

  const isAttendanceRecognitionType = ["조퇴", "지각", "결과"].includes(
    record?.type ?? ""
  );

  const getPeriodText = () => {
    if (!record) return "";
    if (record.type === "조퇴" && record.periodFrom)
      return `${formatDate(record.startDate)} ${record.periodFrom}교시`;
    if (record.type === "지각" && record.periodTo)
      return `${formatDate(record.startDate)} ${record.periodTo}교시`;
    if (record.type === "결과" && record.period)
      return `${formatDate(record.startDate)} ${record.period}`;
    return formatDate(record.startDate);
  };

  const absenceDays =
    record && record.startDate && record.endDate
      ? getAbsenceDays(record.startDate, record.endDate)
      : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="attendance-record-print"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:relative print:inset-auto print:block print:min-h-0 print:bg-white"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto m-4 print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:m-0 ${
          record && (isAbsenceType || isAttendanceRecognitionType)
            ? "max-w-2xl"
            : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold text-gray-900">출결 상세</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none"
              title="인쇄"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {record ? (
          isAbsenceType ? (
            <article className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 shadow-sm text-center font-serif leading-normal text-sm">
            {/* 타이틀 - 크기 줄임 및 상단 여백 제거 */}
            <h1 className="text-3xl font-bold mb-6 tracking-[0.5rem]">결석신고서</h1>
          
            <div className="space-y-4">
              {/* 결석 구분 */}
              <div className="flex justify-left gap-2 pl-10">
                <span>결석 구분 :</span>
                <span className="text-red-500">{TYPE_LABELS[record.type] ?? record.type}</span>
              </div>
          
              {/* 학번 성명 - 간격 축소 */}
              <div className="flex justify-end gap-6 pr-6 text-xs">
                <p>학번: <span className="text-red-500">{record.studentNumber ?? "-"}</span></p>
                <p>성명: <span className="text-red-500">{record.studentName ?? "-"}</span></p>
              </div>
          
              {/* 본문 내용 - 줄 간격(leading) 조정 */}
              <div className="text-base leading-7">
                <p>위 학생은 ( <span className="text-red-500">{record.reason ?? "-"}</span> )으로 인하여</p>
                <p>
                  <span className="text-red-500">{formatDate(record.startDate)}</span> ~{" "}
                  <span className="text-red-500">{formatDate(record.endDate)}</span> ({" "}
                  <span className="text-red-500">{absenceDays}</span> )일간 결석하였기에
                </p>
                <p>보호자 연서로 결석신고서를 제출합니다.</p>
              </div>
          
              {/* 작성 일자 - 여백 축소 */}
              <div className="py-2 text-red-500 font-medium">
                {formatDate(record.writtenAt)}
              </div>
          
              {/* 학생/보호자/교사 서명란 - 가로 배치 */}
              <div className="flex justify-center gap-10 py-2 border-y border-gray-50">
                <div className="flex items-center gap-2">
                  <span>학 생:</span>
                  <span className="text-red-500">{record.studentName ?? "-"}</span>
                  <div className="relative flex items-center justify-center w-12 h-12">
                    <span className="z-0">(인)</span>
                    {record.studentSignUrl && (
                      <a
                        href={record.studentSignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <img
                          src={record.studentSignUrl}
                          alt="학생 서명"
                          className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                        />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="pr-[5ch]">보호자:</span>
                  <div className="relative flex items-center justify-center w-12 h-12">
                    <span className="z-0">(인)</span>
                    {record.guardianSignUrl ? (
                      <a
                        href={record.guardianSignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <img
                          src={record.guardianSignUrl}
                          alt="보호자 서명"
                          className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                        />
                      </a>
                    ) : (
                      <span className="absolute text-xs text-red-500 opacity-50 z-10">서명</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          
            {/* 중간 구분선 간격 대폭 축소 */}
            <hr className="my-6 border-gray-300" />
          
            {/* 담임 확인서 섹션 */}
            <h2 className="text-3xl font-bold mb-6 tracking-[0.5rem]">담임 확인서</h2>
          
            <div className="space-y-4 leading-relaxed">
              <p>
                위 학생의 결석 사유가 <span className="text-red-500 underline underline-offset-4">{TYPE_LABELS[record.type] ?? record.type}</span> 임을
                유선 연락 등의 방법으로 확인하였습니다.
              </p>
          
              {/* 날짜와 담임 성함 - 콤팩트하게 배치 (담임 서명은 상단 서명란에 표시) */}
              <div className="py-2">
                <div className="text-red-500 mb-1">{formatDate(record.writtenAt)}</div>
                <div className="flex justify-center items-center gap-2">
                  <span>담임:</span>
                  <span className="text-red-500">{record.teacherName ?? "-"}</span>
                  
                  {/* (인)과 서명이 겹쳐질 컨테이너 */}
                  <div className="relative flex items-center justify-center w-12 h-12">
                    <span className="z-0">(인)</span> 
                    
                    {record.teacherSignUrl && (
                      <a
                        href={record.teacherSignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <img
                          src={record.teacherSignUrl}
                          alt="교사 서명"
                          /* 서명이 약간 투명하게 겹치면 더 도장 같습니다 (opacity-80) */
                          className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                        />
                      </a>
                    )}
                    
                    {!record.teacherSignUrl && (
                      <span className="absolute text-xs text-red-500 opacity-50">서명</span>
                    )}
                  </div>
                </div>
              </div>
          
              {/* 첨부 및 하단 - 여백 최소화 */}
              <div className="text-xs text-gray-500">
                첨부: ( 진단서, 진료확인서, 처방전, 기타 <span className="inline-block border-b border-black w-12"></span> )
              </div>
          
              <div className="pt-6 text-xl font-bold">
                <span className="text-red-500">{record.school ?? "학교이름"}</span> 장 귀하
              </div>
            </div>
          </article>
          ) : isAttendanceRecognitionType ? (
            <article className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 shadow-sm text-center font-serif leading-normal text-sm">
              <h1 className="text-3xl font-bold mb-6 tracking-[0.5rem]">
                출석인정신고서
              </h1>

              <div className="space-y-4">
                <div className="flex justify-end gap-6 pr-6 text-xs">
                  <p>
                    학번:{" "}
                    <span className="text-red-500">
                      {record.studentNumber ?? "-"}
                    </span>
                  </p>
                  <p>
                    성명:{" "}
                    <span className="text-red-500">
                      {record.studentName ?? "-"}
                    </span>
                  </p>
                </div>

                <div className="text-base leading-7 text-left pl-10">
                  <p>
                    위 학생은 ({" "}
                    <span className="text-red-500">{record.reason ?? "-"}</span>{" "}
                    )으로 인하여
                  </p>
                  <p>
                    <span className="text-red-500">{getPeriodText()}</span>,{" "}
                    <span className="text-red-500">
                      {TYPE_LABELS[record.type] ?? record.type}
                    </span>
                    하였기에 보호자 연서로 신고서를 제출합니다.
                  </p>
                </div>

                <div className="py-2 text-red-500 font-medium">
                  {formatDate(record.writtenAt)}
                </div>

                <div className="flex justify-center gap-10 py-2 border-y border-gray-50">
                  <div className="flex items-center gap-2">
                    <span>학 생:</span>
                    <span className="text-red-500">
                      {record.studentName ?? "-"}
                    </span>
                    <div className="relative flex items-center justify-center w-12 h-12">
                      <span className="z-0">(인)</span>
                      {record.studentSignUrl && (
                        <a
                          href={record.studentSignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-10 flex items-center justify-center"
                        >
                          <img
                            src={record.studentSignUrl}
                            alt="학생 서명"
                            className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pr-[5ch]">보호자:</span>
                    <div className="relative flex items-center justify-center w-12 h-12">
                      <span className="z-0">(인)</span>
                      {record.guardianSignUrl ? (
                        <a
                          href={record.guardianSignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-10 flex items-center justify-center"
                        >
                          <img
                            src={record.guardianSignUrl}
                            alt="보호자 서명"
                            className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                          />
                        </a>
                      ) : (
                        <span className="absolute text-xs text-red-500 opacity-50 z-10">서명</span>
                      )}
                    </div>
                  </div>
                 
                </div>
              </div>

              <hr className="my-6 border-gray-300" />

              <h2 className="text-3xl font-bold mb-6 tracking-[0.5rem]">
                담임 확인서
              </h2>

              <div className="space-y-4 leading-relaxed text-left pl-10">
                <p>
                  위 학생의{" "}
                  <span className="text-red-500">{getPeriodText()}</span>,{" "}
                  <span className="text-red-500">
                    {TYPE_LABELS[record.type] ?? record.type}
                  </span>
                  가 ({" "}
                  <span className="text-red-500">{record.reason ?? "-"}</span>{" "}
                  )으로 인한 출석인정({" "}
                  <span className="text-red-500">
                    {TYPE_LABELS[record.type] ?? record.type}
                  </span>
                  )임을 유선 연락의 방법으로 확인하였습니다.
                </p>

                <div className="py-2 flex flex-col items-center">
                  <div className="text-red-500 mb-1">
                    {formatDate(record.writtenAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>담임:</span>
                    <span className="text-red-500">
                      {record.teacherName ?? "-"}
                    </span>
                    <div className="relative flex items-center justify-center w-12 h-12">
                      <span className="z-0">(인)</span>
                      {record.teacherSignUrl ? (
                        <a
                          href={record.teacherSignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-10 flex items-center justify-center"
                        >
                          <img
                            src={record.teacherSignUrl}
                            alt="교사 서명"
                            className="max-h-14 w-auto object-contain mix-blend-multiply opacity-90"
                          />
                        </a>
                      ) : (
                        <span className="absolute text-xs text-red-500 opacity-50 z-10">서명</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  첨부: 해당란에 ○표 해주세요 ( 진단서, 진료확인서, 처방전, 기타{" "}
                  {record.attachments
                    ? (() => {
                        try {
                          const list = JSON.parse(
                            record.attachments
                          ) as { name: string }[];
                          return Array.isArray(list)
                            ? list.map((a) => a.name).join(", ")
                            : "";
                        } catch {
                          return "";
                        }
                      })()
                    : ""}
                  )
                </div>

                <div className="pt-6 text-xl font-bold text-center">
                  <span className="text-red-500">
                    {record.school ?? "학교이름"}
                  </span>{" "}
                  장 귀하
                </div>
              </div>
            </article>
          ) : (
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">학생 정보</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-gray-500">이름</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {record.studentName ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">학번</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {record.studentNumber ?? "-"}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">출결 정보</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-gray-500">출결 종류</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {TYPE_LABELS[record.type] ?? record.type}
                  </dd>
                </div>
                {record.reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500">출결 사유</dt>
                    <dd className="text-sm font-medium text-gray-900">{record.reason}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">작성 일자</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatDate(record.writtenAt)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500">기간</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {record.type === "조퇴" && record.periodFrom
                      ? `${formatDate(record.startDate)} (${record.periodFrom}교시~)`
                      : record.type === "지각" && record.periodTo
                        ? `${formatDate(record.startDate)} (~${record.periodTo}교시)`
                        : record.type === "결과" && record.period
                          ? `${formatDate(record.startDate)} (${record.period})`
                          : `${formatDate(record.startDate)} ~ ${formatDate(record.endDate)}`}
                  </dd>
                </div>
              </dl>
            </section>

            {record.attachments && (() => {
              try {
                const list = JSON.parse(record.attachments) as { url: string; name: string }[];
                if (!Array.isArray(list) || list.length === 0) return null;
                return (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">첨부 파일</h3>
                    <ul className="space-y-2">
                      {list.map((att, idx) => (
                        <li key={idx}>
                          <a
                            href={att.url.startsWith("http")
                              ? `/api/download?url=${encodeURIComponent(att.url)}&filename=${encodeURIComponent(att.name)}`
                              : att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <span className="truncate">{att.name}</span>
                            <span className="text-xs text-gray-400">(새 창에서 열기)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              } catch {
                return null;
              }
            })()}

            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">서명</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">학생 서명</p>
                  {record.studentSignUrl ? (
                    <a
                      href={record.studentSignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-200 rounded-lg p-2 hover:border-blue-300"
                    >
                      <img
                        src={record.studentSignUrl}
                        alt="학생 서명"
                        className="max-h-24 w-auto mx-auto object-contain"
                      />
                    </a>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                      없음
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">보호자 서명</p>
                  {record.guardianSignUrl ? (
                    <a
                      href={record.guardianSignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-200 rounded-lg p-2 hover:border-blue-300"
                    >
                      <img
                        src={record.guardianSignUrl}
                        alt="보호자 서명"
                        className="max-h-24 w-auto mx-auto object-contain"
                      />
                    </a>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                      없음
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">교사 서명</p>
                  {record.teacherSignUrl ? (
                    <a
                      href={record.teacherSignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-200 rounded-lg p-2 hover:border-blue-300"
                    >
                      <img
                        src={record.teacherSignUrl}
                        alt="교사 서명"
                        className="max-h-24 w-auto mx-auto object-contain"
                      />
                    </a>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                      없음
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          )
        ) : (
          <div className="p-6 text-center text-gray-500">데이터를 불러올 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}
