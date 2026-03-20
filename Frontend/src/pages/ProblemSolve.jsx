import { useParams, useNavigate } from "react-router-dom";
import { problems } from "../data/problems";
import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

export default function ProblemSolve() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [verdict, setVerdict] = useState("");

  const [user, setUser] = useState(null);

  // ⭐ LEFT RIGHT RESIZE
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  // ⭐ EDITOR CONSOLE RESIZE
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [isDragging, setIsDragging] = useState(false);

  const STARTER = `function solve(arr){

}`;

  useEffect(() => {

    const token = localStorage.getItem("token");

    fetch(`http://localhost:5000/api/problems/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {

        setProblem(data);

        // ⭐ VERY IMPORTANT LINE
        setCode(data?.starterCode || STARTER);

      });

  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => { });
  }, []);

  // ⭐ LEFT RIGHT DRAG
  const startResize = () => setIsResizing(true);
  const stopResize = () => setIsResizing(false);

  const onResize = (e) => {
    if (!isResizing) return;

    const newWidth = (e.clientX / window.innerWidth) * 100;

    if (newWidth > 25 && newWidth < 75) {
      setLeftWidth(newWidth);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", onResize);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", onResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  // ⭐ EDITOR CONSOLE DRAG
  const startDrag = () => setIsDragging(true);
  const stopDrag = () => setIsDragging(false);

  const onDrag = (e) => {
    if (!isDragging) return;

    const newHeight = window.innerHeight - e.clientY - 40;

    if (newHeight > 150 && newHeight < 500) {
      setConsoleHeight(newHeight);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [isDragging]);

  const runCode = async () => {

    setVerdict("");
    setOutput("");

    if (!code || code.trim() === STARTER.trim()) {
      setOutput("❗ Please write your solution before running");
      return;
    }

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        code,
        problemId: id
      })
    });

    const data = await res.json();
    setOutput(data.result);
  };

  const submitCode = async () => {

  if (!code || code.trim() === STARTER.trim()) {
    setOutput("❗ Please write your solution before submitting");
    return;
  }

  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      code,
      problemId: id
    })
  });

  const data = await res.json();

  setVerdict(data.verdict);
  setOutput(data.results);   // ⭐ CORRECT
};

  if (!problem) {
  return (
    <div className="h-screen bg-black text-white flex items-center justify-center">
      Loading Problem...
    </div>
  );
}


  return (
    <div className="bg-black text-white h-screen overflow-hidden">

      {/* NAVBAR */}
      <div className="flex justify-between items-center px-6 py-3 border-b border-red-500">
        <h1 onClick={() => navigate("/dashboard")}
          className="text-2xl text-red-500 font-bold cursor-pointer">
          AlgoForge
        </h1>

        {user && (
          <div onClick={() => navigate("/profile")} className="flex gap-3 cursor-pointer">
            <img src={user.picture} className="w-10 h-10 rounded-full border border-red-500" />
            <div>
              <p>{user.name}</p>
              <p className="text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex h-[calc(100vh-60px)]">

        {/* LEFT PANEL */}
  <div
    style={{ width: `${leftWidth}%` }}
    className="h-full overflow-y-auto p-6 border-r border-red-500"
  >

    <h1 className="text-4xl text-red-500 font-bold mb-6">
      {problem.title}
    </h1>

    <p className="text-zinc-300 mb-6 whitespace-pre-line">
      {problem.description}
    </p>

    <h3 className="text-red-400 font-semibold">Input Format</h3>
    <p className="text-zinc-400 mb-4 whitespace-pre-line">
      {problem.inputFormat}
    </p>

    <h3 className="text-red-400 font-semibold">Output Format</h3>
    <p className="text-zinc-400 mb-4 whitespace-pre-line">
      {problem.outputFormat}
    </p>

    <h3 className="text-red-400 font-semibold">Constraints</h3>
    <p className="text-zinc-400 mb-6 whitespace-pre-line">
      {problem.constraints}
    </p>

    <h3 className="text-red-400 font-semibold mb-3">Examples</h3>

    {problem.examples?.map((ex, i) => (
      <div key={i} className="bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-800">
        <p className="text-sm text-zinc-400">Input</p>
        <p className="text-green-400 font-mono whitespace-pre-wrap">
          {ex.input}
        </p>

        <p className="text-sm text-zinc-400 mt-3">Output</p>
        <p className="text-yellow-400 font-mono whitespace-pre-wrap">
          {ex.output}
        </p>
      </div>
    ))}

        </div>

        {/* ⭐ VERTICAL DRAG */}
        <div
          onMouseDown={startResize}
          className="w-0.5 bg-red-500 cursor-col-resize"
        />

        {/* RIGHT PANEL */}
        <div style={{ width: `${100 - leftWidth}%` }} className="flex flex-col">

          {/* EDITOR */}
          <div style={{ height: `calc(100% - ${consoleHeight}px)` }}>
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="javascript"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{ minimap: { enabled: false } }}
            />
          </div>

          {/* ⭐ HORIZONTAL DRAG */}
          <div
            onMouseDown={startDrag}
            className="h-0.5 bg-red-500 cursor-row-resize"
          />

          {/* CONSOLE */}
          <div style={{ height: consoleHeight }} className="bg-zinc-950 flex flex-col">

            {/* BUTTON SAME ROW */}
            <div className="p-3 flex gap-3 border-b border-zinc-800">
              <button
                onClick={runCode}
                className="bg-red-500 px-5 py-2 rounded"
              >
                Run
              </button>

              <button
                onClick={submitCode}
                className="bg-green-600 px-5 py-2 rounded"
              >
                Submit
              </button>
            </div>

            {verdict && (
              <div className={`p-2 text-center font-bold 
                ${verdict === "Accepted"
                  ? "text-green-400"
                  : "text-red-400"}`}>
                {verdict}
              </div>
            )}

            {/* OUTPUT */}
            <div className="flex-1 p-3 overflow-auto text-green-400 font-mono">

              {Array.isArray(output) ? (

                output.map((t, i) => (

                  <div key={i} className="mb-3 border-b border-zinc-800 pb-2">

                    <div className="text-zinc-400 font-bold">
                      Testcase {i + 1}
                    </div>

                    <div>Input: {JSON.stringify(t.input)}</div>
                    <div>Expected: {t.expected}</div>
                    <div>Got: {t.got}</div>

                  </div>

                ))

              ) : (

                output || "Output :"

              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}