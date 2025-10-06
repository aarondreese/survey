import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TitleManager from "@/components/TitleManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dynamic Surveys",
  description: "Manage survey templates, question sets, and dynamic survey configurations",
  icons: {
    icon: "/favicon.svg",
  },
  themeColor: "#ea580c",
  other: {
    "theme-color": "#ea580c",
    "msapplication-TileColor": "#ea580c",
    "msapplication-navbutton-color": "#ea580c",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TitleManager />
        {children}
      </body>
    </html>
  );
}
