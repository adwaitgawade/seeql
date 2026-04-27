import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk-sans",
  weight: "400"
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEEQL Viewer",
  description: "Visualize DBML and SQL schemas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Google Search Console */}
        <meta name="google-site-verification" content="hJYTWvSFqlnAXCRDpD_b5epWu-E00NTQIFWLVWrWbAo" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
      <Script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="0cd25443-b5c5-4302-ac09-e187d819e6e6"
      />
    </html>
  );
}
