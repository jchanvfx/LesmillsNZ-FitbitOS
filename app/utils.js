import { DEBUG_MODE } from "./config"

export function debugLog(value) {if (DEBUG_MODE) {console.log(value);}}
export function zeroPad(i) {if (i < 10) {i = "0" + i;} return i;}
