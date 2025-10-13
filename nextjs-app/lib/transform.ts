import { PublishedContent } from '@/types'

// Map a row from published_content (snake_case) to our PublishedContent type (camelCase)
export function mapPublishedRow(row: any): PublishedContent {
  const tags: string[] = Array.isArray(row?.tags)
    ? row.tags
    : Array.isArray(row?.metadata?.tags)
    ? row.metadata.tags
    : []

  const imageUrl: string | undefined =
    row?.image_url || row?.metadata?.imageUrl || row?.metadata?.image_url || undefined

  const videoUrl: string | undefined =
    row?.video_url || row?.metadata?.videoUrl || row?.metadata?.video_url || undefined

  const externalLink: string | undefined =
    row?.external_url || row?.metadata?.externalLink || row?.metadata?.external_url || undefined

  return {
    id: row.id,
    submissionId: row.submission_id ?? undefined,
    title: row.title,
    content: row.content,
    category: row.category,
  articleCategory: row.article_category ?? row?.metadata?.articleCategory ?? undefined,
    authorWallet: row.author_wallet ?? undefined,
    authorName: row.author_name ?? undefined,
    publishedAt: row.published_at || row.created_at || new Date().toISOString(),
    views: row.views ?? 0,
    likes: row.likes ?? 0,
    metadata: {
      tags,
      imageUrl,
      videoUrl,
      externalLink,
    },
  }
}

export function mapPublishedRows(rows: any[] | null | undefined): PublishedContent[] {
  if (!rows) return []
  return rows.map(mapPublishedRow)
}

// Ambassadors: map snake_case to camelCase
export function mapAmbassadorRow(row: any): import('@/types').Ambassador {
  return {
    id: row.id,
    name: row.name,
    walletAddress: row.wallet_address,
    region: row.region,
    country: row.country,
    city: row.city ?? undefined,
    bio: row.bio ?? '',
    avatar: row.avatar ?? undefined,
    twitter: row.twitter ?? undefined,
    telegram: row.telegram ?? undefined,
    discord: row.discord ?? undefined,
    joinedAt: row.joined_at || row.created_at || new Date().toISOString(),
    contributions: row.contributions ?? 0,
    eventsHosted: row.events_hosted ?? 0,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
  }
}

export function mapAmbassadorRows(rows: any[] | null | undefined): import('@/types').Ambassador[] {
  if (!rows) return []
  return rows.map(mapAmbassadorRow)
}

// Submissions: map DB row to camelCase Submission type
export function mapSubmissionRow(row: any): import('@/types').Submission {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    title: row.title,
    content: row.content,
    category: row.category,
    status: row.status,
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    blockchainHash: row.blockchain_hash ?? undefined,
    metadata: row.metadata || {},
  }
}

export function mapSubmissionRows(rows: any[] | null | undefined): import('@/types').Submission[] {
  if (!rows) return []
  return rows.map(mapSubmissionRow)
}
