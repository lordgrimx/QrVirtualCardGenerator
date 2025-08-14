import { NextResponse } from 'next/server'

export async function GET() {
  const testResults = {
    timestamp: new Date().toISOString(),
    frontend_env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT_SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET'
    },
    tests: {}
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://qrvirtualcardgenerator.onrender.com'
  console.log('🔍 Backend test başlıyor...')
  console.log('🔍 API URL:', apiUrl)

  // Test 1: Backend health check
  try {
    console.log('🔍 Health check test başlıyor...')
    const healthResponse = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Frontend-Debug-Test/1.0'
      }
    })

    const healthData = await healthResponse.json()
    
    testResults.tests.health_check = {
      status: healthResponse.ok ? 'SUCCESS' : 'FAILED',
      status_code: healthResponse.status,
      response_time: 'N/A',
      data: healthData
    }
    
    console.log('✅ Health check başarılı:', healthData)
  } catch (error) {
    console.error('❌ Health check hatası:', error)
    testResults.tests.health_check = {
      status: 'ERROR',
      error: error.message,
      error_type: error.constructor.name
    }
  }

  // Test 2: Backend debug timing endpoint
  try {
    console.log('🔍 Debug timing test başlıyor...')
    const debugResponse = await fetch(`${apiUrl}/api/debug/timing`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Frontend-Debug-Test/1.0'
      }
    })

    const debugData = await debugResponse.json()
    
    testResults.tests.debug_timing = {
      status: debugResponse.ok ? 'SUCCESS' : 'FAILED',
      status_code: debugResponse.status,
      data: debugData
    }
    
    console.log('✅ Debug timing başarılı:', debugData)
  } catch (error) {
    console.error('❌ Debug timing hatası:', error)
    testResults.tests.debug_timing = {
      status: 'ERROR',
      error: error.message,
      error_type: error.constructor.name
    }
  }

  // Test 3: Mock login attempt
  try {
    console.log('🔍 Mock login test başlıyor...')
    const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Frontend-Debug-Test/1.0'
      },
      body: JSON.stringify({
        email: 'admin@elfed.org.tr',
        password: 'elfed2024'
      })
    })

    let loginData
    try {
      loginData = await loginResponse.json()
    } catch (e) {
      loginData = { error: 'JSON parse error', raw: await loginResponse.text() }
    }
    
    testResults.tests.mock_login = {
      status: loginResponse.ok ? 'SUCCESS' : 'FAILED',
      status_code: loginResponse.status,
      data: loginData
    }
    
    console.log('🔍 Mock login sonucu:', loginData)
  } catch (error) {
    console.error('❌ Mock login hatası:', error)
    testResults.tests.mock_login = {
      status: 'ERROR',
      error: error.message,
      error_type: error.constructor.name
    }
  }

  console.log('🔍 Backend test tamamlandı:', testResults)

  return NextResponse.json(testResults, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}
