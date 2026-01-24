import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      school?: string | null;
      role?: string | null;
      studentId?: string | null;
      studentIds?: string[] | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    school?: string | null;
    role?: string | null;
    studentId?: string | null;
    studentIds?: string[] | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    school?: string | null;
    role?: string | null;
    studentId?: string | null;
    studentIds?: string[] | null;
  }
}

