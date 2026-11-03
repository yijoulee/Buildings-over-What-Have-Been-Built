import matter from 'gray-matter';
import { renderMarkdown } from './markdown.js';
import { renderTemplate } from './template.js';

const isText = (value) => typeof value === 'string' && value.trim() !== '';

// Section ids come from the headings, so a link to /about/#about-me keeps working if the
// order changes.
const headingId = (heading) =>
  heading.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Throws with every problem in content/about.md, so the build can report them together. */
export function renderAboutPage(source, templates, chrome) {
  const { data } = matter(source);
  const problems = [];
  if (!isText(data.title)) problems.push('title is required');
  if (!Array.isArray(data.sections) || data.sections.length === 0) problems.push('sections needs at least one section');
  (Array.isArray(data.sections) ? data.sections : []).forEach((section, index) => {
    if (!isText(section?.heading)) problems.push(`sections[${index}].heading is required`);
    if (!isText(section?.body)) problems.push(`sections[${index}].body is required`);
  });
  if (data.note !== undefined && data.note !== null && !isText(data.note)) problems.push('note must be Markdown text');
  if (problems.length > 0) throw new Error(problems.map((problem) => `about.md: ${problem}`).join('\n'));

  return renderTemplate(templates.about, {
    header: chrome.header,
    footer: chrome.footer,
    title: data.title,
    sections: data.sections
      .map(({ heading, body }) => renderTemplate(templates.aboutSection, {
        id: headingId(heading),
        heading,
        body: renderMarkdown(body),
      }))
      .join(''),
    note: isText(data.note) ? renderTemplate(templates.aboutNote, { body: renderMarkdown(data.note) }) : '',
  });
}
