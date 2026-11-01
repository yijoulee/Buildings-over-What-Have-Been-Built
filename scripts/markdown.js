import { Marked } from 'marked';
import { escapeHtml } from './template.js';

const SAFE_LINK = /^(?:https?:|mailto:)/i;

// Content is untrusted and the design only has styles for inline text, paragraphs and
// lists. Anything else is reduced to its text rather than dropped, so a stray heading
// in a case study can't silently lose words. gfm is off to rule out tables and task lists.
const marked = new Marked({
  gfm: false,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    heading({ tokens }) {
      return `<p>${this.parser.parseInline(tokens)}</p>\n`;
    },
    blockquote({ tokens }) {
      return this.parser.parse(tokens);
    },
    code({ text }) {
      return `<p>${escapeHtml(text)}</p>\n`;
    },
    hr() {
      return '';
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!SAFE_LINK.test(href.trim())) return label;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}"${titleAttr}>${label}</a>`;
    },
  },
});

export function renderMarkdown(source) {
  return marked.parse(source, { async: false }).trim();
}
