type RiskProfile = "conservative" | "balanced" | "aggressive";
export type Profile = {
  id: string;
  display_name: string;
  risk_profile: RiskProfile;
  watchlist: string[];
  updated_at: string;
};
export type ProfileUpdate = Partial<
  Pick<Profile, "display_name" | "risk_profile" | "watchlist">
>;
