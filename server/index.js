import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { createHandler } from './app.js';
import { paymentClient } from './payments.js';
import { emailSender, mailWorker } from './mailer.js';

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '');
const course = JSON.parse(readFileSync(resolve(root, 'assets/course.json'), 'utf8'));
const e = process.env;
const config = {
  open: e.ENROLLMENT_OPEN === 'true', detailsConfirmed: e.COURSE_DETAILS_CONFIRMED === 'true',
  siteUrl: (e.SITE_URL || 'http://127.0.0.1:8081').replace(/\/$/, ''), apiUrl: (e.API_URL || 'http://127.0.0.1:8081').replace(/\/$/, ''),
  courseDate: e.COURSE_DATE || course.date, courseLocation: e.COURSE_LOCATION || course.location,
  mpToken: e.MP_ACCESS_TOKEN, webhookSecret: e.MP_WEBHOOK_SECRET, collectorId: e.MP_COLLECTOR_ID, liveMode: e.MP_LIVE_MODE === 'true',
  emailService: e.EMAILJS_SERVICE_ID, emailPublicKey: e.EMAILJS_PUBLIC_KEY, emailPrivateKey: e.EMAILJS_PRIVATE_KEY,
  studentTemplate: e.EMAILJS_STUDENT_TEMPLATE_ID, ownerTemplate: e.EMAILJS_OWNER_TEMPLATE_ID, organizerEmail: e.ORGANIZER_EMAIL,
  addonCapacity: Math.max(0, Number.parseInt(e.GEMINI_CAPACITY || '0', 10) || 0)
};
const store = new Store(e.DATABASE_URL || e.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/postgres');
await store.init();
const server = createServer(createHandler({ store, course, config, payments: paymentClient(config, course), root }));
server.requestTimeout = 20000;
server.headersTimeout = 10000;
const deliver = mailWorker(store, emailSender(config, course));
const timer = setInterval(() => { if (config.emailService && config.studentTemplate && config.ownerTemplate) void deliver(); }, 15000);
timer.unref();
server.listen(Number(e.PORT || 8081), e.HOST || '0.0.0.0', () => console.log(`Preview/API: http://${e.HOST || '0.0.0.0'}:${server.address().port} — enrollment ${config.open ? 'requested (configuration checks apply)' : 'closed'}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { clearInterval(timer); server.close(() => { store.close(); process.exit(0); }); });
