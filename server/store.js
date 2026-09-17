import pg from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';

const { Pool } = pg;

export class Store {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY, course_id TEXT NOT NULL, request_key TEXT UNIQUE NOT NULL,
        lookup_token TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
        gemini INTEGER NOT NULL, total_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        preference_id TEXT, checkout_url TEXT, payment_id TEXT UNIQUE, payment_updated BIGINT NOT NULL DEFAULT 0,
        code TEXT UNIQUE, consent_at TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(course_id,email)
      );
      CREATE TABLE IF NOT EXISTS mail_outbox (
        id SERIAL PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES registrations(id),
        kind TEXT NOT NULL, version TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        sent_at TEXT, next_attempt BIGINT NOT NULL DEFAULT 0, last_error TEXT,
        UNIQUE(registration_id,kind,version)
      );
      CREATE TABLE IF NOT EXISTS payment_reviews (
        payment_id TEXT PRIMARY KEY, registration_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
      );
    `);
  }

  async getEnrollmentCount() {
    const res = await this.pool.query("SELECT COUNT(*) FROM registrations WHERE status = 'confirmed'");
    return parseInt(res.rows[0].count, 10);
  }

  async get(id) {
    const res = await this.pool.query('SELECT * FROM registrations WHERE id=$1', [id]);
    return res.rows[0];
  }

  async byToken(token) {
    const res = await this.pool.query('SELECT * FROM registrations WHERE lookup_token=$1', [token]);
    return res.rows[0];
  }

  async byCode(code, email) {
    const res = await this.pool.query('SELECT * FROM registrations WHERE code=$1 AND email=$2', [code, email]);
    return res.rows[0];
  }

  async counts(courseId) {
    const res = await this.pool.query('SELECT count(*) AS seats, coalesce(sum(gemini),0) AS addons FROM registrations WHERE course_id=$1', [courseId]);
    return { seats: Number(res.rows[0].seats), addons: Number(res.rows[0].addons) };
  }

  async reserve(input, course, addonCapacity) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resExisting = await client.query('SELECT * FROM registrations WHERE request_key=$1 OR (course_id=$2 AND email=$3)', [input.key, course.id, input.email]);
      const existing = resExisting.rows[0];
      if (existing) {
        if (existing.email !== input.email || existing.name !== input.name || !!existing.gemini !== input.gemini) throw new Error('Ya existe una solicitud con estos datos. Contacta al organizador si necesitas modificarla.');
        if (existing.code) throw new Error('Este correo ya tiene una reservación. Consulta tu correo o contacta al organizador.');
        await client.query('COMMIT'); return existing;
      }
      const countsRes = await client.query('SELECT count(*) AS seats, coalesce(sum(gemini),0) AS addons FROM registrations WHERE course_id=$1', [course.id]);
      const counts = { seats: Number(countsRes.rows[0].seats), addons: Number(countsRes.rows[0].addons) };
      if (counts.seats >= course.capacity) throw new Error('No hay lugares disponibles por ahora.');
      if (input.gemini && counts.addons >= addonCapacity) throw new Error('No hay invitaciones de Gemini disponibles. Puedes inscribirte solo al curso.');
      
      const id = randomUUID(), token = randomBytes(32).toString('hex'), now = new Date().toISOString();
      const total = course.priceCents + (input.gemini ? course.addonPriceCents : 0);
      await client.query(`INSERT INTO registrations (id,course_id,request_key,lookup_token,name,email,gemini,total_cents,consent_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, course.id, input.key, token, input.name, input.email, Number(input.gemini), total, now, now]);
      await client.query('COMMIT'); 
      return (await client.query('SELECT * FROM registrations WHERE id=$1', [id])).rows[0];
    } catch (error) { 
      await client.query('ROLLBACK'); throw error; 
    } finally { 
      client.release(); 
    }
  }

  async setCheckout(id, preferenceId, url) { 
    await this.pool.query('UPDATE registrations SET preference_id=$1,checkout_url=$2 WHERE id=$3', [preferenceId, url, id]); 
  }

  async addMail(client, id, kind, version, payload) {
    await client.query('INSERT INTO mail_outbox (registration_id,kind,version,payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, kind, version, JSON.stringify(payload)]);
  }

  async recordPayment(payment, expected) {
    const registration = await this.get(payment.external_reference);
    if (!registration) return { ignored: true };
    if (!Number.isFinite(Number(payment.transaction_amount)) || Math.round(Number(payment.transaction_amount) * 100) !== registration.total_cents ||
      payment.currency_id !== 'MXN' || String(payment.collector_id) !== String(expected.collectorId) || payment.live_mode !== expected.liveMode) {
      throw new Error('Payment verification mismatch');
    }
    const updated = Date.parse(payment.date_last_updated);
    if (!Number.isFinite(updated)) throw new Error('Invalid payment update date');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query('SELECT * FROM registrations WHERE id=$1 FOR UPDATE', [registration.id]);
      const current = currentRes.rows[0];
      const paymentId = String(payment.id);
      if (current.payment_id && current.payment_id !== paymentId && current.code) {
        await client.query('INSERT INTO payment_reviews VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [paymentId, current.id, 'Additional payment for an existing reservation', new Date().toISOString()]);
        await this.addMail(client, current.id, 'owner-review', paymentId, { ...current, note: 'Revisar un pago adicional para la misma reservación. No se ha emitido otro código.', additional_payment_id: paymentId });
        await client.query('COMMIT'); return { review: true };
      }
      if (current.payment_id === paymentId && updated <= Number(current.payment_updated)) { await client.query('COMMIT'); return { duplicate: true }; }
      
      const hasRefund = Number(payment.transaction_amount_refunded || 0) > 0;
      const status = hasRefund ? 'refunded' : ({ approved: 'confirmed', refunded: 'refunded', charged_back: 'charged_back', cancelled: 'cancelled', rejected: 'rejected' }[payment.status] || 'pending');
      const code = current.code || (status === 'confirmed' ? 'IA-' + randomBytes(10).toString('hex').toUpperCase().match(/.{1,4}/g).join('-') : null);
      
      if (current.code && status === 'pending') { await client.query('COMMIT'); return { ignored: true }; }
      await client.query('UPDATE registrations SET status=$1,payment_id=$2,payment_updated=$3,code=$4 WHERE id=$5', [status, paymentId, updated, code, current.id]);
      
      const finalRes = await client.query('SELECT * FROM registrations WHERE id=$1', [current.id]);
      const final = finalRes.rows[0];
      
      if (status === 'confirmed' && !current.code) {
        await this.addMail(client, current.id, 'student', 'confirmation', final);
        await this.addMail(client, current.id, 'owner', 'confirmation', final);
      } else if (current.code && status !== current.status) {
        await this.addMail(client, current.id, 'student-update', `${paymentId}-${updated}`, final);
        await this.addMail(client, current.id, 'owner-update', `${paymentId}-${updated}`, final);
      }
      await client.query('COMMIT'); return { status, code };
    } catch (error) { 
      await client.query('ROLLBACK'); throw error; 
    } finally { 
      client.release(); 
    }
  }

  async pendingMail() { 
    const res = await this.pool.query(`
      SELECT m.id, m.kind, m.payload, m.attempts, r.email, r.name, r.code, r.lookup_token, r.gemini, r.status, r.total_cents
      FROM mail_outbox m JOIN registrations r ON m.registration_id = r.id
      WHERE m.sent_at IS NULL AND m.next_attempt <= $1 AND m.kind LIKE 'student%'
      UNION ALL
      SELECT m.id, m.kind, m.payload, m.attempts, r.email, r.name, r.code, r.lookup_token, r.gemini, r.status, r.total_cents
      FROM mail_outbox m JOIN registrations r ON m.registration_id = r.id
      WHERE m.sent_at IS NULL AND m.next_attempt <= $1 AND m.kind LIKE 'owner%'
      ORDER BY id LIMIT 10
    `, [Date.now()]);
    return res.rows.map(row => ({...row, payload: JSON.parse(row.payload)}));
  }

  async mailSent(id) { await this.pool.query('UPDATE mail_outbox SET sent_at=$1,last_error=NULL WHERE id=$2', [new Date().toISOString(), id]); }
  
  async mailFailed(id, attempts) { 
    await this.pool.query('UPDATE mail_outbox SET attempts=attempts+1,next_attempt=$1,last_error=$2 WHERE id=$3', 
      [Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(attempts, 6)), 'Delivery failed; retry scheduled', id]); 
  }
  
  async all() { 
    const res = await this.pool.query('SELECT name,email,code,status,gemini,total_cents,payment_id,created_at FROM registrations ORDER BY created_at'); 
    return res.rows;
  }
  
  async close() { await this.pool.end(); }
}
