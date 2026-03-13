/**
 * ZPL (Zebra Programming Language) generation service.
 *
 * Generates ZPL II label programs for items, containers, and storage locations.
 * Designed for 4"×2" (101×51mm) labels at 203 dpi (standard Zebra LP2844 / GK420t).
 * All measurements are in dots (1 dot = 0.125mm at 203 dpi).
 *
 * Label size: 812×406 dots (4"×2" at 203 dpi)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemLabelData = {
  barcode: string;
  labIdNumber: string;
  itemType: string;
  /** Primary display name (productName, miscName, model, etc.) */
  displayName: string | null;
  /** Secondary line (OEM, part number, consumable type, etc.) */
  subTitle: string | null;
  /** Location string e.g. "A-01-02-5" or "BOX-0001" */
  location: string | null;
  /** Site name */
  site: string | null;
};

export type ContainerLabelData = {
  barcode: string;
  label: string;
  location: string | null;
  site: string | null;
  itemCount: number;
};

export type LocationLabelData = {
  /** e.g. "A-01-02-5" */
  label: string;
  /** e.g. "Sofia / Main Building / Area A" */
  breadcrumb: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate a string to a maximum byte length (ZPL fields have limits). */
function trunc(value: string | null | undefined, max: number): string {
  if (!value) return "";
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

/** Map internal item type to a short human-readable label. */
function itemTypeLabel(itemType: string): string {
  const map: Record<string, string> = {
    ELECTRONICS_SAMPLE: "ELECTRONICS",
    FIXTURE: "FIXTURE",
    SPARE_PART: "SPARE PART",
    CONSUMABLE: "CONSUMABLE",
    MISC: "MISC",
  };
  return map[itemType] ?? itemType;
}

// ─── Label generators ─────────────────────────────────────────────────────────

/**
 * Item label — 4"×2"
 *
 * Layout:
 *   [barcode]
 *   Lab ID: XXXXX        TYPE
 *   Display name
 *   Sub-title
 *   Location / Site
 */
export function generateItemZpl(data: ItemLabelData): string {
  const displayName = trunc(data.displayName, 30);
  const subTitle = trunc(data.subTitle, 35);
  const location = trunc(data.location, 25);
  const site = trunc(data.site, 20);
  const typeTag = itemTypeLabel(data.itemType);

  return [
    "^XA",
    "^CI28",                          // UTF-8 encoding
    "^LH0,0",                         // label home
    "^PW812",                         // print width 812 dots (4")
    // ── Barcode ──
    "^FO30,20",
    "^BY2,3,80",                      // bar width 2, ratio 3, height 80 dots
    `^BCN,80,N,N,N`,                  // Code 128, no check digit print
    `^FD${data.barcode}^FS`,
    // ── Barcode text below bar ──
    "^FO30,105",
    "^A0N,22,22",
    `^FD${data.barcode}^FS`,
    // ── Type tag (top right) ──
    "^FO550,20",
    "^A0N,20,20",
    `^FD${typeTag}^FS`,
    // ── Lab ID ──
    "^FO30,140",
    "^A0N,24,24",
    `^FDLab ID: ${data.labIdNumber}^FS`,
    // ── Display name ──
    ...(displayName
      ? ["^FO30,170", "^A0N,26,26", `^FD${displayName}^FS`]
      : []),
    // ── Sub-title ──
    ...(subTitle
      ? ["^FO30,200", "^A0N,20,20", `^FD${subTitle}^FS`]
      : []),
    // ── Separator line ──
    "^FO30,230^GB752,2,2^FS",
    // ── Location ──
    "^FO30,238",
    "^A0N,22,22",
    `^FD${location ? `Loc: ${location}` : "No location"}${site ? `  |  ${site}` : ""}^FS`,
    "^XZ",
  ].join("\n");
}

/**
 * Container label — 4"×2"
 *
 * Layout:
 *   [barcode]
 *   BOX LABEL: <label>
 *   <items> items  |  <location>  |  <site>
 */
export function generateContainerZpl(data: ContainerLabelData): string {
  const label = trunc(data.label, 28);
  const location = trunc(data.location, 20);
  const site = trunc(data.site, 15);

  return [
    "^XA",
    "^CI28",
    "^LH0,0",
    "^PW812",
    // ── Barcode ──
    "^FO30,20",
    "^BY2,3,80",
    "^BCN,80,N,N,N",
    `^FD${data.barcode}^FS`,
    // ── Barcode text ──
    "^FO30,105",
    "^A0N,22,22",
    `^FD${data.barcode}^FS`,
    // ── Container badge (top right) ──
    "^FO600,20",
    "^A0N,20,20",
    "^FDCONTAINER^FS",
    // ── Label ──
    "^FO30,140",
    "^A0N,28,28",
    `^FD${label}^FS`,
    // ── Separator ──
    "^FO30,175^GB752,2,2^FS",
    // ── Footer ──
    "^FO30,183",
    "^A0N,22,22",
    `^FD${data.itemCount} item${data.itemCount !== 1 ? "s" : ""}${location ? `  |  ${location}` : ""}${site ? `  |  ${site}` : ""}^FS`,
    "^XZ",
  ].join("\n");
}

/**
 * Location label — 4"×2" — large, scannable shelf label
 *
 * Layout:
 *   [QR code + large location code side by side]
 *   breadcrumb (site / building / area)
 */
export function generateLocationZpl(data: LocationLabelData): string {
  const breadcrumb = trunc(data.breadcrumb, 45);

  return [
    "^XA",
    "^CI28",
    "^LH0,0",
    "^PW812",
    // ── QR code (left) ──
    "^FO30,20",
    "^BQN,2,8",                       // QR code, model 2, magnification 8
    `^FDQA,${data.label}^FS`,
    // ── Location code (large, right of QR) ──
    "^FO310,20",
    "^A0N,90,90",
    `^FD${data.label}^FS`,
    // ── Separator ──
    "^FO30,280^GB752,2,2^FS",
    // ── Breadcrumb ──
    "^FO30,290",
    "^A0N,22,22",
    `^FD${breadcrumb}^FS`,
    "^XZ",
  ].join("\n");
}
