export const problems = [
  {
    id: "max-element",
    _id: "69bd041c0669b885ce198b33",
    title: "Find Maximum Element",
    difficulty: "Easy",
    topic: "Arrays",
    description:
      "Given an array of integers nums, return the maximum element present in the array.\n\nFor each testcase, find the largest number inside nums and return it as a single integer.",
    inputFormat:
      "First line contains N (size of array). Second line contains N space-separated integers.",
    outputFormat:
      "Print the maximum element in the array.",
    constraints:
      "1 ≤ N ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9",
    examples: [
      {
        input: "nums = [1, 3, 1, 7]",
        output: "7",
      },
      {
        input: "nums = [5, 9, 1, 3]",
        output: "9",
      },
    ],
    starterCode: `function solve(arr) {\n\n}`,
    testcases: [
      { input: [1, 3, 1, 7], output: "7" },
      { input: [5, 9, 1, 3], output: "9" },
    ],
    hiddenTestcases: [
      { input: [100, 2, 300], output: "300" },
      { input: [-1, -9, -3], output: "-1" },
    ],
  },
  {
    id: "detect-cycle",
    _id: "69bd041c0669b885ce198b34",
    title: "Detect cycle in linked list",
    difficulty: "Medium",
    topic: "Linked List",
    description:
      "Given head, the head of a singly linked list, determine if the linked list has a cycle in it.\n\nThere is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to (-1 if no cycle).\n\nReturn true if there is a cycle in the linked list. Otherwise, return false.",
    inputFormat:
      "nums = array of node values, pos = index of node tail connects to (-1 if no cycle)",
    outputFormat:
      "Return true if cycle exists, else false.",
    constraints:
      "0 ≤ number of nodes ≤ 10^4, -10^5 ≤ Node.val ≤ 10^5, pos is -1 or a valid index in the linked list.",
    examples: [
      {
        input: "head = [3, 2, 0, -4], pos = 1",
        output: "true",
      },
      {
        input: "head = [1, 2], pos = 0",
        output: "true",
      },
      {
        input: "head = [1], pos = -1",
        output: "false",
      },
    ],
    starterCode: `function solve(head) {\n\n}`,
    testcases: [
      { input: { nums: [3, 2, 0, -4], pos: 1 }, output: "true" },
      { input: { nums: [1, 2], pos: 0 }, output: "true" },
      { input: { nums: [1], pos: -1 }, output: "false" },
    ],
    hiddenTestcases: [
      { input: { nums: [], pos: -1 }, output: "false" },
      { input: { nums: [1, 3, 5, 7, 9], pos: 2 }, output: "true" },
    ],
  },
  {
    id: "dijkstra",
    _id: "69bd041c0669b885ce198b35",
    title: "Dijkstra's Algorithm",
    difficulty: "Hard",
    topic: "Graphs",
    description:
      "Given a weighted directed graph with n vertices numbered from 0 to n - 1, an edge list where each edge is [u, v, weight], and a source vertex start, find the shortest path from start to all other vertices.\n\nReturn an array of integers representing the shortest distance to each vertex 0 through n - 1. If a vertex is unreachable, return -1 for that vertex.",
    inputFormat:
      "n = number of vertices, edges = list of [u, v, weight], start = source vertex",
    outputFormat:
      "Return an array of integers representing the shortest distances from start to each vertex.",
    constraints:
      "1 ≤ n ≤ 10^3, 0 ≤ edges.length ≤ 10^4, 0 ≤ weight ≤ 10^4, 0 ≤ start < n",
    examples: [
      {
        input: "n = 4, edges = [[0,1,4],[0,2,1],[2,1,2],[1,3,1]], start = 0",
        output: "[0,3,1,4]",
      },
      {
        input: "n = 3, edges = [[0,1,5]], start = 0",
        output: "[0,5,-1]",
      },
    ],
    starterCode: `function solve(n, edges, start) {\n\n}`,
    testcases: [
      { input: { n: 4, edges: [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1]], start: 0 }, output: "[0,3,1,4]" },
      { input: { n: 3, edges: [[0, 1, 5]], start: 0 }, output: "[0,5,-1]" },
    ],
    hiddenTestcases: [
      { input: { n: 5, edges: [[0, 1, 2], [0, 2, 4], [1, 2, 1], [1, 3, 7], [2, 4, 3], [3, 4, 1]], start: 0 }, output: "[0,2,3,9,6]" },
    ],
  },
];

export function getImplementedProblemId(title) {
  if (!title) return null;
  const clean = String(title).trim().toLowerCase().replace(/\.+$/, '');

  if (
    clean === 'find maximum element' ||
    clean === 'find the maximum element in an array' ||
    clean === 'maximum element in an array'
  ) {
    return '69bd041c0669b885ce198b33';
  }

  if (
    clean === 'detect cycle in linked list' ||
    clean === 'detect cycle in a linked list'
  ) {
    return '69bd041c0669b885ce198b34';
  }

  if (
    clean === "dijkstra's algorithm" ||
    clean === "dijkstras algorithm" ||
    clean === 'dijkstra algorithm'
  ) {
    return '69bd041c0669b885ce198b35';
  }

  return null;
}

export function isProblemImplemented(title) {
  return Boolean(getImplementedProblemId(title));
}