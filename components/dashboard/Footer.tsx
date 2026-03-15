export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 backdrop-blur-lg border-t border-white/20 mt-auto w-full relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-600">
            <div>
              <p className="text-gray-500">
                © {currentYear} SchoolWorks. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/Privacy Policy/Privacy Policy of SchoolWorks.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                개인정보처리방침
              </a>
              <a
                href="#"
                className="hover:text-blue-600 transition-colors"
              >
                이용약관
              </a>
              <a
                href="#"
                className="hover:text-blue-600 transition-colors"
              >
                문의하기
              </a>
            </div>
          </div>
        </div>
    </footer>
  );
}

