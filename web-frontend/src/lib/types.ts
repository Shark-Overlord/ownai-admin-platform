export type SiteCategory =
  | "All"
  | "SaaS"
  | "Portfolio"
  | "Agency"
  | "Ecommerce"
  | "AI"
  | "Landing Page";

export type SiteCollectionCategory = Exclude<SiteCategory, "All">;

export type SortOption = "Trending" | "Latest" | "Most Viewed";

export type PromptAccessState = "public" | "unlocked" | "locked";

export interface SiteItem {
  id: string;
  title: string;
  description: string;
  category: string;
  sourceType?: "artwork" | "promptAsset";
  memberOnly?: number;
  canAccess?: boolean;
  permanentlyUnlocked?: boolean;
  pointsPrice?: number;
  favoriteCount?: number;
  favorited?: boolean;
  hasSourceCode?: boolean;
  tags: string[];
  assetTags?: string[];
  assetTagTexts?: string[];
  sceneTags?: string[];
  image: string;
  imageAspectRatio?: number;
  imageHeight?: number;
  imageWidth?: number;
  isFeatured?: boolean;
  url?: string;
  videoUrl?: string;
  prompt?: string;
  createdAt?: string;
  sort?: number;
  viewCount?: number;
}

export type PreviewLoadState = "idle" | "loading" | "ready" | "error";

export type PreviewDeviceMode = "web" | "tablet" | "mobile";

export interface ArtworkPreviewResponse {
  html?: string;
  previewUrl?: string;
}

export interface HomeCategoryOption {
  description?: string;
  id: string;
  name: string;
  sort?: number;
}

export interface HomeTagOption {
  description?: string;
  id: string;
  name: string;
  sort?: number;
}

export interface SiteRanking {
  trending: number;
  latest: number;
  mostViewed: number;
}

export type BillingCycle = "monthly" | "annual";

export interface LocalizedText {
  "en-US": string;
  "zh-CN": string;
}

export interface ContactContent {
  email: string;
  emailDescription: LocalizedText;
  emailLabel: LocalizedText;
  supportNotice: LocalizedText;
}

export interface LegalFooterContent {
  icpNumber: LocalizedText;
  legalNotice: LocalizedText;
}

export interface MembershipFeature {
  label: LocalizedText;
  available: boolean;
}

export interface MembershipPlanPrice {
  amount: number | null;
  suffix: LocalizedText;
  caption: LocalizedText;
}

export interface MembershipPlan {
  id: string;
  name: LocalizedText;
  memberLevel: string;
  summary: LocalizedText;
  audience?: LocalizedText;
  badge?: LocalizedText;
  recommended?: boolean;
  ctaLabel: LocalizedText;
  ctaVariant?: "primary" | "secondary" | "ghost";
  valueNote?: LocalizedText;
  prices: Record<BillingCycle, MembershipPlanPrice>;
  features: MembershipFeature[];
}

export interface BaseResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface UserRegisterRequest {
  userAccount: string;
  userPassword: string;
  checkPassword: string;
}

export interface UserLoginRequest {
  userAccount: string;
  userPassword: string;
  captchaCode?: string;
  captchaId?: string;
}

export interface UserEmailRegisterRequest {
  checkPassword: string;
  emailCode: string;
  userEmail: string;
  userPassword: string;
}

export interface LoginCaptchaResponse {
  captchaId: string;
  imageBase64?: string;
  imageUrl?: string;
}

export interface LoginUserVO {
  createTime?: string;
  id: number;
  memberExpireTime?: string;
  memberLevel?: string;
  memberPlanType?: "month" | "year" | "lifetime" | string;
  pointBalance?: number;
  token?: string;
  updateTime?: string;
  userAccount?: string;
  userAvatar?: string;
  userName?: string;
  userProfile?: string;
  userRole?: string;
}

export interface UserProfileDetail {
  createTime?: string;
  id: number;
  memberExpireTime?: string;
  memberLevel?: string;
  memberPlanType?: "month" | "year" | "lifetime" | string;
  pointBalance?: number;
  updateTime?: string;
  userAccount?: string;
  userAvatar?: string;
  userName?: string;
  userProfile?: string;
  userRole?: string;
}

export interface ProfileUpdateRequest {
  userAvatar?: string;
  userName?: string;
  userProfile?: string;
}

export interface CheckInStatusResponse {
  checkedInToday?: boolean;
  lastCheckInDate?: string;
  pointBalance?: number;
  rewardPoints?: number;
  status?: string | number;
}

export interface CheckInResponse {
  rewardPoints?: number;
}

export type AnnouncementType =
  | "site_update"
  | "price_change"
  | "maintenance"
  | "activity";

export interface AnnouncementVO {
  actionLabel?: string;
  actionPath?: string;
  authorAvatar?: string;
  authorName?: string;
  content?: string;
  createTime?: string;
  createUserId?: number;
  expireTime?: string;
  id: number | string;
  official?: boolean | number | string;
  popupEnabled?: boolean;
  priority?: number;
  publishTime?: string;
  readStatus?: boolean | number | string;
  readTime?: string;
  status?: number | string;
  summary?: string;
  targetId?: number | string;
  targetType?: string;
  title?: string;
  type?: AnnouncementType | string;
  updateTime?: string;
}

