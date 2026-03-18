function findMax(arr){
   let max = arr[0];
   for(let i=1;i<arr.length;i++){
       if(arr[i] > max) max = arr[i];
   }
   console.log(max);
}

findMax([2,5,1,9,3]);