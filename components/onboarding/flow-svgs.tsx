/* eslint-disable */
// Ported from gms-merch-flow-intelligence/index.html (the Data Flow site).
// Keep the geometry and copy in sync with that page. Styled by .mf-flow in app/globals.css.

export function CurrentFlowSvg() {
  return (
<svg viewBox="0 150 1460 600" role="img" aria-label="Current tour data flow with ten manual entry points">
        <defs>
          <marker id="mf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--shape-ink)"/></marker>
          <marker id="mf-arrowG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--auto)"/></marker>
        </defs>
        <path className="wire" d="M160 217 H215"/>
        <path className="wire a" d="M300 215 H338"/>
        <path className="wire" d="M478 214 H520"/>
        <path className="wire a" d="M257 255 V719 H433"/>
        <path className="wire a" d="M511 719 H1097 V582"/>
        <path className="wire a" d="M560 268 V324 H628"/>
        <path className="wire a" d="M560 324 V562 H628"/>
        <path className="wire a" d="M560 562 V672 H628"/>
        <path className="wire a" d="M706 324 H750"/>
        <path className="wire a" d="M706 562 H728 V628 H750"/>
        <path className="wire a" d="M706 672 H975 V500 H1022"/>
        <path className="wire" d="M890 323 H930"/>
        <path className="wire a" d="M1015 322 H1057"/>
        <path className="wire a" d="M1096 342 V422"/>
        <path className="wire a" d="M972 372 V445 H819 V486"/>
        <path className="wire a" d="M819 526 V597"/>
        <path className="wire" d="M820 292 V234 H1165"/>
        <path className="wire a" d="M1245 228 H1432 V500 H1391"/>
        <path className="wire a" d="M1432 500 V626 H1391"/>
        <path className="wire a" d="M1313 500 H1280"/>
        <path className="wire a" d="M1202 498 H1172"/>
        <path className="wire a" d="M1313 626 H1280"/>
        <path className="wire a" d="M1202 624 H1190 V700 H820 V659"/>
        <ellipse className="f-gms s" cx="90" cy="217" rx="70" ry="42"/>
        <text className="t-title" textAnchor="middle" x="90" y="205"><tspan x="90">GMS</tspan><tspan x="90" dy="17">Purchase</tspan><tspan x="90" dy="17">Orders</tspan></text>
        <ellipse className="f-vendor s" cx="408" cy="214" rx="70" ry="31"/>
        <text className="t-title" textAnchor="middle" x="408" y="219">Vendor</text>
        <ellipse className="f-atvenu s" cx="820" cy="323" rx="70" ry="31"/>
        <text className="t-title" textAnchor="middle" x="820" y="328">AtVenu</text>
        <ellipse className="f-gms s" cx="820" cy="628" rx="70" ry="31"/>
        <text className="t-title" textAnchor="middle" x="820" y="623"><tspan x="820">Business</tspan><tspan x="820" dy="17">Central</tspan></text>
        <rect className="f-tracker s2" x="1022" y="422" width="150" height="160" rx="3"/>
        <text x="1032" y="444"><tspan className="t-title">Inventory Tracker</tspan>
          <tspan className="t-small" x="1036" dy="20">• Sales &amp; comps</tspan><tspan className="t-small" x="1036" dy="16">• PO data</tspan>
          <tspan className="t-small" x="1036" dy="16">• Packing lists received</tspan><tspan className="t-small" x="1036" dy="16">• Reports, charts, grab sheets</tspan>
          <tspan className="t-small" x="1036" dy="16">• Projections</tspan><tspan className="t-small" x="1036" dy="16">• COGS</tspan></text>
        <rect className="f-sticky" x="215" y="175" width="85" height="80"/>
        <text className="t-small t-bold" textAnchor="middle"><tspan x="257" y="205">Files:</tspan><tspan x="257" dy="14">PDF purchase</tspan><tspan x="257" dy="14">orders</tspan></text>
        <rect className="f-sticky" x="520" y="188" width="80" height="80"/>
        <text className="t-small t-bold" textAnchor="middle"><tspan x="560" y="223">Files:</tspan><tspan x="560" dy="14">Packing lists</tspan></text>
        <rect className="f-sticky" x="930" y="282" width="85" height="90"/>
        <text className="t-small t-bold" textAnchor="middle"><tspan x="972" y="300">Sales report</tspan><tspan x="972" dy="13">PDF/xls &amp;</tspan><tspan x="972" dy="13">settlement</tspan><tspan x="972" dy="13">report</tspan><tspan x="972" dy="13">PDF/xls</tspan></text>
        <rect className="f-sticky" x="1165" y="188" width="80" height="80"/>
        <text className="t-small t-bold" textAnchor="middle"><tspan x="1205" y="216">Comps</tspan><tspan x="1205" dy="14">(GMS/band)</tspan><tspan x="1205" dy="14">trailer</tspan></text>
        <g className="t-small t-bold">
          <rect className="f-manual s2" x="628" y="310" width="78" height="28"/><text textAnchor="middle" x="667" y="328">Manual entry</text>
          <rect className="f-manual s2" x="1057" y="302" width="78" height="40"/><text textAnchor="middle"><tspan x="1096" y="318">Manual down-</tspan><tspan x="1096" dy="13">load &amp; entry</tspan></text>
          <rect className="f-manual s2" x="780" y="486" width="78" height="40"/><text textAnchor="middle"><tspan x="819" y="502">Manual down-</tspan><tspan x="819" dy="13">load &amp; entry</tspan></text>
          <rect className="f-manual s2" x="628" y="548" width="78" height="28"/><text textAnchor="middle" x="667" y="566">Manual entry</text>
          <rect className="f-manual s2" x="628" y="658" width="78" height="28"/><text textAnchor="middle" x="667" y="676">Manual entry</text>
          <rect className="f-manual s2" x="433" y="705" width="78" height="28"/><text textAnchor="middle" x="472" y="723">Manual entry</text>
          <rect className="f-manual s2" x="1202" y="478" width="78" height="40"/><text textAnchor="middle"><tspan x="1241" y="494">Manual entry</tspan><tspan x="1241" dy="13">from portal</tspan></text>
          <rect className="f-manual s2" x="1313" y="486" width="78" height="28"/><text textAnchor="middle"><tspan x="1352" y="498">Log into</tspan><tspan x="1352" dy="11">AtVenu portal</tspan></text>
          <rect className="f-manual s2" x="1202" y="604" width="78" height="40"/><text textAnchor="middle"><tspan x="1241" y="620">Manual entry</tspan><tspan x="1241" dy="13">from portal</tspan></text>
          <rect className="f-manual s2" x="1313" y="612" width="78" height="28"/><text textAnchor="middle"><tspan x="1352" y="624">Log into</tspan><tspan x="1352" dy="11">AtVenu portal</tspan></text>
        </g>
        <g>
          <circle className="badge" cx="628" cy="310" r="10"/><text className="t-badge" textAnchor="middle" x="628" y="314">1</text>
          <circle className="badge" cx="433" cy="705" r="10"/><text className="t-badge" textAnchor="middle" x="433" y="709">2</text>
          <circle className="badge" cx="628" cy="548" r="10"/><text className="t-badge" textAnchor="middle" x="628" y="552">3</text>
          <circle className="badge" cx="628" cy="658" r="10"/><text className="t-badge" textAnchor="middle" x="628" y="662">4</text>
          <circle className="badge" cx="1057" cy="302" r="10"/><text className="t-badge" textAnchor="middle" x="1057" y="306">5</text>
          <circle className="badge" cx="780" cy="486" r="10"/><text className="t-badge" textAnchor="middle" x="780" y="490">6</text>
          <circle className="badge" cx="1391" cy="486" r="10"/><text className="t-badge" textAnchor="middle" x="1391" y="490">7</text>
          <circle className="badge" cx="1202" cy="478" r="10"/><text className="t-badge" textAnchor="middle" x="1202" y="482">8</text>
          <circle className="badge" cx="1391" cy="612" r="10"/><text className="t-badge" textAnchor="middle" x="1391" y="616">9</text>
          <circle className="badge" cx="1202" cy="604" r="10"/><text className="t-badge" textAnchor="middle" x="1202" y="608">10</text>
        </g>
      </svg>
  );
}

