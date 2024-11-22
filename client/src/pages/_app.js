import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '../contexts/AuthContext'
import { SocketProvider } from '../contexts/SocketContext'
import '../app/globals.css'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SocketProvider>
          <Component {...pageProps} />
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default MyApp 