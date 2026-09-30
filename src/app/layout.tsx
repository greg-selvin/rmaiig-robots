import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RMAIIG Robots", description: "Humanoid robot ranking and outreach", icons: { icon: "/icon.png?v=full-robot-2", apple: "/icon.png?v=full-robot-2" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
