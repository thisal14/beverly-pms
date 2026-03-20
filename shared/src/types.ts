import { UserRole, ReservationStatus, PaymentMethod, PaymentStage } from './enums';

export interface Hotel {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  created_at: string;
}

export interface User {
  id: number;
  hotel_id: number | null;
  role: UserRole;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  hotel?: Hotel;
}

export interface RoomCategory {
  id: number;
  hotel_id: number;
  name: string;
  description: string | null;
  base_price: string; // Decimal strings from DB
  sort_order: number;
  is_active: boolean;
}

export interface Room {
  id: number;
  hotel_id: number;
  room_category_id: number;
  room_number: string;
  floor: number | null;
  capacity: number;
  extra_person_charge: string;
  grace_period_checkin_minutes: number;
  grace_period_checkout_minutes: number;
  early_checkin_fee: string;
  late_checkout_fee: string;
  is_active: boolean;
  notes: string | null;
  category?: RoomCategory;
}

export interface PackageType {
  id: number;
  hotel_id: number;
  name: string;
  min_hours: string | null;
  max_hours: string | null;
  price_multiplier: string;
  flat_price: string | null;
  description: string | null;
  is_active: boolean;
}

export interface ReservationRoom {
  id: number;
  reservation_id: number;
  room_id: number;
  package_type_id: number;
  package_quantity: number;
  num_adults: number;
  num_children: number;
  base_amount: string;
  extra_person_charge: string;
  created_at: string;

  room?: Room;
  package_type?: PackageType;
}

export interface Reservation {
  id: number;
  hotel_id: number;
  reservation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_nic_passport: string;
  scheduled_checkin: string;
  scheduled_checkout: string;
  status: ReservationStatus;
  total_amount: string;
  paid_amount: string;
  balance: string;
  actual_checkin: string | null;
  actual_checkout: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;

  room_sum?: string;
  reservation_rooms?: ReservationRoom[];
  guests?: ReservationGuest[];
  payments?: Payment[];
}

export interface ReservationGuest {
  id: number;
  reservation_id: number;
  nic_passport: string | null;
  guest_name: string | null;
  is_primary: boolean;
}

export interface Payment {
  id: number;
  reservation_id: number;
  amount: string;
  payment_method: PaymentMethod;
  payment_stage: PaymentStage;
  reference_number: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  hotel_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  created_at: string;
}
