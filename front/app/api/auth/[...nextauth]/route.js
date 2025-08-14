import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Use environment variable or fallback to production URL
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://qrvirtualcardgenerator.onrender.com'
          
          console.log('🔐 NextAuth authorize() çağrıldı')
          console.log('🔐 Email:', credentials.email)
          console.log('🔐 Password length:', credentials.password?.length || 0)
          console.log('🌐 Backend API URL:', apiUrl)
          console.log('🌐 Environment check:', {
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? 'SET' : 'NOT_SET'
          })
          console.log('⏰ Cold start bekleniyor... Bu işlem 30-45 saniye sürebilir')
          
          // AbortController ile timeout - Render cold start için artırıldı
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 45000) // 45s timeout

          console.log('🚀 Backende istek gönderiliyor...')
          console.log('🚀 Request URL:', `${apiUrl}/api/auth/login`)
          console.log('🚀 Request payload:', {
            email: credentials.email,
            password: '***' + credentials.password?.slice(-3) || ''
          })

          const response = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'NextAuth-Frontend/1.0',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId))

          console.log('📡 Response alındı!')
          console.log('📡 Status:', response.status)
          console.log('📡 Status Text:', response.statusText)
          console.log('📡 Headers:', Object.fromEntries(response.headers.entries()))
          
          let data
          let responseText = ''
          try {
            responseText = await response.text()
            console.log('📨 Raw response text:', responseText)
            
            if (responseText) {
              data = JSON.parse(responseText)
              console.log('📨 Parsed response data:', data)
            } else {
              console.error('❌ Empty response body')
              data = { success: false, message: 'Boş sunucu yanıtı' }
            }
          } catch (e) {
            console.error('🧩 JSON parse error:', e)
            console.error('🧩 Raw response was:', responseText)
            data = { success: false, message: `JSON parse hatası: ${e.message}` }
          }

          if (response.ok && data.success && data.user) {
            console.log('✅ Login successful for:', data.user.email)
            return {
              id: data.user.id.toString(),
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
            }
          }

          console.error('❌ Login failed:', data.message || 'Unknown error')
          return null
        } catch (error) {
          console.error('🚨 Authentication error caught!')
          console.error('🚨 Error type:', error.constructor.name)
          console.error('🚨 Error message:', error.message)
          console.error('🚨 Error stack:', error.stack)
          
          if (error.name === 'AbortError') {
            console.error('🚨 Request timeout - Backend çok yavaş yanıt veriyor')
          } else if (error.message.includes('fetch')) {
            console.error('🚨 Network error - Backend\'e erişim sorunu')
          }
          
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // Custom error page
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  // Add custom error handling
  events: {
    async signIn({ user, account, profile }) {
      console.log('🔐 User signed in:', user.email)
    },
    async signInError({ error }) {
      console.error('🚨 Sign in error:', error)
    },
  },
})

export { handler as GET, handler as POST }
