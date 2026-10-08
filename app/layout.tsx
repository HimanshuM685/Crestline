import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crestline — A website. A brand guide.",
  description: "Extract a brand’s mark, colour, typography and voice from its live website. Generate a sourced guide and download it as PDF or JSON. No account needed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