export function OptionAFlowSvg() {
  return (
<svg viewBox="0 0 1460 520" role="img" aria-label="Option A pipeline keeping AtVenu">
        <defs>
          <marker id="mf-arrowG2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--auto)"/></marker>
        </defs>
        <text className="lane" x="20" y="24">SOURCES</text><text className="lane" x="270" y="24">CAPTURE</text><text className="lane" x="480" y="24">EXTRACT</text>
        <text className="lane" x="710" y="24">VALIDATE</text><text className="lane" x="980" y="24">REVIEW</text><text className="lane" x="1170" y="24">DATABASE</text><text className="lane" x="170" y="408">OUTPUTS</text>
        <g style={{ markerEnd: 'url(#mf-arrowG2)' }}>
          <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M210 68 H240 V160 H270"/>
          <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M210 138 H240 V170 H270"/>
          <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M210 212 H240 V180 H270"/>
          <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M210 286 H240 V190 H270"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M440 175 H480"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M670 175 H710"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M940 175 H980"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M1130 175 H1170"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M1340 175 H1420 V390 H295 V420"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M575 390 V420"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M855 390 V420"/>
          <path className="flow" style={{ markerEnd: 'url(#mf-arrowG2)' }} d="M1135 390 V420"/>
        </g>
        <rect className="f-gms s" x="20" y="40" width="190" height="56" rx="6"/>
        <text x="34" y="64" className="t-bold">GMS purchase orders</text><text x="34" y="82" className="t-small">PDF</text>
        <rect className="f-vendor s" x="20" y="110" width="190" height="56" rx="6"/>
        <text x="34" y="134" className="t-bold">Vendor packing lists</text><text x="34" y="152" className="t-small">PDF or photo</text>
        <rect className="f-atvenu s" x="20" y="180" width="190" height="64" rx="6"/>
        <text x="34" y="204" className="t-bold">AtVenu export</text><text x="34" y="222" className="t-small">Sales report &amp; settlement</text><text x="34" y="236" className="t-small">(xls or PDF)</text>
        <rect className="f-sticky" x="20" y="258" width="190" height="56" rx="6"/>
        <text x="34" y="282" className="t-bold">Comps (GMS / band)</text><text x="34" y="300" className="t-small">Trailer comp log</text>
        <rect className="f-auto" x="270" y="120" width="170" height="110" rx="8"/>
        <text x="284" y="146" className="t-title">Capture</text>
        <text className="t-small"><tspan x="284" y="168">Drag-and-drop upload</tspan><tspan x="284" dy="15">Email-in address</tspan><tspan x="284" dy="15">iPad scan (MerchFlow)</tspan><tspan x="284" dy="15">AtVenu export file</tspan></text>
        <rect className="f-ai" x="480" y="120" width="190" height="110" rx="8"/>
        <text x="494" y="146" className="t-title">AI extraction</text>
        <text className="t-small"><tspan x="494" y="168">Classifies document type</tspan><tspan x="494" dy="15">Extracts fields to a fixed schema</tspan><tspan x="494" dy="15">Does not write to the database</tspan><tspan x="494" dy="15">Flags low-confidence fields</tspan></text>
        <rect className="f-rules" x="710" y="62" width="230" height="226" rx="8"/>
        <text x="724" y="88" className="t-title">GMS business rules</text>
        <text x="724" y="104" className="t-small" style={{ fill: 'var(--rules)' }}>Fixed rules, no AI</text>
        <text className="t-small"><tspan x="724" y="128">• SKU, size &amp; date normalization</tspan><tspan x="724" dy="17">• Size set XS–5X / OS</tspan><tspan x="724" dy="17">• PO ↔ packing list match</tspan><tspan x="724" dy="17">• Balance = received − sold − comps</tspan><tspan x="724" dy="17">• Per-head under $5 flagged</tspan><tspan x="724" dy="17">• Shows outside tour dates flagged</tspan><tspan x="724" dy="17">• Duplicate / re-post guard</tspan><tspan x="724" dy="17">• Reconcile vs sales chart (±$0.005)</tspan><tspan x="724" dy="17">• Units per product cross-check</tspan></text>
        <rect className="f-review" x="980" y="120" width="150" height="110" rx="8"/>
        <text x="994" y="146" className="t-title">Review</text>
        <text className="t-small"><tspan x="994" y="168">Passing documents:</tspan><tspan x="994" dy="15">approve</tspan><tspan x="994" dy="15">Flagged: correct the</tspan><tspan x="994" dy="15">field, then approve</tspan></text>
        <rect className="f-db" x="1170" y="120" width="170" height="110" rx="8"/>
        <text x="1184" y="146" className="t-title t-onDark">One database</text>
        <text className="t-small t-onDark"><tspan x="1184" y="168">Supabase</tspan><tspan x="1184" dy="15">One record per PO,</tspan><tspan x="1184" dy="15">delivery, sale, comp</tspan></text>
        <rect className="f-tracker s2" x="170" y="420" width="250" height="80" rx="6"/>
        <text x="184" y="444" className="t-title">Inventory Tracker</text><text className="t-small"><tspan x="184" y="464">Sales, comps, POs, received stock,</tspan><tspan x="184" dy="15">projections, COGS, reorder alerts</tspan></text>
        <rect className="f-auto" x="450" y="420" width="250" height="80" rx="6"/>
        <text x="464" y="444" className="t-title">MerchFlow Charts</text><text className="t-small"><tspan x="464" y="464">Tour reports, grab sheets and</tspan><tspan x="464" dy="15">PDFs built from live data</tspan></text>
        <rect className="f-gms s" x="730" y="420" width="250" height="80" rx="6"/>
        <text x="744" y="444" className="t-title">Business Central</text><text className="t-small"><tspan x="744" y="464">Automated export or API sync,</tspan><tspan x="744" dy="15">no re-keying</tspan></text>
        <rect className="f-atvenu s" x="1010" y="420" width="250" height="80" rx="6"/>
        <text x="1024" y="444" className="t-title">AtVenu</text><text className="t-small"><tspan x="1024" y="464">Stock counts pushed back</tspan><tspan x="1024" dy="15">as an import file</tspan></text>
      </svg>
  );
}

