export type MainTab = "home" | "water" | "herd" | "monitor" | "profile";

export type AppRoute =
  | MainTab
  | "community"
  | "challenges"
  | "property"
  | "activities"
  | "operations"
  | "assistant"
  | "today"
  | "history"
  | "nfc"
  | "notifications"
  | "plus"
  | "admin";

export type UserRole = "user" | "moderator" | "admin" | "owner";

export type WaterSource = {
  id: string;
  name: string;
  type: string;
  status: "ativa" | "atenção" | "inativa";
};

export type WaterRecord = {
  id: string;
  date: string;
  amount: number;
  sourceId: string;
  purpose: string;
  note?: string;
};

export type AnimalHistoryEntry = {
  id: string;
  date: string;
  type: string;
  description: string;
  weight?: number;
  reminderAt?: string;
  done?: boolean;
};

export type Animal = {
  id: string;
  identification: string;
  name?: string;
  species: string;
  breed?: string;
  sex?: string;
  birthDate?: string;
  weight?: number;
  photoPath?: string;
  photoUrl?: string;
  status: string;
  electronicId?: string;
  notes?: string;
  history?: AnimalHistoryEntry[];
};

export type Sector = {
  id: string;
  name: string;
  kind: string;
  note?: string;
};

export type Activity = {
  id: string;
  title: string;
  category: string;
  date: string;
  sectorId?: string;
  animalId?: string;
  note?: string;
  done: boolean;
};

export type MonitoringRecord = {
  id: string;
  date: string;
  sectorId?: string;
  type: string;
  duration?: string;
  note?: string;
  occurrence?: string;
  photoPaths?: string[];
  photoUrls?: string[];
};

export type CommunityComment = {
  id: string;
  authorId: string;
  author: string;
  text: string;
  date: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  authorAvatarUrl?: string;
  propertyName?: string;
  municipality?: string;
  text: string;
  date: string;
  image?: string;
  likes: number;
  liked: boolean;
  comments: CommunityComment[];
  moderationStatus: "published" | "hidden" | "removed";
};

export type Property = {
  id?: string;
  name: string;
  municipality: string;
  state: string;
  locationDetails?: string;
  coverPath?: string;
  coverUrl?: string;
  area: string;
  areaUnit: string;
  type: string;
  mainActivity: string;
  otherActivities: string[];
  approximateAnimals: string;
  waterKinds: string[];
};

export type HydraAccount = {
  id: string;
  email: string;
  phone: string;
  profile: {
    name: string;
    plan: "Gratuito" | "Hydra Agro+";
    avatarUrl?: string;
    bio?: string;
  };
  subscription: {
    status: string;
    createdAt?: string;
    premiumStartedAt?: string;
    premiumExpiresAt?: string;
    premiumDeactivatedAt?: string;
  };
  property: Property;
  waterSources: WaterSource[];
  waterRecords: WaterRecord[];
  animals: Animal[];
  sectors: Sector[];
  activities: Activity[];
  monitoring: MonitoringRecord[];
  nfcReadCount: number;
  posts: CommunityPost[];
  notifications: string[];
  settings: {
    waterAlerts: boolean;
    pushNotifications: boolean;
    premiumGoals: {
      monthlyWater?: number;
      monthlyActivities?: number;
      identifiedAnimals?: number;
    };
  };
  role: UserRole;
  bannedAt?: string;
  banReason?: string;
};

export type UpdateAccountOptions = {
  requireRemote?: boolean;
};

export type UpdateAccount = (
  updater: (current: HydraAccount) => HydraAccount,
  options?: UpdateAccountOptions,
) => Promise<void>;

export type SignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  property: Property;
};

export type AuthResult = {
  ok: boolean;
  message: string;
  needsEmailConfirmation?: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  level: "info" | "attention" | "critical";
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
};

export type AppLink = {
  id: string;
  label: string;
  url: string;
  description?: string;
  active: boolean;
  position: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bannedAt?: string;
  banReason?: string;
};

export type AdminStats = {
  totalUsers: number;
  activeSubscriptions: number;
  totalAnimals: number;
  totalWaterRecords: number;
};

export type AdminContent = {
  announcements: Announcement[];
  links: AppLink[];
};
