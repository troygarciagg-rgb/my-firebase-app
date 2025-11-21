# ✅ Quick Deployment Checklist

Follow these steps in order to deploy your T-Harbor app.

---

## 📝 Before You Start

- [ ] Make sure you have a GitHub account
- [ ] Make sure you have a Vercel account (sign up at vercel.com)
- [ ] Make sure you have a Railway account (sign up at railway.app)
- [ ] Have your PayPal Client ID and Secret ready
- [ ] Have your Firebase Service Account JSON ready

---

## 🔵 Step 1: Push to GitHub (5 minutes)

1. **Open terminal in your project folder**

2. **Check if git is initialized:**
   ```bash
   git status
   ```

3. **If not initialized, run:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

4. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it: `t-harbor` (or any name)
   - Click "Create repository"

5. **Push your code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
   *(Replace YOUR_USERNAME and YOUR_REPO_NAME)*

✅ **Done!** Your code is on GitHub.

---

## 🌐 Step 2: Deploy Frontend to Vercel (5 minutes)

1. **Go to https://vercel.com and sign in with GitHub**

2. **Click "Add New..." → "Project"**

3. **Import your GitHub repository**

4. **Configure:**
   - Framework: Create React App (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `build`

5. **Add Environment Variables:**
   - `REACT_APP_PAYMENTS_API_BASE_URL` = `https://placeholder.com/api` (we'll update this later)
   - `REACT_APP_PAYPAL_CLIENT_ID` = Your PayPal Client ID

6. **Click "Deploy"**

7. **Wait for deployment, then copy your Vercel URL** (e.g., `https://t-harbor-xyz.vercel.app`)

✅ **Done!** Frontend is live (but backend not connected yet).

---

## ⚙️ Step 3: Deploy Backend to Railway (10 minutes)

1. **Go to https://railway.app and sign in with GitHub**

2. **Click "New Project" → "Deploy from GitHub repo"**

3. **Select your repository**

4. **Configure the service:**
   - Go to Settings
   - Root Directory: `server`
   - Start Command: `npm start`

5. **Add Environment Variables:**
   
   | Variable | Value |
   |----------|-------|
   | `FIREBASE_SERVICE_ACCOUNT` | Paste your entire serviceAccount.json as one line |
   | `PAYPAL_CLIENT_ID` | Your PayPal Client ID |
   | `PAYPAL_SECRET` | Your PayPal Secret |
   | `PAYPAL_MODE` | `sandbox` |
   | `FRONTEND_ORIGIN` | Your Vercel URL (from Step 2) |
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |

6. **Get your Railway URL:**
   - Go to Settings → Domains
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://your-app.railway.app`)

✅ **Done!** Backend is live.

---

## 🔗 Step 4: Connect Frontend to Backend (2 minutes)

1. **Go back to Vercel → Your Project → Settings → Environment Variables**

2. **Update `REACT_APP_PAYMENTS_API_BASE_URL`:**
   - Change from `https://placeholder.com/api`
   - To: `https://your-railway-url.railway.app/api`
   - (Use your Railway URL from Step 3)

3. **Save and Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

✅ **Done!** Frontend and backend are connected.

---

## 🔐 Step 5: Update Firebase & PayPal (5 minutes)

### Firebase:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain: `your-app.vercel.app`

### PayPal:
1. Go to PayPal Developer Dashboard → Your App
2. Add Return URL: `https://your-app.vercel.app`

✅ **Done!** Everything is configured.

---

## 🧪 Step 6: Test (5 minutes)

Visit your Vercel URL and test:
- [ ] Can you see the homepage?
- [ ] Can you register/login?
- [ ] Can you browse listings?
- [ ] Can you create a booking?
- [ ] Can you complete a payment?

✅ **All working?** You're live! 🎉

---

## 🆘 Need Help?

**Frontend not loading?**
- Check Vercel deployment logs
- Verify environment variables are set

**Backend errors?**
- Check Railway logs
- Verify all environment variables are correct
- Check that `FIREBASE_SERVICE_ACCOUNT` JSON is valid

**Payments not working?**
- Verify PayPal credentials
- Check that `FRONTEND_ORIGIN` matches your Vercel URL exactly
- Check Railway logs for CORS errors

---

## 📞 Your URLs

- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-app.railway.app`

Save these URLs - you'll need them!

---

**Total Time:** ~30 minutes ⏱️

