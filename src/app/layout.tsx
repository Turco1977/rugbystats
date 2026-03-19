import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Rugby Stats — Los Tordos RC",
  description:
    "Plataforma de estadísticas en tiempo real para Los Tordos Rugby Club",
  manifest: "/manifest.json",
  icons: { apple: "/logo.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A1628",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans">{children}</body>
    </html>
  );
}
