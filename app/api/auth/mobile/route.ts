import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/utils";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export const dynamic = 'force-dynamic';

// CORS OPTIONS 핸들러
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return corsOptionsResponse(origin || undefined);
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + "-refresh";
const ACCESS_TOKEN_EXPIRY = "15m"; // 15분
const REFRESH_TOKEN_EXPIRY = "7d"; // 7일

// 리프레시 토큰을 저장할 간단한 메모리 맵 (프로덕션에서는 Redis 사용 권장)
const refreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

// 로그인 및 토큰 발급
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    const origin = request.headers.get('origin');
    
    if (!user || !user.hashedPassword) {
      return corsResponse(
        NextResponse.json(
          { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.hashedPassword);
    if (!isPasswordValid) {
      return corsResponse(
        NextResponse.json(
          { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    // 이메일 인증 확인
    if (process.env.ENABLE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
      return corsResponse(
        NextResponse.json(
          { error: "이메일 인증이 필요합니다" },
          { status: 403 }
        ),
        origin || undefined
      );
    }

    // JWT 토큰 생성
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        school: user.school,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // 리프레시 토큰 저장 (7일 후 만료)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt });

    // 만료된 토큰 정리 (간단한 정리 로직)
    if (refreshTokenStore.size > 1000) {
      const now = Date.now();
      for (const [token, data] of refreshTokenStore.entries()) {
        if (data.expiresAt < now) {
          refreshTokenStore.delete(token);
        }
      }
    }

    return corsResponse(
      NextResponse.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          school: user.school,
          role: user.role,
        },
      }),
      origin || undefined
    );
  } catch (error: any) {
    const origin = request.headers.get('origin');
    
    if (error?.name === "ZodError") {
      return corsResponse(
        NextResponse.json(
          { error: "입력값이 올바르지 않습니다.", details: error.errors },
          { status: 400 }
        ),
        origin || undefined
      );
    }

    console.error("Mobile login error:", error);
    return corsResponse(
      NextResponse.json(
        { error: "로그인 중 오류가 발생했습니다" },
        { status: 500 }
      ),
      origin || undefined
    );
  }
}

// 리프레시 토큰으로 액세스 토큰 갱신
export async function PUT(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return corsResponse(
        NextResponse.json(
          { error: "리프레시 토큰이 필요합니다" },
          { status: 400 }
        ),
        origin || undefined
      );
    }

    // 리프레시 토큰 검증
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; type?: string };

    if (decoded.type !== "refresh") {
      return corsResponse(
        NextResponse.json(
          { error: "유효하지 않은 토큰입니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    // 저장된 리프레시 토큰 확인
    const storedToken = refreshTokenStore.get(refreshToken);
    if (!storedToken || storedToken.userId !== decoded.id) {
      return corsResponse(
        NextResponse.json(
          { error: "유효하지 않은 리프레시 토큰입니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    // 만료 확인
    if (storedToken.expiresAt < Date.now()) {
      refreshTokenStore.delete(refreshToken);
      return corsResponse(
        NextResponse.json(
          { error: "리프레시 토큰이 만료되었습니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return corsResponse(
        NextResponse.json(
          { error: "사용자를 찾을 수 없습니다" },
          { status: 404 }
        ),
        origin || undefined
      );
    }

    // 새로운 액세스 토큰 생성
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        school: user.school,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return corsResponse(
      NextResponse.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          school: user.school,
          role: user.role,
        },
      }),
      origin || undefined
    );
  } catch (error: any) {
    const origin = request.headers.get('origin');
    
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return corsResponse(
        NextResponse.json(
          { error: "유효하지 않은 리프레시 토큰입니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    console.error("Token refresh error:", error);
    return corsResponse(
      NextResponse.json(
        { error: "토큰 갱신 중 오류가 발생했습니다" },
        { status: 500 }
      ),
      origin || undefined
    );
  }
}

// 토큰 검증
export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return corsResponse(
        NextResponse.json(
          { error: "인증 토큰이 필요합니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name?: string | null;
        school?: string | null;
        role?: string | null;
      };

      // 사용자 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return corsResponse(
          NextResponse.json(
            { error: "사용자를 찾을 수 없습니다" },
            { status: 404 }
          ),
          origin || undefined
        );
      }

      return corsResponse(
        NextResponse.json({
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            school: user.school,
            role: user.role,
          },
        }),
        origin || undefined
      );
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return corsResponse(
          NextResponse.json(
            { valid: false, error: "토큰이 만료되었습니다" },
            { status: 401 }
          ),
          origin || undefined
        );
      }
      throw error;
    }
  } catch (error) {
    const origin = request.headers.get('origin');
    console.error("Token verification error:", error);
    return corsResponse(
      NextResponse.json(
        { valid: false, error: "토큰 검증 중 오류가 발생했습니다" },
        { status: 500 }
      ),
      origin || undefined
    );
  }
}

// 로그아웃 (리프레시 토큰 무효화)
export async function DELETE(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const body = await request.json();
    const { refreshToken } = body;

    if (refreshToken) {
      refreshTokenStore.delete(refreshToken);
    }

    return corsResponse(
      NextResponse.json({ message: "로그아웃되었습니다" }),
      origin || undefined
    );
  } catch (error) {
    const origin = request.headers.get('origin');
    console.error("Logout error:", error);
    return corsResponse(
      NextResponse.json(
        { error: "로그아웃 중 오류가 발생했습니다" },
        { status: 500 }
      ),
      origin || undefined
    );
  }
}

