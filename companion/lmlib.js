// Timetable web API
const urlAPI = "https://www.lesmills.co.nz/api/timetable/get-timetable-epi";

// Fetch timetable data from the LesMills database.
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
            let today = new Date();
            let date1 = new Date(today);
            let date2 = new Date(today);
            date1.setDate(today.getDate() + 1);
            date2.setDate(today.getDate() + 2);

            let dKey = `${today.getDay()}${today.getDate()}${today.getMonth()}`;
            let dKey1 = `${date1.getDay()}${date1.getDate()}${date1.getMonth()}`;
            let dKey2 = `${date2.getDay()}${date2.getDate()}${date2.getMonth()}`;
            let fltrs = [dKey, dKey1, dKey2];

            let timetable = {};
            timetable['fetched'] = today.toJSON();
            timetable[dKey.toString()] = [];
            timetable[dKey1.toString()] = [];
            timetable[dKey2.toString()] = [];
            // retrive and query 3 days of data.
            for (var i = 0; i < data.Classes.length; i++) {
                let clsInfo = data.Classes[i];
                let clsDate = new Date(clsInfo.StartDateTime);
                let clsKey = `${clsDate.getDay()}${clsDate.getDate()}${clsDate.getMonth()}`;
                if (fltrs.includes(clsKey)) {
                    let grpCls = {
                        name: clsInfo.ClassName,
                        date: clsInfo.StartDateTime,
                        instructor: clsInfo.MainInstructor.Name,
                        color: clsInfo.Colour,
                        desc: `${clsInfo.Site.SiteName} (${clsInfo.Duration}mins)`,
                    };
                    timetable[clsKey.toString()].push(grpCls);
                }
            }
            // sort data by class times.
            for (var i = 0; i < fltrs.length; i++) {
                timetable[fltrs[i]].sort((a, b) => (a.date > b.date) ? 1 : -1);
            }
            // execute callback.
            callbackFunc(timetable);
        })
        .catch(err => {
            console.log(`Failure: ${err}`);
        });
}
