import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-key";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  school?: string | null;
  role?: string | null;
}

/**
 * 요청에서 인증 정보를 가져옵니다.
 * NextAuth 세션 또는 JWT 토큰을 지원합니다.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 먼저 JWT 토큰 확인 (Authorization 헤더)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      // JWT 토큰이 유효하지 않은 경우 NextAuth 세션 시도
    }
  }

  // NextAuth 세션 확인
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        school: session.user.school,
        role: session.user.role,
      };
    }
  } catch (error) {
    console.error("Session error:", error);
  }

  return null;
}

