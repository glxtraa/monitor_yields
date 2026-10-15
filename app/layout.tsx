import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credit Risk Monitors",
  description:
    "France–Germany sovereign yields and AI data center bond prices, CDS spreads, and model-implied default probabilities.",
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
