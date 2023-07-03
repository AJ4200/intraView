import './globals.css'
import './styles/splash/loader.css'
import './styles/custom-animations.css'
import 'animate.css'
import './styles/footer/footer.css'
import './styles/splash/splash.css'
import './styles/footer/search.css'
import './styles/footer/homebutton.css'
import './styles/footer/more.css'
import './styles/utils.css'
import "./styles/interview/interview.css"
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'IntraView',
  description: 'A Better way to recruit',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
