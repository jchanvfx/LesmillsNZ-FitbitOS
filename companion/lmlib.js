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
                        instructor: clsInfo.MainInstructor.Name,
                        color: (clsInfo.Colour !== null) ? clsInfo.Colour : "black",
                        desc: `${clsInfo.Site.SiteName} (${clsInfo.Duration}mins)`,
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

// Fetch fitness classes from the LesMills database.
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
                clsName = clsName.replace(/Virtual|virtual|30|45/g, "");
                clsName = clsName.replace(/^\s+|\s+$/g, "");
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
                let iconName = getIconImageName(workout.toUpperCase());
                classesData.push({name:workout, color:color, iconName:iconName});
            }
            classesData.sort((a, b) => (a.name > b.name) ? 1 : -1)

            // execute callback.
            callbackFunc(classesData);
        })
        .catch(err => {
            console.log(`Failure: ${err}`);
        });
}

function getIconImageName(workout) {
    let name;
    switch (workout) {
        case "CXWORX":
        case "TONE":
            name = "bands";
            break;
        case "BODYCOMBAT":
        case "CONQUER":
        case "IMPACT":
            name = "boxing";
            break;
        case "RPM":
        case "RPM ENDURO":
        case "SPRINT":
        case "THE TRIP":
            name = "cycle";
            break;
        case "BODYJAM":
        case "HIP HOP":
        case "SH'BAM":
            name = "dance";
            break;
        case "BODYATTACK":
            name = "jump";
            break;
        case "GRIT CARDIO":
            name = "mclimb";
            break;
        case "BODYSTEP":
        case "BODYSTEP ATHLETIC":
        case "GRIT ATHLETIC":
            name = "step";
            break;
        case "BARRE":
        case "BODYBALANCE":
        case "LES MILLS STRETCH":
            name = "stretch";
            break;
        case "BODYPUMP":
        case "BODYPUMP INTRO":
        case "GRIT STRENGTH":
            name = "weightlift";
            break;
        case "YOGA":
            name = "yoga";
            break;
        default:
            name = "default";
    }
    return name;
}
