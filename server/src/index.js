/**
 * Standalone Express server for handling PayPal checkout + host payouts.
 * --------------------------------------------------------------------
 * This replaces the Firebase Cloud Function implementation so we can run
 * on Firebase's Spark plan. Deploy this server on Render, Railway, Fly.io,
 * or any Node hosting provider. Make sure the environment variables from
 * `.env.example` are configured in production.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const admin = require('firebase-admin');

// ==== Firebase Admin bootstrap =================================================
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountEnv) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing. Paste your service account JSON here.');
}

const serviceAccount = (() => {
  if (serviceAccountEnv.trim().startsWith('{')) {
    return JSON.parse(serviceAccountEnv);
  }
  // Allow supplying a path relative to the server root.
  const resolvedPath = path.isAbsolute(serviceAccountEnv)
    ? serviceAccountEnv
    : path.resolve(process.cwd(), serviceAccountEnv);
  return require(resolvedPath);
})();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ==== Express setup ============================================================
const app = express();
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',') || ['http://localhost:3000']
}));
app.use(express.json());

// ==== Helpers =================================================================
// PayPal API base URL - use sandbox for testing, production for live
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com');

console.log('[PayPal] 🌐 Using PayPal API base:', PAYPAL_API_BASE);
console.log('[PayPal] Environment:', process.env.NODE_ENV || 'development');

function getPayPalCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    process.env.REACT_APP_PAYPAL_CLIENT_ID ||
    process.env.VITE_PAYPAL_CLIENT_ID;
  const secret =
    process.env.PAYPAL_SECRET ||
    process.env.REACT_APP_PAYPAL_SECRET ||
    process.env.VITE_PAYPAL_SECRET;
  return { clientId, secret };
}

function assertEnvVars() {
  const { clientId, secret } = getPayPalCredentials();
  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_SECRET missing in environment.');
  }
  if (!process.env.PAYPAL_CLIENT_ID) {
    console.warn('[PayPal] PAYPAL_CLIENT_ID not set; falling back to a client-side variable. Add PAYPAL_CLIENT_ID to server/.env.');
  }
}

const allowOfflineAuthFallback =
  process.env.FIREBASE_AUTH_OFFLINE === 'true' || process.env.NODE_ENV !== 'production';

function decodeJwtWithoutVerification(idToken) {
  try {
    const [, payload = ''] = idToken.split('.');
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return {
      uid: json.user_id || json.sub || json.uid || 'dev-user',
      email: json.email || null,
      claims: json
    };
  } catch (error) {
    console.error('[Auth] Failed to decode JWT payload', error);
    throw new Error('Unable to decode Firebase token while offline.');
  }
}

async function verifyFirebaseIdToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Authorization header.');
  }
  const idToken = authHeader.replace('Bearer ', '').trim();
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (error) {
    const isDnsError =
      error?.message?.includes('getaddrinfo ENOTFOUND www.googleapis.com') ||
      error?.code === 'ENOTFOUND';

    if (isDnsError && allowOfflineAuthFallback) {
      console.warn(
        '[Auth] www.googleapis.com not reachable. Falling back to unsigned token parsing for local dev.'
      );
      return decodeJwtWithoutVerification(idToken);
    }

    if (isDnsError) {
      throw new Error(
        'Server cannot reach www.googleapis.com to verify Firebase ID tokens. Check your DNS / firewall.'
      );
    }
    throw error;
  }
}

async function getPayPalAccessToken() {
  assertEnvVars();
  const { clientId, secret } = getPayPalCredentials();
  
  if (!clientId || !secret) {
    console.error('[PayPal] ❌ Missing credentials:', { hasClientId: !!clientId, hasSecret: !!secret });
    throw new Error('PayPal credentials are missing. Check PAYPAL_CLIENT_ID and PAYPAL_SECRET environment variables.');
  }
  
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  console.log('[PayPal] 🔑 Requesting OAuth token from:', PAYPAL_API_BASE);
  console.log('[PayPal] Client ID (first 10 chars):', clientId.substring(0, 10) + '...');
  
  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[PayPal] ❌ Token error response:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(data, null, 2)
      });
      throw new Error(`Unable to authenticate with PayPal: ${data.error_description || data.error || 'Unknown error'}`);
    }
    console.log('[PayPal] ✅ OAuth token acquired. Expires in', data.expires_in, 'seconds');
    console.log('[PayPal] Token (first 20 chars):', data.access_token?.substring(0, 20) + '...');
    return data.access_token;
  } catch (error) {
    console.error('[PayPal] ❌ Token request failed:', {
      message: error.message,
      stack: error.stack,
      apiBase: PAYPAL_API_BASE
    });
    throw error;
  }
}

async function captureOrder(orderId, accessToken, expectedAmount) {
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[PayPal] capture error', data);
    const details = data?.details ? ` Details: ${JSON.stringify(data.details)}` : '';
    throw new Error(`${data?.name || 'PayPal capture error'}: ${data?.message || 'Failed to capture PayPal order.'}${details}`);
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture || capture.status !== 'COMPLETED') {
    throw new Error('PayPal capture did not complete.');
  }
  const capturedAmount = parseFloat(capture.amount?.value || '0');
  if (Math.abs(capturedAmount - expectedAmount) > 0.01) {
    throw new Error('Captured PayPal amount does not match the expected total.');
  }
  return {
    captureId: capture.id,
    currency: capture.amount.currency_code
  };
}

async function sendHostPayout({ accessToken, receiverEmail, amount, currency, listingTitle }) {
  console.log('[PayPal] 💸 sendHostPayout called with:', {
    receiverEmail,
    amount,
    currency,
    listingTitle,
    hasAccessToken: !!accessToken,
    accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING'
  });

  if (!receiverEmail) {
    console.error('[PayPal] ❌ Host PayPal email is missing');
    throw new Error('Host PayPal email is missing.');
  }
  if (!amount || amount <= 0) {
    console.error('[PayPal] ❌ Invalid payout amount:', amount);
    throw new Error('Invalid payout amount.');
  }
  if (!accessToken) {
    console.error('[PayPal] ❌ Access token is missing');
    throw new Error('PayPal access token is missing.');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(receiverEmail)) {
    console.error('[PayPal] ❌ Invalid email format:', receiverEmail);
    throw new Error(`Invalid PayPal email format: ${receiverEmail}`);
  }

  const batchId = `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const payload = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: 'You received a payout from T-Harbor',
      email_message: 'Thanks for hosting with us!'
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: currency || 'USD'
        },
        receiver: receiverEmail.trim().toLowerCase(),
        note: `Payout for ${listingTitle || 'booking'}`,
        sender_item_id: `payout_item_${Date.now()}`
      }
    ]
  };

  console.log('[PayPal] 📤 Sending payout request to:', `${PAYPAL_API_BASE}/v1/payments/payouts`);
  console.log('[PayPal] 📦 Full payout payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('[PayPal] 📥 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('[PayPal] 📥 Full response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[PayPal] ❌ PAYOUT FAILED:', {
        status: response.status,
        statusText: response.statusText,
        errorName: data?.name,
        errorMessage: data?.message,
        errorDetails: data?.details,
        fullResponse: JSON.stringify(data, null, 2)
      });
      
      const details = data?.details ? ` Details: ${JSON.stringify(data.details)}` : '';
      const errorMsg = `${data?.name || 'PayPal payout error'}: ${data?.message || 'Failed to send host payout.'}${details}`;
      throw new Error(errorMsg);
    }

    console.log('[PayPal] ✅ PAYOUT SUCCESS! Response:', JSON.stringify(data, null, 2));
    const txn = data.items?.[0];
    const batchStatus = data.batch_header?.batch_status;
    const transactionStatus = txn?.transaction_status;
    
    console.log('[PayPal] 📊 Payout status details:', {
      batchId: data.batch_header?.payout_batch_id,
      batchStatus,
      transactionStatus,
      receiverEmail,
      amount: amount.toFixed(2),
      currency,
      itemStatus: txn?.transaction_status,
      itemId: txn?.payout_item_id
    });
    
    return {
      payoutBatchId: data.batch_header?.payout_batch_id || null,
      payoutStatus: transactionStatus || batchStatus || 'SENT',
      rawResponse: data
    };
  } catch (error) {
    console.error('[PayPal] ❌ PAYOUT EXCEPTION:', {
      message: error.message,
      stack: error.stack,
      receiverEmail,
      amount,
      currency
    });
    throw error;
  }
}

// ==== Route ===================================================================
app.post('/api/payments/capture-and-payout', async (req, res) => {
  console.log('[Server] POST /api/payments/capture-and-payout hit');
  try {
    const authUser = await verifyFirebaseIdToken(req.headers.authorization);
    console.log('[Server] Authenticated request', {
      uid: authUser.uid,
      email: authUser.email
    });
    const {
      orderId,
      listingId,
      listingTitle,
      hostId,
      totalAmount
    } = req.body || {};
    console.log('[Server] Payload', { orderId, listingId, hostId, totalAmount });

    if (!orderId || !listingId || !hostId || !totalAmount) {
      console.warn('[Server] Missing booking payload fields');
      return res.status(400).json({ error: 'Missing orderId, listingId, hostId, or totalAmount.' });
    }

    const amountNumber = parseFloat(totalAmount);
    if (!amountNumber || amountNumber <= 0) {
      console.warn('[Server] Invalid amount', totalAmount);
      return res.status(400).json({ error: 'Invalid total amount.' });
    }

    console.log('[Server] 🔍 Looking up host PayPal email for hostId:', hostId);
    const hostDoc = await db.collection('users').doc(hostId).get();
    const hostData = hostDoc.exists ? hostDoc.data() : null;
    
    console.log('[Server] 📋 Host document data:', {
      exists: hostDoc.exists,
      hasPaypalEmail: Boolean(hostData?.paypalEmail),
      hasPaymentMethods: Boolean(hostData?.paymentMethods),
      hasPaymentMethodsPaypal: Boolean(hostData?.paymentMethods?.paypal),
      hasPaymentMethodsPaypalEmail: Boolean(hostData?.paymentMethods?.paypal?.email),
      paypalEmailValue: hostData?.paypalEmail || 'NOT SET',
      paymentMethodsPaypalEmailValue: hostData?.paymentMethods?.paypal?.email || 'NOT SET',
      allKeys: hostData ? Object.keys(hostData) : []
    });
    
    const hostPaypalEmail = hostData?.paypalEmail || hostData?.paymentMethods?.paypal?.email;
    
    console.log('[Server] ✅ Host PayPal email resolved:', {
      hostId,
      hostPaypalEmail: hostPaypalEmail || 'MISSING',
      source: hostData?.paypalEmail ? 'paypalEmail' : (hostData?.paymentMethods?.paypal?.email ? 'paymentMethods.paypal.email' : 'NONE')
    });
    
    if (!hostPaypalEmail || !hostPaypalEmail.trim()) {
      console.error('[Server] ❌ Host missing PayPal email:', {
        hostId,
        hostDataKeys: hostData ? Object.keys(hostData) : [],
        paypalEmail: hostData?.paypalEmail,
        paymentMethods: hostData?.paymentMethods
      });
      return res.status(400).json({ 
        error: 'Host has not configured a PayPal payout email yet.',
        hostId,
        debug: {
          hasPaypalEmail: Boolean(hostData?.paypalEmail),
          hasPaymentMethods: Boolean(hostData?.paymentMethods?.paypal?.email)
        }
      });
    }
    
    // Normalize email
    const normalizedEmail = hostPaypalEmail.trim().toLowerCase();
    console.log('[Server] 📧 Using normalized PayPal email:', normalizedEmail);

    const accessToken = await getPayPalAccessToken();
    console.log('[Server] Capturing PayPal order', orderId);
    const captureInfo = await captureOrder(orderId, accessToken, amountNumber);
    console.log('[Server] PayPal capture info', captureInfo);
    // Calculate fees: 5% admin, 95% host
    const adminFee = Math.round(amountNumber * 0.05 * 100) / 100; // Round to 2 decimals
    const hostPayout = Math.round((amountNumber - adminFee) * 100) / 100; // Round to 2 decimals
    
    console.log('[Server] 💰 Fee calculation:', {
      totalAmount: amountNumber.toFixed(2),
      adminFee: adminFee.toFixed(2),
      hostPayout: hostPayout.toFixed(2),
      adminPercentage: '5%',
      hostPercentage: '95%',
      verification: `${adminFee.toFixed(2)} + ${hostPayout.toFixed(2)} = ${(adminFee + hostPayout).toFixed(2)}`
    });

    let payoutInfo;
    try {
      console.log('[Server] 🚀 Initiating host payout:', {
        hostPaypalEmail: normalizedEmail,
        hostPayout: hostPayout.toFixed(2),
        currency: captureInfo.currency || 'USD',
        listingTitle: listingTitle || listingId,
        hostId,
        orderId,
        listingId,
        totalAmount: amountNumber.toFixed(2),
        adminFee: adminFee.toFixed(2)
      });
      payoutInfo = await sendHostPayout({
        accessToken,
        receiverEmail: normalizedEmail,
        amount: hostPayout,
        currency: captureInfo.currency || 'USD',
        listingTitle: listingTitle || listingId
      });
      console.log('[Server] ✅ Payout completed successfully:', {
        payoutBatchId: payoutInfo.payoutBatchId,
        payoutStatus: payoutInfo.payoutStatus,
        hostPayout: hostPayout.toFixed(2),
        hostPaypalEmail: normalizedEmail,
        hostId,
        listingId,
        orderId
      });
    } catch (payoutError) {
      console.error('[Server] ❌ Payout error:', {
        error: payoutError.message,
        errorStack: payoutError.stack,
        hostPaypalEmail: normalizedEmail,
        hostPayout: hostPayout.toFixed(2),
        hostId,
        listingId,
        orderId,
        totalAmount: amountNumber.toFixed(2)
      });
      if (/INSUFFICIENT_FUNDS/i.test(payoutError.message)) {
        console.warn('[Server] ⚠️ Payout skipped due to insufficient funds. Recording transaction as paid with payoutPending status.');
        payoutInfo = {
          payoutBatchId: null,
          payoutStatus: 'payoutPending',
          warning: payoutError.message
        };
      } else {
        // Still record the transaction even if payout fails, but mark it as failed
        console.error('[Server] 💥 Payout failed, but payment was captured. Transaction will be marked as payout-failed.');
        payoutInfo = {
          payoutBatchId: null,
          payoutStatus: 'payout-failed',
          error: payoutError.message
        };
        // Don't throw - we still want to save the transaction record
      }
    }

    const transactionData = {
      listingId,
      listingTitle: listingTitle || '',
      hostId,
      guestId: authUser.uid,
      totalAmount: amountNumber,
      adminFee,
      hostPayout,
      currency: captureInfo.currency || 'USD',
      status: payoutInfo.payoutStatus,
      payoutStatus: payoutInfo.payoutStatus, // Also store as payoutStatus for easier querying
      orderId,
      captureId: captureInfo.captureId,
      payoutBatchId: payoutInfo.payoutBatchId,
      hostPaypalEmail: normalizedEmail, // Store the email used for payout
      payoutError: payoutInfo.error || null,
      payoutWarning: payoutInfo.warning || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('[Server] 💾 Storing transaction:', JSON.stringify(transactionData, null, 2));
    const transactionRef = await db.collection('transactions').add(transactionData);
    console.log('[Server] ✅ Transaction stored with ID:', transactionRef.id);
    const responsePayload = {
      status: 'paid',
      payoutStatus: payoutInfo.payoutStatus,
      transactionId: transactionRef.id,
      adminFee,
      hostPayout,
      captureId: captureInfo.captureId,
      payoutBatchId: payoutInfo.payoutBatchId || null,
      hostPaypalEmail: normalizedEmail
    };
    
    // Include warnings and errors in response so frontend can display them
    if (payoutInfo.warning) {
      responsePayload.payoutWarning = payoutInfo.warning;
      console.warn('[Server] ⚠️ Payout warning included in response:', payoutInfo.warning);
    }
    if (payoutInfo.error) {
      responsePayload.payoutError = payoutInfo.error;
      console.error('[Server] ❌ Payout error included in response:', payoutInfo.error);
    }
    
    // Log final response
    console.log('[Server] 📤 Sending response to frontend:', JSON.stringify(responsePayload, null, 2));
    return res.json(responsePayload);
  } catch (error) {
    console.error('[payments] error', error);
    const statusCode = error.message === 'Missing Authorization header.' ? 401 : 500;
    return res.status(statusCode).json({ error: error.message || 'Payment failed.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const { clientId, secret } = getPayPalCredentials();
  res.json({
    status: 'ok',
    paypal: {
      apiBase: PAYPAL_API_BASE,
      hasClientId: !!clientId,
      hasSecret: !!secret,
      clientIdPreview: clientId ? clientId.substring(0, 10) + '...' : 'MISSING'
    },
    firebase: {
      initialized: admin.apps.length > 0
    }
  });
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 PayPal payments server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`💳 PayPal API: ${PAYPAL_API_BASE}`);
  console.log(`🔑 Credentials: ${getPayPalCredentials().clientId ? 'SET' : 'MISSING'}`);
});

