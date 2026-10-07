import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "France–Germany Yield Monitor",
  description:
    "Interactive France–Germany sovereign yield spreads and model-implied default probabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
