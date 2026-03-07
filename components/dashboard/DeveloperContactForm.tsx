"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Send, Github, ExternalLink } from "lucide-react";

export function DeveloperContactForm() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/developer-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          content: content.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }

      setMessage({ type: "success", text: data.message ?? "제안이 전송되었습니다." });
      setSubject("");
      setContent("");
    } catch {
      setMessage({
        type: "error",
        text: "전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>연락 방법</CardTitle>
        <CardDescription>
          아래에 내용을 작성한 뒤 제안 보내기를 눌러주세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="developer-contact-subject" className="block text-sm font-medium text-gray-700 mb-1">
              제목 (선택)
            </label>
            <input
              id="developer-contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="예: 기능 제안, 버그 신고"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="developer-contact-content" className="block text-sm font-medium text-gray-700 mb-1">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="developer-contact-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
              maxLength={5000}
              placeholder="제안, 문의, 버그 신고 내용을 입력해주세요."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y min-h-[120px]"
            />
            <p className="mt-1 text-xs text-gray-500">{content.length} / 5000</p>
          </div>

          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !content.trim()}
            isLoading={loading}
            className="w-full sm:w-auto"
          >
            <Send className="w-4 h-4 mr-2" />
            제안 보내기
          </Button>
        </form>

        

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            연락주신 내용은 24시간 이내에 검토하여 답변드리겠습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
