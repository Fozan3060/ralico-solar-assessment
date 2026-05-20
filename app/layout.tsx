import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Only mono is loaded as a web font. The body uses the OS system font stack
// (SF Pro on macOS, Segoe UI on Windows, Roboto on Android) for a premium,
// native feel — defined in globals.css via --font-sans.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ralico — Solar Property Assessment",
  description:
    "A voice conversation that finds out if solar fits your home — five questions, two minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} bg-[#05070d] text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
