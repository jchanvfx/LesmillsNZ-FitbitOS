import { readFileSync, writeFileSync, existsSync } from "fs";
const DEBUG = true;

export function debugLog(value) {
    if (DEBUG) {console.log(value);}
}

export function zeroPad(i) {
    if (i < 10) {i = "0" + i;} return i;
}

export function displayElement(element, display=true) {
    element.style.display = display ? "inline" : "none";
}

export function saveSettings(data) {
    writeFileSync("LM_settings.cbor", data, "cbor");
};
export function loadSettings(data) {
    if (existsSync("/private/data/LM_settings.cbor")) {
        return readFileSync("LM_settings.cbor", "cbor");
    }
    return {};
}

/** @description Formats the time spent in milliseconds into mm:ss or hh:mm:ss.
 * @param {number} activeTime The time in milliseconds.
 * @return {string}
 */
export function formatActiveTime(activeTime) {
    let millisecs = activeTime / 10;
    let seconds = (activeTime / 1000).toFixed(0);
    let minutes = Math.floor(seconds / 60);
    let hours;
    if (minutes > 59) {
        hours = Math.floor(minutes / 60);
        hours = zeroPad(hours);
        minutes = minutes - hours * 60;
        minutes = zeroPad(minutes);
    }
    seconds = Math.floor(seconds % 60);
    seconds = zeroPad(seconds);
    if (hours) {
        return `${hours}:${minutes}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
}

/** @description Formats calories with commas for 1,000.
 * @param {number} calories The time in milliseconds.
 * @return {string}
 */
export function formatCalories(calories) {
    return calories.toLocaleString();
}