# Deployment Guide for FlashLearn

This guide will help you deploy FlashLearn to Vercel and set up Firebase.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Firebase account
- Vercel account (or GitHub account for auto-deployment)

## Step 1: Environment Variables Setup

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase credentials in `.env.local`:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Copy the values for your Firebase config

3. Get Firebase Cloud Messaging VAPID Key (optional):
   - Firebase Console > Project Settings > Cloud Messaging
   - Under "Web Push certificates", generate a new key pair
   - Copy the key to `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

## Step 2: Firebase Setup

1. Enable Firebase Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google Sign-In

2. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Set up security rules (provided below)

3. Firestore Security Rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Courses - read for all, write for admins only
       match /courses/{courseId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // Quizzes - users can read/write their own quizzes
       match /quizzes/{quizId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
       
       // Contacts - users can write, admins can read
       match /contacts/{contactId} {
         allow write: if request.auth != null;
         allow read: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // User preferences
       match /userPreferences/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Course progress
       match /courseProgress/{progressId} {
         allow read, write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables:
   - Add all variables from `.env.local` to Vercel Environment Variables
   - Set them for Production, Preview, and Development

### Option B: Deploy via CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables in Vercel Dashboard

## Step 4: Configure Vercel Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables, add:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (optional)
- `NEXT_PUBLIC_SITE_URL` (your Vercel deployment URL)
- `NEXT_PUBLIC_GOOGLE_VERIFICATION` (optional)
- `NEXT_PUBLIC_YANDEX_VERIFICATION` (optional)

## Step 5: Firebase Hosting (Optional)

If you want to use Firebase Hosting alongside Vercel:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login:
   ```bash
   firebase login
   ```

3. Initialize Firebase:
   ```bash
   firebase init
   ```

4. Deploy:
   ```bash
   firebase deploy
   ```

## Step 6: Set up Firebase Cloud Functions (Optional)

For server-side operations like sending notifications:

1. Initialize Functions:
   ```bash
   firebase init functions
   ```

2. Functions will be in `functions/` directory

3. Deploy:
   ```bash
   firebase deploy --only functions
   ```

## Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Firebase Authentication enabled
- [ ] Firestore Database created with proper rules
- [ ] Firebase Storage rules configured
- [ ] Site URL updated in Firebase Console (Authorized domains)
- [ ] Custom domain configured (if applicable)
- [ ] SEO meta tags verified
- [ ] Analytics configured (if using)

## Troubleshooting

### Build Errors
- Check that all environment variables are set
- Verify Firebase config values are correct
- Check Next.js version compatibility

### Authentication Issues
- Verify Firebase Auth domains include your Vercel URL
- Check Firestore security rules
- Ensure email verification is properly configured

### Notification Issues
- Verify VAPID key is correct
- Check browser notification permissions
- Ensure service worker is properly registered

## Support

For issues, please check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)



