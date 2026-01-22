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

    // 댓글 삭제 (대댓글도 함께 삭제됨 - Cascade)
    await (prisma as any).comment.delete({
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

