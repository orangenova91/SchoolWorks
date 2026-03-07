"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToastContext } from "@/components/providers/ToastProvider";
import { MessageSquare, Send, Edit2, Trash2, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: string;
  authorRole: string | null;
  studentId: string | null; // 학생의 학번
  childStudentId: string | null; // 학부모의 자녀 학번
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  deletedAt: string | null; // 소프트 삭제 시각 (부모 댓글만, 대댓글은 유지)
  replies: Comment[];
}

interface CommentSectionProps {
  announcementId: string;
}

export function CommentSection({ announcementId }: CommentSectionProps) {
  const { data: session } = useSession();
  const { showToast } = useToastContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setIsLoading(page === 1);
      const response = await fetch(
        `/api/announcements/${announcementId}/comments?page=${page}&limit=20`
      );

      if (!response.ok) {
        throw new Error("댓글을 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      
      if (append) {
        setComments((prev) => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }

      setHasMore(data.pagination.hasMore);
      setTotalCount(data.pagination.total);
      setCurrentPage(page);
    } catch (error: any) {
      console.error("Failed to fetch comments:", error);
      showToast(error.message || "댓글을 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [announcementId, showToast]);

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  // 무한 스크롤
  useEffect(() => {
    if (!hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchComments(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current && loadMoreRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isLoading, currentPage, fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Optimistic UI 업데이트
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        content: newComment,
        authorId: session?.user?.id || "",
        author: session?.user?.name || session?.user?.email || "",
        authorRole: session?.user?.role || null,
        studentId: null,
        childStudentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentId: null,
        deletedAt: null,
        replies: [],
      };

      setComments((prev) => [tempComment, ...prev]);
      setTotalCount((prev) => prev + 1);
      setNewComment("");

      const response = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "댓글 작성에 실패했습니다.");
      }

      const data = await response.json();
      
      // 실제 댓글로 교체
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? data.comment : c))
      );

      showToast("댓글이 작성되었습니다.", "success");
    } catch (error: any) {
      // Optimistic UI 롤백
      setComments((prev) => prev.filter((c) => !c.id.startsWith("temp-")));
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast(error.message || "댓글 작성 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 재귀적으로 댓글 트리에서 특정 ID를 가진 댓글을 찾아 replies를 업데이트하는 함수
  const updateRepliesRecursively = (
    comments: Comment[],
    targetId: string,
    newReply: Comment
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === targetId) {
        return { ...comment, replies: [...comment.replies, newReply] };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateRepliesRecursively(comment.replies, targetId, newReply),
        };
      }
      return comment;
    });
  };

  // 재귀적으로 댓글 트리에서 특정 ID를 가진 댓글을 찾아 replies를 업데이트하는 함수 (교체용)
  const replaceReplyRecursively = (
    comments: Comment[],
    targetId: string,
    newReply: Comment
  ): Comment[] => {
    return comments.map((comment) => {
      if (comment.id === targetId) {
        return {
          ...comment,
          replies: comment.replies.map((r) =>
            r.id === newReply.id ? newReply : r
          ),
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: replaceReplyRecursively(comment.replies, targetId, newReply),
        };
      }
      return comment;
    });
  };

  // 재귀적으로 댓글 트리에서 temp-reply를 제거하는 함수
  const removeTempReplyRecursively = (comments: Comment[]): Comment[] => {
    return comments.map((comment) => {
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: comment.replies
            .filter((r) => !r.id.startsWith("temp-reply-"))
            .map((r) => ({
              ...r,
              replies: r.replies ? removeTempReplyRecursively(r.replies) : [],
            })),
        };
      }
      return comment;
    });
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Optimistic UI 업데이트
      const tempReply: Comment = {
        id: `temp-reply-${Date.now()}`,
        content: replyContent,
        authorId: session?.user?.id || "",
        author: session?.user?.name || session?.user?.email || "",
        authorRole: session?.user?.role || null,
        studentId: null,
        childStudentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentId,
        deletedAt: null,
        replies: [],
      };

      setComments((prev) => updateRepliesRecursively(prev, parentId, tempReply));
      setReplyContent("");
      setReplyingTo(null);

      const response = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyContent,
          parentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "답글 작성에 실패했습니다.");
      }

      const data = await response.json();

      // 실제 답글로 교체 (재귀적으로)
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map((r) =>
                r.id === tempReply.id ? { ...data.comment, deletedAt: (data.comment as any).deletedAt ?? null, replies: [] } : r
              ),
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies:               replaceReplyRecursively(comment.replies, parentId, {
                ...data.comment,
                deletedAt: (data.comment as any).deletedAt ?? null,
                replies: [],
              }),
            };
          }
          return comment;
        })
      );

      // 댓글 목록 다시 불러오기 (최신 상태 보장)
      await fetchComments(currentPage, false);

      showToast("답글이 작성되었습니다.", "success");
    } catch (error: any) {
      // Optimistic UI 롤백
      setComments((prev) => removeTempReplyRecursively(prev));
      showToast(error.message || "답글 작성 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, isReply: boolean = false) => {
    if (!editContent.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Optimistic UI 업데이트
      const updateComment = (comments: Comment[]): Comment[] => {
        if (isReply) {
          return comments.map((comment) => ({
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId
                ? { ...reply, content: editContent, updatedAt: new Date().toISOString() }
                : reply
            ),
          }));
        } else {
          return comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, content: editContent, updatedAt: new Date().toISOString() }
              : comment
          );
        }
      };

      setComments(updateComment);

      const response = await fetch(
        `/api/announcements/${announcementId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: editContent,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "댓글 수정에 실패했습니다.");
      }

      const data = await response.json();

      // 실제 수정된 댓글로 교체
      if (isReply) {
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId
                ? {
                    ...reply,
                    content: data.comment.content,
                    updatedAt: data.comment.updatedAt,
                  }
                : reply
            ),
          }))
        );
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  content: data.comment.content,
                  updatedAt: data.comment.updatedAt,
                }
              : comment
          )
        );
      }

      setEditingId(null);
      setEditContent("");
      showToast("댓글이 수정되었습니다.", "success");
    } catch (error: any) {
      // Optimistic UI 롤백 - 원래 댓글 다시 불러오기
      fetchComments(currentPage, false);
      showToast(error.message || "댓글 수정 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReplyFromTree = (comments: Comment[], replyId: string): Comment[] => {
    return comments.map((comment) => ({
      ...comment,
      replies: comment.replies
        .filter((r) => r.id !== replyId)
        .map((r) => ({ ...r, replies: removeReplyFromTree(r.replies, replyId) })),
    }));
  };

  const handleDeleteComment = async (commentId: string, isReply: boolean = false) => {
    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

    try {
      // Optimistic UI: 대댓글이면 트리에서 제거, 부모면 목록에서 제거(소프트 삭제 시 서버가 업데이트된 댓글 반환)
      if (isReply) {
        setComments((prev) => removeReplyFromTree(prev, commentId));
      } else {
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }

      const response = await fetch(
        `/api/announcements/${announcementId}/comments/${commentId}`,
        { method: "DELETE" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "댓글 삭제에 실패했습니다.");
      }

      // 소프트 삭제된 경우(하위 대댓글이 있음): 서버가 업데이트된 댓글 반환 → 목록에 반영
      if (data.comment) {
        const c = data.comment as Comment;
        if (c.parentId) {
          // 대댓글 소프트 삭제: 트리 구조이므로 목록 다시 불러오기
          await fetchComments(currentPage, false);
        } else {
          // 부모 댓글 소프트 삭제: 최상위 목록만 갱신
          setComments((prev) => {
            const merged = prev.some((x) => x.id === c.id)
              ? prev.map((comment) => (comment.id === c.id ? { ...c, replies: c.replies } : comment))
              : [c, ...prev];
            return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      }

      showToast(data.message || "댓글이 삭제되었습니다.", "success");
    } catch (error: any) {
      fetchComments(currentPage, false);
      showToast(error.message || "댓글 삭제 중 오류가 발생했습니다.", "error");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">댓글</h3>
        <span className="text-sm text-gray-500">({totalCount})</span>
      </div>

      {/* 댓글 작성 폼 */}
      <div className="mb-6">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 댓글 목록 */}
      {isLoading && comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">댓글을 불러오는 중...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">댓글이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              session={session}
              replyingTo={replyingTo}
              replyContent={replyContent}
              editingId={editingId}
              editContent={editContent}
              onReplyClick={(replyId) => setReplyingTo(replyId)}
              onReplyCancel={() => {
                setReplyingTo(null);
                setReplyContent("");
              }}
              onReplyChange={setReplyContent}
              onReplySubmit={() => handleSubmitReply(comment.id)}
              onEditClick={() => {
                setEditingId(comment.id);
                setEditContent(comment.content);
              }}
              onEditCancel={() => {
                setEditingId(null);
                setEditContent("");
              }}
              onEditChange={setEditContent}
              onEditSubmit={() => handleEditComment(comment.id, false)}
              onDeleteClick={() => handleDeleteComment(comment.id, false)}
              onReplyEditSubmit={(replyId: string) => handleEditComment(replyId, true)}
              onReplyDeleteClick={(replyId: string) => handleDeleteComment(replyId, true)}
              onReplySubmitToReply={(replyId: string) => handleSubmitReply(replyId)}
              formatDate={formatDate}
              announcementId={announcementId}
              isSubmitting={isSubmitting}
            />
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="text-center py-4 text-sm text-gray-500">
              더 불러오는 중...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  session: any;
  replyingTo: string | null;
  replyContent: string;
  editingId: string | null;
  editContent: string;
  onReplyClick: (replyId: string) => void; // replyId를 받도록 변경
  onReplyCancel: () => void;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  onEditClick: () => void;
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onDeleteClick: () => void;
  onReplyEditSubmit: (replyId: string) => void;
  onReplyDeleteClick: (replyId: string) => void;
  onReplySubmitToReply: (replyId: string) => void;
  formatDate: (date: string) => string;
  announcementId: string;
  isSubmitting: boolean;
}

function CommentItem({
  comment,
  session,
  replyingTo,
  replyContent,
  editingId,
  editContent,
  onReplyClick,
  onReplyCancel,
  onReplyChange,
  onReplySubmit,
  onEditClick,
  onEditCancel,
  onEditChange,
  onEditSubmit,
  onDeleteClick,
  onReplyEditSubmit,
  onReplyDeleteClick,
  onReplySubmitToReply,
  formatDate,
  announcementId,
  isSubmitting,
}: CommentItemProps) {
  const isAuthor = comment.authorId === session?.user?.id;
  const isTeacher = session?.user?.role === "teacher";
  const isEditing = editingId === comment.id;
  const isDeleted = Boolean(comment.deletedAt);

  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {!isDeleted && (
            <div className="flex items-center gap-2 mb-1">
              {comment.authorRole === "teacher" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  교사
                </span>
              )}
              {comment.authorRole === "student" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                  학생
                </span>
              )}
              {comment.authorRole === "parent" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                  학부모
                </span>
              )}
              <span className="font-medium text-sm text-gray-900">
                {comment.authorRole === "student" && comment.studentId
                  ? `${comment.studentId} ${comment.author}`
                  : comment.authorRole === "parent" && comment.childStudentId
                  ? `${comment.childStudentId} ${comment.author}`
                  : comment.author}
              </span>
              <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
              {comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-gray-400">(수정됨)</span>
              )}
            </div>
          )}

          {!isDeleted && isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => onEditChange(e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onEditSubmit}
                  disabled={!editContent.trim() || isSubmitting}
                  className="text-xs px-3 py-1"
                >
                  저장
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditCancel}
                  disabled={isSubmitting}
                  className="text-xs px-3 py-1"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn("text-sm whitespace-pre-wrap", isDeleted ? "text-gray-400 italic" : "text-gray-700")}>
              {isDeleted ? "삭제된 댓글입니다." : comment.content}
            </p>
          )}

          {!isEditing && !isDeleted && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onReplyClick(comment.id)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Reply className="h-3 w-3" />
                답글
              </button>
              {isAuthor && (
                <>
                  <button
                    onClick={onEditClick}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    수정
                  </button>
                  <button
                    onClick={onDeleteClick}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    삭제
                  </button>
                </>
              )}
              {!isAuthor && isTeacher && (
                <button
                  onClick={onDeleteClick}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  삭제
                </button>
              )}
            </div>
          )}

          {/* 답글 작성 폼 */}
          {replyingTo === comment.id && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200">
              <div className="space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  className="w-full min-h-[60px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onReplySubmit}
                    disabled={!replyContent.trim() || isSubmitting}
                    className="text-xs px-3 py-1"
                  >
                    작성
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onReplyCancel}
                    disabled={isSubmitting}
                    className="text-xs px-3 py-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 답글 목록 */}
          {comment.replies.length > 0 && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  session={session}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  editingId={editingId}
                  editContent={editContent}
                  onReplyClick={(replyId) => {
                    onReplyClick(replyId);
                    onReplyChange("");
                  }}
                  onReplyCancel={onReplyCancel}
                  onReplyChange={onReplyChange}
                  onReplySubmit={() => onReplySubmitToReply(reply.id)}
                  onEditClick={() => {
                    onEditClick();
                    onEditChange(reply.content);
                  }}
                  onEditCancel={onEditCancel}
                  onEditChange={onEditChange}
                  onEditSubmit={() => onReplyEditSubmit(reply.id)}
                  onDeleteClick={() => onReplyDeleteClick(reply.id)}
                  onReplyEditSubmit={onReplyEditSubmit}
                  onReplyDeleteClick={onReplyDeleteClick}
                  onReplySubmitToReply={onReplySubmitToReply}
                  formatDate={formatDate}
                  announcementId={announcementId}
                  isSubmitting={isSubmitting}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: Comment;
  session: any;
  replyingTo: string | null;
  replyContent: string;
  editingId: string | null;
  editContent: string;
  onReplyClick: (replyId: string) => void; // replyId를 받도록 변경
  onReplyCancel: () => void;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  onEditClick: () => void;
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onDeleteClick: () => void;
  onReplyEditSubmit: (replyId: string) => void;
  onReplyDeleteClick: (replyId: string) => void;
  onReplySubmitToReply: (replyId: string) => void;
  formatDate: (date: string) => string;
  announcementId: string;
  isSubmitting: boolean;
  depth?: number; // 중첩 깊이 (0부터 시작)
}

function ReplyItem({
  reply,
  session,
  replyingTo,
  replyContent,
  editingId,
  editContent,
  onReplyClick,
  onReplyCancel,
  onReplyChange,
  onReplySubmit,
  onEditClick,
  onEditCancel,
  onEditChange,
  onEditSubmit,
  onDeleteClick,
  onReplyEditSubmit,
  onReplyDeleteClick,
  onReplySubmitToReply,
  formatDate,
  announcementId,
  isSubmitting,
  depth = 0,
}: ReplyItemProps) {
  const isAuthor = reply.authorId === session?.user?.id;
  const isTeacher = session?.user?.role === "teacher";
  const isEditing = editingId === reply.id;
  const isReplying = replyingTo === reply.id;
  const isDeleted = Boolean(reply.deletedAt);

  // depth에 따라 들여쓰기 클래스 결정
  const getIndentClass = (d: number) => {
    switch (d) {
      case 0:
        return "ml-4 pl-4 border-l-2 border-gray-200";
      case 1:
        return "ml-8 pl-4 border-l-2 border-gray-200";
      case 2:
        return "ml-12 pl-4 border-l-2 border-gray-200";
      case 3:
        return "ml-16 pl-4 border-l-2 border-gray-200";
      default:
        return "ml-20 pl-4 border-l-2 border-gray-200";
    }
  };
  const indentClass = getIndentClass(depth);


  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {!isDeleted && (
            <div className="flex items-center gap-2 mb-1">
              {reply.authorRole === "teacher" && (
                <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-800">
                  교사
                </span>
              )}
              {reply.authorRole === "student" && (
                <span className="text-xs px-1 py-0.5 rounded bg-green-100 text-green-800">
                  학생
                </span>
              )}
              {reply.authorRole === "parent" && (
                <span className="text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-800">
                  학부모
                </span>
              )}
              <span className="font-medium text-xs text-gray-900">
                {reply.authorRole === "student" && reply.studentId
                  ? `${reply.studentId} ${reply.author}`
                  : reply.authorRole === "parent" && reply.childStudentId
                  ? `${reply.childStudentId} ${reply.author}`
                  : reply.author}
              </span>
              <span className="text-xs text-gray-500">{formatDate(reply.createdAt)}</span>
              {reply.updatedAt !== reply.createdAt && (
                <span className="text-xs text-gray-400">(수정됨)</span>
              )}
            </div>
          )}

          {!isDeleted && isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => onEditChange(e.target.value)}
                className="w-full min-h-[50px] rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onEditSubmit}
                  disabled={!editContent.trim() || isSubmitting}
                  className="text-xs px-2 py-1"
                >
                  저장
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditCancel}
                  disabled={isSubmitting}
                  className="text-xs px-2 py-1"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn("text-xs whitespace-pre-wrap", isDeleted ? "text-gray-400 italic" : "text-gray-700")}>
              {isDeleted ? "삭제된 댓글입니다." : reply.content}
            </p>
          )}

          {!isEditing && !isDeleted && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onReplyClick(reply.id)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Reply className="h-3 w-3" />
                답글
              </button>
              {isAuthor && (
                <>
                  <button
                    onClick={onEditClick}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    수정
                  </button>
                  <button
                    onClick={onDeleteClick}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    삭제
                  </button>
                </>
              )}
              {!isAuthor && isTeacher && (
                <button
                  onClick={onDeleteClick}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  삭제
                </button>
              )}
            </div>
          )}

          {/* 답글 작성 폼 */}
          {isReplying && (
            <div className={`mt-2 ${indentClass}`}>
              <div className="space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  className="w-full min-h-[50px] rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (onReplySubmitToReply) {
                        onReplySubmitToReply(reply.id);
                      } else {
                        onReplySubmit();
                      }
                    }}
                    disabled={!replyContent.trim() || isSubmitting}
                    className="text-xs px-2 py-1"
                  >
                    작성
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onReplyCancel}
                    disabled={isSubmitting}
                    className="text-xs px-2 py-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 재귀적으로 답글 목록 렌더링 */}
          {reply.replies && reply.replies.length > 0 && (
            <div className={`mt-2 ${indentClass} space-y-2`}>
              {reply.replies.map((nestedReply) => (
                <ReplyItem
                  key={nestedReply.id}
                  reply={nestedReply}
                  session={session}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  editingId={editingId}
                  editContent={editContent}
                  onReplyClick={(replyId) => {
                    onReplyClick(replyId);
                    onReplyChange("");
                  }}
                  onReplyCancel={onReplyCancel}
                  onReplyChange={onReplyChange}
                  onReplySubmit={() => onReplySubmitToReply(nestedReply.id)}
                  onEditClick={() => {
                    onEditClick();
                    onEditChange(nestedReply.content);
                  }}
                  onEditCancel={onEditCancel}
                  onEditChange={onEditChange}
                  onEditSubmit={() => onReplyEditSubmit(nestedReply.id)}
                  onDeleteClick={() => onReplyDeleteClick(nestedReply.id)}
                  onReplyEditSubmit={onReplyEditSubmit}
                  onReplyDeleteClick={onReplyDeleteClick}
                  onReplySubmitToReply={onReplySubmitToReply}
                  formatDate={formatDate}
                  announcementId={announcementId}
                  isSubmitting={isSubmitting}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

