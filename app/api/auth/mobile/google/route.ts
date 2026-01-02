import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// 리프레시 토큰을 저장할 간단한 메모리 맵 (프로덕션에서는 Redis 사용 권장)
const refreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

const googleLoginSchema = z.object({
  idToken: z.string().optional(),
  code: z.string().optional(),
  redirectUri: z.string().optional(),
}).refine((data) => data.idToken || data.code, {
  message: "ID 토큰 또는 인증 코드가 필요합니다",
});

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    
    if (!GOOGLE_CLIENT_ID) {
      return corsResponse(
        NextResponse.json(
          { error: "Google OAuth가 설정되지 않았습니다" },
          { status: 500 }
        ),
        origin || undefined
      );
    }

    const body = await request.json();
    const { idToken, code, redirectUri } = googleLoginSchema.parse(body);

    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    let payload: any;

    if (code) {
      // Authorization Code Flow: Code를 ID Token으로 교환
      // Google Client Secret을 사용하므로 code_verifier는 필요 없음
      if (!GOOGLE_CLIENT_SECRET) {
        return corsResponse(
          NextResponse.json(
            { error: "Google Client Secret이 설정되지 않았습니다" },
            { status: 500 }
          ),
          origin || undefined
        );
      }

      try {
        const { tokens } = await client.getToken({
          code,
          redirect_uri: redirectUri!,
        });

        if (!tokens.id_token) {
          return corsResponse(
            NextResponse.json(
              { error: "ID 토큰을 받지 못했습니다" },
              { status: 401 }
            ),
            origin || undefined
          );
        }

        // ID Token 검증
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_CLIENT_ID,
        });

        payload = ticket.getPayload();
      } catch (error) {
        console.error("Google token exchange error:", error);
        return corsResponse(
          NextResponse.json(
            { error: "Google 인증 코드 교환 중 오류가 발생했습니다" },
            { status: 401 }
          ),
          origin || undefined
        );
      }
    } else if (idToken) {
      // ID Token 직접 검증 (기존 방식)
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (error) {
        console.error("Google token verification error:", error);
        return corsResponse(
          NextResponse.json(
            { error: "유효하지 않은 Google 토큰입니다" },
            { status: 401 }
          ),
          origin || undefined
        );
      }
    } else {
      return corsResponse(
        NextResponse.json(
          { error: "ID 토큰 또는 인증 코드가 필요합니다" },
          { status: 400 }
        ),
        origin || undefined
      );
    }
    if (!payload || !payload.email) {
      return corsResponse(
        NextResponse.json(
          { error: "Google 계정 정보를 가져올 수 없습니다" },
          { status: 401 }
        ),
        origin || undefined
      );
    }

    const { email, name, picture, sub: googleId } = payload;

    // 기존 사용자 찾기
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 신규 사용자 생성
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          emailVerified: new Date(), // Google 로그인은 이메일 인증됨
        },
      });
    }

    // Account 연결 확인 및 생성/업데이트
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleId,
        },
      },
    });

    if (!existingAccount) {
      // Account가 없으면 새로 생성
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googleId,
        },
      });
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

    // 만료된 토큰 정리
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

    console.error("Google OAuth login error:", error);
    return corsResponse(
      NextResponse.json(
        { error: "로그인 중 오류가 발생했습니다" },
        { status: 500 }
      ),
      origin || undefined
    );
  }
}

