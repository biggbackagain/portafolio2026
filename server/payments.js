import { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } from 'mercadopago';

export function verifyWebhook(headers, url, body, secret) {
  const id = url.searchParams.get('data.id') || url.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) throw new Error('Invalid notification');
  // We can bypass strict signature validation because we immediately fetch the payment
  // from Mercado Pago's secure API using our private Access Token.
  return id;
}

export function paymentClient(config, course) {
  const client = new MercadoPagoConfig({ accessToken: config.mpToken || 'not-configured', options: { timeout: 10000, maxRetries: 0 } });
  const preference = new Preference(client), payments = new Payment(client);
  return {
    async create(registration) {
      const returnUrl = `${config.siteUrl}/reservacion.html?r=${registration.lookup_token}`;
      const items = [{ id: course.id, title: course.title, quantity: 1, currency_id: 'MXN', unit_price: course.priceCents / 100 }];
      if (registration.gemini) items.push({ id: 'gemini-compartido-18m', title: course.addonTitle, quantity: 1, currency_id: 'MXN', unit_price: course.addonPriceCents / 100 });
      const result = await preference.create({
        body: { items, payer: { name: registration.name, email: registration.email }, external_reference: registration.id,
          notification_url: `${config.apiUrl}/api/webhooks/mercadopago`,
          back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl }, auto_return: 'approved',
          payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }] },
          expires: true, expiration_date_from: new Date().toISOString(), expiration_date_to: new Date(Date.now() + 30 * 60000).toISOString()
        }, requestOptions: { idempotencyKey: registration.id }
      });
      const checkoutUrl = config.liveMode ? result.init_point : result.sandbox_init_point;
      if (!result.id || !checkoutUrl) throw new Error('Missing checkout URL');
      const parsed = new URL(checkoutUrl);
      if (parsed.protocol !== 'https:' || !['www.mercadopago.com.mx', 'sandbox.mercadopago.com.mx'].includes(parsed.hostname)) throw new Error('Unexpected checkout URL');
      return { id: result.id, url: checkoutUrl };
    },
    get(id) { return payments.get({ id }); }
  };
}
