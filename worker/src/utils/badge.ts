import type { Monitor } from "../db/queries";

type BadgeInput = {
  name: string;
  status: Monitor["status"];
  uptimePercentage: number | null;
};

const STATUS_COLORS: Record<Monitor["status"], string> = {
  operational: "#2da44e",
  degraded: "#d4a72c",
  down: "#cf222e",
  unknown: "#8c959f"
};

const LABEL_BACKGROUND = "#555555";
const FONT_WIDTH_PX = 6.7;
const HORIZONTAL_PADDING_PX = 10;
const MAX_NAME_LENGTH = 24;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function segmentWidth(text: string): number {
  return Math.round(text.length * FONT_WIDTH_PX + HORIZONTAL_PADDING_PX * 2);
}

export function buildBadgeValueText(status: Monitor["status"], uptimePercentage: number | null): string {
  if (uptimePercentage === null) {
    return status;
  }

  return `${uptimePercentage}% - ${status}`;
}

export function buildStatusBadgeSvg(input: BadgeInput): string {
  const label = escapeXml(
    (input.name.length > MAX_NAME_LENGTH
      ? `${input.name.slice(0, MAX_NAME_LENGTH - 1)}…`
      : input.name
    ).toLowerCase()
  );
  const value = escapeXml(buildBadgeValueText(input.status, input.uptimePercentage));
  const color = STATUS_COLORS[input.status];
  const labelWidth = segmentWidth(label);
  const valueWidth = segmentWidth(value);
  const totalWidth = labelWidth + valueWidth;
  const labelCenter = labelWidth / 2;
  const valueCenter = labelWidth + valueWidth / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbbbbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#ffffff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${LABEL_BACKGROUND}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#ffffff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelCenter}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelCenter}" y="14">${label}</text>
    <text x="${valueCenter}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${valueCenter}" y="14">${value}</text>
  </g>
</svg>`;
}
