import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { verifyWebhook } from './payments.js';

export function enrollmentReady(config) {
  return Boolean(config.open && config.detailsConfirmed && config.mpToken && config.webhookSecret && config.collectorId &&
    config.emailService && config.emailPublicKey && config.studentTemplate && config.ownerTemplate && config.organizerEmail &&
    config.courseDate && config.courseDate !== 'Por definir' && config.courseLocation && config.courseLocation !== 'Por definir' &&
    (config.siteUrl.startsWith('https://') || config.siteUrl.startsWith('http://127.0.0.1')) && 
    (config.apiUrl.startsWith('https://') || config.apiUrl.startsWith('http://127.0.0.1')));
}
export function validateRegistration(data, key) {
  if (!data || typeof data !== 'object' || typeof data.name !== 'string' || typeof data.email !== 'string' || typeof data.gemini !== 'boolean' || data.consent !== true) throw new Error('Revisa tus datos y acepta las condiciones del curso.');
  const name = data.name.trim(), email = data.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 100 || /[\x00-\x1f<>]/.test(name) || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('Escribe un nombre y un correo válidos.');
  if (!/^[a-f0-9-]{36}$/i.test(key || '')) throw new Error('Recarga la página e intenta de nuevo.');
  return { name, email, gemini: data.gemini, key };
}
const publicReservation = (row, course, config) => ({ status: row.status, code: row.code, courseTitle: course.title,
  gemini: !!row.gemini, totalCents: row.total_cents, date: config.courseDate, location: config.courseLocation });
