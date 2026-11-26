export interface Site {
  name: string; trainer: string; phone: string; email: string; telegram: string; whatsapp: string; vk: string;
  address: string; mapLat: number; mapLon: number; workHours: string; operator: string;
}
export interface Service { id: number; title: string; description: string; format: string }
export interface Tariff {
  id: number; service_id: number; title: string; description: string; price: number;
  sessions_count: number; is_featured: boolean; service_title: string;
}
export interface Review { id: number; client_name: string; text: string; rating: number }
export interface PublicData {
  site: Site;
  integrations: { ymapsKey: string; metrikaId: number };
  services: Service[]; tariffs: Tariff[]; reviews: Review[];
}
export interface AuthUser { id: number; login: string; full_name: string; role: string; role_name: string }
