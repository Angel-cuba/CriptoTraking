export const RISK_PROFILES = ['conservative', 'balanced', 'aggressive'] as const;
export const SUPPORTED_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const;

export type RiskProfile = typeof RISK_PROFILES[number];
export type Profile = {
  id: string;
  display_name: string;
  risk_profile: RiskProfile;
  watchlist: string[];
  updated_at: string;
};
export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'risk_profile' | 'watchlist'>>;
