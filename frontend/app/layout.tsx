import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BxT VisionEngine | Enterprise CV Platform",
  description: "Secure AutoML and inference development platform for private and government sectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased selection:bg-accent-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
