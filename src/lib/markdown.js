const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const escapeAttribute = (value) => escapeHtml(value).replaceAll('`', '&#96;')

const isSafeLink = (href) => {
  const trimmedHref = href.trim()

  if (!trimmedHref) return false
  if (/^(https?:|mailto:)/i.test(trimmedHref)) return true
  return /^(\/|#|\.\.?\/)/.test(trimmedHref)
}

const renderInlineMarkdown = (text) => {
  const codeSpans = []
  const escaped = escapeHtml(text).replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`
    codeSpans.push(`<code>${code}</code>`)
    return token
  })

  const linked = escaped.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    const decodedHref = href
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")

    if (!isSafeLink(decodedHref)) return match

    return `<a href="${escapeAttribute(decodedHref)}" target="_blank" rel="noreferrer">${label}</a>`
  })

  return linked
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/(^|[^\*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codeSpans[Number(index)] ?? '')
}

const renderParagraph = (lines) => {
  const content = lines.map(renderInlineMarkdown).join('<br>')
  return `<p>${content}</p>`
}

const renderList = (items, ordered) => {
  const tagName = ordered ? 'ol' : 'ul'
  const content = items
    .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
    .join('')

  return `<${tagName}>${content}</${tagName}>`
}

const renderBlockquote = (lines) => `<blockquote>${renderParagraph(lines)}</blockquote>`

export const markdownToHtml = (markdown) => {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let paragraphLines = []
  let listItems = []
  let listOrdered = false
  let blockquoteLines = []
  let codeLines = []
  let inCodeBlock = false

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push(renderParagraph(paragraphLines))
    paragraphLines = []
  }

  const flushList = () => {
    if (listItems.length === 0) return
    blocks.push(renderList(listItems, listOrdered))
    listItems = []
  }

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return
    blocks.push(renderBlockquote(blockquoteLines))
    blockquoteLines = []
  }

  const flushCodeBlock = () => {
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    codeLines = []
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      } else {
        flushParagraph()
        flushList()
        flushBlockquote()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      flushBlockquote()
      continue
    }

    const headingMatch = line.match(/^\s*(#{1,3})\s+(.+)$/)

    if (headingMatch) {
      flushParagraph()
      flushList()
      flushBlockquote()
      blocks.push(`<h${headingMatch[1].length}>${renderInlineMarkdown(headingMatch[2])}</h${headingMatch[1].length}>`)
      continue
    }

    const blockquoteMatch = line.match(/^\s*>\s?(.*)$/)

    if (blockquoteMatch) {
      flushParagraph()
      flushList()
      blockquoteLines.push(blockquoteMatch[1])
      continue
    }

    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/)

    if (unorderedMatch || orderedMatch) {
      flushParagraph()
      flushBlockquote()
      const nextOrdered = Boolean(orderedMatch)

      if (listItems.length > 0 && listOrdered !== nextOrdered) {
        flushList()
      }

      listOrdered = nextOrdered
      listItems.push((orderedMatch ?? unorderedMatch)[1])
      continue
    }

    flushList()
    flushBlockquote()
    paragraphLines.push(line)
  }

  if (inCodeBlock) flushCodeBlock()
  flushParagraph()
  flushList()
  flushBlockquote()

  return blocks.join('')
}
