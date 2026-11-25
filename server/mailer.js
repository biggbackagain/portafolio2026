// EmailJS uses dedicated templates with a dynamic {{to_email}} recipient.
export function emailSender(config, course, transport = fetch) {
  return async (job, record) => {
    const isLicense = job.kind.startsWith('license-');
    const owner = job.kind.startsWith('owner') || job.kind === 'license-owner';
    const params = isLicense ? {
      to_email: owner ? config.organizerEmail : record.email,
      to_name: record.name, attendee_email: record.email,
      course_title: `${record.product_title} × ${record.quantity}`,
      reservation_code: record.order_code || 'Sin código',
      payment_status: record.status, total: `$${record.total_cents / 100} MXN`,
      addon_text: `WhatsApp/Tel: ${record.phone}${record.notes ? ` · Notas: ${record.notes}` : ''}`,
      date: 'Entrega estimada: 1 a 2 horas', location: 'Envío digital por correo electrónico',
      ticket_url: `${config.siteUrl}/licencias-software-ciudad-guzman.html?orden=${record.lookup_token}`,
      organizer_email: config.organizerEmail,
      message: owner
        ? `Nuevo pago confirmado de licencia: ${record.product_title} (Cantidad: ${record.quantity}). Enviar licencia al correo ${record.email} (Tel: ${record.phone}) en un plazo de 1 a 2 horas.`
        : `¡Gracias por tu compra! Tu pago de ${record.product_title} (Cantidad: ${record.quantity}) fue confirmado. Entre 1 y 2 horas recibirás tu licencia e instrucciones en este correo.`,
      delivery_reference: `license-${job.id}`
    } : {
      to_email: owner ? config.organizerEmail : record.email,
      to_name: record.name, attendee_email: record.email,
      course_title: course.title, reservation_code: record.code || 'Sin código',
      payment_status: record.status, total: `$${record.total_cents / 100} MXN`,
      addon_text: record.gemini ? 'Sí: acceso compartido por 18 meses.' : 'No contratado',
      date: config.courseDate, location: config.courseLocation,
      ticket_url: `${config.siteUrl}/reservacion.html?r=${record.lookup_token}`,
      organizer_email: config.organizerEmail,
      message: job.kind === 'owner-review' ? 'Se detectó un pago adicional. Revisa Mercado Pago antes de realizar cualquier ajuste.' :
        record.status === 'confirmed' ? 'Pago confirmado. Conserva tu código y preséntalo el día del evento.' : 'El estado de tu pago cambió. Consulta tu reservación o contacta al organizador.',
      delivery_reference: `reservation-${job.id}`
    };
    const response = await transport('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: config.emailService, template_id: owner ? config.ownerTemplate : config.studentTemplate,
        user_id: config.emailPublicKey, ...(config.emailPrivateKey ? { accessToken: config.emailPrivateKey } : {}), template_params: params }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Email delivery failed (${response.status}): ${text}`);
    }
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
          await send(msg, msg);
          await store.mailSent(msg.id);
        } catch (error) {
          console.error(`Mail error for ${msg.email}:`, error);
          await store.mailFailed(msg.id, msg.attempts || 0);
        }
        // EmailJS REST API accepts one request per second.
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      if (typeof store.pendingLicenseMail === 'function') {
        const licenseOutbox = await store.pendingLicenseMail();
        for (const msg of licenseOutbox) {
          try {
            await send(msg, msg);
            await store.licenseMailSent(msg.id);
          } catch (error) {
            console.error(`License mail error for ${msg.email}:`, error);
            await store.licenseMailFailed(msg.id, msg.attempts || 0);
          }
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      }
    } catch (e) {
      console.error('Critical mail worker error:', e);
    } finally {
      active = false;
    }
  };
}
