// Tune these two by eye.
const HOLD_MS = 2500;
const RETURN_MS = 400;

// From the prototype: every step is Smart Animate, Ease In, 250ms.
const STEP_MS = 250;
const STEP_EASE = 'power2.in';
const RETURN_EASE = 'none';
const STATE_COUNT = 9;

const GSAP_URL = 'https://unpkg.com/gsap@3.12.5/dist/gsap.min.js';
const GSAP_INTEGRITY = 'sha256-KAM+RJox68w5blvosTtjFSvwMJQoj7WGcDQyGSe84Ic=';

const PENDING_CLASS = 'intro-pending';
const IS_DEV = ['localhost', '127.0.0.1'].includes(location.hostname);

const seconds = (ms) => ms / 1000;
const stateLabel = (state) => `state${state}`;

// Injected rather than in the page's HTML, so screens that never animate never download it.
function loadGsap() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSAP_URL;
    script.integrity = GSAP_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(window.gsap);
    script.onerror = () => reject(new Error('GSAP failed to load'));
    document.head.append(script);
  });
}

// A rejected decode means a broken image, which shouldn't stop the page. It just gets no frame.
const decodeImages = (stage) =>
  Promise.all([...stage.querySelectorAll('img:not(.landing-flat)')].map((image) => image.decode().catch(() => {})));

function readPairs(stage) {
  return [...stage.querySelectorAll('.landing-traveller')].map((traveller) => {
    const { pair, arrival, states } = traveller.dataset;
    return {
      traveller,
      host: stage.querySelector(`.landing-layer--host[data-pair="${pair}"]`),
      combined: stage.querySelector(`.landing-layer--combined[data-pair="${pair}"]`),
      arrival: Number(arrival),
      poses: JSON.parse(states).map(([xPercent, yPercent, rotation]) => ({ xPercent, yPercent, rotation })),
    };
  });
}

const samePose = (a, b) => a.xPercent === b.xPercent && a.yPercent === b.yPercent && a.rotation === b.rotation;

// The prototype, step for step: each change eases on its own, so an insert stops on every grid
// line. Chosen over one continuous tween per insert, which slid through the grid unmarked.
function addMotion(timeline, { traveller, poses, arrival }) {
  for (let state = 1; state < arrival; state++) {
    if (samePose(poses[state - 1], poses[state])) continue;
    timeline.to(traveller, { ...poses[state], duration: seconds(STEP_MS), ease: STEP_EASE }, stateLabel(state));
  }
}

function buildTimeline(gsap, stage) {
  const pairs = readPairs(stage);
  const timeline = gsap.timeline({ paused: true, repeat: -1 });

  for (let state = 1; state <= STATE_COUNT; state++) {
    timeline.addLabel(stateLabel(state), seconds((state - 1) * STEP_MS));
  }
  timeline.addLabel('hold', stateLabel(STATE_COUNT));
  timeline.addLabel('return', seconds((STATE_COUNT - 1) * STEP_MS + HOLD_MS));

  for (const pair of pairs) {
    const { traveller, host, combined, poses, arrival } = pair;
    gsap.set(traveller, { ...poses[0], opacity: 1 });
    gsap.set(host, { opacity: 1 });
    gsap.set(combined, { opacity: 0 });

    addMotion(timeline, pair);

    const swap = { duration: seconds(STEP_MS), ease: STEP_EASE };
    timeline.to([host, traveller], { opacity: 0, ...swap }, stateLabel(arrival));
    timeline.to(combined, { opacity: 1, ...swap }, stateLabel(arrival));

    // The insert is invisible by now, so it can jump home unseen.
    const back = { duration: seconds(RETURN_MS), ease: RETURN_EASE };
    timeline.set(traveller, poses[0], 'return');
    timeline.to([host, traveller], { opacity: 1, ...back }, 'return');
    timeline.to(combined, { opacity: 0, ...back }, 'return');
  }
  return timeline;
}

function init() {
  const root = document.documentElement;
  const hero = document.querySelector('[data-landing-hero]');
  const stage = document.querySelector('[data-landing-stage]');
  const wide = matchMedia('(min-width: 900px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let timeline = null;
  let running = false;
  let starting = false;
  let failed = false;
  let heroOnScreen = true;

  async function start() {
    if (starting) return;
    starting = true;
    try {
      const [gsap] = await Promise.all([loadGsap(), document.fonts.ready, decodeImages(stage)]);
      // Compared while the class is still on: it says whether state 1 is on screen, or reduced
      // motion was switched off after the page had settled on the resting state.
      const fromStateOne = root.classList.contains(PENDING_CLASS);
      root.classList.remove(PENDING_CLASS);
      timeline = buildTimeline(gsap, stage);
      if (!fromStateOne) timeline.seek('hold', false);
      if (IS_DEV) window.__introTimeline = timeline;
    } catch {
      failed = true;
    }
    sync();
  }

  // The single place that decides what the animation should be doing, called on every change.
  function sync() {
    if (reducedMotion.matches || failed) {
      root.classList.remove(PENDING_CLASS);
      running = false;
      timeline?.pause('hold');
      return;
    }
    if (!wide.matches) {
      running = false;
      timeline?.pause();
      return;
    }
    if (!timeline) {
      start();
      return;
    }
    // Only on a real change, so an unrelated event can't restart a timeline someone has paused
    // from the console to scrub. Not a seek: it carries on from where it stopped.
    const shouldRun = heroOnScreen && !document.hidden;
    if (shouldRun !== running) {
      running = shouldRun;
      timeline.paused(!running);
    }
  }

  wide.addEventListener('change', sync);
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    heroOnScreen = entry.isIntersecting;
    sync();
  }).observe(hero);

  sync();
}

init();
