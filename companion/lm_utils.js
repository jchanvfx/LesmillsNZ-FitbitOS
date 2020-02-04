// Timetable web API
const lesmillsAPI = "https://www.lesmills.co.nz/api/timetable/get-timetable-epi";

// Fetch timetable data from the LesMills database.
export function fetchLesMillsData(clubID) {
    let fetchData = {
        method: "POST",
        headers: new Headers({
            "Content-type": "application/json; charset=UTF-8"
        }),
        body: JSON.stringify({Club: clubID}),
    };
    return fetch(lesmillsAPI, fetchData)
        .then(response => response.json());
}
