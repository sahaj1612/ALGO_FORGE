import Editor from "@monaco-editor/react";
import { useState } from "react";
import axios from "axios";

export default function ProblemSolve() {

  const [code, setCode] = useState(
`function findMax(arr){
   let max = arr[0];
   for(let i=1;i<arr.length;i++){
       if(arr[i] > max) max = arr[i];
   }
   console.log(max);
}

findMax([2,5,1,9,3]);`
  );

  const [output, setOutput] = useState("");

  const runCode = async () => {
    const res = await axios.post(
      "http://localhost:5000/api/execute/run",
      { code }
    );
    setOutput(res.data.output);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 grid grid-cols-2 gap-8">

      {/* LEFT SIDE → PROBLEM */}
<div className="h-[85vh] overflow-y-auto pr-6">

  <h1 className="text-4xl font-bold text-red-500 mb-6">
    Find Maximum Element
  </h1>

  <p className="text-zinc-300 leading-relaxed mb-6">
    Given an array of integers <span className="text-red-400 font-semibold">arr</span>,
    your task is to find and return the maximum element present in the array.
  </p>

  {/* INPUT FORMAT */}
  <div className="mb-6">
    <h2 className="text-xl text-red-400 font-semibold mb-2">
      Input Format
    </h2>
    <p className="text-zinc-400">
      • First line contains integer <b>N</b> — size of array. <br/>
      • Second line contains <b>N space-separated integers</b>.
    </p>
  </div>

  {/* OUTPUT FORMAT */}
  <div className="mb-6">
    <h2 className="text-xl text-red-400 font-semibold mb-2">
      Output Format
    </h2>
    <p className="text-zinc-400">
      Print the maximum element in the array.
    </p>
  </div>

  {/* CONSTRAINTS */}
  <div className="mb-6">
    <h2 className="text-xl text-red-400 font-semibold mb-2">
      Constraints
    </h2>
    <p className="text-zinc-400">
      • 1 ≤ N ≤ 10<sup>5</sup> <br/>
      • -10<sup>9</sup> ≤ arr[i] ≤ 10<sup>9</sup>
    </p>
  </div>

  {/* EXAMPLES */}
  <div className="mb-6">
    <h2 className="text-xl text-red-400 font-semibold mb-3">
      Examples
    </h2>

    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-4">
      <p className="text-zinc-400">Input</p>
      <p className="text-green-400 font-mono">5</p>
      <p className="text-green-400 font-mono">2 5 1 9 3</p>

      <p className="text-zinc-400 mt-3">Output</p>
      <p className="text-yellow-400 font-mono">9</p>

      <p className="text-zinc-500 mt-2 text-sm">
        Explanation: Maximum element in the array is 9.
      </p>
    </div>

    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <p className="text-zinc-400">Input</p>
      <p className="text-green-400 font-mono">4</p>
      <p className="text-green-400 font-mono">7 3 11 6</p>

      <p className="text-zinc-400 mt-3">Output</p>
      <p className="text-yellow-400 font-mono">11</p>
    </div>

  </div>

</div>

      {/* RIGHT SIDE → CONSOLE */}
      <div className="h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">

  {/* TOP BAR */}
  <div className="flex justify-between items-center px-4 py-3 bg-zinc-900 border-b border-zinc-800">
    
    {/* Language Selector */}
    <select className="bg-zinc-800 text-white px-3 py-1 rounded-lg outline-none">
      <option>JavaScript</option>
      <option>Python</option>
      <option>Java</option>
      <option>C++</option>
    </select>

    {/* Buttons */}
    <div className="flex gap-3">
      <button
        onClick={runCode}
        className="bg-red-500 hover:bg-red-600 px-5 py-1.5 rounded-lg font-semibold"
      >
        Run
      </button>

      <button
        className="bg-green-600 hover:bg-green-700 px-5 py-1.5 rounded-lg font-semibold"
      >
        Submit
      </button>
    </div>

  </div>

  {/* CODE EDITOR */}
  <div className="flex-1">
    <Editor
      height="100%"
      theme="vs-dark"
      defaultLanguage="javascript"
      value={code}
      onChange={(value) => setCode(value)}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  </div>

  {/* INPUT BOX */}
  <div className="border-t border-zinc-800 p-3 bg-zinc-900">
    <p className="text-zinc-400 mb-1 text-sm">Custom Input</p>
    <textarea
      className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-green-400 font-mono h-20 outline-none"
      placeholder="Enter input here..."
    />
  </div>

  {/* OUTPUT CONSOLE */}
  <div className="border-t border-zinc-800 p-3 bg-black h-40 overflow-y-auto">
    <p className="text-zinc-400 mb-2 text-sm">Console Output</p>
    <div className="text-green-400 font-mono whitespace-pre-wrap">
      {output}
    </div>
  </div>

</div>

    </div>
  );
}