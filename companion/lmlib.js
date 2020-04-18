// Timetable web API
const urlAPI = "https://www.lesmills.co.nz/api/timetable/get-timetable-epi";

// Fetch timetable data from the website.
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

            let dKey  = `${today.getDay()}${today.getDate()}${today.getMonth()}`;
            let dKey1 = `${date1.getDay()}${date1.getDate()}${date1.getMonth()}`;
            let dKey2 = `${date2.getDay()}${date2.getDate()}${date2.getMonth()}`;
            let fltrs = [dKey, dKey1, dKey2];

            let timetable = {};
            timetable['fetched'] = today.toJSON();
            timetable[dKey.toString()]  = [];
            timetable[dKey1.toString()] = [];
            timetable[dKey2.toString()] = [];
            // retrive and query 3 days of data.
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

// Fetch fitness classes from website.
export function fetchClasses(clubID, callbackFunc) {
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
            let fitnessClasses  = [];
            let fitnessColors   = [];
            for (let i = 0; i < data.Classes.length; i++) {
                let clsInfo     = data.Classes[i];
                let clsColor    = clsInfo.Colour;
                let clsName     = clsInfo.ClassName;
                clsName = clsName.toUpperCase();
                clsName = clsName.replace(/VIRTUAL|30|45/g, "");
                clsName = clsName.replace(/^\s+|\s+$/g, "");
                if (clsName.endsWith("INTRO")) {
                    clsName = clsName.slice(0, -" INTRO".length);
                }
                if (fitnessClasses.includes(clsName)) {
                    let idx = fitnessClasses.indexOf(clsName);
                    if (fitnessColors[idx] === null && clsColor !== null) {
                        fitnessColors[idx] = clsColor;
                    }
                    continue;
                }
                fitnessClasses.push(clsName);
                fitnessColors.push(clsColor);
            }

            let classesData = [];
            for (let i = 0; i < fitnessClasses.length; i++) {
                let color = (fitnessColors[i] !== null) ? fitnessColors[i] : "black";
                let workout = fitnessClasses[i];
                classesData.push({name:workout, color:color});
            }
            classesData.sort((a, b) => (a.name > b.name) ? 1 : -1)

            // execute callback.
            callbackFunc(classesData);
        })
        .catch(err => {
            console.log(`Failure: ${err}`);
        });
}
