/*
  A simple clock which renders the current time and date in a digital format.
  Callback should be used to update your UI.
*/
import clock from "clock";
import { preferences } from "user-settings";

let dateFormat, clockCallback;

export const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];
export const daysShort = [
    "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"
];
export const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
export const monthsShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec"
];


export function formatDateToAmPm(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    let strTime = hours + ':' + minutes + ampm;
    return strTime;
}

export function initialize(granularity, dateFormatString, callback) {
  dateFormat = dateFormatString;
  clock.granularity = granularity;
  clockCallback = callback;
  clock.addEventListener("tick", tickHandler);
}

// Add zero in front of numbers < 10
function zeroPad(i) {
    if (i < 10) {i = "0" + i;}
        return i;
}

function tickHandler(evt) {
  let today = evt.date;
  let dayName = days[today.getDay()];
  // let dayNameShort = daysShort[today.getDay()];
  // let month = zeroPad(today.getMonth() + 1);
  let monthName = months[today.getMonth()];
  let monthNameShort = monthsShort[today.getMonth()];
  let dayNumber = zeroPad(today.getDate());

//   let hours = today.getHours();
//   let ampm = "";
//   if (preferences.clockDisplay === "12h") {
//     // 12h format
//     hours = hours % 12 || 12;
//     ampm = today.getHours() >= 12 ? 'pm' : 'am';
//   } else {
//     // 24h format
//     hours = zeroPad(hours);
//   }
//   let mins = zeroPad(today.getMinutes());
//   let timeString = `${hours}:${mins}${ampm}`;
  let timeString = formatDateToAmPm(today);
  let dateString = today;

  switch(dateFormat) {
    case "shortDate":
      dateString = `${dayNumber} ${monthNameShort}`;
      break;
    case "mediumDate":
      dateString = `${dayNumber} ${monthName}`;
      break;
    case "longDate":
      dateString = `${dayName} ${monthName} ${dayNumber}`;
      break;
  }
  clockCallback({time: timeString, date: dateString});
}