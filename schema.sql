-- Apply only after inspecting existing table definitions. Never drops existing data.
CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 phone TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bookings (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id),
 room TEXT NOT NULL CHECK(room IN ('A','B')),
 booking_date DATE NOT NULL,
 start_time TIME NOT NULL,
 end_time TIME NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending_payment',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio136_booking_lookup ON bookings(room,booking_date);
CREATE UNIQUE INDEX IF NOT EXISTS studio136_booking_active_unique ON bookings(room,booking_date,start_time) WHERE status IN ('pending_payment','confirmed','paid');
