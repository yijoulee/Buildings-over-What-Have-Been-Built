// Rules from scripts/validate.js that CMS fields can't express, because each depends on another
// field or on the filename. Sveltia has no conditional fields, so they run here, just before a
// save. Throwing stops the save and shows the message in the editor's error dialog.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECTION_NAMES = ['introduction', 'reuse_goal', 'challenges', 'adaptive_strategy', 'solutions'];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

function findProblems(data, slug) {
  const problems = [];
  if (!SLUG_PATTERN.test(slug)) {
    problems.push(`The filename "${slug}" must be lowercase letters and numbers joined by hyphens. Change the title.`);
  }
  if (!isBlank(data.year_completed) && isBlank(data.year_sort)) {
    problems.push('Year for sorting is required when Year completed is filled in.');
  }
  const [latitude] = data.coordinates ?? [];
  if (Math.abs(latitude) > 90) problems.push('Latitude, the first coordinate, must be between -90 and 90.');

  for (const name of SECTION_NAMES) {
    const section = data.sections?.[name];
    const images = section?.images ?? [];
    if (section?.figure !== 'comparison') {
      if (images.some((image) => isBlank(image.caption))) problems.push(`${name}: each image needs a caption.`);
      if (!isBlank(section?.caption)) problems.push(`${name}: a shared caption is only for a comparison. Clear it, or set Figure to comparison.`);
      continue;
    }
    if (images.length !== 2) problems.push(`${name}: a comparison needs exactly two images.`);
    if (images.some((image) => isBlank(image.label))) problems.push(`${name}: each image in a comparison needs a label.`);
    if (isBlank(section.caption)) problems.push(`${name}: a comparison needs a shared caption.`);
  }

  const thumbnails = SECTION_NAMES.flatMap((name) => data.sections?.[name]?.images ?? []).filter((image) => image?.thumbnail === true);
  if (thumbnails.length > 1) problems.push(`Only one image can be the thumbnail; ${thumbnails.length} are marked "Use as thumbnail".`);
  return problems;
}

window.CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    if (entry.get('collection') !== 'case-studies') return undefined;
    const data = entry.get('data');
    const slug = entry.get('slug');
    const problems = findProblems(data.toJS(), slug);
    if (problems.length > 0) throw new Error(problems.join(' '));
    return data.set('slug', slug);
  },
});
