export interface KarmaType {
  karma: string;
}

export interface IdentityType {
  identity_type: string;
}

export interface KarmaReportingEntity {
  name: string;
  email: string;
}

export interface KarmaData {
  karma_identity: string;
  amount_in_contention: string;
  reason: string | null;
  default_date: string;
  karma_type: KarmaType;
  karma_identity_type: IdentityType;
  reporting_entity: KarmaReportingEntity;
}

export interface KarmaApiResponse {
  status: string;
  message: string;
  data: KarmaData | null;
  meta?: {
    cost: number;
    balance: number;
  };
}

export interface IAdjutorService {
  isBlacklisted(identity: string): Promise<boolean>;
}
