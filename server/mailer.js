// EmailJS uses dedicated templates with a dynamic {{to_email}} recipient.
export function emailSender(config, course, transport = fetch) {
  return async (job, registration) => {
    const owner = job.kind.startsWith('owner');
    const params = {
      to_email: owner ? config.organizerEmail : registration.email,
      attendee_name: registration.name, attendee_email: registration.email,
      course_title: course.title, reservation_code: registration.code || 'Sin código',
      payment_status: registration.status, total: `$${registration.total_cents / 100} MXN`,
      gemini: registration.gemini ? 'Sí: acceso compartido por 18 meses, entrega por invitación el día del evento.' : 'No contratado',
      course_date: config.courseDate, course_location: config.courseLocation,
      reservation_url: `${config.siteUrl}/reservacion.html`,
      message: job.kind === 'owner-review' ? 'Se detectó un pago adicional. Revisa Mercado Pago antes de realizar cualquier ajuste.' :
        registration.status === 'confirmed' ? 'Pago confirmado. Conserva tu código y preséntalo el día del evento.' : 'El estado de tu pago cambió. Consulta tu reservación o contacta al organizador.',
      delivery_reference: `reservation-${job.id}`
    };
    const response = await transport('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: config.emailService, template_id: owner ? config.ownerTemplate : config.studentTemplate,
        user_id: config.emailPublicKey, ...(config.emailPrivateKey ? { accessToken: config.emailPrivateKey } : {}), template_params: params }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Email delivery failed');
  };
}

export function mailWorker(store, send) {
  let active = false;
  return async function deliver() {
    if (active || !send) return;
    active = true;
    try {
      const outbox = await store.pendingMail();
      for (const msg of outbox) {
        try {
          await send(msg);
          await store.mailSent(msg.id);
        } catch (error) {
          console.error(`Mail error for ${msg.email}:`, error);
          await store.mailFailed(msg.id, msg.attempts);
        }
        // EmailJS REST API accepts one request per second.
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    } catch (e) {
      console.error('Critical mail worker error:', e);
    } finally {
      active = false;
    }
  };
}
