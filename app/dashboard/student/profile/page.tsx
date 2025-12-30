import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/dashboard/student/ProfileForm";

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  // User와 StudentProfile 정보 가져오기
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="border-4 border-dashed border-gray-200 rounded-lg p-8 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          프로필 수정
        </h2>
        <p className="text-gray-600">
          프로필 정보를 수정할 수 있습니다.
        </p>
      </header>

      <ProfileForm
        initialData={{
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            school: user.school,
            role: user.role,
          },
          profile: user.studentProfile,
        }}
      />
    </div>
  );
}

















