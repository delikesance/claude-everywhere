import type { ToolDef } from "../types";
import { findInPageTool } from "./find-in-page";
import { pageOutlineTool } from "./page-outline";
import { readSectionTool } from "./read-section";

export const pageTools: ToolDef[] = [pageOutlineTool, readSectionTool, findInPageTool];