export function OptionBFlowSvg() {
  return (
<svg viewBox="0 0 1460 550" role="img" aria-label="Option B with MerchFlow replacing AtVenu">
        <defs>
          <marker id="mf-arrowG3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--auto)"/></marker>
        </defs>
        <text className="lane" x="20" y="24">VENDOR DOCUMENTS</text><text className="lane" x="270" y="24">CAPTURE</text><text className="lane" x="480" y="24">EXTRACT</text>
        <text className="lane" x="710" y="24">VALIDATE</text><text className="lane" x="980" y="24">REVIEW</text><text className="lane" x="1170" y="24">DATABASE</text>
        <text className="lane" x="20" y="246">POINT OF SALE</text><text className="lane" x="440" y="420">OUTPUTS</text>
        <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M210 78 H240 V165 H270"/>
        <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M210 148 H240 V185 H270"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M440 175 H480"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M670 175 H710"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M940 175 H980"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M1130 175 H1170"/>
        <path className="flow thin" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M300 260 V245 H355 V230"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M320 340 H1230 V230"/>
        <text className="tag" x="560" y="332">Sales, comps and counts: direct write, no extraction step</text>
        <text className="tag" x="364" y="250">Packing-list scans</text>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M1340 175 H1420 V428 H295 V450"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M575 428 V450"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M855 428 V450"/>
        <path className="flow" style={{ markerEnd: 'url(#mf-arrowG3)' }} d="M1135 428 V450"/>
        <rect className="f-gms s" x="20" y="50" width="190" height="56" rx="6"/>
        <text x="34" y="74" className="t-bold">GMS purchase orders</text><text x="34" y="92" className="t-small">PDF</text>
        <rect className="f-vendor s" x="20" y="120" width="190" height="56" rx="6"/>
        <text x="34" y="144" className="t-bold">Vendor packing lists</text><text x="34" y="162" className="t-small">PDF or photo</text>
        <rect className="f-auto" x="270" y="120" width="170" height="110" rx="8"/>
        <text x="284" y="146" className="t-title">Capture</text>
        <text className="t-small"><tspan x="284" y="168">Drag-and-drop upload</tspan><tspan x="284" dy="15">Email-in address</tspan><tspan x="284" dy="15">iPad scan (MerchFlow)</tspan></text>
        <rect className="f-ai" x="480" y="120" width="190" height="110" rx="8"/>
        <text x="494" y="146" className="t-title">AI extraction</text>
        <text className="t-small"><tspan x="494" y="168">Vendor documents only</tspan><tspan x="494" dy="15">Extracts fields to a fixed schema</tspan><tspan x="494" dy="15">Does not write to the database</tspan></text>
        <rect className="f-rules" x="710" y="80" width="230" height="190" rx="8"/>
        <text x="724" y="106" className="t-title">GMS business rules</text>
        <text className="t-small"><tspan x="724" y="130">• SKU, size &amp; date normalization</tspan><tspan x="724" dy="17">• PO ↔ packing list match</tspan><tspan x="724" dy="17">• Balance = received − sold − comps</tspan><tspan x="724" dy="17">• Per-head &amp; tour-date checks</tspan><tspan x="724" dy="17">• Duplicate / re-post guard</tspan><tspan x="724" dy="17">• Count-out vs sales variance</tspan><tspan x="724" dy="17">• Settlement math per show</tspan></text>
        <rect className="f-review" x="980" y="120" width="150" height="110" rx="8"/>
        <text x="994" y="146" className="t-title">Review</text>
        <text className="t-small"><tspan x="994" y="168">Vendor documents</tspan><tspan x="994" dy="15">and flagged count</tspan><tspan x="994" dy="15">variances only</tspan></text>
        <rect className="f-db" x="1170" y="120" width="170" height="110" rx="8"/>
        <text x="1184" y="146" className="t-title t-onDark">One database</text>
        <text className="t-small t-onDark"><tspan x="1184" y="168">Supabase</tspan><tspan x="1184" dy="15">Updated per</tspan><tspan x="1184" dy="15">transaction</tspan></text>
        <rect className="f-db" x="20" y="260" width="300" height="150" rx="8"/>
        <text x="36" y="288" className="t-title t-onDark">MerchFlow iPad POS</text>
        <text className="t-small t-onDark"><tspan x="36" y="312">• Sales at the table (Stripe Terminal)</tspan><tspan x="36" dy="17">• Comps (GMS / band) logged at hand-off</tspan><tspan x="36" dy="17">• Count-in and count-out per show</tspan><tspan x="36" dy="17">• Packing-list scan at receiving</tspan><tspan x="36" dy="17">• Offline mode, syncs when online</tspan></text>
        <rect className="f-tracker s2" x="170" y="450" width="250" height="80" rx="6"/>
        <text x="184" y="474" className="t-title">Inventory Tracker</text><text className="t-small"><tspan x="184" y="494">Live stock, projections, COGS,</tspan><tspan x="184" dy="15">reorder alerts</tspan></text>
        <rect className="f-auto" x="450" y="450" width="250" height="80" rx="6"/>
        <text x="464" y="474" className="t-title">MerchFlow Charts</text><text className="t-small"><tspan x="464" y="494">Tour reports and grab sheets,</tspan><tspan x="464" dy="15">available after each show</tspan></text>
        <rect className="f-gms s" x="730" y="450" width="250" height="80" rx="6"/>
        <text x="744" y="474" className="t-title">Business Central</text><text className="t-small"><tspan x="744" y="494">Automated export or API sync</tspan></text>
        <rect className="f-auto" x="1010" y="450" width="250" height="80" rx="6"/>
        <text x="1024" y="474" className="t-title">Settlements</text><text className="t-small"><tspan x="1024" y="494">Built per show from POS sales</tspan><tspan x="1024" dy="15">and comps</tspan></text>
      </svg>
  );
}
