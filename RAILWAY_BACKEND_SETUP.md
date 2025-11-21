# 🚂 Railway Backend Setup Guide

Step-by-step guide to deploy your Express backend server to Railway.

---

## 📋 Prerequisites

- [ ] Railway account (sign up at https://railway.app - free tier available)
- [ ] Your Firebase Service Account JSON file
- [ ] Your PayPal Client ID and Secret
- [ ] Your Vercel frontend URL (e.g., `https://my-firebase-app.vercel.app`)

---

## 🚀 Step 1: Sign Up / Log In to Railway

1. Go to **https://railway.app**
2. Click **"Start a New Project"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Railway to access your GitHub account

---

## 📦 Step 2: Create New Project

1. Click **"New Project"** (top right or in dashboard)
2. Select **"Deploy from GitHub repo"**
3. Find and select your `my-firebase-app` repository
4. Click **"Deploy Now"**

Railway will start deploying, but we need to configure it first!

---

## ⚙️ Step 3: Configure Service Settings

### 3.1: Open Service Settings

1. Click on your service (should be named `my-firebase-app`)
2. Click the **"Settings"** tab (top right)

### 3.2: Set Root Directory

1. Find **"Root Directory"** or **"Source"** section
2. Change from `./` to: **`server`**
3. Click **"Save"** or it auto-saves

### 3.3: Set Start Command

1. Find **"Start Command"** or **"Deploy Command"**
2. Set it to: **`npm start`**
3. Make sure **"Build Command"** is empty or set to: **`npm install`**
4. Click **"Save"**

---

## 🔐 Step 4: Add Environment Variables

1. In the Settings tab, find **"Variables"** section
2. Click **"New Variable"** for each one below:

### Required Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | `{...your full JSON...}` | Paste entire serviceAccount.json as one line |
| `PAYPAL_CLIENT_ID` | `YOUR_PAYPAL_CLIENT_ID` | From PayPal Developer Dashboard |
| `PAYPAL_SECRET` | `YOUR_PAYPAL_SECRET` | From PayPal Developer Dashboard |
| `PAYPAL_MODE` | `sandbox` | Use `live` for production |
| `FRONTEND_ORIGIN` | `https://your-vercel-app.vercel.app` | Your Vercel frontend URL |
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | Railway auto-assigns, but set as fallback |

### How to Get Firebase Service Account JSON:

1. Go to **Firebase Console** → Your Project
2. Click the **gear icon** → **"Project Settings"**
3. Go to **"Service Accounts"** tab
4. Click **"Generate new private key"**
5. A JSON file will download
6. **Open the file** and copy the entire contents
7. **Paste it as the value** for `FIREBASE_SERVICE_ACCOUNT` in Railway
   - Keep it as one line (Railway will handle it)
   - Or use Railway's JSON editor if available

**Important:** Make sure the JSON is valid! It should start with `{` and end with `}`.

---

## 🌐 Step 5: Get Your Backend URL

1. Go to **"Settings"** → **"Domains"** tab
2. Click **"Generate Domain"** button
3. Railway will create a URL like: `https://your-app.railway.app`
4. **Copy this URL** - you'll need it!

---

## 🔄 Step 6: Redeploy

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** or trigger a new deployment
3. Wait 2-3 minutes for deployment to complete
4. Check the logs to make sure it started successfully

---

## ✅ Step 7: Test Your Backend

1. Visit: `https://your-railway-url.railway.app/health`
2. You should see: `{"status":"ok"}`
3. If you see this, your backend is working! ✅

---

## 🔗 Step 8: Connect Frontend to Backend

1. Go back to **Vercel** dashboard
2. Go to your project → **"Settings"** → **"Environment Variables"**
3. Find `REACT_APP_PAYMENTS_API_BASE_URL`
4. Update it to: `https://your-railway-url.railway.app/api`
   - Replace `your-railway-url` with your actual Railway URL
5. Click **"Save"**
6. Go to **"Deployments"** tab
7. Click **"..."** on latest deployment → **"Redeploy"**

---

## 🐛 Troubleshooting

### Backend won't start:
- Check Railway logs: **"Deployments"** → Click on deployment → **"View Logs"**
- Verify all environment variables are set correctly
- Make sure `FIREBASE_SERVICE_ACCOUNT` JSON is valid

### CORS errors:
- Update `FRONTEND_ORIGIN` in Railway to match your Vercel URL exactly
- Make sure there's no trailing slash: `https://app.vercel.app` (not `https://app.vercel.app/`)

### 404 errors:
- Make sure your backend URL ends with `/api` when setting in Vercel
- Check that routes in `server/src/index.js` start with `/api`

### Port errors:
- Railway automatically assigns a port via `process.env.PORT`
- Your server should use: `const port = process.env.PORT || 5000;`
- This is already set in your code ✅

---

## 📝 Quick Checklist

- [ ] Railway account created
- [ ] Project created from GitHub repo
- [ ] Root Directory set to `server`
- [ ] Start Command set to `npm start`
- [ ] All environment variables added
- [ ] Domain generated
- [ ] Backend deployed successfully
- [ ] Health check works (`/health` endpoint)
- [ ] Frontend environment variable updated
- [ ] Frontend redeployed

---

## 🎉 You're Done!

Your backend is now live on Railway! 🚂

**Your URLs:**
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-app.railway.app`

**Next Steps:**
- Test a complete booking flow
- Monitor Railway logs for any issues
- Update PayPal from sandbox to live when ready

---

**Need Help?** Check Railway logs in the dashboard for specific error messages.

