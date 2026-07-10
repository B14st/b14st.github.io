/* ==========================================================
   EMNEDATA — på norsk
   Legg til nye emner ved å utvide TOPICS-arrayen nedenfor.
   ========================================================== */

const TOPICS = [

/* ── KATEGORI: Areal og dekning ─────────────────────────── */

{
  id: 'four-wall-area',
  title: 'Areal av fire vegger',
  subtitle: 'Totalt veggareal fra rommets mål',
  category: 'Areal og dekning',
  color: '#2563eb',
  tags: ['vegg', 'areal', 'rom', 'omkrets', 'flislegging', 'maling', 'kledning'],

  problem: `<p>Du skal legge flis, male eller kle alle fire vegger i et rektangulært rom og trenger det totale overflatearealet for å beregne materialbehovet.</p>`,

  formula: {
    primary: 'A = 2 × (L + B) × H',
    legend: [
      { sym: 'A', desc: 'Totalt veggareal',  unit: 'm²' },
      { sym: 'L', desc: 'Rommets lengde',    unit: 'm'  },
      { sym: 'B', desc: 'Rommets bredde',    unit: 'm'  },
      { sym: 'H', desc: 'Veghøyde',          unit: 'm'  },
    ],
  },

  diagram: `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">
  <rect x="50" y="30" width="160" height="90" fill="#e8f1f8" stroke="#0f4c75" stroke-width="2" rx="2"/>
  <line x1="50" y1="140" x2="210" y2="140" stroke="#0f4c75" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
  <text x="130" y="155" text-anchor="middle" font-size="13" fill="#0f4c75" font-weight="700">L</text>
  <line x1="228" y1="30" x2="228" y2="120" stroke="#0f4c75" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
  <text x="245" y="80" text-anchor="middle" font-size="13" fill="#0f4c75" font-weight="700">B</text>
  <text x="130" y="20" text-anchor="middle" font-size="11" fill="#64748b">Sett ovenfra — plantegning</text>
  <circle cx="50"  cy="30"  r="3" fill="#0f4c75"/>
  <circle cx="210" cy="30"  r="3" fill="#0f4c75"/>
  <circle cx="210" cy="120" r="3" fill="#0f4c75"/>
  <circle cx="50"  cy="120" r="3" fill="#0f4c75"/>
  <text x="130" y="80" text-anchor="middle" font-size="11" fill="#2563eb">× høyde H</text>
  <text x="130" y="95" text-anchor="middle" font-size="10" fill="#64748b">= totalt veggareal</text>
  <defs>
    <marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#0f4c75"/>
    </marker>
  </defs>
</svg>`,
  diagramCaption: 'Sett ovenfra: gang omkretsen 2(L+B) med veghøyden H.',

  whyItWorks: `<p>Omkretsen av et rektangulært rom er den totale avstanden rundt alle fire vegger: <strong>2 × (L + B)</strong>. Tenk deg at du tar av alle fire veggene og bretter dem flate ut til ett enkelt rektangel. Det rektangelet har en bredde lik rommets omkrets og en høyde lik H.</p>
<p>Areal av den utrullede stripen = bredde × høyde = 2(L+B) × H.</p>`,

  example: [
    { step: 'Gitt', body: 'Rom 4,5 m langt, 3,0 m bredt, 2,4 m høyt.' },
    { step: 'Omkrets', body: '<span class="eq">2 × (4,5 + 3,0) = 2 × 7,5 = 15,0 m</span>' },
    { step: 'Totalt veggareal', body: '<span class="eq">15,0 × 2,4 = 36,0 m²</span>' },
    { step: 'Bestillingsantall', body: 'Legg til 10 % svinn: <span class="eq">36,0 × 1,10 = <strong>39,6 m²</strong></span>' },
  ],
  exampleAnswer: '39,6 m² flis å bestille (før fratrekk for dører og vinduer).',

  assumptions: [
    'Rommet er rektangulært — fire vegger møtes i 90°.',
    'Alle vegger har samme høyde gjennom hele rommet.',
    'Formelen inkluderer areal bak dører og vinduer; trekk fra disse åpningene separat.',
  ],

  tips: [
    'En standard dør er omtrent 1,9 m² (0,9 m × 2,1 m); et typisk vindu 0,6–1,4 m². Trekk disse fra etter at du har beregnet totalarealet.',
    'Legg til 10 % svinn for rett legging; 15–20 % for diagonal eller sildebensmønster.',
    'Bestill alltid fra samme produksjonssats (fargenummer) for å unngå fargeforskjeller mellom esker.',
  ],

  related: ['wall-length-from-area', 'tile-quantity'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'wall-length-from-area',
  title: 'Vegglengde fra areal',
  subtitle: 'Finn vegglendge når du bare har arealet (m2)',
  category: 'Areal og dekning',
  color: '#2563eb',
  tags: ['vegg', 'lengde', 'areal', 'høyde', 'baklengs', 'tilbud', 'tegninger'],

  problem: `<p>Du har et totalt veggarealtall (fra tegninger, et tilbud eller en spesifikasjon) og kjenner veghøyden. Du trenger å finne den totale lineære veggløpemeteren — nyttig for å kontrollere et tilbud eller regne baklengs fra en materialberegning.</p>`,

  formula: {
    primary: 'L = A ÷ H',
    legend: [
      { sym: 'L', desc: 'Total veggløpemeter',  unit: 'm'  },
      { sym: 'A', desc: 'Totalt veggareal',      unit: 'm²' },
      { sym: 'H', desc: 'Veghøyde',             unit: 'm'  },
    ],
    note: 'Dette er rett og slett arealformelen løst for lengde: A = L × H → L = A ÷ H.',
  },

  whyItWorks: `<p>Areal = Lengde × Høyde er den grunnleggende sammenhengen for ethvert rektangulært overflate. Hvis du kjenner to av de tre verdiene, kan du alltid finne den tredje. Her deler vi begge sider av likningen med H for å isolere L.</p>`,

  example: [
    { step: 'Gitt', body: 'Tilbud angir 40 m² veggflis ved 2,4 m veghøyde.' },
    { step: 'Total vegglengde', body: '<span class="eq">40 ÷ 2,4 = <strong>16,67 m</strong></span>' },
    { step: 'Kontroll', body: 'Et rom 4,5 m × 3,0 m har omkrets 2(4,5+3,0) = 15 m. Et rom 4,8 m × 3,5 m har omkrets 16,6 m — dette stemmer.' },
  ],
  exampleAnswer: 'Total veggløpemeter ≈ 16,67 m, tilsvarende et mellomstort rom.',

  assumptions: [
    'Alle vegger har samme høyde (jevn takhøyde).',
    'Avklar om arealtallet allerede er fratrukket åpninger — dette endrer resultatet.',
  ],

  tips: [
    'Hvis rommet er kvadratisk, er veggløpemeteren ÷ 4 = lengden på hver side.',
    'Bruk dette til å sjekke et leverandørtilbud: impliserer arealtallet et rimelig rommål?',
    'Nyttig for listverk og lister: konverter m² til løpemeter, og bestill deretter.',
  ],

  related: ['four-wall-area', 'tile-quantity'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'tile-quantity',
  title: 'Flismengde med svinn',
  subtitle: 'Antall fliser (eller m²) å bestille inkludert kutt og sprekker',
  category: 'Areal og dekning',
  color: '#2563eb',
  tags: ['flis', 'mengde', 'svinn', 'bestilling', 'esker', 'kutt', 'sprekk'],

  problem: `<p>Du har et gulv- eller veggareal som skal flislegges. Kutt langs kanter og av og til brekk betyr at du må bestille mer enn nettoaredalet. Hvor mye ekstra bør du kjøpe?</p>`,

  formula: {
    primary: 'Bestillingsareal = Nettoareal × (1 + S)',
    legend: [
      { sym: 'Nettoareal', desc: 'Det faktiske arealet som skal flislegges', unit: 'm²' },
      { sym: 'S',          desc: 'Svinnfaktor (desimal)',                    unit: ''   },
    ],
    note: `Svinnfaktor etter leggetype:<br>
• Rett legging: <strong>S = 0,10</strong> (10&nbsp;%)<br>
• Diagonal (45°): <strong>S = 0,15–0,20</strong> (15–20&nbsp;%)<br>
• Sildesben / komplekst mønster: <strong>S = 0,20–0,25</strong> (20–25&nbsp;%)<br>
• Små rom eller mange kutt: legg til ekstra 5&nbsp;%.`,
  },

  whyItWorks: `<p>Svinn kommer fra tre kilder: <strong>kantskjær</strong> (halve fliser langs romkantene), <strong>mønsterinnretting</strong> (fliser som må starte midt i for å passe mønsteret) og <strong>brekk</strong> under skjæring eller håndtering.</p>
<p>Diagonale legginger gir større avkutt ved hvert hjørne fordi skjærene alltid går på skrå over flisene — og svinn er strukturelt høyere enn ved rett legging.</p>`,

  example: [
    { step: 'Gitt', body: 'Gulvareal 14,5 m², 300×600 mm fliser, rett legging.' },
    { step: 'Legg til svinn', body: '<span class="eq">14,5 × 1,10 = 15,95 → <strong>rund opp til 16 m²</strong></span>' },
    { step: 'Flisareal', body: '<span class="eq">0,30 × 0,60 = 0,18 m² per flis</span>' },
    { step: 'Antall fliser', body: '<span class="eq">16 ÷ 0,18 = 88,9 → <strong>89 fliser</strong></span>' },
    { step: 'Antall esker', body: 'Hvis 6 fliser/eske: 89 ÷ 6 = 14,8 → <strong>15 esker</strong>' },
  ],
  exampleAnswer: '15 esker à 6 fliser (90 stk), som dekker ≈ 16,2 m² med liten margin.',

  assumptions: [
    'Rommet har rette vegger og ingen uvanlige utsparinger.',
    'Mønsterfliser (f.eks. treimitasjon med forskyvning) kan kreve større svinnfaktor.',
    'Tar ikke hensyn til dekorative fliser eller bord med eget svinn.',
  ],

  tips: [
    'Bestill alltid fra samme produksjonssats (fargenummer) — fargen varierer mellom partier.',
    'Legg til side 5–10&nbsp;% av resterende fliser for fremtidige reparasjoner. Utgåtte fliser er umulige å matche.',
    'For svært små rom (under 3 m²): bruk 20&nbsp;% svinnfaktor uansett leggetype — kantskjær er forholdsmessig større.',
    'Rund alltid opp til nærmeste hele eske; rund aldri ned.',
  ],

  related: ['four-wall-area', 'diagonal-layout'],
},


/* ── KATEGORI: Avretning og sparkelmasse ────────────────── */

{
  id: 'leveling-flat',
  title: 'Avrettingsmasse — flatt gulv',
  subtitle: 'Volum og antall sekker for et jevnt tykt strøk',
  category: 'Avretning og sparkelmasse',
  color: '#059669',
  tags: ['avretning', 'avrettingsmasse', 'sparkelmasse', 'selvavrettende', 'sekker', 'volum', 'flatt'],

  problem: `<p>Et gulv trenger å heves eller jevnes til en bestemt dybde. Hvor mye selvavrettende masse (SLM) trengs, og hvor mange sekker bør bestilles?</p>`,

  formula: {
    primary: 'V = A × T',
    legend: [
      { sym: 'V', desc: 'Volum masse',             unit: 'liter' },
      { sym: 'A', desc: 'Gulvareal',               unit: 'm²'    },
      { sym: 'T', desc: 'Påføringsdybde (tykkelse)', unit: 'mm'  },
    ],
    note: `Én liter dekker <strong>1 m² ved 1 mm dybde</strong>, så V (liter) = A (m²) × T (mm).<br><br>
For å finne antall sekker: <strong>Sekker = V × ρ ÷ sekkevekt</strong><br>
der ρ = produktdensitet (typisk <strong>1,4–1,6 kg/L</strong> — sjekk databladet).<br>
Eller bruk direkte: <strong>kg = A × T × ρ</strong>`,
  },

  whyItWorks: `<p>Volum = areal × dybde. Siden 1 liter = 1 dm³ = 0,001 m³, og vi måler areal i m² og dybde i mm (= 0,001 m), får vi V i liter direkte: <strong>V = A × T</strong> der T er i mm og V kommer ut i liter.</p>
<p>Densitetsomregningen konverterer fra volum til masse, som er slik sekker selges.</p>`,

  example: [
    { step: 'Gitt', body: 'Gulvareal 18 m², påføringsdybde 6 mm, produktdensitet 1,5 kg/L, solgt i 25 kg sekker.' },
    { step: 'Volum', body: '<span class="eq">18 × 6 = 108 liter</span>' },
    { step: 'Masse', body: '<span class="eq">108 × 1,5 = 162 kg</span>' },
    { step: 'Sekker', body: '<span class="eq">162 ÷ 25 = 6,48 → <strong>bestill 7 sekker</strong></span>' },
  ],
  exampleAnswer: '7 × 25 kg sekker for 18 m² ved 6 mm dybde.',

  assumptions: [
    'Gulvet er allerede rimelig flatt — formelen forutsetter samme dybde overalt.',
    'Densitet 1,5 kg/L er typisk; sjekk alltid produktets datablad.',
    'Inkluderer ikke forbruk til grunning.',
    'En minimumsdybde gjelder som regel (ofte 3 mm); sjekk databladet.',
  ],

  tips: [
    'Grunne alltid underlaget først. Uten grunningsmiddel kan avrettingsmassen delaminere eller tørke for fort.',
    'Bestill 5–10&nbsp;% ekstra for ujevnheter i underlaget og søl.',
    'For dybder under 3 mm: bruk en finstrykningsmasse eller et tynnsjikt-produkt i stedet.',
    'Hell fra det høyeste punktet og arbeid mot det laveste for å unngå luftlommer.',
  ],

  related: ['slope-thickness'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'slope-thickness',
  title: 'Gjennomsnittlig tykkelse for gulv med fall',
  subtitle: 'Volum av avrettingsmasse når det skal støpes fall',
  category: 'Avretning og sparkelmasse',
  color: '#059669',
  tags: ['fall', 'avretning', 'gjennomsnitt', 'tykkelse', 'avrettingsmasse', 'skrå', 'gradient'],

  problem: `<p>Et gulv faller fra den ene siden til den andre. For å gjøre det flatt vil avrettingsmassen være tynn på én side og tykk på den andre. Hva er gjennomsnittsdybden, og hvor mye materiale trengs?</p>`,

  formula: {
    primary: 'T_avg = (T_min + T_max) ÷ 2',
    legend: [
      { sym: 'T_avg', desc: 'Gjennomsnittlig tykkelse på avrettingsmassen', unit: 'mm' },
      { sym: 'T_min', desc: 'Minste dybde (høyeste punkt på gulvet)',       unit: 'mm' },
      { sym: 'T_max', desc: 'Største dybde (laveste punkt på gulvet)',      unit: 'mm' },
    ],
    note: 'Bruk deretter <strong>V = A × T_avg</strong> (liter) akkurat som for et flatt gulv, med T_avg i mm.',
  },

  diagram: `<svg viewBox="0 0 280 148" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">

  <!-- panel titles -->
  <text x="77" y="12" text-anchor="middle" font-size="9" fill="#64748b">Kileform (faktisk)</text>
  <text x="213" y="12" text-anchor="middle" font-size="9" fill="#64748b">Jevnet ut</text>

  <!-- ── LEFT PANEL ──────────────────────────────────────
       Flat floor at y=110. Scale 10px/mm.
       T_min=2mm → left top y=90.  T_max=8mm → right top y=30.
       T_avg=5mm → horizontal at y=60.
       T_avg bisects the wedge top exactly at x=77.5 (midpoint).
  ─────────────────────────────────────────────────────── -->

  <!-- base compound (below T_avg): pentagon -->
  <polygon points="20,90 77.5,60 135,60 135,110 20,110"
           fill="#bbf7d0" stroke="#059669" stroke-width="1.5"/>

  <!-- excess: compound above T_avg (amber triangle, upper-right) -->
  <polygon points="77.5,60 135,30 135,60"
           fill="#fed7aa" stroke="#d97706" stroke-width="1.5"/>

  <!-- deficit ghost: gap above thin side, below T_avg (dashed, upper-left) -->
  <polygon points="20,60 77.5,60 20,90"
           fill="#fff7ed" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3,3"/>

  <!-- T_avg dashed line -->
  <line x1="20" y1="60" x2="135" y2="60"
        stroke="#d97706" stroke-width="1.5" stroke-dasharray="5,3"/>

  <!-- floor -->
  <line x1="20" y1="110" x2="135" y2="110" stroke="#94a3b8" stroke-width="3"/>

  <!-- + in excess, − in deficit -->
  <text x="116" y="53" font-size="12" fill="#c2410c" font-weight="700">+</text>
  <text x="27"  y="84" font-size="12" fill="#c2410c" font-weight="700">−</text>

  <!-- T_avg label on the dashed line -->
  <text x="39" y="57" font-size="8" fill="#d97706">T_avg = 5</text>

  <!-- T_min dimension: left edge y=90→110 (2mm) -->
  <line x1="13" y1="90" x2="13" y2="110"
        stroke="#1e40af" stroke-width="1.5"
        marker-start="url(#aSlBlue)" marker-end="url(#aSlBlue)"/>
  <text x="3"  y="104" font-size="8" fill="#1e40af">2</text>
  <text x="21" y="123" font-size="8" fill="#1e40af">T_min</text>

  <!-- T_max dimension: right edge y=30→110 (8mm) -->
  <line x1="139" y1="30" x2="139" y2="110"
        stroke="#1e40af" stroke-width="1.5"
        marker-start="url(#aSlBlue)" marker-end="url(#aSlBlue)"/>
  <text x="142" y="74" font-size="8" fill="#1e40af">8</text>
  <text x="107" y="123" font-size="8" fill="#1e40af">T_max</text>

  <!-- annotation -->
  <text x="77" y="139" text-anchor="middle" font-size="8" fill="#c2410c">(+) = (−)  →  jevner ut til T_avg</text>


  <!-- ── RIGHT PANEL ──────────────────────────────────── -->

  <!-- rectangle at T_avg height = 50px = 5mm -->
  <rect x="163" y="60" width="100" height="50"
        fill="#bbf7d0" stroke="#059669" stroke-width="1.5"/>

  <!-- floor -->
  <line x1="163" y1="110" x2="263" y2="110" stroke="#94a3b8" stroke-width="3"/>

  <!-- T_avg label inside rect -->
  <text x="213" y="81" text-anchor="middle" font-size="8"  fill="#059669" font-weight="600">T_avg</text>
  <text x="213" y="97" text-anchor="middle" font-size="10" fill="#059669" font-weight="700">5 mm</text>

  <!-- formula + note below -->
  <text x="213" y="128" text-anchor="middle" font-size="9"   fill="#059669" font-weight="600">T_avg = (2 + 8) ÷ 2 = 5</text>
  <text x="213" y="141" text-anchor="middle" font-size="7.5" fill="#64748b">Samme volum — jevn tykkelse</text>

  <defs>
    <marker id="aSlBlue" viewBox="0 0 6 6" refX="3" refY="3"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#1e40af"/>
    </marker>
  </defs>
</svg>`,
  diagramCaption: 'Overskuddet (+, oransje) og underskuddet (−, stiplet) er nøyaktig like store — de nuller hverandre ut.',

  whyItWorks: `<p>Tenk på kileformen som en vektstang. Den <strong>tynne</strong> venstre siden (T_min = 2 mm) mangler avrettingsmasse for å nå T_avg — det er underskuddet (−, stiplet trekant). Den <strong>tykke</strong> høyre siden (T_max = 8 mm) har mer enn T_avg — det er overskuddet (+, oransje trekant).</p>
<p>De to trekantene er <strong>nøyaktig like store</strong>. Når du "jevner ut vektstangen" fyller overskuddet nøyaktig underskuddet, og du sitter igjen med en flat rektangel med jevn tykkelse T_avg. Matematisk er dette gjennomsnittet: <strong>(T_min + T_max) ÷ 2</strong>.</p>`,

  example: [
    { step: 'Gitt', body: 'Gulv 5,0 m × 3,5 m. Dybde: 2 mm ved det høyeste punktet, 8 mm ved det laveste. Densitet 1,7 kg/L, 20 kg sekker.' },
    { step: 'Gjennomsnittsdybde', body: '<span class="eq">(2 + 8) ÷ 2 = <strong>5 mm</strong></span>' },
    { step: 'Areal', body: '<span class="eq">5,0 × 3,5 = 17,5 m²</span>' },
    { step: 'Volum', body: '<span class="eq">17,5 × 5 = 87,5 liter</span>' },
    { step: 'Masse', body: '<span class="eq">87,5 × 1,7 = 148,75 kg</span>' },
    { step: 'Sekker', body: '<span class="eq">148,75 ÷ 20 = 7,44 → <strong>bestill 8 sekker</strong></span>' },
  ],
  exampleAnswer: '8 × 20 kg sekker for et 17,5 m² gulv som faller fra 2 mm til 8 mm.',

  assumptions: [
    'Fallet er lineært (konstant gradient) fra den ene siden til den andre.',
    'For et fall i to retninger: ta dybdemålinger på et rutenett og middel alle — to-verdienes formel vil underestimere.',
    'Kontroller at T_min er over produktets minimumsdybde (ofte 3 mm).',
  ],

  tips: [
    'Bruk lasernivellering for å måle T_min og T_max nøyaktig før bestilling.',
    'Hvis fallet ikke er lineært (f.eks. en pukkel i midten), ta målinger for hver 0,5–1 m og middel alle.',
    'Legg alltid til 5–10&nbsp;% på sekkantallet for å dekke underestimering og svinn.',
  ],

  related: ['leveling-flat'],
},


/* ── KATEGORI: Gulvvarme ────────────────────────────────── */

{
  id: 'heating-cable',
  title: 'Elektrisk gulvvarme',
  subtitle: 'Kabellengde, CC-avstand og effektbehov — komplett arbeidsflyt',
  category: 'Gulvvarme',
  color: '#dc2626',
  tags: ['gulvvarme', 'varmekabel', 'elektrisk', 'cc-avstand', 'kabel', 'lengde', 'effekt', 'watt', 'W/m', 'W/m²', 'bad', 'gang', 'entre'],

  problem: `<p>Du skal varme opp et gulvareal med elektrisk varmekabel. Du trenger å vite tre ting: <strong>hvor kraftig kabel du trenger</strong> (W/m), <strong>hvor lang kabel</strong> (m) og <strong>hvilken CC-avstand</strong> du skal legge den med (mm).</p>
<p>Start alltid med effektbehovet for romtypen — geometri alene er ikke nok.</p>`,

  formula: {
    primary: 'L = (A × P_rom) ÷ P_kabel',
    legend: [
      { sym: 'L',       desc: 'Nødvendig kabellengde',               unit: 'm'    },
      { sym: 'A',       desc: 'Oppvarmet gulvareal',                  unit: 'm²'   },
      { sym: 'P_rom',   desc: 'Effektbehov for romtypen (se tabell)', unit: 'W/m²' },
      { sym: 'P_kabel', desc: 'Kabelens effekt per meter',            unit: 'W/m'  },
    ],
    note: `CC-avstand følger direkte — arealet forsvinner fra ligningen:<br>
<strong>CC (mm) = (P_kabel × 1 000) ÷ P_rom</strong><br><br>
Geometriske hjelpeformler (når L og CC allerede er kjent):<br>
• Lengde fra CC: <strong>L = (A × 1 000) ÷ CC</strong><br>
• CC fra lengde: <strong>CC = (A × 1 000) ÷ L</strong><br>
• Dekningsareal: <strong>A = (L × CC) ÷ 1 000</strong><br><br>
<strong>Typiske effektkrav (P_rom) etter romtype:</strong><br>
• Bad / våtrom: <strong>120–160 W/m²</strong><br>
• Gang / entre: <strong>80–100 W/m²</strong><br>
• Kjøkken: <strong>80–100 W/m²</strong><br>
• Stue (tilleggsvarme): <strong>60–80 W/m²</strong>`,
  },

  diagram: `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">
  <rect x="20" y="20" width="220" height="120" fill="#fff1f2" stroke="#dc2626" stroke-width="2" rx="3"/>
  <line x1="20" y1="50"  x2="240" y2="50"  stroke="#ef4444" stroke-width="2"/>
  <line x1="20" y1="80"  x2="240" y2="80"  stroke="#ef4444" stroke-width="2"/>
  <line x1="20" y1="110" x2="240" y2="110" stroke="#ef4444" stroke-width="2"/>
  <line x1="255" y1="50"  x2="255" y2="80"  stroke="#0f4c75" stroke-width="1.5" marker-start="url(#aHC)" marker-end="url(#aHC)"/>
  <text x="262" y="68" font-size="10" fill="#0f4c75">CC</text>
  <line x1="255" y1="80"  x2="255" y2="110" stroke="#0f4c75" stroke-width="1.5" marker-start="url(#aHC)" marker-end="url(#aHC)"/>
  <text x="130" y="142" text-anchor="middle" font-size="10" fill="#64748b">Oppvarmet areal (A)</text>
  <text x="130" y="35" text-anchor="middle" font-size="10" fill="#dc2626">Kabelstrenger</text>
  <defs>
    <marker id="aHC" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#0f4c75"/>
    </marker>
  </defs>
</svg>`,
  diagramCaption: 'Sett ovenfra: parallelle kabelstrenger med CC-avstand mellom.',

  whyItWorks: `<p>Total nødvendig effekt for rommet er <strong>A × P_rom</strong> watt. Kabelen leverer <strong>L × P_kabel</strong> watt. Setter vi disse like og løser for L, får vi L = (A × P_rom) / P_kabel.</p>
<p>CC-formelen fremkommer ved å sette inn i den geometriske formelen L = A × 1 000 / CC:<br>
CC = A × 1 000 / L = A × 1 000 / ((A × P_rom) / P_kabel) = <strong>P_kabel × 1 000 / P_rom</strong><br>
Arealet forsvinner — CC-avstand avhenger bare av kabelens W/m og rommets W/m²-krav.</p>
<p>De geometriske hjelpeformlene er alle den samme likningen omskrevet: A = L × CC / 1 000. Med to kjente verdier finner du alltid den tredje.</p>`,

  example: [
    { step: 'Gitt', body: 'Bad på 5 m². Ønsket effekt: 120 W/m².' },
    { step: '10 W/m — kabellengde', body: '<span class="eq">(5 × 120) ÷ 10 = <strong>60 m</strong></span>' },
    { step: '10 W/m — CC-avstand', body: '<span class="eq">(10 × 1 000) ÷ 120 = <strong>83,3 mm</strong></span> — under 100 mm-grensen. <strong>Ikke egnet for bad.</strong>' },
    { step: '17 W/m — kabellengde', body: '<span class="eq">(5 × 120) ÷ 17 = <strong>35,3 m</strong></span>' },
    { step: '17 W/m — CC-avstand', body: '<span class="eq">(17 × 1 000) ÷ 120 = <strong>141,7 mm</strong> ≈ 140 mm</span> ✓' },
    { step: 'Bruk', body: 'Nærmeste standardlengde ≥ 35,3 m, som i dette tilfelle nøyaktig tilsvarer Nexans tqxp 600/17 <span class="eq">(600w x 17w/m = 35,3 m)</strong></span>.' },
  ],
  exampleAnswer: '10 W/m krever CC = 83 mm — for tett, ikke egnet. 17 W/m: 35,3 m ved ~139 mm CC gir 120 W/m² i badet.',

  assumptions: [
    'W/m²-verdiene er veiledende. Dårlig isolasjon, store vindusflater eller kald betong kan kreve høyere verdi.',
    'Oppvarmet areal ekskluderer soner under fast inventar — badekar, toalett, kjøkkenbenk.',
    'Formelen gir optimal kabellengde; bestill alltid nærmeste tilgjengelige standardlengde oppover.',
    'Kabelstrengene forutsettes parallelle og rette; svinger og hjørner kan avvike ±5 % fra beregnet lengde.',
  ],

  tips: [
    '<strong>Klipp aldri i en varmekabel</strong> — det ødelegger elementet. Velg alltid fra produsentens faste kabellengder.',
    'Hvis CC < 100 mm er kabelens W/m for lav for rommets krav — velg en kabel med høyere W/m.',
    'Hvis CC > 200 mm er kabelen "for sterk" relativt til kravet — vurder lavere W/m-kabel eller lavere W/m².',
    'Vanlige kabelstyrker: 10, 12, 16,5, 17, 18 og 20 W/m. Sjekk alltid produsentens datablad.',
    'Elektrisk gulvvarme i bad (våtsone) skal alltid installeres av autorisert elektriker.',
  ],

  related: ['heating-cable-bend'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'heating-cable-bend',
  title: 'Bøyeradius for varmekabel',
  subtitle: 'Minste tillatte radius i svinger og sløyfer ved legging',
  category: 'Gulvvarme',
  color: '#dc2626',
  tags: ['gulvvarme', 'varmekabel', 'bøyeradius', 'sving', 'installasjon', 'diameter'],

  problem: `<p>Når du legger varmekabel må du sløyfe kabelen 180 grader i enden av hver stripe. Kabelen tåler ikke å bøyes for tett — produsenten oppgir en <strong>minste bøyeradius</strong> som ikke må underskrides.</p>`,

  formula: {
    primary: 'R = n × d',
    legend: [
      { sym: 'R', desc: 'Minste bøyeradius',                         unit: 'mm' },
      { sym: 'n', desc: 'Produsentens multiplikator (vanligvis 5)',   unit: ''   },
      { sym: 'd', desc: 'Kabelens ytre diameter',                     unit: 'mm' },
    ],
    note: 'En komplett 180°-sving (U-sveip) får da en total bredde på <strong>2 × R</strong>.',
  },

  diagram: `<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">
  <defs>
    <marker id="aBR" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#0f4c75"/>
    </marker>
  </defs>
  <text x="75" y="14" text-anchor="middle" font-size="9" fill="#64748b">Bøyeradius (R)</text>
  <circle cx="75" cy="82" r="52" fill="#fff1f2" stroke="#dc2626" stroke-width="2"/>
  <circle cx="75" cy="82" r="3" fill="#0f4c75"/>
  <line x1="75" y1="82" x2="124" y2="82" stroke="#0f4c75" stroke-width="1.5" marker-end="url(#aBR)"/>
  <text x="99" y="76" text-anchor="middle" font-size="11" fill="#0f4c75" font-weight="700">R</text>
  <line x1="23" y1="97" x2="127" y2="97" stroke="#64748b" stroke-width="1.5" marker-start="url(#aBR)" marker-end="url(#aBR)" stroke-dasharray="3,2"/>
  <text x="75" y="112" text-anchor="middle" font-size="9" fill="#64748b">diameter = 2×R</text>
  <line x1="150" y1="8" x2="150" y2="152" stroke="#e2e8f0" stroke-width="1"/>
  <text x="215" y="14" text-anchor="middle" font-size="9" fill="#64748b">180°-sving i praksis</text>
  <line x1="195" y1="22" x2="195" y2="108" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <path d="M195,108 A20,20 0 0,1 235,108" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <line x1="235" y1="108" x2="235" y2="22" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <circle cx="215" cy="108" r="2.5" fill="#0f4c75"/>
  <line x1="215" y1="108" x2="235" y2="108" stroke="#0f4c75" stroke-width="1" stroke-dasharray="2,2"/>
  <text x="224" y="104" text-anchor="middle" font-size="8" fill="#0f4c75">R</text>
  <line x1="195" y1="143" x2="235" y2="143" stroke="#0f4c75" stroke-width="1.5" marker-start="url(#aBR)" marker-end="url(#aBR)"/>
  <text x="215" y="156" text-anchor="middle" font-size="9" fill="#0f4c75">2R</text>
</svg>`,
  diagramCaption: 'Venstre: radius R vs. diameter 2R. Høyre: en 180°-sving har total bredde 2R.',

  whyItWorks: `<p>Bøyer du kabelen for tett, komprimeres isolasjonen og varmeelementet på innsiden av svingen og strekkes på utsiden. Over tid gir dette varme flekker, isolasjonssvikt og elektrisk feil.</p>
<p>Multiplikatoren n (vanligvis 4–6, oppgitt av produsenten) holder disse spenningene innenfor trygge grenser. Bøyeradiusen måles alltid til <strong>kabelens senterlinje</strong>, ikke til kabelens ytterkant.</p>`,

  example: [
    { step: 'Gitt', body: 'Kabeldiameter d = 7 mm. Produsenten oppgir n = 5.' },
    { step: 'Minste bøyeradius', body: '<span class="eq">5 × 7 = <strong>35 mm</strong></span>' },
    { step: 'Bredde på 180°-sving', body: '<span class="eq">2 × 35 = <strong>70 mm</strong></span>' },
  ],
  exampleAnswer: 'Svingen kan ikke være trangere enn 35 mm radius — hele U-sveipet blir da ca. 70 mm bredt.',

  assumptions: [
    'n varierer etter kabeltype og produsent — sjekk alltid databladet.',
    'Kravet gjelder kabelens senterlinje; den faktiske ytre svingen er litt større.',
  ],

  tips: [
    '70 mm er langt under typisk CC-avstand (100–200 mm), så bøyeradiusen begrenser sjelden selve oppsettet — men den er kritisk i endepunktene der kabelen snur.',
    'Knekk eller klem aldri kabelen flatt. Et brå knikk er et brudd på bøyeradiuskravet i ett punkt.',
    'Produsenter oppgir radius, ikke sveipstørrelse. Radius = det du skal overholde; 2× radius = hva du ser når du måler over hele U-svingen.',
  ],

  related: ['heating-cable'],
},


/* ── KATEGORI: Flislegging og oppsett ───────────────────── */

{
  id: 'tile-centering',
  title: 'Sentrering av flisoppsett',
  subtitle: 'Slik setter du opp fliser med like kutt på begge sider',
  category: 'Flislegging og oppsett',
  color: '#7c3aed',
  tags: ['oppsett', 'sentrering', 'kutt', 'symmetri', 'balanse', 'planlegging'],

  problem: `<p>Et flisoppsett som starter fra én vegg gir ofte en hel flis på én side og en smal stripe på den andre — noe som ser ubalansert ut og er strukturelt svakere. Hvordan setter du opp flisene slik at kuttene er like på begge sider?</p>`,

  formula: {
    primary: 'Kutt = (Rom − n × Flis) ÷ 2',
    legend: [
      { sym: 'Kutt', desc: 'Bredde på kuttflis langs kantene',                         unit: 'mm' },
      { sym: 'Rom',  desc: 'Rommålet i den retningen',                                  unit: 'mm' },
      { sym: 'n',    desc: 'Antall hele fliser (= gulv(Rom ÷ Flis))',                   unit: ''   },
      { sym: 'Flis', desc: 'Flismodul: flisbredde + én fugebredde (f.eks. 303 = 300+3)', unit: 'mm' },
    ],
    note: `Hvis beregnet Kutt < halvparten av flisbredden ser det bedre ut å forskyve oppsettet med en halv flis:<br>
<strong>Justert kutt = (Rom − n × Flis + Flis) ÷ 2</strong><br>
(Dette legger til én kuttflis til og reduserer n med én.)`,
  },

  diagram: `<svg viewBox="0 0 280 90" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">
  <rect x="10" y="25" width="35" height="45" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <text x="27" y="52" text-anchor="middle" font-size="9" fill="#5b21b6">kutt</text>
  <rect x="47" y="25" width="50" height="45" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <rect x="99" y="25" width="50" height="45" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <line x1="140" y1="15" x2="140" y2="85" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="140" y="12" text-anchor="middle" font-size="9" fill="#d97706">mitte</text>
  <rect x="151" y="25" width="50" height="45" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <rect x="203" y="25" width="50" height="45" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <rect x="255" y="25" width="15" height="45" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5" rx="1"/>
  <text x="262" y="52" text-anchor="middle" font-size="8" fill="#5b21b6">—</text>
  <line x1="10" y1="80" x2="45" y2="80" stroke="#059669" stroke-width="1.5" marker-start="url(#a4)" marker-end="url(#a4)"/>
  <line x1="255" y1="80" x2="270" y2="80" stroke="#059669" stroke-width="1.5" marker-start="url(#a4)" marker-end="url(#a4)"/>
  <text x="27" y="88" text-anchor="middle" font-size="8" fill="#059669">= like</text>
  <defs>
    <marker id="a4" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 z" fill="#059669"/>
    </marker>
  </defs>
</svg>`,
  diagramCaption: 'Like kuttfliser på begge ender, sentrert i rommet.',

  whyItWorks: `<p>Etter at n hele fliser er lagt, er gjenværende plass lik Rom − n × Flis. Del dette likt mellom de to sidene og du får kuttflisens størrelse. Hvis dette tallet er mindre enn halvparten av en flis, ser kuttene ut som smale strimler — å forskyve hele oppsettet med en halv flis gir et bredere, bedre utseende kutt på begge sider.</p>`,

  example: [
    { step: 'Gitt', body: 'Rombredde 3 650 mm. Flis 600 mm + 3 mm fuge = 603 mm modul.' },
    { step: 'Hele fliser', body: '<span class="eq">gulv(3 650 ÷ 603) = gulv(6,05) = <strong>6 hele fliser</strong></span>' },
    { step: 'Gjenværende plass', body: '<span class="eq">3 650 − (6 × 603) = 3 650 − 3 618 = <strong>32 mm</strong> — en smal stripe!</span>' },
    { step: 'Halvflis-forskyvning', body: 'Forskyv oppsett: Kutt = (32 + 603) ÷ 2 = <span class="eq"><strong>317,5 mm</strong></span> — mye bedre.' },
    { step: 'Resultat', body: 'Start første flis 317,5 mm fra veggen (eller kritt en linje der).' },
  ],
  exampleAnswer: 'Start oppsett 317,5 mm fra veggen, noe som gir 317,5 mm kuttfliser på begge sider.',

  assumptions: [
    'Forutsetter jevn flisbredde og fugebredde gjennom hele rommet.',
    'Denne prosessen gjøres uavhengig for hver akse (lengde og bredde).',
    'I rom med ikke-parallelle eller skjeve vegger, kontroller begge ender av hver akse.',
  ],

  tips: [
    'Kritt alltid en linje i midten av rommet i begge retninger før du starter leggingen.',
    'I et bad: prioriter sentrering mot den mest synlige veggen (vanligvis den som vender mot døren).',
    'Store formatfliser (600 mm+) gjør smale kutt mye mer synlige — sentrering er ekstra viktig.',
    'Halvflisregelen: en kuttflis som er smalere enn halvparten av sin fulle størrelse ser generelt dårlig ut og bør unngås ved å forskyve oppsettet.',
  ],

  related: ['tile-quantity', 'diagonal-layout'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'diagonal-layout',
  title: 'Diagonal flislegging (45°)',
  subtitle: 'Svinnfaktor, planlegging og effektiv dekning',
  category: 'Flislegging og oppsett',
  color: '#7c3aed',
  tags: ['diagonal', '45 grader', 'oppsett', 'svinn', 'rotert', 'planlegging', 'mønster'],

  problem: `<p>Fliser lagt i 45° mot veggene skaper et klassisk diamantmønster. Hvordan påvirker dette svinnfaktoren, den effektive dekningen, og hvordan planlegger du oppsettet?</p>`,

  formula: {
    primary: 'B_eff = F × √2 ≈ F × 1,414',
    legend: [
      { sym: 'B_eff', desc: 'Effektiv flismodulbredde langs romaksene', unit: 'mm' },
      { sym: 'F',     desc: 'Flisbredde (kvadratisk flis)',              unit: 'mm' },
    ],
    note: `For materialbestilling, bruk 15–20&nbsp;% svinnfaktor:<br>
<strong>Bestillingsareal = Nettoareal × 1,15 til 1,20</strong><br>
Dette er høyere enn rett legging (10&nbsp;%) fordi kantskjær gir større trekantede avkutt.`,
  },

  whyItWorks: `<p>Når en kvadratisk flis roteres 45°, presenterer den en diagonal flate mot romkantene. Bredden på flisen langs rommets x-akse (dens "modulbredde") blir diagonalen i kvadratet: F × √2. Dette er grunnen til at diagonale fliser ser større ut visuelt, og hvorfor kantskjær alltid er trekantede — noe som gir mer svinn.</p>
<p>Hver kuttflis ved kanten fjerner omtrent halvparten av flisen uansett hvor grensen faller, så svinn er strukturelt høyere enn ved rett legging.</p>`,

  example: [
    { step: 'Gitt', body: 'Gulvareal 20 m², 300×300 mm fliser, diagonal legging, 15&nbsp;% svinn.' },
    { step: 'Bestillingsareal', body: '<span class="eq">20 × 1,15 = <strong>23 m²</strong></span>' },
    { step: 'Flisareal', body: '<span class="eq">0,30 × 0,30 = 0,09 m² per flis</span>' },
    { step: 'Antall fliser', body: '<span class="eq">23 ÷ 0,09 = 255,6 → <strong>256 fliser</strong></span>' },
    { step: 'Effektivt modul', body: '<span class="eq">300 × 1,414 = <strong>424 mm</strong></span> — bruk dette for oppsettplanlegging langs romaksene.' },
  ],
  exampleAnswer: '256 fliser trengs. Planlegg midtlinjer med 424 mm modulavstand.',

  assumptions: [
    'Gjelder kun kvadratiske fliser. Rektangulære fliser i 45° har et mer komplekst effektivt modul.',
    '15&nbsp;% svinnestimatet er konservativt; kompliserte rom med mange utsparinger kan trenge 20&nbsp;%.',
  ],

  tips: [
    'Finn romsenteret og kritt diagonale linjer i 45° — disse blir oppsettguidene dine.',
    'Kuttfliser ved kanten er trekanter: hypotenusen løper langs veggen, så svinn er alltid ca. halvparten av en flis.',
    'Vurder om 45° gir nok visuell verdi til å rettferdiggjøre ekstra materialkostnader og kuttetid.',
    'En geringssag eller våtsag med 45°-jig gir langt renere diagonalkutt enn standardverktøy.',
  ],

  related: ['tile-quantity', 'tile-centering'],
},


/* ── KATEGORI: Fuge og lim ──────────────────────────────── */

{
  id: 'grout-consumption',
  title: 'Fugmasse — forbruk',
  subtitle: 'Mengde fugmasse som skal bestilles for en flislagt flate',
  category: 'Fuge og lim',
  color: '#d97706',
  tags: ['fuge', 'fugmasse', 'fugebredde', 'kg', 'sekker', 'mengde', 'dekning'],

  problem: `<p>Hvor mange kilo fugmasse trenger du for et gitt flislagt areal? Svaret avhenger av flisbredde, flistykkelse, fugebredde og fugmassens densitet.</p>`,

  formula: {
    primary: 'G = J × D × ρ × (1/W + 1/H) × 1000',
    legend: [
      { sym: 'G', desc: 'Fugmasse-forbruk',                   unit: 'kg/m²' },
      { sym: 'J', desc: 'Fugebredde',                         unit: 'mm'    },
      { sym: 'D', desc: 'Flistykkelse (dybde)',               unit: 'mm'    },
      { sym: 'ρ', desc: 'Fugmassedensitet (tørr, typisk 1,5–1,8)', unit: 'kg/L' },
      { sym: 'W', desc: 'Flisbredde',                         unit: 'mm'    },
      { sym: 'H', desc: 'Flishøyde',                          unit: 'mm'    },
    ],
    note: 'For kvadratiske fliser (W = H = S) forenkles dette til: <strong>G = 2 × J × D × ρ ÷ (S + J)</strong>',
  },

  whyItWorks: `<p>Fugmasse fyller fugene mellom flisene. Fugens tverrsnitt er J mm bred × D mm dyp. Total fugelengde per m² avhenger av hvor mange fliskanter det er i hver retning.</p>
<p>Per m² flislagt flate er fugelengden: (1/W + 1/H) × 1 000 meter, der W og H er i mm. Multipliser tverrsnittsareal × fugelengde × densitet og du får masse per m².</p>`,

  example: [
    { step: 'Gitt', body: '300×300 mm fliser, 8 mm tykke, 3 mm fuger, fugmassedensitet 1,6 kg/L.' },
    { step: 'Fugelengde per m²', body: '<span class="eq">(1/300 + 1/300) × 1 000 = 6,67 m fuge per m²</span>' },
    { step: 'Fugevolum per m²', body: '<span class="eq">3 × 8 × 6,67 = 160 cm³/m² = 0,160 L/m²</span>' },
    { step: 'Fugmasse per m²', body: '<span class="eq">0,160 × 1,6 = 0,256 kg/m² ≈ <strong>0,26 kg/m²</strong></span>' },
    { step: 'For 45 m²', body: '<span class="eq">45 × 0,26 = 11,7 kg → <strong>bestill 12–13 kg</strong></span>' },
  ],
  exampleAnswer: 'Ca. 0,26 kg/m² — bestill 12–13 kg for 45 m².',

  assumptions: [
    'Forutsetter at fugene fylles til full flistykkelse (flatfuge).',
    'Fugmassedensitet varierer etter produkt; sjekk alltid databladet.',
    'Dette er tørrvekt — legg til 5–10&nbsp;% for svinn og overfylling på byggeplassen.',
    'Store formatfliser eller tynne fliser gir forskjellige resultater; beregn med faktiske mål.',
  ],

  tips: [
    'Bland alltid fugmasse til produsentens angitte vannforhold — for mye vann svekker og flekker fugen.',
    'Epoksyfugmasse er tettere (≈ 1,8 kg/L); beregn på nytt hvis epoksy brukes.',
    'Test fugefargen mot flisene i et prøvefelt før du forplikter deg til hele gulvet.',
    'For brede fuger (> 6 mm): bruk et fugemiddel med skarpsand tilblanding for å forhindre sprekker.',
  ],

  related: ['adhesive-coverage', 'tile-quantity'],
},

/* ───────────────────────────────────────────────────────── */

{
  id: 'adhesive-coverage',
  title: 'Flislim — dekning og tannhøyde',
  subtitle: 'Mengde flislim å bestille og hvilken murerskje som passer',
  category: 'Fuge og lim',
  color: '#d97706',
  tags: ['flislim', 'lim', 'dekning', 'murerskje', 'tannhøyde', 'kg', 'sekker'],

  problem: `<p>Hvor mye flislim trenger du, og hvilken tannhøyde på murerskjeen gir riktig limbeddybde for dine fliser?</p>`,

  formula: {
    primary: 'Sekker = (A × Forbruk) ÷ Sekkestørrelse',
    legend: [
      { sym: 'A',            desc: 'Flislagt areal',                          unit: 'm²'    },
      { sym: 'Forbruk',      desc: 'Lim påført — se tannhøydeguide nedenfor', unit: 'kg/m²' },
      { sym: 'Sekkestørrelse', desc: 'Vekt per sekk',                         unit: 'kg'    },
    ],
    note: `<strong>Tannhøydeguide (typiske forbruksrater):</strong><br>
• V3 / 3 mm tann: 3–4 kg/m² — mosaikk og fliser opp til 100 mm<br>
• V6 / 6 mm tann: 5–6 kg/m² — små/mellomstore fliser opp til 250 mm<br>
• V8 / 8 mm tann: 6–8 kg/m² — mellomstore fliser 250–400 mm<br>
• V10 / 10 mm tann: 8–10 kg/m² — store formater 400–600 mm<br>
• V12 / 12 mm tann: 10–13 kg/m² — svært store eller tunge naturstein ≥ 600 mm`,
  },

  whyItWorks: `<p>En tannet murerskje legger igjen kamstriper av lim. Når en flis trykkes ned, flater stripene ut og sprer seg til å dekke ca. 65–70&nbsp;% av flisets bakside. Tanndybden kontrollerer hvor mye lim som er igjen under flisen etter innlegging. Dypere tann = mer lim = bedre støtte for tunge eller store fliser.</p>`,

  example: [
    { step: 'Gitt', body: 'Gulvareal 22 m², 400×400 mm fliser. Velger V8 (8 mm) tann ved 7 kg/m². 20 kg sekker.' },
    { step: 'Totalt lim', body: '<span class="eq">22 × 7 = 154 kg</span>' },
    { step: 'Sekker', body: '<span class="eq">154 ÷ 20 = 7,7 → <strong>bestill 8 sekker</strong></span>' },
  ],
  exampleAnswer: '8 × 20 kg sekker med V8 murerskje for 22 m² med 400 mm fliser.',

  assumptions: [
    'Forbruksrater er gjennomsnitt. Ujevne underlag krever mer lim.',
    'Dobbeltstrykning av store fliser øker forbruket — legg til 1–2 kg/m² ekstra.',
    'Hurtigbindende lim kan ha annen dekning enn standard; sjekk databladet.',
  ],

  tips: [
    'For fliser ≥ 400 mm på gulv: alltid dobbeltstryk (påfør et tynt lag på flisets bakside også) for å oppnå ≥ 80&nbsp;% kontakt.',
    'På vegger: bruk et ikke-synkende lim (vanligvis merket "W" eller veggkvalitet).',
    'Natursteinfliser bør bruke hvitt lim — grått lim kan skinne igjennom lysfargede steiner.',
    'Bland aldri lim for vått. En stiv konsistens holder flisen på plass uten å synke ned.',
  ],

  related: ['grout-consumption', 'tile-quantity'],
},


/* ── KATEGORI: Referanse ────────────────────────────────── */

{
  id: 'unit-conversions',
  title: 'Enhetsomregninger',
  subtitle: 'Vanlige omregninger brukt i flis- og gulvlegging',
  category: 'Referanse',
  color: '#0891b2',
  tags: ['enheter', 'omregning', 'mm', 'tommer', 'fot', 'm²', 'ft²', 'kg', 'lbs', 'liter'],

  problem: `<p>Tegninger kan være i millimeter, flisbredder i centimeter, romareal i kvadratfot og limmengder i liter eller pund. Her er omregningene du vil bruke oftest på jobben.</p>`,

  conversionTable: true,

  whyItWorks: `<p>Det internasjonale (SI) systemet bruker meter, kvadratmeter og kilogram. De fleste europeiske fagspesifikasjoner arbeider i mm (for mål) og m² (for areal). Amerikanske spesifikasjoner bruker ofte tommer og kvadratfot. Tabellen nedenfor gir de eksakte multiplikatorene for omregningene du faktisk trenger.</p>`,

  assumptions: [
    'For temperatur: blandingstemperaturer på limdatablader er i °C i Europa, °F i USA.',
    'Kontroller alltid hvilket enhetssystem en tegning eller et datablad bruker før du beregner.',
  ],

  tips: [
    'Rask mental huskeregel: 1 m ≈ 3,3 fot; 1 m² ≈ 10,8 ft²; 1 kg ≈ 2,2 lbs.',
    'For å omregne et romareal fra fot og tommer: konverter tommer til desimaltall (tommer ÷ 12), og multipliser deretter hele verdien med 0,3048.',
    'Flisbredder i USA (f.eks. "12×12 tommer") er nesten nøyaktig 300×300 mm (1 tomme = 25,4 mm).',
    '1 US gallon ≈ 3,785 L; 1 britisk gallon ≈ 4,546 L — flytende tilsetningsstoffer til lim kan angi begge.',
  ],

  related: ['four-wall-area', 'tile-quantity'],
},

];

/* ── Omregningstabelldata ── */
const CONVERSIONS = [
  { section: 'Lengde' },
  { from: '1 tomme',    to: '25,4 mm',               factor: '× 25,4' },
  { from: '1 fot',      to: '304,8 mm = 0,3048 m',   factor: '× 0,3048' },
  { from: '1 meter',    to: '3,2808 fot = 39,37 tommer', factor: '× 3,2808' },
  { from: '1 cm',       to: '10 mm',                  factor: '× 10' },
  { from: '1 mm',       to: '0,03937 tommer',         factor: '÷ 25,4' },

  { section: 'Areal' },
  { from: '1 m²',       to: '10,764 ft²',             factor: '× 10,764' },
  { from: '1 ft²',      to: '0,0929 m²',              factor: '× 0,0929' },
  { from: '1 m²',       to: '10 000 cm²',             factor: '× 10 000' },
  { from: '1 m²',       to: '1 000 000 mm²',          factor: '× 1 000 000' },

  { section: 'Volum og dekning' },
  { from: '1 liter',    to: '1 dm³ = 0,001 m³',       factor: '' },
  { from: '1 liter',    to: 'dekker 1 m² ved 1 mm dybde', factor: '' },
  { from: '1 m³',       to: '1 000 liter',             factor: '× 1 000' },

  { section: 'Masse' },
  { from: '1 kg',       to: '2,2046 lbs',              factor: '× 2,2046' },
  { from: '1 lb',       to: '0,4536 kg',               factor: '× 0,4536' },

  { section: 'Temperatur' },
  { from: '°C → °F',    to: '(°C × 9/5) + 32',        factor: '' },
  { from: '°F → °C',    to: '(°F − 32) × 5/9',        factor: '' },
];

/* ── Kategorifarger ── */
const CATEGORY_COLORS = {
  'Areal og dekning':          '#2563eb',
  'Avretning og sparkelmasse': '#059669',
  'Gulvvarme':                 '#dc2626',
  'Flislegging og oppsett':    '#7c3aed',
  'Fuge og lim':               '#d97706',
  'Referanse':                 '#0891b2',
};
