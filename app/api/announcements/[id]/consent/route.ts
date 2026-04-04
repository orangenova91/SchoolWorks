import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertSameSchoolForAnnouncement,
  rejectUnauthenticated,
  requireSession,
} from "@/lib/api-auth";
import { put } from "@vercel/blob";

const signatureSchema = z.object({
  signatureImage: z.string().min(1),
});

type ConsentMeta = {
  requiresSignature?: boolean;
};

const parseConsentMeta = (raw: unknown): ConsentMeta | null => {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as ConsentMeta);
  } catch (error) {
    console.error("Failed to parse consent meta:", error);
    return null;
  }
};

const parseSignatureDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    return {
      contentType: match[1],
      base64: match[2],
    };
  }
  return {
    contentType: "image/png",
    base64: dataUrl,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, category: true, consentData: true, school: true },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    const getConsentSchoolErr = assertSameSchoolForAnnouncement(session, announcement.school);
    if (getConsentSchoolErr) return getConsentSchoolErr;

    const consentMeta = parseConsentMeta(announcement.consentData);
    const requiresSignature =
      announcement.category === "consent" ||
      (announcement.category === "survey" && consentMeta?.requiresSignature);

    const existingConsent = await (prisma as any).announcementConsent.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      requiresSignature,
      consent: existingConsent
        ? {
            signatureImage: existingConsent.signatureImage,
            signatureUrl: existingConsent.signatureUrl || null,
            signedAt: existingConsent.signedAt?.toISOString?.() || null,
            submittedAt: existingConsent.submittedAt?.toISOString?.() || null,
            returnedAt: existingConsent.returnedAt?.toISOString?.() || null,
            returnReason: existingConsent.returnReason || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Get consent signature error:", error);
    return NextResponse.json(
      { error: "서명 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    if (!["parent", "student"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "서명 권한이 없습니다." }, { status: 403 });
    }

    const announcement = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { id: true, category: true, consentData: true, school: true },
    });

    if (!announcement) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }

    const postConsentSchoolErr = assertSameSchoolForAnnouncement(session, announcement.school);
    if (postConsentSchoolErr) return postConsentSchoolErr;

    const consentMeta = parseConsentMeta(announcement.consentData);
    const requiresSignature =
      announcement.category === "consent" ||
      (announcement.category === "survey" && consentMeta?.requiresSignature);

    if (!requiresSignature) {
      return NextResponse.json(
        { error: "서명이 필요한 안내문이 아닙니다." },
        { status: 400 }
      );
    }

    const existingConsent = await (prisma as any).announcementConsent.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (existingConsent?.submittedAt) {
      return NextResponse.json(
        { error: "이미 제출된 동의서입니다." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validated = signatureSchema.parse(body);
    const { contentType, base64 } = parseSignatureDataUrl(validated.signatureImage);
    const buffer = Buffer.from(base64, "base64");
    const extension = contentType.split("/")[1] || "png";
    const filename = `consents/${params.id}/${session.user.id}-${Date.now()}.${extension}`;

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });
    const signedAt = new Date();
    const submittedAt = new Date();

    const consent = await (prisma as any).announcementConsent.upsert({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
      update: {
        signatureImage: null,
        signatureUrl: blob.url,
        signedAt,
        submittedAt,
        returnedAt: null,
        returnReason: null,
      },
      create: {
        announcementId: params.id,
        userId: session.user.id,
        signatureImage: null,
        signatureUrl: blob.url,
        signedAt,
        submittedAt,
        returnedAt: null,
        returnReason: null,
      },
    });

    return NextResponse.json({
      message: "동의서가 제출되었습니다.",
      consent: {
        signatureImage: consent.signatureImage,
        signatureUrl: consent.signatureUrl || null,
        signedAt: consent.signedAt?.toISOString?.() || null,
        submittedAt: consent.submittedAt?.toISOString?.() || null,
        returnedAt: consent.returnedAt?.toISOString?.() || null,
        returnReason: consent.returnReason || null,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Submit consent signature error:", error);
    return NextResponse.json(
      { error: "동의서 제출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!requireSession(session)) {
      return rejectUnauthenticated();
    }

    if (!["parent", "student"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    }

    const announcementForPatch = await (prisma as any).announcement.findUnique({
      where: { id: params.id },
      select: { school: true },
    });
    if (!announcementForPatch) {
      return NextResponse.json({ error: "안내문을 찾을 수 없습니다." }, { status: 404 });
    }
    const patchConsentSchoolErr = assertSameSchoolForAnnouncement(
      session,
      announcementForPatch.school
    );
    if (patchConsentSchoolErr) return patchConsentSchoolErr;

    const existingConsent = await (prisma as any).announcementConsent.findUnique({
      where: {
        announcementId_userId: {
          announcementId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (!existingConsent) {
      return NextResponse.json(
        { error: "제출된 동의서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!existingConsent.returnedAt) {
      return NextResponse.json(
        { error: "반환된 동의서만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    if (!existingConsent.submittedAt) {
      return NextResponse.json(
        { error: "제출된 동의서만 수정할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = signatureSchema.parse(body);
    const { contentType, base64 } = parseSignatureDataUrl(validated.signatureImage);
    const buffer = Buffer.from(base64, "base64");
    const extension = contentType.split("/")[1] || "png";
    const filename = `consents/${params.id}/${session.user.id}-${Date.now()}.${extension}`;

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });
    const signedAt = new Date();

    const consent = await (prisma as any).announcementConsent.update({
      where: { id: existingConsent.id },
      data: {
        signatureImage: null,
        signatureUrl: blob.url,
        signedAt,
        returnedAt: null,
        returnReason: null,
      },
    });

    return NextResponse.json({
      message: "동의서 수정이 저장되었습니다.",
      consent: {
        signatureImage: consent.signatureImage,
        signatureUrl: consent.signatureUrl || null,
        signedAt: consent.signedAt?.toISOString?.() || null,
        submittedAt: consent.submittedAt?.toISOString?.() || null,
        returnedAt: consent.returnedAt?.toISOString?.() || null,
        returnReason: consent.returnReason || null,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Update consent signature error:", error);
    return NextResponse.json(
      { error: "동의서 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
