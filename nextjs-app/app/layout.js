import './globals.css'
// adds toast notifications
import { Toaster } from "sonner";
import { Inter } from 'next/font/google'

import { ThemeProvider } from "@/components/providers/theme-provider";


const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Bookbag',
  description: 'We manage and deploy your AI models with ease.',
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logo.svg",
        href: "/logo.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logo-dark.svg",
        href: "/logo-dark.svg",
      }
    ]
  }
}


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>

          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="boobag-theme">
            <Toaster position="bottom-center" />
            {children}
          </ThemeProvider>
        

      </body>
    </html>
  );
}
