const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

/**
 * {{name}} is escaped. {{{name}}} is inserted as is, and exists only for markup the build
 * has already made safe (rendered Markdown, rendered partials).
 *
 * This is a single pass, so a case study containing the text "{{title}}" stays literal.
 * An unknown name throws: it's a typo in a template, and would otherwise ship as a blank.
 */
export function renderTemplate(template, values) {
  return template.replace(/\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*(\w+)\s*\}\}/g, (_, raw, escaped) => {
    const name = raw ?? escaped;
    if (!Object.hasOwn(values, name)) throw new Error(`unknown placeholder {{${name}}}`);
    return raw ? String(values[name] ?? '') : escapeHtml(values[name]);
  });
}
