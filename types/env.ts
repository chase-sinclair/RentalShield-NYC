export interface PublicEnv {
  appName: string;
  appUrl: string;
}

export interface ServerEnv extends PublicEnv {
  awsRegion: string;
  bedrockModelId: string;
  bedrockFallbackModelId?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  googleMapsApiKey?: string;
  rentcastApiKey?: string;
  nycOpenDataAppToken?: string;
  nyLicenseLookupBaseUrl?: string;
  maxUploadFileSizeMb: number;
  maxUploadFileCount: number;
}
