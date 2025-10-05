# Vercel Environment Variables Kurulumu

## 🚨 KRİTİK: Vercel'da Bu Environment Variables'ları Ekleyin

Vercel Dashboard → Project Settings → Environment Variables

### 1. **NEXTAUTH_SECRET** (Required)
```
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long-for-production-security
```

### 2. **NEXTAUTH_URL** (Required)
```
NEXTAUTH_URL=https://qr-virtual-card-generator.vercel.app/
```

### 3. **NEXT_PUBLIC_API_URL** (Required - Backend URL)
```
NEXT_PUBLIC_API_URL=https://qrvirtualcardgenerator.onrender.com
```

## 🔍 Test Endpoint'leri

### Backend Test:
```bash
curl https://qrvirtualcardgenerator.onrender.com/health
```

### Frontend'den Backend Test:
```
https://qr-virtual-card-generator.vercel.app/api/debug/backend-test
```

## 📋 Checklist

- [ ] Vercel'da 3 environment variable eklenmiş mi?
- [ ] Backend Render.com'da çalışıyor mu?
- [ ] CORS doğru ayarlanmış mı?
- [ ] NextAuth secret random ve güvenli mi?

## 🚨 Deployment Sonrası

Environment variable ekledikten sonra **yeniden deploy** etmeyi unutmayın!
