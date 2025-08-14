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
    async jwt({ token, user, account }) {
      console.log('🔐 JWT Callback - User:', user ? 'Present' : 'None')
      console.log('🔐 JWT Callback - Account:', account ? account.provider : 'None')
      if (user) {
        token.role = user.role
        console.log('🔐 JWT Token updated with role:', user.role)
      }
      return token
    },
    async session({ session, token }) {
      console.log('🔐 Session Callback - Token:', token ? 'Present' : 'None')
      session.user.id = token.sub
      session.user.role = token.role
      console.log('🔐 Session created for user:', session.user.email)
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn Callback triggered!')
      console.log('🔐 SignIn - User:', user ? { id: user.id, email: user.email, role: user.role } : 'None')
      console.log('🔐 SignIn - Account:', account ? { provider: account.provider, type: account.type } : 'None')
      console.log('🔐 SignIn - Profile:', profile ? 'Present' : 'None')
      
      // Always allow sign in for credentials
      if (account?.provider === 'credentials') {
        console.log('🔐 Credentials sign in - ALLOWED')
        return true
      }
      
      console.log('🔐 Non-credentials sign in - checking...')
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // Custom error page
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here-change-in-production',
  debug: true, // Always enable debug for troubleshooting
  events: {
    async signIn({ user, account, profile }) {
      console.log('🔐 Event: User signed in successfully:', user.email)
    },
    async signInError({ error }) {
      console.error('🚨 Event: Sign in error occurred:', error)
    },
    async createUser({ user }) {
      console.log('🔐 Event: User created:', user.email)
    },
    async session({ session, token }) {
      console.log('🔐 Event: Session accessed:', session.user.email)
    },
  },
})

export { handler as GET, handler as POST }
