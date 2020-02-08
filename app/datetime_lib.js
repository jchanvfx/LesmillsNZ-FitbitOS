import clock from "clock";

let clockCallback;
let date;
let year;
let dayName;
let dayShortName;
let month;
let monthShortName;
let time12hr;
let time24hr;

export const getDate = () => {return date;};
export const getYear = () => {return year;};
export const getDayName = () => {return dayName;};
export const getDayShortName = () => {return dayShortName;};
export const getMonthName = () => {return month;};
export const getMonthShortName = () => {return monthShortName;};
export const getTime12hr = () => {return time12hr;};
export const getTime24Hr = () => {return time24hr;};

export const formatTo12hrTime = date => {
    let hours = date.getHours();
    let mins = zeroPad(date.getMinutes());
    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    return hours + ':' + mins + ampm;
}

clock.granularity = "minutes"; // seconds, minutes, hours

export function registerCallback(callbackFunc) {
  clockCallback = callbackFunc;
  clock.addEventListener("tick", tickHandler);
}

// ----------------------------------------------------------------------------

const DAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday"
];
const DAYS_SHORT = [
    "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"
];
const MONTHS = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
];
const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec"
];

function zeroPad(i) {if (i < 10) {i = "0" + i;} return i;}
function tickHandler(evt) {
    date = zeroPad(evt.date.getDate());
    // year = evt.date.getFullYear();
    // dayName = DAYS[evt.date.getDay()];
    dayShortName = DAYS_SHORT[evt.date.getDay()];
    // month = MONTHS[evt.date.getMonth()];
    monthShortName = MONTHS_SHORT[evt.date.getMonth()];

    let hours = evt.date.getHours();
    let mins = zeroPad(evt.date.getMinutes());
    time24hr = hours + ":" + mins;

    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    time12hr = hours + ':' + mins + ampm;

    let dateString = `${dayShortName} ${date} ${monthShortName}`;

    clockCallback({time: time12hr, date: dateString});
}
