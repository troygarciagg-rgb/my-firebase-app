/**
 * Firebase Cloud Functions
 *  - OTP email verification (existing)
 *  - PayPal capture + payout flow for bookings
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Email transporter configuration
// Replace with your email service credentials
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // or 'sendgrid', 'smtp', etc.
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password'
  }
});

// Alternative: Use SendGrid
// const emailTransporter = nodemailer.createTransport({
//   host: 'smtp.sendgrid.net',
//   port: 587,
//   auth: {
//     user: 'apikey',
//     pass: functions.config().sendgrid?.api_key
//   }
// });

/**
 * Generate and send OTP code
 * 
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @param {string} userName - User name (optional)
 * @returns {Promise<{success: boolean, message: string, otp?: string}>}
 */
async function generateOtp(uid, email, userName = 'User') {
  try {
    console.log(`[generateOtp] Starting for uid: ${uid}, email: ${email}`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    );

    console.log(`[generateOtp] Generated OTP: ${otp} for ${email}`);

    // Get or create user document
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[generateOtp] User document not found, creating...`);
      // Create user document if it doesn't exist
      await userRef.set({
        uid,
        email,
        emailVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Update user document with OTP
    await userRef.update({
      verificationCode: otp,
      verificationExpires: expiresAt,
      otpAttempts: 0,
      otpLastSent: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[generateOtp] OTP stored in Firestore for ${uid}`);

    // Send email
    try {
      const mailOptions = {
        from: `"T-Harbor" <${functions.config().email?.user || 'noreply@tharbor.com'}>`,
        to: email,
        subject: 'T-Harbor - Email Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>T-Harbor</h1>
                <p>Email Verification</p>
              </div>
              <div class="content">
                <h2>Hello ${userName},</h2>
                <p>Thank you for registering with T-Harbor. Please use the verification code below to verify your email address:</p>
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                <p><strong>This code will expire in 30 minutes.</strong></p>
                <p>If you didn't request this code, please ignore this email.</p>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} T-Harbor. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          T-Harbor - Email Verification Code
          
          Hello ${userName},
          
          Thank you for registering with T-Harbor. Please use the verification code below to verify your email address:
          
          Verification Code: ${otp}
          
          This code will expire in 30 minutes.
          
          If you didn't request this code, please ignore this email.
          
          © ${new Date().getFullYear()} T-Harbor. All rights reserved.
        `
      };

      await emailTransporter.sendMail(mailOptions);
      console.log(`[generateOtp] Email sent successfully to ${email}`);

      return {
        success: true,
        message: 'OTP sent successfully to your email',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only return OTP in dev
      };
    } catch (emailError) {
      console.error(`[generateOtp] Email sending failed:`, emailError);
      // Don't fail the function if email fails - OTP is still stored
      // In production, you might want to use a queue system
      return {
        success: true,
        message: 'OTP generated. Email sending may have failed. Please check your email or request a new code.',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      };
    }
  } catch (error) {
    console.error(`[generateOtp] Error:`, error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate OTP: ${error.message}`
    );
  }
}

/**
 * Verify OTP code
 * 
 * @param {string} uid - User ID
 * @param {string} inputCode - OTP code entered by user
 * @returns {Promise<{success: boolean, message: string, verified?: boolean}>}
 */
