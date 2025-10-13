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