export interface ArtworkQueryRequest {
  categoryId?: number | string;
  current: number;
  memberOnly?: number;
  pageSize: number;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
  status?: number;
  tagIdList?: Array<number | string>;
  tagName?: string;
}

export interface OrderItem {
  asc?: boolean;
  column?: string;
}

export interface Page<T> {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: OrderItem[];
  pages?: number;
  records?: T[];
  searchCount?: boolean;
  size?: number;
  total?: number;
}

export interface CategoryVO {
  createTime?: string;
  description?: string;
  id?: number | string;
  name?: string;
  parentId?: number | string | null;
  sort?: number;
  children?: CategoryVO[] | null;
  tags?: TagVO[] | null;
}

export interface TagVO {
  createTime?: string;
  description?: string;
  id?: number | string;
  name?: string;
  sort?: number;
}

export interface ArtworkVO {
  canAccess?: boolean;
  canAccessPrompt?: boolean;
  permanentlyUnlocked?: boolean;
  cashPrice?: number;
  category?: CategoryVO;
  categoryId?: number;
  coverUrl?: string;
  createTime?: string;
  description?: string;
  favoriteCount?: number | string;
  favorited?: boolean;
  hasSourceCode?: boolean;
  htmlUrl?: string;
  id: string;
  imageAspectRatio?: number | string;
  imageHeight?: number | string;
  imageUrl?: string;
  imageWidth?: number | string;
  memberOnly?: number;
  pointsPrice?: number;
  promptContent?: string | null;
  previewMediaUrl?: string;
  sort?: number;
  status?: number;
  summary?: string;
  tagList?: TagVO[];
  title: string;
  videoUrl?: string;
  viewCount?: number;
}

export interface ArtworkDetailVO extends ArtworkVO {
  accessReason?: string | null;
}

export interface VideoBackgroundQueryRequest {
  categoryId?: number | string;
  current: number;
  memberOnly?: number;
  pageSize: number;
  searchText?: string;
  sortField?: string;
  sortOrder?: string;
  tagIdList?: Array<number | string>;
}

export interface VideoBackgroundVO {
  canAccess?: boolean;
  category?: CategoryVO;
  categoryId?: number | string;
  coverUrl?: string;
  createTime?: string;
  durationMs?: number | string;
  favoriteCount?: number | string;
  favorited?: boolean;
  fileSize?: number | string;
  id: number | string;
  memberOnly?: number;
  previewVideoUrl?: string;
  sort?: number | string;
  summary?: string;
  tagList?: TagVO[] | null;
  title?: string;
  updateTime?: string;
  videoAspectRatio?: number | string;
  videoFormat?: string;
  videoHeight?: number | string;
  videoWidth?: number | string;
}

export interface VideoBackgroundResourceVO {
  downloadUrl?: string;
  id?: number | string;
  promptContent?: string;
  title?: string;
}

export interface MemberPriceConfigPlan {
  currency?: string;
  createTime?: string;
  description?: string | null;
  durationDays: number;
  features?: string | string[] | null;
  id: string;
  memberLevel: "member";
  planType: "month" | "year" | "lifetime";
  pointsPrice?: number | null;
  cashPrice?: number | null;
  status?: number;
  updateTime?: string;
}

export interface MemberPaymentCreateResult {
  expiresAt?: string | null;
  orderNo: string;
  orderStatus: string;
  paymentChannel: "alipay";
  /** Signed Alipay form returned by the server. Submit it with POST; do not treat it as a URL. */
  paymentFormHtml: string;
}

export interface MemberPaymentStatus {
  orderType?: string;
  pointsAmount?: number;
  pointBalance?: number;
  expiresAt?: string | null;
  failureReason?: string | null;
  memberActive: boolean;
  memberPlanType?: "month" | "year" | "lifetime" | string | null;
  memberExpireTime?: string | null;
  orderNo: string;
  orderStatus: "pending" | "completed" | "cancelled" | "expired" | "failed";
  paymentChannel: "alipay";
}

export interface MemberOrderQueryRequest {
  current: number;
  memberLevel?: string;
  orderNo?: string;
  orderStatus?: string;
  orderType?: string;
  pageSize: number;
  sortField?: string;
  sortOrder?: string;
  userId?: number;
}

export interface MemberOrder {
  amountMinor?: number;
  createTime?: string;
  currency?: string;
  durationDays?: number;
  expiresAt?: string;
  finishTime?: string;
  id: number;
  memberLevel?: string;
  orderAmount?: number;
  orderNo?: string;
  orderStatus?: string;
  orderType?: string;
  payTime?: string;
  paymentChannel?: string;
  pointsAmount?: number;
  rechargeQuantity?: number;
  planType?: "month" | "year" | "lifetime" | "points";
  thirdPartyOrderNo?: string;
  updateTime?: string;
  userId?: number;
  userName?: string;
}
