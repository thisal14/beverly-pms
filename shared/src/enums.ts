export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  FRONT_OFFICE = 'front_office',
  PURCHASING_MANAGER = 'purchasing_manager'
}

export enum ReservationStatus {
  RESERVED = 'reserved',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE = 'online',
  OTHER = 'other'
}

export enum PaymentStage {
  RESERVATION = 'reservation',
  CHECKIN = 'checkin',
  CHECKOUT = 'checkout',
  ADJUSTMENT = 'adjustment'
}
