import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "댓글 내용을 입력하세요").max(1000, "댓글은 1000자 이하여야 합니다"),
  parentId: z.string().optional(), // 대댓글인 경우 부모 댓글 ID
});

// 학부모의 자녀 학번을 가져오는 헬퍼 함수
async function getChildStudentId(parentProfile: any): Promise<string | null> {
  if (!parentProfile || !parentProfile.studentIds || parentProfile.studentIds.length === 0) {
    return null;
  }
  
  // 첫 번째 자녀의 학번을 가져옵니다
  const firstChildId = parentProfile.studentIds[0];
  try {
    const childStudent = await (prisma as any).studentProfile.findFirst({
      where: {
        userId: firstChildId,
      },
      select: {
        studentId: true,
      },
    });
    
    return childStudent?.studentId || null;
  } catch (error) {
    console.error("Error fetching child studentId:", error);
    return null;
  }
}

// 댓글 목록 조회 (무한 스크롤 지원)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // 공지사항 존재 확인
    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    // 학교 필터 확인
    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 재귀적으로 replies를 가져오는 함수
    const getRepliesRecursively = async (parentId: string): Promise<any[]> => {
      const replies = await (prisma as any).comment.findMany({
        where: {
          parentId: parentId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              studentProfile: {
                select: {
                  studentId: true,
                },
              },
              parentProfile: {
                select: {
                  studentIds: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // 각 reply의 replies도 재귀적으로 가져오기
      const repliesWithNested = await Promise.all(
        replies.map(async (reply: any) => {
          const nestedReplies = await getRepliesRecursively(reply.id);
          return {
            ...reply,
            replies: nestedReplies,
          };
        })
      );

      return repliesWithNested;
    };

    // 댓글 조회 (부모 댓글만, 대댓글은 replies로 포함)
    const comments = await (prisma as any).comment.findMany({
      where: {
        announcementId: params.id,
        parentId: null, // 부모 댓글만 조회
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            studentProfile: {
              select: {
                studentId: true,
              },
            },
            parentProfile: {
              select: {
                studentIds: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // 각 댓글의 replies를 재귀적으로 가져오기
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment: any) => {
        const replies = await getRepliesRecursively(comment.id);
        return {
          ...comment,
          replies,
        };
      })
    );

    // 전체 댓글 개수 (부모 댓글만)
    const totalCount = await (prisma as any).comment.count({
      where: {
        announcementId: params.id,
        parentId: null,
      },
    });

    // 재귀적으로 replies를 변환하는 함수
    const transformReplies = async (replies: any[]): Promise<any[]> => {
      return Promise.all(replies.map(async (reply: any) => {
        const childStudentId = reply.author?.role === "parent" && reply.author?.parentProfile
          ? await getChildStudentId(reply.author.parentProfile)
          : null;
        
        return {
          id: reply.id,
          content: reply.content,
          authorId: reply.authorId,
          author: reply.author.name || reply.author.email,
          authorRole: reply.author.role,
          studentId: reply.author?.studentProfile?.studentId || null,
          childStudentId: childStudentId,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
          parentId: reply.parentId,
          replies: reply.replies ? await transformReplies(reply.replies) : [],
        };
      }));
    };

    // 댓글 목록을 변환하는 함수
    const transformComments = async (comments: any[]): Promise<any[]> => {
      return Promise.all(comments.map(async (comment: any) => {
        const childStudentId = comment.author?.role === "parent" && comment.author?.parentProfile
          ? await getChildStudentId(comment.author.parentProfile)
          : null;
        
        return {
          id: comment.id,
          content: comment.content,
          authorId: comment.authorId,
          author: comment.author.name || comment.author.email,
          authorRole: comment.author.role,
          studentId: comment.author?.studentProfile?.studentId || null,
          childStudentId: childStudentId,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          parentId: comment.parentId,
          replies: await transformReplies(comment.replies || []),
        };
      }));
    };

    return NextResponse.json({
      comments: await transformComments(commentsWithReplies),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "댓글 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 댓글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 공지사항 존재 확인
    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
    });

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    // 학교 필터 확인
    if (session.user.school && announcement.school !== session.user.school) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // 대댓글인 경우 부모 댓글 확인
    if (validatedData.parentId) {
      const parentComment = await (prisma as any).comment.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentComment) {
        return NextResponse.json({ error: "부모 댓글을 찾을 수 없습니다." }, { status: 404 });
      }

      // 부모 댓글이 같은 공지사항에 속하는지 확인
      if (parentComment.announcementId !== params.id) {
        return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
      }
    }

    // 댓글 생성
    const comment = await (prisma as any).comment.create({
      data: {
        announcementId: params.id,
        authorId: session.user.id,
        content: validatedData.content,
        parentId: validatedData.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            studentProfile: {
              select: {
                studentId: true,
              },
            },
            parentProfile: {
              select: {
                studentIds: true,
              },
            },
          },
        },
      },
    });

    const childStudentId = comment.author?.role === "parent" && comment.author?.parentProfile
      ? await getChildStudentId(comment.author.parentProfile)
      : null;

    return NextResponse.json({
      message: "댓글이 작성되었습니다.",
      comment: {
        id: comment.id,
        content: comment.content,
        authorId: comment.authorId,
        author: comment.author.name || comment.author.email,
        authorRole: comment.author.role,
        studentId: comment.author?.studentProfile?.studentId || null,
        childStudentId: childStudentId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        parentId: comment.parentId,
        replies: [],
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "댓글 작성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

