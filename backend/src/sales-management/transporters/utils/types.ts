import { TransporterStatus } from "@prisma/tenant-client";

export interface TransporterListItem {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  vehicleRegistration: string | null;
  status: TransporterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TransporterDetail = TransporterListItem & {
  address: string | null;
  notes: string | null;
};
