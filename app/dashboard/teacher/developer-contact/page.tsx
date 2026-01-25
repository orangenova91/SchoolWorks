import { Card, CardContent, CardDescription, CardHeader, CardTitle } from  '@/components/ui/Card';
import { Button } from "@/components/ui/Button";
import { Mail, MessageSquare, Github, ExternalLink } from "lucide-react";

export default function DeveloperContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">개발자 연락하기</h1>
          <p className="text-lg text-gray-600">
            이 사이트의 발전을 위해 언제든지 연락주세요
          </p>
        </div>

        {/* 개발자 소개 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              개발자 소개
            </CardTitle>
            <CardDescription>
              저희 팀은 교육 현장을 더 효율적이고 편리하게 만들기 위해 노력하고 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">주요 개발자</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 프론트엔드 개발: React, Next.js, TypeScript 전문</p>
                  <p>• 백엔드 개발: Node.js, Prisma, PostgreSQL 활용</p>
                  <p>• UI/UX 디자인: 사용자 중심의 직관적인 인터페이스 설계</p>
                  <p>• 데이터베이스 설계: 효율적인 데이터 구조 및 관계형 모델링</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">프로젝트 목표</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 교육 기관의 디지털 전환 지원</p>
                  <p>• 교사와 학생 간 소통 강화</p>
                  <p>• 행정 업무 자동화 및 효율화</p>
                  <p>• 안전하고 신뢰할 수 있는 플랫폼 구축</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 연락 메시지 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              연락 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💬 여러분의 의견이 중요합니다</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                이 플랫폼을 사용하는 교사, 학생, 학부모님들의 소중한 피드백이
                저희 서비스를 더 나은 방향으로 발전시키는 원동력이 됩니다.
                새로운 기능 제안, 버그 신고, 사용성 개선 아이디어 등
                어떤 의견이라도 환영합니다.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">연락 가능한 사항들:</h3>
              <ul className="space-y-1 text-sm text-gray-600 ml-4">
                <li>• 새로운 기능 요청 및 개선 제안</li>
                <li>• 발견된 버그나 오류 신고</li>
                <li>• 사용 중 불편한 점이나 어려운 부분</li>
                <li>• 보안 관련 이슈 보고</li>
                <li>• 기술 지원 및 문의</li>
                <li>• 파트너십 및 협업 제안</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 연락 버튼들 */}
        <Card>
          <CardHeader>
            <CardTitle>연락 방법</CardTitle>
            <CardDescription>
              아래 버튼을 클릭하시면 해당 채널로 바로 연결됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href="mailto:support@schoolhub.com"
                className="w-full h-12 text-base bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center rounded-md font-medium transition-colors px-8 py-2"
              >
                <Mail className="w-5 h-5 mr-2" />
                이메일로 연락하기
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>

              <a
                href="https://github.com/schoolhub-team/support"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 text-base border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center rounded-md font-medium transition-colors px-8 py-2"
              >
                <Github className="w-5 h-5 mr-2" />
                GitHub Issues
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">
                연락주신 내용은 24시간 이내에 검토하여 답변드리겠습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}