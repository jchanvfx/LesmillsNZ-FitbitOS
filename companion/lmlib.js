import { debugLog } from "../app/utils";
import {date, date1, date2, date3, date4, date5, date6} from "../common/datelib"

// Timetable web API
const urlAPI_start = "https://www.lesmills.co.nz/API/TimetablePage/GetTimetableCards?searchClubCodes="
const urlAPI_end   = "&searchClassCodes=&searchTrainerNames=";

// Default class colors.
const defaultColors = {
    BODYATTACK       : "#FFB81C",
    BODYBALANCE      : "#C5E86C",
    BODYCOMBAT       : "#787121",
    BODYJAM          : "#FEDD00",
    BODYPUMP         : "#E4002B",
    BODYSTEP         : "#008C95",
    "LES MILLS CORE" : "#E35205",
    RPM              : "#00A9E0",
    "SH'BAM"         : "#D0006F",
    SPRINT           : "#FEDD00",
    TONE             : "#8246AF"
};


function sanitizeName(name) {
    let sanitizedName = String(name).replace(/^[\s\+&]+|[\s\+&]+$/g, '');
    return sanitizedName;
}

// Fetch timetable from database.
export function fetchTimetableData(clubID, callbackFunc) {
    let urlAPI = urlAPI_start + clubID + urlAPI_end;
    return fetch(urlAPI)
        .then(response => response.json())
        .then(data => {
            let fitnessClasses = data.responseData.cards;

            // retrive up to 7 days of data.
            let dates = [date, date1, date2, date3, date4, date5, date6];
            let fltrs = [];
            let timetable = {};

            // build the date keys.
            for (let i = 0; i < dates.length; i++) {
                let dkey = `${dates[i].getDay()}` +
                           `${dates[i].getDate()}` +
                           `${dates[i].getMonth()}`;
                fltrs.push(dkey);
                timetable[dkey.toString()] = [];
            }

            // extract and sort data from the json blob.
            let emojiRegex = /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g;
            let exclColors = ["#", "#000", "#000000", "black", null];

            for (let i = 0; i < fitnessClasses.length; i++) {
                let clsInfo = fitnessClasses[i];
                let clsDate = new Date(`${clsInfo.startDate} ${clsInfo.startTime}`);
                let clsKey = `${clsDate.getDay()}${clsDate.getDate()}${clsDate.getMonth()}`;

                // sanitize emoji characters from class name as Fitbit OS fonts don't support it.
                let clsName = clsInfo.className;
                clsName = clsName.replace(emojiRegex, "");
                clsName = clsName.replace(/\s{2,}/g, " ");

                // set the class default color and filter out the color "black" or "null"
                // because by default the background is black.
                let color = `#${clsInfo.colorHexCode}`;
                let title = clsName.toUpperCase();
                for (let key in defaultColors) {
                    if (title.indexOf(key) !== -1) {
                        color = defaultColors[key];
                        break;
                    }
                }
                color = (exclColors.includes(color)) ? "#848484" : color;

                if (fltrs.includes(clsKey)) {
                    timetable[`${clsKey}`].push({
                        name: clsName,
                        date: clsDate.toISOString(),
                        instructor1: sanitizeName(clsInfo.mainInstructorName),
                        instructor2: (clsInfo.secondaryInstructorName !== "") ?
                            sanitizeName(clsInfo.secondaryInstructorName) : undefined,
                        color: color,
                        duration: clsInfo.durationMins,
                        location: clsInfo.siteName,
                    });
                }
            }
            // sort data by class times.
            // (save processing power on fitbit device)
            for (let i = 0; i < fltrs.length; i++) {
                timetable[fltrs[i]].sort((a, b) => (a.date > b.date) ? 1 : -1);
            }
            // execute callback.
            callbackFunc(timetable);
        })
        .catch(err => {
            console.log(`Failure: ${err}`);
        });
}
