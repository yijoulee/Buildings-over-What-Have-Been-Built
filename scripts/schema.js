// The case study content model. validate.js reads these definitions, so a field
// changed here changes what the validator enforces.
//
// `taxonomy` names a list in content/taxonomy.yml; `values` is for the few enums
// that are layout switches rather than controlled vocabulary.

export const fields = [
  // Becomes a folder and a URL segment, so the format is enforced, not just conventional.
  { name: 'slug', type: 'string', required: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  { name: 'title', type: 'string', required: true },
  { name: 'architect', type: 'string', required: true }, // "Unknown" is a permitted value
  { name: 'area_m2', type: 'number', required: false },
  // A string because some cases read "7th Century"; year_sort carries the ordering.
  { name: 'year_completed', type: 'string', required: false },
  { name: 'year_sort', type: 'number', integer: true, required: false, requiredWhen: 'year_completed' },
  { name: 'city', type: 'string', required: true },
  { name: 'country', type: 'string', required: true },
  { name: 'coordinates', type: 'coordinates', required: true },
  { name: 'location_note', type: 'string', required: false },

  { name: 'original_function', type: 'enum', required: true, taxonomy: 'function' },
  { name: 'original_form_geometry', type: 'enum', required: true, taxonomy: 'form_geometry' },
  { name: 'original_form_organisation', type: 'enum', required: true, taxonomy: 'form_organisation' },
  { name: 'new_function', type: 'enum', required: true, taxonomy: 'function' },
  { name: 'new_form_geometry', type: 'enum', required: true, taxonomy: 'form_geometry' },
  { name: 'new_form_organisation', type: 'enum', required: true, taxonomy: 'form_organisation' },
  { name: 'strategy', type: 'enum-list', required: true, taxonomy: 'strategy' },
];

export const sectionNames = [
  'introduction',
  'reuse_goal',
  'challenges',
  'adaptive_strategy',
  'solutions',
];

export const sectionHeadings = {
  introduction: 'Introduction',
  reuse_goal: 'Reuse Goal',
  challenges: 'Challenge',
  adaptive_strategy: 'Adaptive Strategy',
  solutions: 'Outcome',
};

export const sectionFields = [
  { name: 'body', type: 'markdown', required: true },
  { name: 'figure', type: 'enum', required: false, values: ['separate', 'comparison'] },
  // Overrides the layout the build alternates by section index.
  { name: 'layout', type: 'enum', required: false, values: ['text-left', 'image-left'] },
  // One caption under both images of a comparison; validate.js decides when it is needed.
  { name: 'caption', type: 'string', required: false },
];

export const imageFields = [
  { name: 'src', type: 'string', required: true },
  // Required unless the section is a comparison with a shared caption; validate.js enforces that.
  { name: 'caption', type: 'string', required: false },
  // Required only under `figure: comparison`; validate.js enforces that.
  { name: 'label', type: 'string', required: false },
  // The index and map cards use the image marked here; at most one per case study.
  { name: 'thumbnail', type: 'boolean', required: false },
];

export const MAX_IMAGES_PER_SECTION = 2;
export const COMPARISON_IMAGE_COUNT = 2;
