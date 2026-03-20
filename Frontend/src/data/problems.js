export const problems = [
  {
    id: "max-element",
    title: "Find Maximum Element",
    difficulty: "Easy",

    description:
      "Given an array of integers, return the maximum element present in the array.",

    inputFormat:
      "First line contains N (size of array). Second line contains N space-separated integers.",

    outputFormat:
      "Print the maximum element in the array.",

    constraints:
      "1 ≤ N ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9",

    examples: [
      {
        input: "5\n2 5 1 9 3",
        output: "9",
      },
      {
        input: "4\n7 3 11 6",
        output: "11",
      },
    ],

    starterCode:
`function solve(arr){
    
}`,

testcases: [
    { input: [1,2,3,4], output: 4 },
    { input: [5,9,1], output: 9 }
  ],

  hiddenTestcases: [
    { input: [100,2,300], output: 300 },
    { input: [-1,-9,-3], output: -1 }
  ]

  }
];