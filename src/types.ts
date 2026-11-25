export type Language = 'en' | 'hi';

export interface SiteSettings {
  id: number;
  org_name: string;
  tagline: string;
  legal_status: string;
  registration_number: string;
  pan_number: string;
  section_80g_number: string;
  donations_enabled: number;
  tax_exemption_enabled: number;
  default_commission_pct: number;
  tax_rate_pct: number;
  shipping_flat_fee: number;
  free_shipping_threshold: number;
  contact_phone: string;
  contact_email: string;
  pilot_location: string;
  payment_gateway_mode: string;
  shiprocket_mode: string;
  shiprocket_pickup_location: string;
  seo_title: string;
  seo_description: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  district: string;
  block: string;
  village: string;
}

export interface Category {
  id: number;
  name: string;
  name_hi: string;
  slug: string;
  description: string;
  featured: number;
}

export interface Project {
  id: number;
  title: string;
  title_hi: string;
  category: string;
  description: string;
  description_hi: string;
  objectives: string;
  district: string;
  block: string;
  village: string;
  status: string;
  is_proposed: number;
  start_date: string;
  end_date: string;
  image_url: string;
}

export interface PihuEvent {
  id: number;
  title: string;
  title_hi: string;
  description: string;
  description_hi: string;
  event_date: string;
  event_time: string;
  location: string;
  district: string;
  block: string;
  status: string;
  is_proposed: number;
  image_url: string;
  registrations_count: number;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  options?: string[];
  required?: boolean;
}

export interface DynamicForm {
  id: number;
  slug: string;
  title: string;
  title_hi: string;
  description: string;
  category: string;
  is_active: number;
  fields: FormField[];
}

export interface Product {
  id: number;
  seller_id: number;
  category_id: number;
  category_name: string;
  category_name_hi: string;
  category_slug: string;
  seller_name: string;
  seller_village: string;
  seller_block: string;
  seller_district: string;
  name: string;
  name_hi: string;
  brand: string;
  description: string;
  price: number;
  discount_price: number;
  stock_qty: number;
  unit_label: string;
  weight_grams: number;
  variants: string[];
  is_food_product: number;
  fssai_license: string;
  ingredients: string;
  mfg_date: string;
  expiry_date: string;
  batch_code: string;
  image_url: string;
  approval_status: string;
  is_active: number;
  featured: number;
  rating: number;
  reviews_count: number;
}

export interface CartItem {
  product: Product;
  variant: string;
  quantity: number;
}

export interface MemberRecord {
  id: number;
  application_ref: string;
  member_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  district: string;
  block: string;
  village: string;
  role_type: string;
  status: string;
  joined_at: string;
  approved_at: string;
  renewal_due: string;
  history: { date: string; action: string }[];
}

export interface CmsItem {
  id: number;
  item_type: string;
  title: string;
  title_hi: string;
  body: string;
  body_hi: string;
  meta_label: string;
  image_url: string;
}