async function verifyOtp(uid, inputCode) {
  try {
    console.log(`[verifyOtp] Starting for uid: ${uid}, code: ${inputCode}`);

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[verifyOtp] User document not found for uid: ${uid}`);
      throw new functions.https.HttpsError(
        'not-found',
        'User account not found. Please register again.'
      );
    }

    const userData = userDoc.data();
    const storedOtp = userData.verificationCode;
    const expiresAt = userData.verificationExpires;
    const attempts = userData.otpAttempts || 0;

    // Check if OTP exists
    if (!storedOtp) {
      console.log(`[verifyOtp] No OTP found for uid: ${uid}`);
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No verification code found. Please request a new code.'
      );
    }

    // Check attempts limit (max 5 attempts)
    if (attempts >= 5) {
      console.log(`[verifyOtp] Too many attempts for uid: ${uid}`);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many failed attempts. Please request a new verification code.'
      );
    }

    // Check if expired
    const now = admin.firestore.Timestamp.now();
    if (expiresAt && now.toMillis() > expiresAt.toMillis()) {
      console.log(`[verifyOtp] OTP expired for uid: ${uid}`);
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'Verification code expired. Please request a new one.'
      );
    }

    // Check if code matches
    if (storedOtp !== inputCode) {
      console.log(`[verifyOtp] Invalid code for uid: ${uid}`);
      // Increment attempts
      await userRef.update({
        otpAttempts: admin.firestore.FieldValue.increment(1)
      });

      const remainingAttempts = 5 - (attempts + 1);
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Incorrect code. You have ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} left.`
      );
    }

    // OTP is valid - mark user as verified
    console.log(`[verifyOtp] OTP verified successfully for uid: ${uid}`);
    await userRef.update({
      emailVerified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationCode: null,
      verificationExpires: null,
      otpAttempts: null
    });

    return {
      success: true,
      message: 'Email verified successfully!',
      verified: true
    };
  } catch (error) {
    console.error(`[verifyOtp] Error:`, error);
    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Wrap other errors
    throw new functions.https.HttpsError(
      'internal',
      `Failed to verify OTP: ${error.message}`
    );
  }
}

/**
 * Resend OTP code
 * 
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @param {string} userName - User name (optional)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function resendOtp(uid, email, userName = 'User') {
  try {
    console.log(`[resendOtp] Starting for uid: ${uid}, email: ${email}`);

    // Check if user document exists
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[resendOtp] User document not found, creating...`);
      // Create user document if it doesn't exist
      await userRef.set({
        uid,
        email,
        emailVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Generate new OTP (reuse generateOtp logic)
    return await generateOtp(uid, email, userName);
  } catch (error) {
    console.error(`[resendOtp] Error:`, error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to resend OTP: ${error.message}`
    );
  }
}

// Cloud Functions exports
exports.generateOtp = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate OTP'
    );
  }

  const { email, userName } = data;
  const uid = context.auth.uid;

  if (!email) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required'
    );
  }

  return await generateOtp(uid, email, userName);
});

exports.verifyOtp = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to verify OTP'
    );
  }

  const { code } = data;
  const uid = context.auth.uid;

  if (!code || code.length !== 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid 6-digit code is required'
    );
  }

  return await verifyOtp(uid, code);
});

exports.resendOtp = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to resend OTP'
    );
  }

  const { email, userName } = data;
  const uid = context.auth.uid;

  if (!email) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required'
    );
  }

  return await resendOtp(uid, email, userName);
});

/**
 * -----------------------------------------------------------------------------
 * PayPal Booking Capture + Host Payout
 * -----------------------------------------------------------------------------
 */
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || functions.config().paypal?.client_id;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || functions.config().paypal?.secret;

function ensurePayPalConfig() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    console.error('[PayPal] Missing client ID or secret in environment variables.');
    throw new functions.https.HttpsError(
      'failed-precondition',
      'PayPal is not configured on the server. Please contact support.'
    );
  }
}

async function getPayPalAccessToken() {
  ensurePayPalConfig();
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[PayPal] Failed to get access token', data);
    throw new functions.https.HttpsError('internal', 'Unable to authenticate with PayPal.');
  }

  return data.access_token;
}

async function capturePayPalOrder(orderId, accessToken) {
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[PayPal] Capture failed', data);
    throw new functions.https.HttpsError('aborted', data?.message || 'Failed to capture PayPal order.');
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture || capture.status !== 'COMPLETED') {
    console.error('[PayPal] Capture incomplete', capture);
    throw new functions.https.HttpsError('aborted', 'PayPal did not complete the capture.');
  }

  return {
    capture,
    payerEmail: data.payer?.email_address || null,
    currency: capture.amount?.currency_code || 'USD'
  };
}

