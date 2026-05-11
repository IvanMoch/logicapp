# Logicapp — Interface Design System

**Direction:** "Almacén bajo luz fría a las 7am" — operario de almacén móvil/tablet, gestión de inventario por SKU/lote/Calle/Bloque/Piso. Calmado, alerta, clínico-industrial. Los números mandan (es app de inventario), todo lo demás se aquieta.

## Tokens

Definidos en `src/theme/tokens.ts`. Source of truth.

- **Surfaces** — `frost` (canvas), `paper` (card), `paperSunk` (inputs/wells), `paperRaised` (sheets). Jerarquía por tinte, no por sombra.
- **Ink ladder** — `ink` → `inkSoft` → `inkMute` → `inkFaint` → `inkGhost`. Cuatro niveles activos en cualquier pantalla.
- **Cobalto** (acción/selección) — `cobalt`, `cobaltDeep`, `cobaltSoft`, `cobaltTint`, `cobaltTintDeep`. Reservado SOLO para acción y selección.
- **Semantic** — `amber/amberTint/amberInk` (warning, expirations próximos), `ember/emberTint/emberInk` (crítico, vencido, error), `mint/mintTint/mintInk` (entrada/healthy stock).
- **Chart ladder** — `chart1..chart6`, monocromática azul de `ink` a `cobaltTintDeep`. NUNCA paleta rainbow.
- **Rails** (borders) — `rail`, `railSoft`, `railStrong`, `railFocus`. rgba sobre azul, no hex sólido.

## Depth strategy

**Borders-only.** Sin shadows / sin elevation. Las superficies se diferencian por:
1. Tinte de fondo (frost/paper/sunk/tinted)
2. Borde rgba muy sutil (`rail` o `railSoft`)
3. Borde activo cobalto sólo en estado seleccionado

## Spacing

Base 4. Escala: `xs 4 · sm 8 · md 12 · base 16 · lg 20 · xl 24 · xxl 32 · xxxl 48`.

## Radius

`xs 4 · sm 6 (chips, inputs, buttons) · md 10 (cards) · lg 14 (modals)`.

## Tipografía

System font + variantes por peso/tracking/tabular:
- **Eyebrow:** `xs`, weight 600, `trackEyebrow 0.8`, UPPERCASE, color `inkMute` o `cobalt` (sección)
- **Title:** `xxl`, weight 700, `trackTight -0.4`, color `ink`
- **Hero number:** `hero (38)`, weight 700, `letterSpacing -1`, `tabular-nums`
- **Stat number:** `xxl`, weight 700, `tabular-nums`
- **Body:** `md`, weight 400-500, color `ink/inkSoft`
- **Caption/meta:** `sm` o `xs`, color `inkMute/inkSoft`, `tabular-nums` cuando es número
- **Códigos (SKU/lote):** `trackCode 0.4`, weight bold

## Componentes core (`src/components/ui/`)

- `Surface` — variants paper/sunk/tinted, padded opcional.
- `Stat` — eyebrow + value (tabular) + caption opcional. Tones: default/cobalt/amber/mint/ember. `hero` flag para KPI dominante.
- `LocationTile` — **signature**. Badge de Calle (letra grande mono), coords BL/NV tabulares, chips de lote apilados, medidor de capacidad como línea horizontal de 2px al pie.
- `ScreenHeader` — eyebrow cobalto + title + subtitle + slot derecho para acción.
- `HeaderAction` — variants primary (cobalto sólido) / ghost (paper + borde rail).
- `EmptyState` — frame dashed `rail`, título + hint + acción opcional.
- `Field` — label uppercase + "obligatorio" + child input + hint.

## Patrones

- **Listas:** filas conectadas (sin radius/border entre filas), sólo la primera tiene radius superior. `borderTopWidth` 0 entre filas, sólo en la primera.
- **Header de pantalla:** eyebrow + title + subtitle, `HeaderAction` a la derecha. NO FAB flotante — la acción va etiquetada en el header.
- **Selección:** `cobaltTint` background + borde `cobalt`. Texto de números pasa a `cobaltDeep`.
- **Charts:** sin sombras, sin gradientes, usar `chart1..chart6` como ladder monocromático. Legend custom con `swatch + nombre + count tabular + porcentaje`.
- **Banner de alerta:** ámbar frío (`amberTint` bg, `amberInk` text), badge cuadrado con count tabular, sin emojis ni signos de exclamación.
- **Botones de acción:** primary cobalto sólido + texto blanco; secondary ghost con borde `rail` + texto `inkSoft`. Cancelar y confirmar conviven en `actions` row con flex 1:2.
- **Toggle binario** (entrada/salida): dos cajas paper que al activarse adoptan el tone semántico (cobalt para salida, mint para entrada).

## Reglas de uso de color

- Cobalto **solo** para acción primaria, brand eyebrow, selección, hero stat.
- Ámbar **solo** para vencimientos próximos / warning de capacidad >85%.
- Ember **solo** para crítico, error, capacidad sobrepasada.
- Mint **solo** para entradas / stock saludable.
- Para cualquier otra cosa, escala de tinta (`ink/inkSoft/inkMute/inkFaint`).

## Anti-patterns (rejected defaults)

- Material Card con elevation/sombra → reemplazado por `Surface` borderless.
- PieChart rainbow (`#f44336/#2196f3/#4caf50…`) → ladder monocromático azul.
- FAB circular flotante → `HeaderAction` etiquetado en el header.
- Emoji ⚠️ + rojo fire-truck → barra ámbar fría sin emoji con count tabular.
- KPIs idénticos uniformes → hero dominante + secundarios contrastados.
- Bordes hex sólidos (`#ccc`, `#eee`) → rgba `rail/railSoft`.

## Files

- `src/theme/tokens.ts` — palette, space, radius, type
- `src/theme/paperTheme.ts` — Paper + React Navigation themes
- `src/components/ui/*` — primitivos
- `App.tsx` — wraps con PaperProvider(theme) y NavigationContainer(theme)
