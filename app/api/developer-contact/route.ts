import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";
import { z } from "zod";

const bodySchema = z.object({
  subject: z.string().max(200).optional(),
  content: z.string().min(1, "내용을 입력해주세요.").max(5000),
});

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  ip: string,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { subject, content } = parsed.data;
    const toEmail =
      process.env.DEVELOPER_CONTACT_EMAIL ?? "orangenova91@gmail.com";

    const session = await getServerSession(authOptions);
    const senderInfo = session?.user
      ? `보낸 사람: ${session.user.name ?? "(이름 없음)"} (${session.user.email})\n`
      : "";

    const mailOptions = {
      from: process.env.SMTP_USER ?? toEmail,
      to: toEmail,
      subject: subject
        ? `[개발자 연락] ${subject}`
        : "[개발자 연락] 제안/문의",
      text: senderInfo + "\n" + content,
      replyTo: session?.user?.email ?? undefined,
    };

    const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn(
        "SMTP not configured (SMTP_USER/SMTP_PASS). Developer contact email not sent."
      );
      // 개발 중에는 전송 없이 성공 반환 가능하도록, 또는 503 반환
      return NextResponse.json(
        {
          error:
            "이메일 전송 설정이 되어 있지 않습니다. 관리자에게 문의해주세요.",
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "제안이 전송되었습니다. 검토 후 답변드리겠습니다." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Developer contact send error:", error);
    return NextResponse.json(
      { error: "전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
