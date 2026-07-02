export interface ManualGuestDto {
  name: string;
  phone: string;
  notes?: string;
}

export interface PublicRsvpDto {
  eventPublicToken: string;
  name: string;
  phone: string;
  confirmed: boolean;
  companions: { name: string; age?: number }[];
}
