import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { verifyPassword } from "./utils";

const hydrateStudentIdentifiers = async (token: {
  id?: string;
  role?: string | null;
  studentId?: string | null;
  studentIds?: string[] | null;
}) => {
  if (!token.id || !token.role) return token;

  if (token.role === "student" && token.studentId === undefined) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: token.id },
      select: { studentId: true },
    });
    token.studentId = profile?.studentId ?? null;
  }

  if (token.role === "parent" && token.studentIds === undefined) {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: token.id },
      select: { studentIds: true },
    });

    if (parentProfile?.studentIds?.length) {
      const students = await prisma.studentProfile.findMany({
        where: { userId: { in: parentProfile.studentIds } },
        select: { studentId: true },
      });
      token.studentIds = students
        .map((student) => student.studentId)
        .filter((studentId): studentId is string => Boolean(studentId));
    } else {
      token.studentIds = [];
    }
  }

  return token;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해주세요");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          // 보안: 계정 존재 여부를 구분하지 않음
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
        }

        // 소셜(예: Google) 계정이 연결된 사용자는 비밀번호 로그인 불가
        const socialAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "google",
          },
        });

        if (socialAccount) {
          // 클라이언트에서 소셜 로그인 유도 메시지를 보여줄 수 있도록
          // 구분 가능한 에러 코드를 전달
          throw new Error("SOCIAL_ONLY_GOOGLE");
        }

        if (!user.hashedPassword) {
          // 보안: 계정 존재 여부를 구분하지 않음
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          // 보안: 계정 존재 여부를 구분하지 않음
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
        }

        // 이메일 인증이 활성화된 경우 확인
        if (process.env.ENABLE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
          throw new Error("이메일 인증이 필요합니다");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          school: user.school,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Always show Google account chooser even if a session exists
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google OAuth 로그인인 경우
      if (account?.provider === "google") {
        try {
          // 기존 계정이 있는지 확인
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            // 기존 사용자가 있으면 Account 연결 확인/생성
            // DB에서 직접 조회하여 unique constraint 확인
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            if (!existingAccount) {
              // Account가 없으면 새로 생성
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
            } else {
              // Account가 있으면 토큰 업데이트
              // userId가 다를 수 있으므로 현재 사용자로 업데이트
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: {
                  userId: existingUser.id,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
            }

            // Google 인증은 이메일이 이미 인증된 것으로 간주
            if (!existingUser.emailVerified) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: new Date() },
              });
            }
          } else {
            // 새 사용자 생성 전에 같은 providerAccountId가 이미 존재하는지 확인
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            if (existingAccount) {
              // 같은 Google 계정이 다른 User에 연결되어 있는 경우
              // 해당 User를 찾아서 이메일을 업데이트하거나 기존 User 사용
              const linkedUser = await prisma.user.findUnique({
                where: { id: existingAccount.userId },
              });

              if (linkedUser) {
                // 기존 User의 이메일을 현재 Google 계정 이메일로 업데이트
                await prisma.user.update({
                  where: { id: linkedUser.id },
                  data: {
                    email: user.email!,
                    name: user.name || profile?.name || linkedUser.name,
                    emailVerified: new Date(),
                  },
                });

                // Account 토큰 업데이트
                await prisma.account.update({
                  where: { id: existingAccount.id },
                  data: {
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                  },
                });

                // user 객체 업데이트
                user.id = linkedUser.id;
                user.name = linkedUser.name;
                user.school = linkedUser.school;
                user.role = linkedUser.role;
              }
            } else {
              // 새 사용자 생성
              const newUser = await prisma.user.create({
                data: {
                  email: user.email!,
                  name: user.name || profile?.name || null,
                  emailVerified: new Date(), // Google 인증은 이메일이 이미 인증된 것으로 간주
                  accounts: {
                    create: {
                      type: account.type,
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      refresh_token: account.refresh_token,
                      access_token: account.access_token,
                      expires_at: account.expires_at,
                      token_type: account.token_type,
                      scope: account.scope,
                      id_token: account.id_token,
                      session_state: account.session_state,
                    },
                  },
                },
              });

              // user 객체 업데이트
              user.id = newUser.id;
              user.name = newUser.name;
              user.school = newUser.school;
              user.role = newUser.role;
            }
          }
        } catch (error) {
          console.error("Google OAuth sign in error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 초기 로그인 시 user 정보를 token에 저장
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.school = user.school;
        token.role = user.role;
      }

      // OAuth 로그인 후 DB에서 최신 정보 가져오기
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.school = dbUser.school;
          token.role = dbUser.role;
        }
      }

      await hydrateStudentIdentifiers(token);

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.school = token.school as string | null;
        session.user.role = token.role as string | null;
        session.user.studentId = token.studentId as string | null;
        session.user.studentIds = (token.studentIds as string[] | null) ?? null;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30일
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

