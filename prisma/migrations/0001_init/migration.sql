CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('PLAYER', 'OWNER');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'HELD', 'BOOKED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  price_per_hour NUMERIC(10, 2) NOT NULL CHECK (price_per_hour >= 0),
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_courts_owner
    FOREIGN KEY (owner_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL,
  start_time TIMESTAMPTZ(6) NOT NULL,
  end_time TIMESTAMPTZ(6) NOT NULL,
  status slot_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_slots_time_order CHECK (end_time > start_time),
  CONSTRAINT fk_slots_court
    FOREIGN KEY (court_id)
    REFERENCES courts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  court_id UUID NOT NULL,
  slot_id UUID NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_court
    FOREIGN KEY (court_id)
    REFERENCES courts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_slot
    FOREIGN KEY (slot_id)
    REFERENCES slots(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

ALTER TABLE slots
ADD CONSTRAINT ex_slots_no_overlap
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
);

CREATE INDEX idx_courts_owner_id ON courts(owner_id);
CREATE INDEX idx_courts_location ON courts(location);

CREATE INDEX idx_slots_court_id ON slots(court_id);
CREATE INDEX idx_slots_court_time_window ON slots(court_id, start_time, end_time);
CREATE INDEX idx_slots_status_start_time ON slots(status, start_time);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_court_id ON bookings(court_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courts_set_updated_at
BEFORE UPDATE ON courts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_slots_set_updated_at
BEFORE UPDATE ON slots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
