'use strict';
// Owner-authorized cancellation at 2026-10-05 09:48:59 JST.
// Fixed cutoff makes rebuilds idempotent and protects later reservations.
async function main() {
  if (process.env.VERCEL_ENV !== 'production') return;
  const sql = require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
  const cutoff = '2026-10-05T00:48:59Z';
  const cancelled = await sql.query("UPDATE public.bookings SET status='cancelled' WHERE created_at <= $1::timestamptz AND status IN ('pending_payment','confirmed','paid') RETURNING id", [cutoff]);
  const remaining = await sql.query("SELECT count(*)::int AS count FROM public.bookings WHERE created_at <= $1::timestamptz AND status IN ('pending_payment','confirmed','paid')", [cutoff]);
  if (remaining[0].count !== 0) throw new Error('Existing reservation cancellation incomplete');
  console.log(JSON.stringify({migration:'cancel-existing-bookings-20261005',cancelledCount:cancelled.length,remainingExistingActive:remaining[0].count}));
}
main().catch(() => { console.error('Existing reservation cancellation failed'); process.exit(1); });
