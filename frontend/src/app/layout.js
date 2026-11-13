import { Outfit, Nunito } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata = {
  title: "Focus Buddy Prototype",
  description: "Your personal coaching dog for getting things done.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${nunito.variable}`}>
        {children}
      </body>
    </html>
  );
}
