import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MessageCircle } from "lucide-react";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Google Workspace 도메인 확인 (여러 도메인 지원: 쉼표로 구분)
  const googleWorkspaceDomains = (process.env.GOOGLE_WORKSPACE_DOMAIN || "")
    .split(",")
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0);

  const isGoogleWorkspaceUser = Boolean(
    googleWorkspaceDomains.length > 0 &&
    session.user.email &&
    googleWorkspaceDomains.some(domain => 
      session.user.email!.endsWith(`@${domain}`)
    )
  );

  // Google Workspace 사용자는 Google Chat으로 리다이렉트
  if (isGoogleWorkspaceUser) {
    redirect("https://chat.google.com");
  }

  // 일반 사용자를 위한 채팅 페이지 (향후 다른 채팅 솔루션으로 대체 가능)
  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">메시지</h2>
        </div>
        <p className="text-gray-600">
          채팅 기능이 곧 제공될 예정입니다.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          채팅 기능 안내
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            현재 채팅 기능은 준비 중입니다. 곧 사용하실 수 있도록 준비하고 있습니다.
          </p>
          <p>
            Google Workspace 계정을 사용하시는 경우, 사이드바의 "Google Chat" 메뉴를 통해
            Google Chat을 이용하실 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

