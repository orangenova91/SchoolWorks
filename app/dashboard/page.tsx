import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("ko");

export default async function DashboardIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "teacher") {
    redirect("/dashboard/teacher");
  }
  if (role === "student") {
    redirect("/dashboard/student");
  }

  if (role === "admin") {
    redirect("/dashboard/admin");
  }

  if (role === "superadmin") {
    redirect("/dashboard/superadmin");
  }

  if (role === "parent") {
    redirect("/dashboard/parent");
  }

  return (
    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t.dashboard.missingRoleTitle}
      </h2>
      <p className="text-gray-600">{t.dashboard.missingRoleDescription}</p>
    </div>
  );
}

