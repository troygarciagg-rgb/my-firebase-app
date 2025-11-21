import { useMemo, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

/**
 * Reusable PayPal checkout button that only creates the order on the client.
 * The actual capture + payout logic happens on the server after approval.
 *
 * Props:
 *  - amount: number (e.g. 199.99)
 *  - currency: string (default USD)
 *  - disabled: boolean
 *  - onApprove: async function called with PayPal data (orderID, payerID, etc.)
 *  - onError: function(error) called when PayPal JS emits an error
 */
export default function PayPalCheckoutButton({
  amount,
  currency = 'USD',
  disabled = false,
  onApprove,
  onError
}) {
  const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || import.meta?.env?.VITE_PAYPAL_CLIENT_ID;

  const paypalOptions = useMemo(() => ({
    'client-id': clientId || '',
    currency,
    intent: 'capture',
    components: 'buttons'
  }), [clientId, currency]);

  useEffect(() => {
    console.log('[PayPal] Script options updated', {
      hasClientId: Boolean(clientId),
      amount,
      currency
    });
  }, [clientId, amount, currency]);

  if (!clientId) {
    return (
      <div className="text-sm text-red-600">
        PayPal client ID is missing. Please set REACT_APP_PAYPAL_CLIENT_ID in your environment.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <div className="space-y-2">
        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
          forceReRender={[amount, currency, disabled]}
          fundingSource={undefined}
          disabled={disabled || !amount}
          createOrder={(_, actions) => (
            (function create() {
              console.log('[PayPal] CREATE ORDER start', {
                amount,
                currency
              });
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: Number(amount || 0).toFixed(2),
                      currency_code: currency
                    }
                  }
                ]
              }).then((orderId) => {
                console.log('[PayPal] CREATE ORDER success', { orderId });
                return orderId;
              }).catch((err) => {
                console.error('[PayPal] CREATE ORDER error', err);
                throw err;
              });
            })()
          )}
          onClick={(data, actions) => {
            console.log('[PayPal] BUTTON CLICKED', { data, amount, currency });
            return actions.resolve();
          }}
          onApprove={async (data) => {
            console.log('[PayPal] ON APPROVE triggered', data);
            try {
              console.log('[PayPal] Notifying onApprove handler');
              await onApprove?.(data);
            } catch (error) {
              console.error('[PayPal] onApprove handler error', error);
              onError?.(error);
            }
          }}
          onError={(error) => {
            console.error('[PayPalButtons] Error:', error);
            onError?.(error);
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}