async function sendPayPalPayout(accessToken, {
  receiverEmail,
  amount,
  currency,
  listingId,
  listingTitle,
  guestId
}) {
  const payload = {
    sender_batch_header: {
      sender_batch_id: `payout_${Date.now()}`,
      email_subject: 'You have received a payout from T-Harbor',
      email_message: 'Thanks for hosting with T-Harbor!'
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency_code: currency
        },
        receiver: receiverEmail,
        note: `Payout for listing ${listingTitle || listingId} (guest: ${guestId})`,
        sender_item_id: `listing_${listingId}_${Date.now()}`
      }
    ]
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[PayPal] Payout failed', data);
    throw new Error(data?.message || 'Failed to trigger PayPal payout.');
  }

  const payoutItem = data.items?.[0];
  return {
    batchId: data.batch_header?.payout_batch_id || null,
    transactionStatus: payoutItem?.transaction_status || data.batch_header?.batch_status || 'SENT'
  };
}

const roundToTwo = (value) => Math.round(value * 100) / 100;

exports.processBookingPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to pay for a booking.');
  }

  const {
    orderId,
    listingId,
    hostId,
    listingTitle,
    totalAmount
  } = data || {};

  if (!orderId || !listingId || !hostId || !totalAmount) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing orderId, listingId, hostId, or amount.');
  }

  const amountNumber = Number(totalAmount);
  if (Number.isNaN(amountNumber) || amountNumber <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Total amount must be a positive number.');
  }

  const hostDoc = await db.collection('users').doc(hostId).get();
  if (!hostDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Host profile not found.');
  }

  const hostData = hostDoc.data();
  const hostPaypalEmail = hostData.paypalEmail || hostData.paymentMethods?.paypal?.email;
  if (!hostPaypalEmail) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Host has not provided a PayPal payout email yet. Please contact support.'
    );
  }

  const accessToken = await getPayPalAccessToken();
  const captureResult = await capturePayPalOrder(orderId, accessToken);
  const capturedAmount = Number(captureResult.capture.amount?.value || '0');
  const currency = captureResult.currency || 'USD';

  if (Math.abs(capturedAmount - amountNumber) > 0.01) {
    console.error('[PayPal] Captured amount mismatch', {
      capturedAmount,
      amountNumber
    });
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Captured PayPal amount does not match the expected total. Payment aborted.'
    );
  }

  const adminFee = roundToTwo(amountNumber * 0.05);
  const hostPayout = roundToTwo(amountNumber - adminFee);

  let payoutStatus = 'payout-sent';
  let payoutBatchId = null;
  let payoutError = '';

  try {
    const payoutResult = await sendPayPalPayout(accessToken, {
      receiverEmail: hostPaypalEmail,
      amount: hostPayout,
      currency,
      listingId,
      listingTitle,
      guestId: context.auth.uid
    });
    payoutStatus = payoutResult.transactionStatus || payoutStatus;
    payoutBatchId = payoutResult.batchId;
  } catch (error) {
    payoutStatus = 'payout-failed';
    payoutError = error.message || 'Unknown payout failure.';
  }

  const transactionRecord = {
    listingId,
    listingTitle: listingTitle || '',
    hostId,
    guestId: context.auth.uid,
    totalAmount: amountNumber,
    currency,
    adminFee,
    hostPayout,
    status: payoutStatus,
    orderId,
    captureId: captureResult.capture.id,
    payoutBatchId: payoutBatchId || null,
    payoutError: payoutError || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const transactionRef = await db.collection('transactions').add(transactionRecord);

  if (payoutStatus === 'payout-failed') {
    console.error('[PayPal] Payout failed after capture', {
      transactionId: transactionRef.id,
      payoutError
    });
    throw new functions.https.HttpsError(
      'aborted',
      'Payment captured, but automatic payout to the host failed. Support has been notified.',
      {
        transactionId: transactionRef.id,
        payoutStatus
      }
    );
  }

  return {
    transactionId: transactionRef.id,
    captureId: captureResult.capture.id,
    payoutStatus,
    adminFee,
    hostPayout,
    currency
  };
});

