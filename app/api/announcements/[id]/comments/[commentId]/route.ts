import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const updateCommentSchema = z.object({
  content: z.string().trim().min(1, "댓글 내용을 입력하세요").max(1000, "댓글은 1000자 이하여야 합니다"),
});

// 댓글 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 댓글 조회
    const comment = await (prisma as any).comment.findUnique({
      where: { id: params.commentId },
      include: {
        announcement: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    // 공지사항 확인
    if (comment.announcementId !== params.id) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    // 학교 필터 확인
    if (session.user.school && comment.announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 작성자만 수정 가능
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 작성한 댓글만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // 삭제된 댓글(소프트 삭제)은 수정 불가
    if ((comment as any).deletedAt) {
      return NextResponse.json(
        { error: "삭제된 댓글은 수정할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // 댓글 수정
    const updatedComment = await (prisma as any).comment.update({
      where: { id: params.commentId },
      data: {
        content: validatedData.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      message: "댓글이 수정되었습니다.",
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        authorId: updatedComment.authorId,
        author: updatedComment.author.name || updatedComment.author.email,
        authorRole: updatedComment.author.role,
        createdAt: updatedComment.createdAt.toISOString(),
        updatedAt: updatedComment.updatedAt.toISOString(),
        parentId: updatedComment.parentId,
        replies: updatedComment.replies.map((reply: any) => ({
          id: reply.id,
          content: reply.content,
          authorId: reply.authorId,
          author: reply.author.name || reply.author.email,
          authorRole: reply.author.role,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
          parentId: reply.parentId,
        })),
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update comment error:", error);
    return NextResponse.json(
      { error: "댓글 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 댓글 조회
    const comment = await (prisma as any).comment.findUnique({
      where: { id: params.commentId },
      include: {
        announcement: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    // 공지사항 확인
    if (comment.announcementId !== params.id) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    // 학교 필터 확인
    if (session.user.school && comment.announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 작성자 또는 교사만 삭제 가능
    const isAuthor = comment.authorId === session.user.id;
    const isTeacher = session.user.role === "teacher";

    if (!isAuthor && !isTeacher) {
      return NextResponse.json(
        { error: "댓글 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const commentModel = (prisma as any).comment;

    // 이미 소프트 삭제된 댓글은 실제 삭제만 허용 (수정 불가 상태이므로)
    if (comment.deletedAt) {
      await commentModel.delete({
        where: { id: params.commentId },
      });
      return NextResponse.json({
        message: "댓글이 삭제되었습니다.",
      });
    }

    // 대댓글이 있는 부모 댓글: 소프트 삭제 (내용만 "삭제된 댓글입니다."로 변경, 대댓글은 유지)
    const replyCount = await commentModel.count({
      where: { parentId: params.commentId },
    });

    if (replyCount > 0) {
      const updated = await commentModel.update({
        where: { id: params.commentId },
        data: {
          content: "삭제된 댓글입니다.",
          deletedAt: new Date(),
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              studentProfile: { select: { studentId: true } },
              parentProfile: { select: { studentIds: true } },
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  studentProfile: { select: { studentId: true } },
                  parentProfile: { select: { studentIds: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" as const },
          },
        },
      });

      const getChildStudentId = async (parentProfile: any): Promise<string | null> => {
        if (!parentProfile?.studentIds?.length) return null;
        const firstChildId = parentProfile.studentIds[0];
        const child = await (prisma as any).studentProfile.findFirst({
          where: { userId: firstChildId },
          select: { studentId: true },
        });
        return child?.studentId ?? null;
      };

      const mapReply = async (reply: any) => ({
        id: reply.id,
        content: reply.content,
        authorId: reply.authorId,
        author: reply.author?.name || reply.author?.email,
        authorRole: reply.author?.role,
        studentId: reply.author?.studentProfile?.studentId ?? null,
        childStudentId: reply.author?.role === "parent" && reply.author?.parentProfile
          ? await getChildStudentId(reply.author.parentProfile)
          : null,
        createdAt: reply.createdAt.toISOString(),
        updatedAt: reply.updatedAt.toISOString(),
        parentId: reply.parentId,
        deletedAt: reply.deletedAt?.toISOString() ?? null,
        replies: [],
      });

      return NextResponse.json({
        message: "댓글이 삭제되었습니다. 대댓글은 그대로 표시됩니다.",
        comment: {
          id: updated.id,
          content: updated.content,
          authorId: updated.authorId,
          author: updated.author?.name || updated.author?.email,
          authorRole: updated.author?.role,
          studentId: updated.author?.studentProfile?.studentId ?? null,
          childStudentId: updated.author?.role === "parent" && updated.author?.parentProfile
            ? await getChildStudentId(updated.author.parentProfile)
            : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          parentId: updated.parentId,
          deletedAt: updated.deletedAt?.toISOString() ?? null,
          replies: await Promise.all((updated.replies || []).map(mapReply)),
        },
      });
    }

    // 대댓글 없음: 실제 삭제
    await commentModel.delete({
      where: { id: params.commentId },
    });

    return NextResponse.json({
      message: "댓글이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: "댓글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

