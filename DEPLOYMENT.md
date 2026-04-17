# 🚀 Firebase Hosting Deployment Guide

## ✅ Setup Complete!

Your project is now configured for Firebase Hosting deployment!

## 📦 What's Been Configured

### 1. **Package.json Updated**
- Added `"type": "module"` to fix ES module warnings

### 2. **Next.js Configuration** ([next.config.js](next.config.js))
- Enabled static export: `output: 'export'`
- Unoptimized images for static hosting
- Ready for Firebase Hosting deployment

### 3. **Firebase Configuration Files**
- **[firebase.json](firebase.json)** - Hosting configuration pointing to `out` directory
- **[.firebaserc](.firebaserc)** - Project alias set to `crypto-wallet-c4c06`
- **[jsconfig.json](jsconfig.json)** - Path aliases configured for imports

### 4. **Production Build**
✅ Build successful! Static files generated in `out/` directory

## 🔥 Deployment Steps

### Step 1: Authenticate with Firebase
```bash
firebase login
```
Follow the browser prompt to sign in with your Google account.

### Step 2: Verify Authentication
```bash
firebase projects:list
```
You should see `crypto-wallet-c4c06` in the list.

### Step 3: Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Alternative: One-line Deployment
```bash
npm run build && firebase deploy --only hosting
```

## 📋 Deployment Checklist

Before deploying, ensure:
- [ ] Firebase login completed successfully
- [ ] Google Sign-In enabled in Firebase Console
- [ ] Authorized domains added in Firebase Console:
  - `localhost` (for development)
  - Your Firebase Hosting domain (auto-added)
- [ ] Production build completed (`npm run build`)

## 🌐 After Deployment

Once deployed, your app will be available at:
```
https://crypto-wallet-c4c06.web.app
```
or
```
https://crypto-wallet-c4c06.firebaseapp.com
```

## ⚙️ Firebase Console Setup (Required for Google Auth)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `crypto-wallet-c4c06`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** provider
5. Add authorized domains:
   - Your Firebase Hosting URL will be auto-added
   - Add any custom domains you plan to use

## 🔄 Future Deployments

After making changes:
```bash
npm run build        # Build the app
firebase deploy      # Deploy to hosting
```

## 📂 Project Structure

```
crypto-wallet/
├── out/             # Static export (auto-generated, deployed to Firebase)
├── app/             # Next.js app directory
├── lib/             # Firebase configuration
├── public/          # Static assets
├── firebase.json    # Firebase hosting config
├── .firebaserc      # Firebase project config
└── jsconfig.json    # Path aliases
```

## 🛠️ Troubleshooting

### Authentication Issues
```bash
# Check if logged in
firebase login:list

# Re-authenticate
firebase login --reauth

# Logout and login again
firebase logout
firebase login
```

### Build Issues
```bash
# Clean build
rm -rf .next out
npm run build
```

### Deployment Issues
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Verify project
firebase use --add
```

## 📱 Testing Your Deployment

1. Visit your Firebase Hosting URL
2. Test Google Sign-In functionality
3. Verify wallet creation and unlock features
4. Check responsive design on mobile

## 🎯 Next Steps

- Set up custom domain in Firebase Console
- Configure SSL certificate (auto-handled by Firebase)
- Set up CI/CD with GitHub Actions
- Monitor analytics in Firebase Console

## 📊 Monitoring

View your app's performance:
- Firebase Console → Hosting → Usage
- Firebase Console → Analytics
- Firebase Console → Authentication → Users

---

**Your crypto wallet is ready for production! 🎉**

For more info: [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
