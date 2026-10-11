import { RESULT_SLOT } from "../constants";
import { readSelection } from "./read-selection";

Object.assign(globalThis, { [RESULT_SLOT]: readSelection(document) });
