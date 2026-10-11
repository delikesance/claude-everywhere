import { RESULT_SLOT } from "../constants";
import { readPage } from "./read-page";

Object.assign(globalThis, { [RESULT_SLOT]: readPage(document) });