async function readJson(request) {
  let bytes = 0, chunks = [];
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 12000) throw new Error('Request too large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createHandler({ store, course, config, payments, root }) {
  const limits = new Map(), inFlight = new Map();
  const staticPages = new Set(['index.html', 'curso-ia.html', 'reservacion.html', 'robots.txt', 'sitemap.xml', 'CNAME']);
  const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  function limited(ip) {
    const now = Date.now();
    if (limits.size > 5000) for (const [key, item] of limits) if (item.until < now) limits.delete(key);
    if (limits.size > 10000) return true;
    const item = limits.get(ip);
    if (!item || item.until < now) { limits.set(ip, { count: 1, until: now + 60000 }); return false; }
    return ++item.count > 30;
  }
  return async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const url = new URL(req.url, 'http://localhost');
    const origin = req.headers.origin;
    if (origin === config.siteUrl) {
      res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Idempotency-Key,Bypass-Tunnel-Reminder');
    }
    if (req.method === 'OPTIONS') { res.writeHead(origin === config.siteUrl ? 204 : 403); return res.end(); }
    try {
      if (url.pathname.startsWith('/api/')) {
        const webhook = url.pathname === '/api/webhooks/mercadopago';
        if (!webhook && limited(req.socket.remoteAddress || 'unknown')) return json(res, 429, { message: 'Demasiadas solicitudes. Espera un minuto.' });
        if (req.method === 'POST' && !webhook && origin !== config.siteUrl) return json(res, 403, { message: 'Origen no permitido.' });
        if (req.method === 'GET' && url.pathname === '/api/course') {
          const counts = await store.counts(course.id), ready = enrollmentReady(config), available = ready && counts.seats < course.capacity;
          const enrolledCount = await store.getEnrollmentCount();
          return json(res, 200, { ...course, date: config.courseDate, location: config.courseLocation, enrollmentOpen: available,
            addonAvailable: available && counts.addons < config.addonCapacity,
            enrolledCount,
            message: !ready ? 'Fecha y sede por definir. Las inscripciones y los pagos aún no están habilitados.' :
              !available ? 'No hay lugares disponibles por ahora. Contacta al organizador.' : 'Inscripciones abiertas. Tu lugar se confirma al acreditarse el pago.' });
        if (req.method === 'POST' && url.pathname === '/api/registrations') {
          if (!enrollmentReady(config)) return json(res, 503, { message: 'Las inscripciones todavía no están habilitadas.' });
          let input;
          try { input = validateRegistration(await readJson(req), req.headers['idempotency-key']); }
          catch (error) { return json(res, 400, { message: error.message }); }
          let registration;
          try { registration = await store.reserve(input, course, config.addonCapacity); }
          catch (error) { return json(res, 409, { message: error.message }); }
          if (registration.checkout_url) return json(res, 200, { checkoutUrl: registration.checkout_url });
          // Share a single preference request for concurrent retries of one registration.
          if (!inFlight.has(registration.id)) {
            inFlight.set(registration.id, payments.create(registration).then(async (result) => {
              await store.setCheckout(registration.id, result.id, result.url); return result.url;
            }).finally(() => inFlight.delete(registration.id)));
          }
          const checkoutUrl = await inFlight.get(registration.id);
          return json(res, 201, { checkoutUrl });
        }
        if (req.method === 'POST' && webhook) {
          let id;
          try { id = verifyWebhook(req.headers, url, await readJson(req), config.webhookSecret); }
          catch (_) { return json(res, 401, { message: 'Invalid notification' }); }
          const payment = await payments.get(id);
          if (String(payment.id) !== id) throw new Error('Mismatched payment ID');
          await store.recordPayment(payment, { collectorId: config.collectorId, liveMode: config.liveMode });
          // Mail is persisted in the same transaction; delivery does not delay the webhook ACK.
          return json(res, 200, { received: true });
        }
        if (req.method === 'GET' && url.pathname === '/api/reservation-status') {
          const token = url.searchParams.get('r') || '';
          const row = /^[a-f0-9]{64}$/.test(token) ? await store.byToken(token) : null;
          return row ? json(res, 200, publicReservation(row, course, config)) : json(res, 404, { message: 'No se encontró una reservación con estos datos.' });
        }
        if (req.method === 'POST' && url.pathname === '/api/reservations/lookup') {
          const data = await readJson(req);
          const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
          const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
          const row = /^IA-(?:[A-F0-9]{4}-){4}[A-F0-9]{4}$/.test(code) && email.length <= 254 ? await store.byCode(code, email) : null;
          return row ? json(res, 200, publicReservation(row, course, config)) : json(res, 404, { message: 'No se encontró una reservación con estos datos. Revisa el código y el correo.' });
        }
        if (req.method === 'GET' && url.pathname === '/api/reservations/report') {
          if (!config.reportKey || url.searchParams.get('key') !== config.reportKey) return json(res, 403, { message: 'Forbidden' });
          const rows = await store.all();
          const csv = ['Name,Email,Code,Status,Gemini,MXN,PaymentID,Date\n'].concat(rows.map(r => 
            `"${r.name.replace(/"/g, '""')}","${r.email}",${r.code || ''},${r.status},${r.gemini ? 'Yes' : 'No'},${(r.total_cents / 100).toFixed(2)},${r.payment_id || ''},${r.created_at}`
          )).join('\n');
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reservations.csv"' });
          return void res.end(csv);
        }
        return json(res, 404, { message: 'Servicio no encontrado.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      const relative = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      const path = resolve(root, relative);
      const allowedAsset = relative.startsWith('assets/') && ['.css','.js','.json','.png','.jpg','.jpeg','.svg','.pdf'].includes(extname(relative));
      if (!path.startsWith(root + sep) || (!staticPages.has(relative) && !allowedAsset)) { res.writeHead(404); return res.end('Not found'); }
      let file; try { file = await readFile(path); } catch (_) { res.writeHead(404); return res.end('Not found'); }
      const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.xml':'application/xml','.txt':'text/plain' };
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'text/plain' });
      res.end(req.method === 'HEAD' ? undefined : file);
    } catch (_) { json(res, 503, { message: 'No fue posible completar la solicitud. Puedes reintentar o contactar al organizador.' }); }
  };
}
