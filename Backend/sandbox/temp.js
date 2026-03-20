const fs = require("fs");
const input = fs.readFileSync(0,"utf8").trim().split("\n");

const n = Number(input[0]);
const arr = input[1].split(" ").map(Number);

// Write your logic here

let max = arr[0];
for(let i=1;i<n;i++){
   if(arr[i] > max) max = arr[i];
}

console.log(max);