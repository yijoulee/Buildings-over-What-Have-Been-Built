import yaml from 'js-yaml';
import { sectionNames } from './schema.js';

const sameSet = (a, b) => a.length === b.length && a.every((value) => b.includes(value));
const optionValue = (option) => option?.value ?? option;

// A YAML config can't read taxonomy.yml or schema.js, so its copies are compared here. A value
// missing from the CMS can't be chosen, and an extra one would save a file validate.js rejects.
export function checkCmsConfig(configText, taxonomy) {
  const { collections } = yaml.load(configText);
  const fields = collections.find(({ name }) => name === 'case-studies').fields;
  const allowed = {
    function: Object.values(taxonomy.function).flat(),
    form_geometry: taxonomy.form_geometry,
    form_organisation: taxonomy.form_organisation,
    strategy: taxonomy.strategy,
  };
  const lists = {
    original_function: 'function',
    new_function: 'function',
    original_form_geometry: 'form_geometry',
    new_form_geometry: 'form_geometry',
    original_form_organisation: 'form_organisation',
    new_form_organisation: 'form_organisation',
    strategy: 'strategy',
  };

  const warnings = [];
  for (const [fieldName, listName] of Object.entries(lists)) {
    const options = fields.find(({ name }) => name === fieldName)?.options?.map(optionValue) ?? [];
    if (!sameSet(options, allowed[listName])) {
      warnings.push(`public/admin/config.yml: ${fieldName} options differ from taxonomy.${listName}`);
    }
  }
  const sections = fields.find(({ name }) => name === 'sections')?.fields?.map(({ name }) => name) ?? [];
  if (!sameSet(sections, sectionNames)) {
    warnings.push('public/admin/config.yml: sections differ from scripts/schema.js');
  }
  return warnings;
}
