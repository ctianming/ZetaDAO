import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

// Configure marked for GitHub-flavored markdown
marked.setOptions({
  gfm: true,
  breaks: true,
})

export function markdownToHtml(md: string): string {
  const rawHtml = marked.parse(md || '') as string
  const clean = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'span', 'code', 'pre', 'iframe']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
      '*': ['class'],
    },
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      iframe: ['http', 'https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }) as any,
    },
  })
  return clean
}
