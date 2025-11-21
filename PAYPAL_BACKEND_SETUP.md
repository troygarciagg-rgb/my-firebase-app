## PayPal Checkout + Host Payouts (No Firebase Functions)

This project now ships with an optional Node/Express server (`/server`) that handles every secure PayPal step:

1. Captures the guest’s PayPal order.
2. Calculates the 5% admin fee / 95% host payout.
3. Sends the host payout via PayPal Payouts API.
4. Writes a transaction record to Firestore.

Because the server runs outside Firebase Cloud Functions, it works on the Spark (free) plan. Follow the steps below to run it locally or deploy it to your provider of choice (Render, Railway, Fly.io, etc.).

---

### 1. Create a Firebase service account

1. Visit [Firebase Console → Project settings → Service accounts](https://console.firebase.google.com/).
2. Click **Generate new private key**.
3. Copy the JSON contents.

You can either store that JSON in a secure file or paste it as a single environment variable (recommended for hosted platforms).

---

### 2. Server environment variables (`server/.env`)

```
PORT=5001
PAYPAL_CLIENT_ID=ARr3UTNH_rV-4i7zzpCoV4nY9jlZaYnZ4GsydwZUo2oB6M-SkOO71tc38-fE739sUVkUrj46k0Sj-pe-
PAYPAL_SECRET=YOUR_PAYPAL_SANDBOX_SECRET
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk@...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}'
FRONTEND_ORIGIN=http://localhost:3000
```

- `FIREBASE_SERVICE_ACCOUNT` can either be:
  - the raw JSON pasted as a single quoted string (escape newlines as `\\n`), or
  - a path to the JSON file (e.g. `FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json`).
- `FRONTEND_ORIGIN` accepts a comma-separated list if you have multiple origins.

Install dependencies and run locally:

```bash
cd server
npm install
npm run dev
```

The server listens on `http://localhost:5001` by default.

Deploy the same folder to your hosting provider and set the same environment variables there.

---

### 3. Frontend environment variable

Add the server URL (local or hosted) to your React `.env.local`:

```
REACT_APP_PAYMENTS_API_BASE_URL=http://localhost:5001
```

Restart `npm start` whenever you change `.env.local`.

---

### 4. Flow summary

1. Guest fills out the booking form and clicks **Review Price & Continue**.
2. PayPal button appears. When approved, the frontend sends the `orderId` to `/api/payments/capture-and-payout` with the user’s Firebase ID token.
3. Express server verifies the token, captures the order, calculates fees, sends the payout, and writes a Firestore transaction.
4. Server responds with `{ status: 'paid', payoutStatus, transactionId }`.
5. Frontend creates the booking record with `status: 'paid'` and shows the success UI.

If anything fails (missing host PayPal email, capture error, payout error), the server responds with HTTP 400/500 and the frontend displays the detailed message.

---

### 5. Host payout email reminder

Hosts **must** enter a valid PayPal email under **Host Panel → Payment Methods → PayPal**. The server reads `users/{hostId}.paypalEmail` (or `paymentMethods.paypal.email`) to know where to send the payout. If it’s missing, the API returns a 400 error so the guest can try another listing or contact support.

---

That’s it! You now have a full PayPal checkout with admin fees and host payouts—without needing Firebase’s Blaze plan.

