const DEBUG = true;

export function debugLog(value) {
    if (DEBUG) {console.log(value);}
}

export function zeroPad(i) {
    if (i < 10) {i = "0" + i;} return i;
}
