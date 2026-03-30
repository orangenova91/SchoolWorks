"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, Download } from "lucide-react";

type EvaluationPlanFile = {
  id: string;
  grade: string;
  semester?: string;
  filePath: string;
  originalFileName: string;
  uploadedByName?: string | null;
  createdAt: string;
};

const GRADE_LABELS = [
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" },
] as const;

export default function EvaluationPlanSection() {
  const [files, setFiles] = useState<EvaluationPlanFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingGrade, setUploadingGrade] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingGrade, setDownloadingGrade] = useState<string | null>(null);
  const [semester, setSemester] = useState<"1" | "2">("1");

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/evaluation-plan?semester=${encodeURIComponent(semester)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "파일 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 목록을 불러오는 데 실패했습니다.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [semester]);

  const uploadFile = async (grade: string, file: File) => {
    try {
      setUploadingGrade(grade);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", grade);
      formData.append("semester", semester);

      const res = await fetch("/api/evaluation-plan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "파일 업로드에 실패했습니다.");
      }

      await fetchFiles();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploadingGrade(null);
    }
  };

  const handleFileSelect = (grade: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(grade, file);
    (e.target as HTMLInputElement).value = "";
  };

  const handleDrop = (grade: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGrade(null);
    if (uploadingGrade) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    uploadFile(grade, file);
  };

  const handleDragOver = (grade: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadingGrade) return;
    setDragOverGrade(grade);
  };

  const [dragOverGrade, setDragOverGrade] = useState<string | null>(null);

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget;
    if (related && current.contains(related)) return;
    setDragOverGrade(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 파일을 삭제하시겠습니까?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/evaluation-plan/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "파일 삭제에 실패했습니다.");
      }
      await fetchFiles();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "파일 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const getFilesByGrade = (grade: string) =>
    files
      .filter((f) => f.grade === grade)
      .sort((a, b) =>
        (a.originalFileName || "").localeCompare(b.originalFileName || "", "ko")
      );

  const handleDownloadZip = (grade: string) => {
    if (uploadingGrade || deletingId || downloadingGrade) return;
    setDownloadingGrade(grade);

    const url = `/api/evaluation-plan/download?grade=${encodeURIComponent(
      grade
    )}&semester=${encodeURIComponent(semester)}`;

    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => setDownloadingGrade(null), 2500);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">평가계획서</h2>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">평가계획서</h2>
        <p className="text-sm text-gray-600">
          학년별로 평가계획서 파일을 업로드하고 관리할 수 있습니다.
        </p>
      </div>

      <div className="flex items-end gap-6 border-b border-gray-200">
        {(["1", "2"] as const).map((s) => {
          const active = semester === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setDownloadingGrade(null);
                setSemester(s);
              }}
              disabled={uploadingGrade !== null || deletingId !== null}
              className={[
                "pb-2 text-sm font-medium transition-colors",
                active
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-500 border-b-2 border-transparent hover:text-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              ].join(" ")}
              aria-pressed={active}
            >
              {s === "1" ? "1학기" : "2학기"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GRADE_LABELS.map(({ value, label }) => (
            <section
              key={value}
              className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  {label}
                </h3>
                <button
                  type="button"
                  onClick={() => handleDownloadZip(value)}
                  disabled={getFilesByGrade(value).length === 0 || downloadingGrade === value}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="해당 학년 파일을 ZIP으로 다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingGrade === value ? "다운로드..." : "전체 다운로드"}
                </button>
              </div>

              <div className="space-y-3">
                <div
                  onDrop={(e) => handleDrop(value, e)}
                  onDragOver={(e) => handleDragOver(value, e)}
                  onDragLeave={handleDragLeave}
                  className={`flex items-center justify-center gap-2 w-full py-6 px-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragOverGrade === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <label className="flex items-center justify-center gap-2 w-full cursor-pointer">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {uploadingGrade === value
                        ? "업로드 중..."
                        : dragOverGrade === value
                          ? "파일을 여기에 놓으세요"
                          : "클릭하거나 파일을 끌어다 놓으세요"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.ppt,.pptx,.jpg,.jpeg,.png"
                      disabled={uploadingGrade !== null}
                      onChange={(e) => handleFileSelect(value, e)}
                    />
                  </label>
                </div>

                <div className="space-y-2 min-h-[60px]">
                  {getFilesByGrade(value).length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      등록된 파일이 없습니다.
                    </p>
                  ) : (
                    getFilesByGrade(value).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/api/evaluation-plan/file/${f.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate block"
                            title={f.originalFileName}
                          >
                            {f.originalFileName}
                          </a>
                          {f.uploadedByName && (
                            <p className="text-xs text-gray-500 truncate">
                              {f.uploadedByName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a
                            href={`/api/evaluation-plan/file/${f.id}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded"
                            title="다운로드"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id)}
                            disabled={deletingId === f.id}
                            className="p-1.5 text-gray-500 hover:text-red-600 rounded disabled:opacity-50"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
