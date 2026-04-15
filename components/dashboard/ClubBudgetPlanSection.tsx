"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Trash2, Download } from "lucide-react";

type ClubBudgetPlanFile = {
  id: string;
  filePath: string;
  originalFileName: string;
  uploadedByName?: string | null;
  createdAt: string;
};

export default function ClubBudgetPlanSection() {
  const [files, setFiles] = useState<ClubBudgetPlanFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/club-budget-plan");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "파일 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "파일 목록을 불러오는 데 실패했습니다."
      );
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/club-budget-plan", {
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
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
    (e.target as HTMLInputElement).value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget;
    if (related && current.contains(related)) return;
    setIsDragOver(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 파일을 삭제하시겠습니까?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/club-budget-plan/${id}`, {
        method: "DELETE",
      });
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

  const handleDownloadZip = () => {
    if (uploading || deletingId || downloadingZip || files.length === 0) return;
    setDownloadingZip(true);

    const link = document.createElement("a");
    link.href = "/api/club-budget-plan/download";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => setDownloadingZip(false), 2500);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          동아리 예산 사용 계획서
        </h2>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              동아리 예산 사용 계획서
            </h2>
            <p className="text-sm text-gray-600">
              파일을 업로드하고 누적 관리할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={files.length === 0 || downloadingZip}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="전체 파일 ZIP 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingZip ? "다운로드..." : "전체 다운로드"}
          </button>
        </div>
      </div>

      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex items-center justify-center gap-2 w-full py-8 px-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <label className="flex items-center justify-center gap-2 w-full cursor-pointer">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {uploading
                  ? "업로드 중..."
                  : isDragOver
                  ? "파일을 여기에 놓으세요"
                  : "클릭하거나 파일을 끌어다 놓으세요"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.ppt,.pptx,.jpg,.jpeg,.png"
                disabled={uploading}
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : (
            <div className="space-y-2 min-h-[60px]">
              {files.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  등록된 파일이 없습니다.
                </p>
              ) : (
                files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/api/club-budget-plan/file/${f.id}`}
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
                        href={`/api/club-budget-plan/file/${f.id}`}
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
          )}
        </div>
      </section>
    </div>
  );
}
