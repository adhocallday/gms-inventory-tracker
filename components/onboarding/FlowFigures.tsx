import type { CSSProperties } from 'react';
import {
  COMPARE,
  STAGES,
  TILES,
  type FlowItem,
  type FlowView,
  type PipelineFlow,
  type StageId,
  type TodayFlow,
} from './flow-data';

/*
 * Renders flow-data.ts. Every figure is drawn twice from the same data: a
 * diagram (.mfd-desktop) and a numbered list (.mfd-mobile). CSS shows one or
 * the other by the figure's width (900px container query, app/globals.css).
 */

const s = (stage: StageId) => `mfd-s-${stage}`;
const col = (start: number, end?: number, row?: string): CSSProperties => ({
  gridColumn: end ? `${start} / ${end}` : `${start}`,
  ...(row ? { gridRow: row } : {}),
});

function Items({ items }: { items: FlowItem[] }) {
  return (
    <ul className="mfd-items">
      {items.map((item) => (
        <li key={item.text}>
          {item.text}
          {item.sub && <small>{item.sub}</small>}
        </li>
      ))}
    </ul>
  );
}

function StageHead({ stage, n }: { stage: StageId; n?: number }) {
  return (
    <div className="mfd-head">
      <span className={n === undefined ? 'mfd-marker mfd-marker--dot' : 'mfd-marker'} aria-hidden="true">
        {n}
      </span>
      <span className="mfd-label">{STAGES[stage].label}</span>
    </div>
  );
}

export function StageLegend() {
  const order: StageId[] = ['sources', 'capture', 'ai', 'rules', 'review', 'database', 'outputs', 'manual'];
  return (
    <ul className="mfd-legend" aria-label="Stage colours">
      {order.map((id) => (
        <li key={id} className={s(id)}>
          <i className="mfd-swatch" aria-hidden="true" />
          <b>{STAGES[id].label}</b>
          <span>{STAGES[id].note}</span>
        </li>
      ))}
    </ul>
  );
}

