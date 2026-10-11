type Shape = readonly [tag: "path" | "circle" | "rect", attributes: Record<string, string>];

const path = (d: string): Shape => ["path", { d }];

// Path data mirrors the symbols in design/index.html (24x24, stroked by .icon).
export const ICON_SHAPES = {
  egress: [path("M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"), path("m21 3-9 9"), path("M15 3h6v6")],
  plus: [path("M5 12h14M12 5v14")],
  x: [path("M18 6 6 18M6 6l12 12")],
  chevronDown: [path("m6 9 6 6 6-6")],
  search: [["circle", { cx: "11", cy: "11", r: "8" }], path("m21 21-4.3-4.3")],
  settings: [
    ["circle", { cx: "12", cy: "12", r: "3" }],
    path("M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"),
  ],
  library: [path("m16 6 4 14M12 6v14M8 8v12M4 4v16")],
  squarePen: [
    path("M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"),
    path("M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"),
  ],
  copy: [
    ["rect", { x: "8", y: "8", width: "14", height: "14", rx: "2" }],
    path("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"),
  ],
  bookmarkPlus: [path("M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"), path("M12 7v6M9 10h6")],
  rotateCw: [path("M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8"), path("M21 3v5h-5")],
  lock: [["rect", { x: "3", y: "11", width: "18", height: "11", rx: "2" }], path("M7 11V7a5 5 0 0 1 10 0v4")],
  check: [path("M20 6 9 17l-5-5")],
  spark: [path("M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18")],
  info: [["circle", { cx: "12", cy: "12", r: "10" }], path("M12 16v-4M12 8h.01")],
  triangleAlert: [
    path("m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"),
    path("M12 9v4M12 17h.01"),
  ],
  circleAlert: [["circle", { cx: "12", cy: "12", r: "10" }], path("M12 8v4M12 16h.01")],
  arrowUpRight: [path("M7 7h10v10M7 17 17 7")],
  arrowDown: [path("M12 5v14m7-7-7 7-7-7")],
  history: [path("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"), path("M3 3v5h5"), path("M12 7v5l4 2")],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICON_SHAPES;
