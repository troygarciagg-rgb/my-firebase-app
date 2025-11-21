# 🚀 T-Harbor Deployment Guide

Complete step-by-step guide to deploy your T-Harbor app to GitHub and Vercel.

---

## 📋 Prerequisites

- [ ] GitHub account (free)
- [ ] Vercel account (free) - sign up at https://vercel.com
- [ ] PayPal Developer account (for payments)
- [ ] Firebase project (already set up)

---

## 🎯 Deployment Strategy

Your app has **2 parts**:
1. **Frontend** (React app) → Deploy to Vercel
2. **Backend** (Express server for PayPal) → Deploy separately (Railway/Render recommended)

**Why separate?** Your Express server needs to run 24/7, which is better suited for Railway or Render than Vercel serverless functions.

---

## 📦 Part 1: Prepare Your Code

### Step 1.1: Update .gitignore ✅
Already done! Your `.gitignore` now excludes sensitive files.

### Step 1.2: Check for Sensitive Files
Make sure these files are NOT in your repository:
- ❌ `server/serviceAccount.json` (Firebase credentials)
- ❌ `.env` files
- ❌ Any files with passwords or API keys

**If you see these files, delete them before pushing to GitHub!**

---

## 🔵 Part 2: Push to GitHub

### Step 2.1: Initialize Git (if not already done)

Open terminal in your project folder and run:

```bash
# Check if git is initialized
git status

# If not initialized, run:
git init
```

### Step 2.2: Create GitHub Repository

1. Go to https://github.com
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `t-harbor` (or any name you like)
4. Description: "T-Harbor - Property Booking Platform"
5. Choose **Public** or **Private**
6. **DO NOT** check "Initialize with README" (you already have code)
7. Click **"Create repository"**

### Step 2.3: Push Your Code

In your terminal, run:

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit - T-Harbor app"

# Add GitHub remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

---

## 🌐 Part 3: Deploy Frontend to Vercel

### Step 3.1: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended)

### Step 3.2: Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Find your `t-harbor` repository
4. Click **"Import"**

### Step 3.3: Configure Project Settings

Vercel should auto-detect your React app. Verify these settings:

- **Framework Preset:** Create React App ✅
- **Root Directory:** `./` (root)
- **Build Command:** `npm run build` ✅
- **Output Directory:** `build` ✅
- **Install Command:** `npm install` ✅

### Step 3.4: Add Environment Variables

Click **"Environment Variables"** and add these:

#### Frontend Variables:

