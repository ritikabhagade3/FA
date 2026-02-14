import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationProvider from "@/components/NotificationProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://flashlearn.vercel.app'),
  title: "FlashLearn - Learn Smarter, Faster | AI-Powered E-Learning Platform",
  description: "FlashLearn is an AI-powered e-learning platform that adapts to your learning style. Access interactive courses, AI-generated quizzes, and personalized learning experiences.",
  keywords: ["e-learning", "online courses", "AI education", "interactive learning", "online education", "educational platform", "flashcards", "quiz generator", "personalized learning", "adaptive learning"],
  authors: [{ name: "FlashLearn Team" }],
  creator: "FlashLearn",
  publisher: "FlashLearn",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://flashlearn.vercel.app",
    siteName: "FlashLearn",
    title: "FlashLearn - Learn Smarter, Faster",
    description: "AI-powered e-learning platform that adapts to your learning style",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FlashLearn - AI-Powered E-Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlashLearn - Learn Smarter, Faster",
    description: "AI-powered e-learning platform that adapts to your learning style",
    images: ["/og-image.png"],
    creator: "@flashlearn",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "",
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || "",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://flashlearn.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeToggle />
        <NotificationProvider>
          {children}
        </NotificationProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
