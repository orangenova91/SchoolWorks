"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Trash2 } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface SchoolLogoManagerProps {
  schoolName: string | null;
  initialLogoUrl?: string | null;
}

export function SchoolLogoManager({
  schoolName,
  initialLogoUrl,
}: SchoolLogoManagerProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialLogoUrl ?? null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);
    setSelectedFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("업로드할 이미지를 선택해주세요.");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/school/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "로고 업로드에 실패했습니다.");
      }

      setLogoUrl(data?.url ?? null);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccess("대표 사진이 업데이트되었습니다.");
    } catch (uploadError: any) {
      setError(uploadError?.message || "로고 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/school/logo", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "로고 삭제에 실패했습니다.");
      }

      setLogoUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccess("대표 사진이 제거되었습니다.");
    } catch (removeError: any) {
      setError(removeError?.message || "로고 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || logoUrl;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            학교 대표 사진
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {schoolName ? `${schoolName} 로고` : "학교 로고"}
          </p>
        </div>
        {logoUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={schoolName ? `${schoolName} 로고` : "학교 로고"}
              className="w-full h-full object-cover"
            />
          ) : (
            "No Logo"
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-xs text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-400 mt-2">
            권장: 512x512 이상, PNG/JPG/WebP, 최대 5MB
          </p>
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4" />
          {isUploading ? "업로드 중..." : "업로드"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-600">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-xs text-emerald-600">{success}</p>
      )}
    </div>
  );
}
