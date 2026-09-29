import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/figtree";
import "./globals.css";

export const dynamic = "force-dynamic";

const title = "Business Mission Control";
const description =
  "Uma visão executiva, interativa e fundamentada das melhores oportunidades de IA para uma pequena empresa.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = `${origin}/og.png`;

  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: origin,
      siteName: title,
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "Business Mission Control — decidir com evidência" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