export function FlowTiles(props: { 'data-tour'?: string }) {
  return (
    <ul className="mfd-tiles" aria-label="Manual steps per option" {...props}>
      {TILES.map((tile) => (
        <li key={tile.label} className={`mfd-tile ${s(tile.tone)}`}>
          <span className="mfd-tile-label">{tile.label}</span>
          <span className="mfd-tile-count">{tile.count}</span>
          <p className="mfd-tile-body">
            {tile.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PipelineDiagram({ flow }: { flow: PipelineFlow }) {
  const last = flow.stages.length * 2 - 1; // grid column of the database
  const dbRow = flow.branch ? '1 / span 3' : '1';
  const outRow = flow.branch ? 5 : 3;
  return (
    <div className="mfd-desktop mfd-pipe">
      {flow.stages.map((stage, i) => (
        <PipelineCell key={stage.stage} index={i} stage={stage} style={col(i * 2 + 1, undefined, i === flow.stages.length - 1 ? dbRow : '1')} />
      ))}
      {flow.stages.slice(1).map((stage, i) => (
        <span key={`a-${stage.stage}`} className="mfd-arrow-r" style={col(i * 2 + 2, undefined, '1')} />
      ))}
      {flow.branch && (
        <>
          <div className="mfd-up" style={col(3, undefined, '2')}>
            <span className="mfd-arrow-v up" />
            <span className="mfd-wire-label">{flow.branch.toCapture}</span>
          </div>
          <div className={`mfd-card ${s(flow.branch.stage)}`} style={col(1, 4, '3')}>
            <StageHead stage={flow.branch.stage} />
            <p className="mfd-title">{flow.branch.title}</p>
            <Items items={flow.branch.items} />
          </div>
          <div className="mfd-hconn" style={col(4, last, '3')}>
            <span className="mfd-wire-label">{flow.branch.toDatabase}</span>
            <span className="mfd-arrow-r" />
          </div>
        </>
      )}
      <span className="mfd-arrow-v" style={col(last, undefined, String(outRow - 1))} />
      <div className={`mfd-card mfd-outputs ${s('outputs')}`} style={{ gridRow: String(outRow) }}>
        <StageHead stage="outputs" n={flow.stages.length + 1} />
        <div className="mfd-outputs-grid">
          {flow.outputs.map((out) => (
            <div key={out.text} className="mfd-out">
              <b>{out.text}</b>
              <span>{out.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineCell({ stage, index, style }: { stage: PipelineFlow['stages'][number]; index: number; style: CSSProperties }) {
  return (
    <div className={`mfd-card ${s(stage.stage)}`} style={style}>
      <StageHead stage={stage.stage} n={index + 1} />
      {stage.title !== STAGES[stage.stage].label && <p className="mfd-title">{stage.title}</p>}
      {stage.tag && <p className="mfd-tag">{stage.tag}</p>}
      <Items items={stage.items} />
    </div>
  );
}

function PipelineList({ flow }: { flow: PipelineFlow }) {
  const db = flow.stages.length - 1;
  return (
    <ol className="mfd-mobile mfd-steps">
      {flow.stages.map((stage, i) => (
        <PipelineListStep key={stage.stage} n={i + 1} stage={stage.stage} title={stage.title} tag={stage.tag} items={stage.items} before={i === db && flow.branch ? flow.branch : undefined} />
      ))}
      <li className={`mfd-step ${s('outputs')}`}>
        <span className="mfd-marker" aria-hidden="true">{flow.stages.length + 1}</span>
        <div className="mfd-card">
          <p className="mfd-label">
            <span className="sr-only">Step {flow.stages.length + 1}: </span>
            {STAGES.outputs.label}
          </p>
          <Items items={flow.outputs} />
        </div>
      </li>
    </ol>
  );
}

function PipelineListStep({
  n,
  stage,
  title,
  tag,
  items,
  before,
}: {
  n: number;
  stage: StageId;
  title: string;
  tag?: string;
  items: FlowItem[];
  before?: PipelineFlow['branch'];
}) {
  return (
    <>
      {before && (
        <li className={`mfd-step ${s(before.stage)}`}>
          <span className="mfd-marker mfd-marker--dot" aria-hidden="true" />
          <div className="mfd-card">
            <p className="mfd-label">{STAGES[before.stage].label}, in parallel</p>
            <p className="mfd-title">{before.title}</p>
            <Items items={before.items} />
            <p className="mfd-step-note">
              <b>To the database:</b> {before.toDatabase}.
            </p>
            <p className="mfd-step-note">
              <b>To capture:</b> {before.toCapture}.
            </p>
          </div>
        </li>
      )}
      <li className={`mfd-step ${s(stage)}`}>
        <span className="mfd-marker" aria-hidden="true">{n}</span>
        <div className="mfd-card">
          <p className="mfd-label">
            <span className="sr-only">Step {n}: </span>
            {STAGES[stage].label}
          </p>
          {title !== STAGES[stage].label && <p className="mfd-title">{title}</p>}
          {tag && <p className="mfd-tag">{tag}</p>}
          <Items items={items} />
        </div>
      </li>
    </>
  );
}

function TodayDiagram({ flow }: { flow: TodayFlow }) {
  return (
    <div className="mfd-desktop mfd-today">
      <span className="mfd-today-corner">Document, and where it comes from</span>
      {flow.systems.map((sys) => (
        <div key={sys.id} className={`mfd-card mfd-sys ${s('database')}`}>
          <p className="mfd-title">{sys.title}</p>
          <small>{sys.sub}</small>
        </div>
      ))}
      {flow.rows.map((row) => {
        const lastUsed = flow.systems.reduce((acc, sys, i) => (row.cells[sys.id] ? i : acc), -1);
        return (
          <div key={row.doc} style={{ display: 'contents' }}>
            <div className={`mfd-card mfd-doc ${s('sources')}`}>
              <p className="mfd-title">{row.doc}</p>
              <small>{row.from}</small>
            </div>
            {flow.systems.map((sys, i) => {
              const cell = row.cells[sys.id];
              const line = i < lastUsed ? 'through' : i === lastUsed ? 'end' : undefined;
              return (
                <div key={sys.id} className="mfd-cell" data-line={line}>
                  {cell === 'source' && <span className={`mfd-chip ${s('sources')}`}>Source</span>}
                  {Array.isArray(cell) && (
                    <div className={`mfd-pill ${s('manual')}`}>
                      {cell.map((step) => (
                        <span key={step.n} className="mfd-pill-step">
                          <span className="mfd-marker">{step.n}</span>
                          {step.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TodayList({ flow }: { flow: TodayFlow }) {
  return (
    <ol className="mfd-mobile mfd-steps">
      {flow.rows.map((row) => (
        <li key={row.doc} className={`mfd-step ${s('sources')}`}>
          <span className="mfd-marker mfd-marker--dot" aria-hidden="true" />
          <div className="mfd-card">
            <p className="mfd-title">{row.doc}</p>
            <p className="mfd-step-note">{row.from}</p>
            <ol className={`mfd-substeps ${s('manual')}`}>
              {flow.systems.flatMap((sys) => {
                const cell = row.cells[sys.id];
                if (!Array.isArray(cell)) return [];
                return cell.map((step, i) => (
                  <li key={step.n}>
                    <span className="mfd-marker">{step.n}</span>
                    <span>
                      {i === cell.length - 1 ? step.text.replace(/yped in$/, `yped into ${sys.title}`) : step.text}
                    </span>
                  </li>
                ));
              })}
            </ol>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One diagram, as a figure with a caption for screen readers and both layouts. */
export function FlowFigure({ flow, ...rest }: { flow: PipelineFlow | TodayFlow; 'data-tour'?: string }) {
  return (
    <figure className="mfd-figure" aria-label={flow.title} {...rest}>
      <figcaption className="sr-only">{flow.desc}</figcaption>
      {flow.kind === 'today' ? (
        <>
          <TodayDiagram flow={flow} />
          <TodayList flow={flow} />
        </>
      ) : (
        <>
          <PipelineDiagram flow={flow} />
          <PipelineList flow={flow} />
        </>
      )}
    </figure>
  );
}

const COLUMN_TONE: StageId[] = ['manual', 'review', 'outputs'];

/** A tab panel's content: heading, diagram, comparison table and notes. */
export function FlowPanelBody({ view }: { view: FlowView }) {
  return (
    <>
      <div className="mfd-panel-head">
        <h3>{view.title}</h3>
        <p>{view.intro}</p>
      </div>

      {view.flow && <FlowFigure flow={view.flow} data-tour="flow-diagram" />}

      {view.id === 'compare' && <CompareTable />}

      {view.notes.length > 0 && (
        <div className="mfd-notes">
          {view.notes.map((note, index) => {
            const List = note.ordered ? 'ol' : 'ul';
            return (
              <div
                key={note.title}
                data-tour={`flow-${view.id}-note-${index}`}
                className={note.tone ? `mfd-note mfd-s-${note.tone}` : 'mfd-note'}
              >
                <h4>{note.title}</h4>
                <List>
                  {note.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </List>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function CompareTable() {
  return (
    <div className="mfd-table">
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Measure</span>
            </th>
            {COMPARE.columns.map((label, i) => (
              <th key={label} scope="col" className={`mfd-s-${COLUMN_TONE[i]}`}>
                <span className="mfd-dot" aria-hidden="true" />
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, i) => (
                <td key={i}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
