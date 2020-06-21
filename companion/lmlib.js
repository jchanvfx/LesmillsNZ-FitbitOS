import { date, date1, date2, date3, date4 } from "../common/datelib"

// Timetable web API
const urlAPI = "https://www.lesmills.co.nz/api/timetable/get-timetable-epi";

// Fetch timetable from database.
export function fetchTimetableData(clubID, callbackFunc) {
    let fetchData = {
        method: "POST",
        headers: new Headers({
            "Content-type": "application/json; charset=UTF-8"
        }),
        body: JSON.stringify({Club: clubID}),
    };
    return fetch(urlAPI, fetchData)
        .then(response => response.json())
        .then(data => {
            // retrive up to 5 days of data.
            let dates = [date, date1, date2, date3, date4];
            let fltrs = [];
            let timetable = {};
            timetable['fetched'] = date.toJSON();
            // build the date keys.
            for (let i = 0; i < dates.length; i++) {
                let dkey = `${dates[i].getDay()}` +
                           `${dates[i].getDate()}` +
                           `${dates[i].getMonth()}`;
                fltrs.push(dkey);
                timetable[dkey.toString()] = [];
            }
            // extract and sort data from the json blob.
            for (let i = 0; i < data.Classes.length; i++) {
                let clsInfo = data.Classes[i];
                let clsDate = new Date(clsInfo.StartDateTime);
                let clsKey = `${clsDate.getDay()}${clsDate.getDate()}${clsDate.getMonth()}`;
                if (fltrs.includes(clsKey)) {
                    let grpCls = {
                        name: clsInfo.ClassName,
                        date: clsInfo.StartDateTime,
                        instructor1: clsInfo.MainInstructor.Name,
                        instructor2: (clsInfo.SecondaryInstructor !== null) ?
                                      clsInfo.SecondaryInstructor.Name : undefined,
                        color: (clsInfo.Colour !== null) ? clsInfo.Colour : "black",
                        duration: clsInfo.Duration,
                        location: clsInfo.Site.SiteName,
                    };
                    timetable[clsKey.toString()].push(grpCls);
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
