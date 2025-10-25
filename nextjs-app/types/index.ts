// Content types
export type ContentCategory = 'article' | 'video' | 'activity' | 'ambassador'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'

export interface User {
  walletAddress: string
  username?: string
  role: UserRole
  createdAt: string
  totalSubmissions: number
  approvedSubmissions: number
  xpTotal?: number
}

export interface Submission {
  id: string
  walletAddress: string
  title: string
  content: string
  category: ContentCategory
  status: SubmissionStatus
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  blockchainHash?: string
  metadata?: {
    tags?: string[]
    imageUrl?: string
    videoUrl?: string
    externalLink?: string
  // For articles: classification label
  articleCategory?: string
  }
}

export interface PublishedContent {
  id: string
  submissionId?: string
  title: string
  content: string
  category: ContentCategory
  authorUid?: string
  authorWallet?: string
  authorName?: string
  publishedAt: string
  views: number
  likes: number
  // For articles: classification label persisted in column
  articleCategory?: string
  metadata?: {
    tags?: string[]
    imageUrl?: string
    videoUrl?: string
  externalLink?: string
  // Activity-specific optional fields
  location?: string
  participants?: number
  }
}

export type XpEventType = 'checkin' | 'publish' | 'view_threshold' | 'tip_give' | 'tip_receive'

export interface XpEvent {
  id: string
  userUid: string
  type: XpEventType
  amount: number
  contentId?: string
  submissionId?: string
  milestone?: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface Ambassador {
  id: string
  name: string
  walletAddress: string
  region: string
  country: string
  city?: string
  bio: string
  avatar?: string
  twitter?: string
  telegram?: string
  discord?: string
  joinedAt: string
  contributions: number
  eventsHosted?: number
  lat?: number
  lng?: number
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types
export interface SubmitContentForm {
  title: string
  content: string
  category: ContentCategory
  tags?: string[]
  imageUrl?: string
  videoUrl?: string
  externalLink?: string
  // For articles: allow classification
  articleCategory?: string
}

export interface ReviewSubmissionPayload {
  submissionId: string
  action: 'approve' | 'reject'
  reason?: string
}

// Shop types
export type ShopProduct = {
  id: string
  slug: string
  name: string
  description?: string
  image_url?: string
  metadata_uri?: string
  onchain_id?: string
  price_wei: string // bigint as string
  stock: string
  status: 'active' | 'inactive'
  last_synced_block?: string
  created_at: string
  updated_at: string
}

export type ShopOrder = {
  id: string
  onchain_id?: string
  product_id?: string
  product_onchain_id?: string
  buyer_uid: string
  buyer_address?: string
  quantity: string
  unit_price_wei: string
  total_price_wei: string
  status: 'created' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
  metadata_hash?: string
  last_status_note?: string
  chain_id?: number
  last_event_tx_hash?: string
  paid_tx_hash?: string
  refund_tx_hash?: string
  shipped_at?: string
  completed_at?: string
  cancelled_at?: string
  refunded_at?: string
  shipping_contact?: string
  shipping_phone?: string
  shipping_address?: string
  offchain_metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ShopAddress = {
  id: string
  user_uid: string
  contact_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  is_default: boolean
  created_at: string
  updated_at: string
}
