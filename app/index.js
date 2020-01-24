import document from "document";
import { workoutTypes } from "./group_fitness";

let background = document.getElementById("background");
let myList = document.getElementById("my-list");

console.log("====================");

myList.delegate = {
  getTileInfo: function(index) {
    return {
      ...workoutTypes[index], 
      ...{type: "my-pool", index: index}
    };
  },
  configureTile: function(tile, info) {
    if (info.type == "my-pool") {
      tile.getElementById("text-title").text = `${info.workout}`;
      tile.getElementById("text-subtitle").text = `intensity: ${info.intensity}`;
      tile.getElementById("text-L").text = ">>>";
      tile.getElementById("text-R").text = "Start Workout";
      tile.getElementById("color").style.fill = `${info.color}`;
      tile.getElementById("colorL").style.fill = `${info.color}`;

      let touch = tile.getElementById("touch-me");
      touch.onclick = evt => {
        console.log(`touched: ${info.index}`);
      };
    }
  }
};

// list length must be set AFTER the delegate
myList.length = workoutTypes.length;


