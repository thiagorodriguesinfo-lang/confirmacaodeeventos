export interface CreateEventDto {
  name: string;
  date: Date;
  time: string;
  location: string;
  address?: string;
  description?: string;
  invitationImage?: string;
  qrCodeUrl?: string;
  googleMapsUrl?: string;
  maxGuests?: number;
  defaultMessage?: string;
  thankYouMessage?: string;
  reminderMessage?: string;
  declinedMessage?: string;
}

export type UpdateEventDto = Partial<CreateEventDto> & {
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'CANCELLED';
};
