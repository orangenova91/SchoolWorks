"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type PreviewRow = {
  row: number;
  title: string;
  startDate: string;
  endDate: string | null;
  scope: string;
  eventType: string | null;
};

export default function BulkUploadButton() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [errors, setErrors] = useState<Array<{ row: number; msg: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const generateTemplateCSV = () => {
    const headers = [
      "제목",
      "시작 날짜",
      "종료 날짜(선택)",
      "일정 구분",
      "일정 유형",
      "학년",
      "교시",
      "담당 부서",
      "담당자",
      "설명(선택)",
    ];
    // Use date-only example for user convenience (YYYY-MM-DD)
    const sample = [
      `"중간고사"`,
      `2026-03-10`,
      `2026-03-10`,
      `"교과"`,
      `"학사행사"`,
      `"1,2"`,
      `"2"`,
      `"교무실"`,
      `"홍길동"`,
      `"국어/수학 중간고사"`,
    ];
    return `${headers.join(",")}\n${sample.join(",")}\n`;
  };

  const downloadTemplate = () => {
    // Prefer public hosted template if available
    const publicUrl = "/templates/calendar_upload_template.csv";
    fetch(publicUrl, { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          const a = document.createElement("a");
          a.href = publicUrl;
          a.download = "calendar_upload_template.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          // fallback to generated template
          const csv = generateTemplateCSV();
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "calendar_upload_template.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        const csv = generateTemplateCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "calendar_upload_template.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      // request preview
      setLoading(true);
      try {
        const resp = await fetch("/api/events/bulk-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText: text, preview: true }),
        });
        const data = await resp.json();
        setPreview(data.preview ?? null);
        setErrors(data.errors ?? []);
      } catch (err) {
        setErrors([{ row: 0, msg: "미리보기 요청 실패" }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleUpload = async () => {
    if (!csvText) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/events/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, preview: false }),
      });
      const data = await resp.json();
      setResult(data);
      // refresh calendar view
      router.refresh();
    } catch (err) {
      setErrors([{ row: 0, msg: "업로드 실패" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-xs italic text-gray-400">
       학사 일정을 오른쪽 템플릿으로 받아 CSV로 업로드 할 수 있습니다.
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-1.5 py-0 text-[10px]"
          onClick={downloadTemplate}
        >
          템플릿 다운
        </Button>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            ref={useRef<HTMLInputElement | null>(null)}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) =>
              handleFile(e.target.files ? e.target.files[0] : null)
            }
          />
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={(e) => {
              e.preventDefault();
              const inputEl =
                document.querySelector<HTMLInputElement>(
                  'input[type="file"].sr-only'
                );
              inputEl?.click();
            }}
          >
            CSV 업로드
          </button>
        </label>
      </div>

      {loading && <span className="text-sm text-gray-500">처리 중...</span>}

      {errors.length > 0 && (
        <div className="text-sm text-red-600">
          {errors.slice(0, 5).map((e) => (
            <div key={e.row}>Row {e.row}: {e.msg}</div>
          ))}
          {errors.length > 5 && <div>...(더 있음)</div>}
        </div>
      )}

      {preview && (
        <div className="max-h-48 overflow-auto border rounded p-2 bg-white">
          <table className="text-sm w-full">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">제목</th>
                <th className="text-left">시작</th>
                <th className="text-left">종료</th>
                <th className="text-left">범위</th>
                <th className="text-left">유형</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 50).map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  <td>{r.title}</td>
                  <td>{r.startDate}</td>
                  <td>{r.endDate ?? "-"}</td>
                  <td>{r.scope}</td>
                  <td>{r.eventType ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <Button variant="primary" onClick={handleUpload} disabled={loading || errors.length > 0}>
          업로드 확인
        </Button>
      )}

      {result && (
        <div className="text-sm text-gray-600">
          Inserted: {result.inserted ?? 0}, Errors: {result.errors?.length ?? 0}
        </div>
      )}
    </div>
  );
}


