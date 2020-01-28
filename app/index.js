import document from "document";

let VTList = document.getElementById("my-list");
let NUM_ELEMS = 100;


function formatDateToAmPm(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ampm;
  return strTime;
}


VTList.delegate = {
  getTileInfo: function(index) {
    return {
      index: index,
      type: "my-pool",
      Name: "BodyPump",
      MainInstructor: "Alistair Alcock",
      Colour: "#E4002B",
      Duration: "60",
      Site: "Studio 2",
      StartDateTime: "2020-02-02T17:00:00+13:00"
    };
  },
  configureTile: function(tile, info) {
    if (info.type == "my-pool") {
      let time = new Date(info.StartDateTime);
      tile.getElementById("text-title").text = `${info.Name.toUpperCase()}`;
      tile.getElementById("text-subtitle").text = `${info.MainInstructor}`;
      tile.getElementById("text-L").text = formatDateToAmPm(time);
      tile.getElementById("text-R").text = `${info.Site} (${info.Duration}mins)`;
      tile.getElementById("color").style.fill = `${info.Colour}`;
      tile.getElementById("colorIdx").style.fill = `${info.Colour}`;

      let touch = tile.getElementById("touch-me");
      touch.onclick = evt => {
        console.log(`touched: ${info.index}`);
      };
    }
  }
};

// VTList.length must be set AFTER VTList.delegate
VTList.length = NUM_ELEMS;