import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function PaymentMethods() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [storedEmail, setStoredEmail] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const detectedEmail =
            data?.paypalEmail ||
            data?.paymentMethods?.paypal?.email ||
            '';
          setPaypalEmail(detectedEmail);
          setConfirmEmail(detectedEmail);
          setStoredEmail(detectedEmail);
        }
      } catch (error) {
        console.error('Error loading payout email:', error);
        setErrorMessage('Failed to load payout email. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    const trimmedEmail = paypalEmail.trim();
    const trimmedConfirm = confirmEmail.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please provide a valid PayPal email.');
      setSaving(false);
      return;
    }

    if (trimmedEmail !== trimmedConfirm) {
      setErrorMessage('Email confirmation does not match.');
      setSaving(false);
      return;
    }

    if (trimmedEmail === storedEmail) {
      setSuccessMessage('No changes detected — PayPal email is already up to date.');
      setSaving(false);
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          paymentMethods: {
            paypal: {
              enabled: true,
              email: trimmedEmail
            }
          },
          paypalEmail: trimmedEmail
        },
        { merge: true }
      );

      setStoredEmail(trimmedEmail);
      setSuccessMessage('PayPal payout email saved successfully.');
    } catch (error) {
      console.error('Error saving payout email:', error);
      setErrorMessage(`Failed to save payout email: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!currentUser) return;
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          paymentMethods: {
            paypal: {
              enabled: false,
              email: ''
            }
          },
          paypalEmail: deleteField()
        },
        { merge: true }
      );

      setPaypalEmail('');
      setConfirmEmail('');
      setStoredEmail('');
      setSuccessMessage('PayPal payout email removed.');
    } catch (error) {
      console.error('Error removing payout email:', error);
      setErrorMessage(`Failed to remove payout email: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="host" />
          <div className="flex-1 p-8 bg-gray-50 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payout settings…</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar role="host" />
        <div className="flex-1 p-6 md:p-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.4em] text-blue-500">
                Payout destination
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                PayPal Payout Settings
              </h1>
              <p className="text-gray-600 mt-3">
                Guests pay the platform. We immediately send you 95% of each booking to the PayPal
                address you save here. Make sure this address is a verified PayPal account you own.
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                <ul className="list-disc ml-5 space-y-1">
                  <li>The email must belong to an active PayPal account (sandbox for testing).</li>
                  <li>We’ll automatically transfer 95% of every booking to this email via PayPal Payouts.</li>
                  <li>Changing this email affects future payouts only.</li>
                </ul>
              </div>
            </div>

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-2xl text-sm">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl text-sm">
                {errorMessage}
              </div>
            )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PayPal payout email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="host-paypal@example.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm PayPal email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Re-enter the same email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save PayPal email'}
              </button>
              {storedEmail && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Remove payout email
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

