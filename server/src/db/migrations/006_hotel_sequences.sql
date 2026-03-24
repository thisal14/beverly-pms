CREATE TABLE IF NOT EXISTS hotel_sequences (
  hotel_id      INT NOT NULL,
  sequence_date DATE NOT NULL,
  seq           INT NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, sequence_date),
  CONSTRAINT fk_hs_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);
