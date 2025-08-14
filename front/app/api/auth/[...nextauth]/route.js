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
          
          console.log('🔐 Attempting login with:', credentials.email)
          console.log('🌐 API URL:', apiUrl)
          
          const response = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            // Add timeout and proper error handling
            signal: AbortSignal.timeout(30000), // 30 second timeout
          })

          console.log('📡 Response status:', response.status)
          
          if (!response.ok) {
            console.error('❌ Response not OK:', response.status, response.statusText)
            return null
          }

          const data = await response.json()
          console.log('📨 Response data:', data)

          if (data.success && data.user) {
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
          console.error('🚨 Authentication error:', error)
          if (error.name === 'TimeoutError') {
            console.error('⏰ Request timed out')
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
