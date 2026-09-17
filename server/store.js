import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY, course_id TEXT NOT NULL, request_key TEXT UNIQUE NOT NULL,
        lookup_token TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
        gemini INTEGER NOT NULL, total_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        preference_id TEXT, checkout_url TEXT, payment_id TEXT UNIQUE, payment_updated INTEGER NOT NULL DEFAULT 0,
        code TEXT UNIQUE, consent_at TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(course_id,email)
      );
      CREATE TABLE IF NOT EXISTS mail_outbox (
        id INTEGER PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES registrations(id),
        kind TEXT NOT NULL, version TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        sent_at TEXT, next_attempt INTEGER NOT NULL DEFAULT 0, last_error TEXT,
        UNIQUE(registration_id,kind,version)
      );
      CREATE TABLE IF NOT EXISTS payment_reviews (
        payment_id TEXT PRIMARY KEY, registration_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
      );`);
  }
  get(id) { return this.db.prepare('SELECT * FROM registrations WHERE id=?').get(id); }
  byToken(token) { return this.db.prepare('SELECT * FROM registrations WHERE lookup_token=?').get(token); }
  byCode(code, email) { return this.db.prepare('SELECT * FROM registrations WHERE code=? AND email=?').get(code, email); }
  counts(courseId) {
    // Pending checkouts hold a seat too. Never release based solely on a browser redirect.
    return this.db.prepare('SELECT count(*) AS seats, coalesce(sum(gemini),0) AS addons FROM registrations WHERE course_id=?').get(courseId);
  }
  reserve(input, course, addonCapacity) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT * FROM registrations WHERE request_key=? OR (course_id=? AND email=?)').get(input.key, course.id, input.email);
      if (existing) {
        if (existing.email !== input.email || existing.name !== input.name || !!existing.gemini !== input.gemini) throw new Error('Ya existe una solicitud con estos datos. Contacta al organizador si necesitas modificarla.');
        if (existing.code) throw new Error('Este correo ya tiene una reservación. Consulta tu correo o contacta al organizador.');
        this.db.exec('COMMIT'); return existing;
      }
      const counts = this.counts(course.id);
      if (counts.seats >= course.capacity) throw new Error('No hay lugares disponibles por ahora.');
      if (input.gemini && counts.addons >= addonCapacity) throw new Error('No hay invitaciones de Gemini disponibles. Puedes inscribirte solo al curso.');
      const id = randomUUID(), token = randomBytes(32).toString('hex'), now = new Date().toISOString();
      const total = course.priceCents + (input.gemini ? course.addonPriceCents : 0);
      this.db.prepare(`INSERT INTO registrations (id,course_id,request_key,lookup_token,name,email,gemini,total_cents,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, course.id, input.key, token, input.name, input.email, Number(input.gemini), total, now, now);
      this.db.exec('COMMIT'); return this.get(id);
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  setCheckout(id, preferenceId, url) { this.db.prepare('UPDATE registrations SET preference_id=?,checkout_url=? WHERE id=?').run(preferenceId, url, id); }
  addMail(id, kind, version, payload) {
    this.db.prepare('INSERT OR IGNORE INTO mail_outbox (registration_id,kind,version,payload) VALUES (?,?,?,?)').run(id, kind, version, JSON.stringify(payload));
  }
  recordPayment(payment, expected) {
    const registration = this.get(payment.external_reference);
    if (!registration) return { ignored: true };
    if (!Number.isFinite(Number(payment.transaction_amount)) || Math.round(Number(payment.transaction_amount) * 100) !== registration.total_cents ||
      payment.currency_id !== 'MXN' || String(payment.collector_id) !== String(expected.collectorId) || payment.live_mode !== expected.liveMode) {
      throw new Error('Payment verification mismatch');
    }
    const updated = Date.parse(payment.date_last_updated);
    if (!Number.isFinite(updated)) throw new Error('Invalid payment update date');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.get(registration.id);
      const paymentId = String(payment.id);
      if (current.payment_id && current.payment_id !== paymentId && current.code) {
        this.db.prepare('INSERT OR IGNORE INTO payment_reviews VALUES (?,?,?,?)').run(paymentId, current.id, 'Additional payment for an existing reservation', new Date().toISOString());
        this.addMail(current.id, 'owner-review', paymentId, { ...current, note: 'Revisar un pago adicional para la misma reservación. No se ha emitido otro código.', additional_payment_id: paymentId });
        this.db.exec('COMMIT'); return { review: true };
      }
      if (current.payment_id === paymentId && updated <= current.payment_updated) { this.db.exec('COMMIT'); return { duplicate: true }; }
      const hasRefund = Number(payment.transaction_amount_refunded || 0) > 0;
      const status = hasRefund ? 'refunded' : ({ approved: 'confirmed', refunded: 'refunded', charged_back: 'charged_back', cancelled: 'cancelled', rejected: 'rejected' }[payment.status] || 'pending');
      const code = current.code || (status === 'confirmed' ? 'IA-' + randomBytes(10).toString('hex').toUpperCase().match(/.{1,4}/g).join('-') : null);
      // An old pending notification must not revoke an already confirmed reservation.
      if (current.code && status === 'pending') { this.db.exec('COMMIT'); return { ignored: true }; }
      this.db.prepare('UPDATE registrations SET status=?,payment_id=?,payment_updated=?,code=? WHERE id=?').run(status, paymentId, updated, code, current.id);
      const final = this.get(current.id);
      if (status === 'confirmed' && !current.code) {
        this.addMail(current.id, 'student', 'confirmation', final);
        this.addMail(current.id, 'owner', 'confirmation', final);
      } else if (current.code && status !== current.status) {
        this.addMail(current.id, 'student-update', `${paymentId}-${updated}`, final);
        this.addMail(current.id, 'owner-update', `${paymentId}-${updated}`, final);
      }
      this.db.exec('COMMIT'); return { status, code };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  dueMail() { return this.db.prepare('SELECT * FROM mail_outbox WHERE sent_at IS NULL AND next_attempt<=? ORDER BY id LIMIT 10').all(Date.now()); }
  mailSent(id) { this.db.prepare('UPDATE mail_outbox SET sent_at=?,last_error=NULL WHERE id=?').run(new Date().toISOString(), id); }
  mailFailed(id, attempts) { this.db.prepare('UPDATE mail_outbox SET attempts=attempts+1,next_attempt=?,last_error=? WHERE id=?').run(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(attempts, 6)), 'Delivery failed; retry scheduled', id); }
  all() { return this.db.prepare('SELECT name,email,code,status,gemini,total_cents,payment_id,created_at FROM registrations ORDER BY created_at').all(); }
  close() { this.db.close(); }
}
