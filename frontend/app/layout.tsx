import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blinka Guard | Control de facturas",
  description:
    "Revisión de facturas, evaluación de políticas y aprobaciones de Blinka Guard.",
};

export const viewport: Viewport = {
  themeColor: "#f5f6f4",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
