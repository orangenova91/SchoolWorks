"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, Trash2, Pencil } from "lucide-react";
import AddCollaborativeDocModal from "./AddCollaborativeDocModal";

export type CollaborativeDocLinkItem = {
  id: string;
  title: string;
  url: string;
  order: number;
  createdAt: string;
};

export default function CollaborativeDocLinksSection() {
  const [links, setLinks] = useState<CollaborativeDocLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CollaborativeDocLinkItem | null>(null);

  const fetchLinks = async () => {
    try {
      const response = await fetch("/api/teacher/collaborative-doc-links");
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links ?? []);
      }
    } catch (err) {
      console.error("협업 문서 링크 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 링크를 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/teacher/collaborative-doc-links/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">협업 문서 링크 생성</h2>
        <button
          type="button"
          onClick={() => {
            setEditingLink(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          링크 추가
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 py-6 text-center">로딩 중...</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          등록된 링크가 없습니다. 링크 추가 버튼을 눌러 협업 문서를 등록해 보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate"
                >
                  {link.title}
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
                <p className="text-xs text-gray-500 truncate mt-0.5">{link.url}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingLink(link);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(link.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddCollaborativeDocModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLink(null);
        }}
        onSaved={() => {
          fetchLinks();
          setEditingLink(null);
        }}
        editLink={editingLink}
      />
    </section>
  );
}
