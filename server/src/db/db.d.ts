import { Generated, Selectable, Insertable, Updateable } from 'kysely'

export interface Database {
  hotels: HotelsTable
  rooms: RoomsTable
  room_categories: RoomCategoriesTable
  package_types: PackageTypesTable
  reservations: ReservationsTable
  reservation_rooms: ReservationRoomsTable
  reservation_guests: ReservationGuestsTable
  payments: PaymentsTable
  users: UsersTable
  audit_log: AuditLogTable
  hotel_sequences: HotelSequencesTable
}

export interface HotelsTable {
  id: Generated<number>
  name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  slug: string
  timezone: string
  created_at: Generated<Date | string>
}

export interface RoomsTable {
  id: Generated<number>
  hotel_id: number
  room_category_id: number
  room_number: string
  floor: number | null
  status: 'available' | 'occupied' | 'dirty' | 'maintenance' | 'out_of_order'
  is_active: Generated<number>
  capacity: number
  extra_person_charge: string | number
  early_checkin_fee: string | number | null
  late_checkout_fee: string | number | null
  grace_period_checkout_minutes: number | null
  created_at: Generated<Date | string>
}

export interface RoomCategoriesTable {
  id: Generated<number>
  hotel_id: number
  name: string
  description: string | null
  base_price: string | number
  sort_order: Generated<number>
  is_active: Generated<number>
  created_at: Generated<Date | string>
}

export interface PackageTypesTable {
  id: Generated<number>
  hotel_id: number
  name: string
  description: string | null
  price_multiplier: string | number
  flat_price: string | number | null
  min_hours: number | null
  max_hours: number | null
  sort_order: Generated<number>
  is_active: Generated<number>
  created_at: Generated<Date | string>
}

export interface ReservationsTable {
  id: Generated<number>
  hotel_id: number
  reservation_number: string
  customer_name: string
  customer_phone: string
  customer_nic_passport: string
  status: Generated<'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' | 'reserved'>
  scheduled_checkin: Date | string
  scheduled_checkout: Date | string
  actual_checkin: Date | string | null
  actual_checkout: Date | string | null
  base_amount: string | number
  extra_person_charge: string | number
  late_checkout_fee: string | number | null
  early_checkin_fee: string | number | null
  total_amount: string | number
  paid_amount: Generated<string | number>
  discount_amount: Generated<string | number>
  cancellation_reason: string | null
  created_by: number
  created_at: Generated<Date | string>
}

export interface ReservationRoomsTable {
  id: Generated<number>
  reservation_id: number
  room_id: number
  package_type_id: number
  package_quantity: number
  num_adults: number
  num_children: number
  base_amount: string | number
  extra_person_charge: string | number
  created_at: Generated<Date | string>
}

export interface ReservationGuestsTable {
  id: Generated<number>
  reservation_id: number
  guest_name: string
  nic_passport: string | null
  is_primary: Generated<number>
}

export interface PaymentsTable {
  id: Generated<number>
  reservation_id: number
  amount: string | number
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other'
  payment_stage: 'reservation' | 'checkin' | 'checkout' | 'adjustment'
  reference_number: string | null
  notes: string | null
  created_by: number
  created_at: Generated<Date | string>
}

export interface UsersTable {
  id: Generated<number>
  hotel_id: number | null
  name: string
  email: string
  password_hash: string
  role: 'super_admin' | 'hotel_admin' | 'receptionist' | 'manager'
  is_active: Generated<number>
  created_at: Generated<Date | string>
}

export interface AuditLogTable {
  id: Generated<number>
  hotel_id: number | null
  user_id: number | null
  action: string
  entity_type: string | null
  entity_id: number | null
  old_data: any | null
  new_data: any | null
  ip_address: string | null
  created_at: Generated<Date | string>
}

export interface HotelSequencesTable {
  hotel_id: number
  sequence_date: Date | string
  seq: Generated<number>
}
