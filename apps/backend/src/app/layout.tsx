import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hareef English API",
  description: "Backend API for the Hareef English learning platform.",
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
