// A Hide button beside Delete on the Case Studies list, and Unhide on the Hidden list.
//
// Sveltia has no API for list actions, so this finds its Delete button and adds one beside it.
// It is written against Sveltia 0.248.0, pinned in index.html: if an upgrade changes that
// markup, the button simply doesn't appear and the rest of the CMS is unaffected.
//
// Hiding sets `hidden: true` in each ticked case study's front matter; unhiding removes the
// line. All the files change in one commit, made with the GitHub sign-in Sveltia already holds.
// The two lists are collections filtered on that field (config.yml), so the page reloads
// afterwards for Sveltia to sort the entries again.

// As in config.yml's backend.
const REPO = 'yijoulee/Buildings-over-What-Have-Been-Built';
const BRANCH = 'main';
const FOLDER = 'content/case-studies';

const LISTS = {
  'case-studies': { label: 'Hide', busy: 'Hiding…', hide: true },
  'hidden-case-studies': { label: 'Unhide', busy: 'Unhiding…', hide: false },
};

const API = 'https://api.github.com';
const BUTTON_CLASS = 'hide-entries';

function token() {
  try {
    return JSON.parse(localStorage.getItem('sveltia-cms.user'))?.token ?? null;
  } catch {
    return null;
  }
}

async function github(path, options = {}) {
  const response = await fetch(`${API}/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub answered ${response.status} to ${options.method ?? 'GET'} ${path}`);
  return response.json();
}

const decode = (base64) =>
  new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (char) => char.charCodeAt(0)));

// The list labels each row with the entry's title, the collection's identifier_field.
const unquote = (value) => value.trim().replace(/^(['"])(.*)\1$/, '$2').replace(/''/g, "'");

function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? { block: match[1], start: match[0].indexOf(match[1]) } : null;
}

function titleOf(text) {
  const line = frontMatter(text)?.block.match(/^title:(.*)$/m);
  return line ? unquote(line[1]) : null;
}

// Only the one line changes, so the rest of the file stays exactly as the CMS wrote it.
function setHidden(text, hide) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const { block, start } = frontMatter(text);
  const lines = block.split(/\r?\n/).filter((line) => !/^hidden:/.test(line));
  if (hide) {
    const after = lines.findIndex((line) => /^slug:/.test(line));
    lines.splice(after + 1, 0, 'hidden: true');
  }
  return text.slice(0, start) + lines.join(eol) + text.slice(start + block.length);
}

async function changeEntries(titles, hide) {
  const files = (await github(`/contents/${FOLDER}?ref=${BRANCH}`)).filter((file) => file.name.endsWith('.md'));
  const texts = await Promise.all(
    files.map(async (file) => ({ path: file.path, text: decode((await github(`/git/blobs/${file.sha}`)).content) })),
  );

  const changes = titles.map((title) => {
    const matches = texts.filter((file) => titleOf(file.text) === title);
    if (matches.length !== 1) throw new Error(`Found ${matches.length} files titled "${title}", so nothing was changed.`);
    return { path: matches[0].path, content: setHidden(matches[0].text, hide) };
  });

  const head = await github(`/git/ref/heads/${BRANCH}`);
  const parent = await github(`/git/commits/${head.object.sha}`);
  const tree = await github('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: changes.map(({ path, content }) => ({ path, mode: '100644', type: 'blob', content })),
    }),
  });
  const count = `${titles.length} case ${titles.length === 1 ? 'study' : 'studies'}`;
  const commit = await github('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: `${hide ? 'Hide' : 'Unhide'} ${count}\n\n${titles.join('\n')}`, tree: tree.sha, parents: [parent.sha] }),
  });
  // Not forced: if someone saved in the meantime, this fails rather than undo their commit.
  await github(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
}

const currentList = () => LISTS[location.hash.match(/^#\/collections\/([^/?]+)\/?(?:\?.*)?$/)?.[1]];

const tickedTitles = () =>
  [...document.querySelectorAll('[role="grid"] [role="row"]')]
    .filter((row) => row.querySelector('[role="checkbox"][aria-checked="true"]'))
    // Sveltia wraps labels in bidi isolates, which aren't part of the title.
    .map((row) => row.getAttribute('aria-label').replace(/[\u2066-\u2069]/g, ''));

async function onClick(event) {
  const button = event.currentTarget;
  const list = currentList();
  const titles = tickedTitles();
  if (!list || titles.length === 0 || button.disabled) return;
  const what = titles.length === 1 ? `"${titles[0]}"` : `${titles.length} case studies`;
  const effect = list.hide
    ? 'It will be left off the case study index and the map once the site has redeployed.'
    : 'It will be listed on the site again once it has redeployed.';
  if (!window.confirm(`${list.label} ${what}?\n\n${effect}`)) return;

  button.disabled = true;
  button.querySelector('.label-text').textContent = list.busy;
  try {
    await changeEntries(titles, list.hide);
    location.reload();
  } catch (error) {
    window.alert(`${list.label} didn't go through. ${error.message}`);
    button.querySelector('.label-text').textContent = list.label;
    update();
  }
}

// Built from the Delete button's own classes, so it takes Sveltia's ghost-button style.
function createButton(deleteButton) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${deleteButton.className} ${BUTTON_CLASS}`;
  const label = document.createElement('span');
  label.className = `${deleteButton.querySelector('.label')?.className ?? ''} label-text`;
  button.append(label);
  button.addEventListener('click', onClick);
  return button;
}

function update() {
  const list = currentList();
  const deleteButton = document.querySelector('button[aria-label="Delete Selected Entries"]');
  let button = document.querySelector(`.${BUTTON_CLASS}`);
  if (!list || !deleteButton) {
    button?.remove();
    return;
  }
  if (!button || button.nextElementSibling !== deleteButton) {
    button?.remove();
    button = createButton(deleteButton);
    deleteButton.before(button);
  }
  const label = button.querySelector('.label-text');
  // Only what has changed is written, since writing the label would wake the observer again.
  if (!button.disabled || label.textContent !== list.busy) {
    if (label.textContent !== list.label) label.textContent = list.label;
    const off = tickedTitles().length === 0;
    button.disabled = off;
    button.setAttribute('aria-disabled', String(off));
  }
}

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    update();
  });
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked'] });
window.addEventListener('hashchange', update);
