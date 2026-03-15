import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SchoolWorks 학교를 잇다.",
  description: "SchoolWorks 로그인 시스템",
  icons: {
    icon: "/logo/rounded-in-photoretrica.png",
  },
  openGraph: {
    title: "SchoolWorks 학교를 잇다.",
    description: "SchoolWorks 로그인 시스템",
    images: ["/logo/rounded-in-photoretrica.png"],
  },
  twitter: {
    card: "summary",
    title: "SchoolWorks 학교를 잇다.",
    description: "SchoolWorks 로그인 시스템",
    images: ["/logo/rounded-in-photoretrica.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

