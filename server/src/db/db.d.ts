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
  audit_logs: AuditLogsTable
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
  is_active: Generated<number>
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
  extra_person_charge: string | number
  capacity: number
  created_at: Generated<Date | string>
}

export interface RoomCategoriesTable {
  id: Generated<number>
  hotel_id: number
  name: string
  description: string | null
  base_price: string | number
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
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  scheduled_checkin: Date | string
  scheduled_checkout: Date | string
  actual_checkin: Date | string | null
  actual_checkout: Date | string | null
  base_amount: string | number
  extra_person_charge: string | number
  total_amount: string | number
  paid_amount: string | number
  discount_amount: string | number
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
  name: string
  nic_passport: string | null
  phone: string | null
  email: string | null
  is_primary: Generated<number>
  created_at: Generated<Date | string>
}

export interface PaymentsTable {
  id: Generated<number>
  reservation_id: number
  amount: string | number
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other'
  payment_stage: 'reservation' | 'checkin' | 'checkout' | 'additional'
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
  password: string
  role: 'super_admin' | 'hotel_admin' | 'receptionist' | 'manager'
  is_active: Generated<number>
  created_at: Generated<Date | string>
}

export interface AuditLogsTable {
  id: Generated<number>
  user_id: number | null
  action: string
  table_name: string | null
  record_id: number | null
  old_values: any | null
  new_values: any | null
  ip_address: string | null
  created_at: Generated<Date | string>
}
