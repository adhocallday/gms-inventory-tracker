// Renders the data-flow figures (components/onboarding/FlowFigures + flow-data) to static HTML
// fragments for the public Data Flow site. Writes JSON to stdout; build.py assembles the page.
//   npx tsx scripts/flow-site/render.mts > /tmp/flow.json
//   python3 scripts/flow-site/build.py /tmp/flow.json ../gms-merch-flow-intelligence/index.html
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
(globalThis as any).React = React;

const { FlowPanelBody, FlowTiles, StageLegend } = await import(path.join(REPO, 'components/onboarding/FlowFigures'));
const { VIEWS, AI_NOTE } = await import(path.join(REPO, 'components/onboarding/flow-data'));

const out: Record<string, string> = {
  tiles: renderToStaticMarkup(React.createElement(FlowTiles)),
  legend: renderToStaticMarkup(React.createElement(StageLegend)),
  ai: AI_NOTE,
};
for (const v of VIEWS as any[]) out['panel:' + v.id] = renderToStaticMarkup(React.createElement(FlowPanelBody, { view: v }));
out.views = JSON.stringify((VIEWS as any[]).map((v) => ({ id: v.id, tab: v.tab, count: v.count })));
process.stdout.write(JSON.stringify(out));
