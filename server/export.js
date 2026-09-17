import { Store } from './store.js';
const store = new Store(process.env.DATABASE_PATH || 'server/data/reservations.sqlite');
// Prefix spreadsheet formula characters before quoting exported values.
const cell = (value) => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
const columns = ['name','email','code','status','gemini','total_cents','payment_id','created_at'];
console.log(columns.join(','));
for (const row of store.all()) console.log(columns.map((key) => cell(row[key])).join(','));
store.close();