| Name | Value | Notes |
|------|-------|-------|
| `REACT_APP_PAYMENTS_API_BASE_URL` | `https://your-backend-url.railway.app/api` | Your backend URL (we'll set this up next) |
| `REACT_APP_PAYPAL_CLIENT_ID` | `YOUR_PAYPAL_CLIENT_ID` | From PayPal Developer Dashboard |

**Important:** 
- For now, use a placeholder for `REACT_APP_PAYMENTS_API_BASE_URL` (e.g., `https://placeholder.com/api`)
- We'll update it after deploying the backend

### Step 3.5: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. You'll get a URL like: `https://t-harbor-xyz.vercel.app`

🎉 **Your frontend is now live!**

---

## ⚙️ Part 4: Deploy Backend to Railway

### Step 4.1: Sign Up for Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with GitHub (free tier available)

### Step 4.2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `t-harbor` repository
4. Railway will detect your project

### Step 4.3: Configure Backend Service

1. Railway might create multiple services. You need to configure the backend:
   - Click on the service
   - Go to **"Settings"**
   - Set **Root Directory** to: `server`
   - Set **Start Command** to: `npm start`

### Step 4.4: Add Environment Variables

In Railway, go to **"Variables"** tab and add:

| Name | Value | Notes |
|------|-------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | `{...your full JSON...}` | Paste your entire serviceAccount.json as a string |
| `PAYPAL_CLIENT_ID` | `YOUR_PAYPAL_CLIENT_ID` | From PayPal Developer Dashboard |
| `PAYPAL_SECRET` | `YOUR_PAYPAL_SECRET` | From PayPal Developer Dashboard |
| `PAYPAL_MODE` | `sandbox` | Use `live` for production |
| `FRONTEND_ORIGIN` | `https://your-vercel-app.vercel.app` | Your Vercel frontend URL |
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | Railway will auto-assign, but set this as fallback |

**How to get Firebase Service Account JSON:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **"Generate new private key"**
3. Copy the entire JSON content
4. Paste it as the value for `FIREBASE_SERVICE_ACCOUNT` (keep it as one line or use Railway's JSON editor)

### Step 4.5: Deploy Backend

1. Railway will automatically deploy when you save variables
2. Wait for deployment to complete
3. Go to **"Settings"** → **"Domains"**
4. Click **"Generate Domain"** to get your backend URL
5. Copy the URL (e.g., `https://your-app.railway.app`)

🎉 **Your backend is now live!**

---

## 🔗 Part 5: Connect Frontend to Backend

### Step 5.1: Update Vercel Environment Variables

1. Go back to Vercel
2. Go to your project → **"Settings"** → **"Environment Variables"**
3. Update `REACT_APP_PAYMENTS_API_BASE_URL` to your Railway backend URL:
   ```
   https://your-app.railway.app/api
   ```
4. Click **"Save"**
5. Go to **"Deployments"** tab
6. Click the **"..."** menu on the latest deployment
7. Click **"Redeploy"** to apply the new environment variable

---

## 🔐 Part 6: Update Firebase & PayPal Settings

### Step 6.1: Update Firebase Authorized Domains

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click **"Add domain"**
3. Add your Vercel domain: `your-app.vercel.app`
4. Click **"Add"**

### Step 6.2: Update PayPal App Settings

1. Go to PayPal Developer Dashboard
2. Select your app
3. Go to **"App Settings"** → **"Return URLs"**
4. Add your Vercel URL: `https://your-app.vercel.app`
5. Save changes

---

## ✅ Part 7: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test the following:
   - [ ] User registration/login
   - [ ] Browse listings
   - [ ] Create a booking
   - [ ] Complete a payment (use PayPal sandbox)
   - [ ] Check host dashboard
   - [ ] Check admin dashboard

---

## 🐛 Troubleshooting

### Frontend shows "Failed to fetch" errors
- Check that `REACT_APP_PAYMENTS_API_BASE_URL` is correct in Vercel
- Make sure backend is running on Railway
- Check Railway logs for errors

### Backend returns 500 errors
- Check Railway logs: Go to Railway → Your service → "Deployments" → Click on deployment → "View Logs"
- Verify all environment variables are set correctly
- Check that `FIREBASE_SERVICE_ACCOUNT` JSON is valid

### PayPal payments not working
- Verify `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` are correct
- Check that `PAYPAL_MODE` matches your PayPal app (sandbox/live)
- Verify PayPal app has correct return URLs

### CORS errors
- Update `FRONTEND_ORIGIN` in Railway to match your Vercel URL exactly
- Check backend CORS settings in `server/src/index.js`

---

## 📝 Quick Reference

### Your URLs:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-app.railway.app`

### Environment Variables Checklist:

**Vercel (Frontend):**
- ✅ `REACT_APP_PAYMENTS_API_BASE_URL`
- ✅ `REACT_APP_PAYPAL_CLIENT_ID`

**Railway (Backend):**
- ✅ `FIREBASE_SERVICE_ACCOUNT`
- ✅ `PAYPAL_CLIENT_ID`
- ✅ `PAYPAL_SECRET`
- ✅ `PAYPAL_MODE`
- ✅ `FRONTEND_ORIGIN`
- ✅ `NODE_ENV`
- ✅ `PORT`

---

## 🎉 You're Done!

Your T-Harbor app is now live on the internet! 🚀

**Next Steps:**
- Share your Vercel URL with users
- Monitor Railway logs for any issues
- Set up custom domain (optional)
- Switch PayPal from sandbox to live mode when ready

---

## 💡 Tips

1. **Free Tiers:**
   - Vercel: Free for personal projects
   - Railway: $5/month free credit (usually enough for small apps)

2. **Custom Domain:**
   - Vercel: Add custom domain in project settings
   - Railway: Can also add custom domain

3. **Monitoring:**
   - Use Vercel Analytics (free)
   - Check Railway logs regularly
   - Set up error tracking (Sentry, etc.)

4. **Updates:**
   - Push to GitHub → Vercel auto-deploys
   - Railway auto-deploys on push (if configured)

---

**Need Help?** Check the logs in Vercel and Railway dashboards for specific error messages.

