import React from 'react';
import { Check } from 'lucide-react';

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 1, end.x, end.y].join(' ');
}

export default function SolvedStatsCard({
  solvedStats = {
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
    totalSolved: 0,
    totalProblems: 0,
    attempting: 0,
  },
}) {
  const {
    easy = { solved: 0, total: 0 },
    medium = { solved: 0, total: 0 },
    hard = { solved: 0, total: 0 },
    totalSolved = 0,
    totalProblems = 0,
    attempting = 0,
  } = solvedStats;

  // Full 360-degree Circle Geometry
  const cx = 140;
  const cy = 140;
  const radius = 102;
  const strokeWidth = 10;

  // 3 balanced segments forming a full 360° circle (108° each with 12° gaps)
  // Easy: lower-left to mid-left
  const easyStart = 126;
  const easyEnd = 234;
  const easySpan = easyEnd - easyStart; // 108 deg
  const easyLen = radius * (easySpan * Math.PI) / 180;
  const easyRatio = easy.total > 0 ? Math.min(1, easy.solved / easy.total) : 0;
  const easyOffset = easyLen * (1 - easyRatio);

  // Medium: upper-left to upper-right (across top)
  const medStart = 246;
  const medEnd = 354;
  const medSpan = medEnd - medStart; // 108 deg
  const medLen = radius * (medSpan * Math.PI) / 180;
  const medRatio = medium.total > 0 ? Math.min(1, medium.solved / medium.total) : 0;
  const medOffset = medLen * (1 - medRatio);

  // Hard: upper-right to lower-right (across bottom right)
  const hardStart = 6;
  const hardEnd = 114;
  const hardSpan = hardEnd - hardStart; // 108 deg
  const hardLen = radius * (hardSpan * Math.PI) / 180;
  const hardRatio = hard.total > 0 ? Math.min(1, hard.solved / hard.total) : 0;
  const hardOffset = hardLen * (1 - hardRatio);

  const easyPath = describeArc(cx, cy, radius, easyStart, easyEnd);
  const medPath = describeArc(cx, cy, radius, medStart, medEnd);
  const hardPath = describeArc(cx, cy, radius, hardStart, hardEnd);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 rounded-2xl bg-zinc-900 p-7 sm:p-8 text-white border border-zinc-800 shadow-2xl w-full h-full">
      {/* Left side: Full Circle Gauge Chart */}
      <div className="relative flex flex-col items-center justify-center shrink-0 w-[280px] h-[280px]">
        <svg viewBox="0 0 280 280" className="w-full h-full overflow-visible">
          {/* Easy Background Track (Bright Green Translucent) */}
          <path
            d={easyPath}
            fill="none"
            stroke="rgba(0, 230, 153, 0.22)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Easy Active Progress (Bright Vivid Green) */}
          {easy.solved > 0 && (
            <path
              d={easyPath}
              fill="none"
              stroke="#00e699"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${easyLen} ${easyLen}`}
              strokeDashoffset={easyOffset}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Medium Background Track (Bright Yellow Translucent) */}
          <path
            d={medPath}
            fill="none"
            stroke="rgba(255, 184, 0, 0.22)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Medium Active Progress (Bright Vivid Yellow) */}
          {medium.solved > 0 && (
            <path
              d={medPath}
              fill="none"
              stroke="#ffb800"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${medLen} ${medLen}`}
              strokeDashoffset={medOffset}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Hard Background Track (Bright Red Translucent) */}
          <path
            d={hardPath}
            fill="none"
            stroke="rgba(255, 59, 92, 0.22)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Hard Active Progress (Bright Vivid Red) */}
          {hard.solved > 0 && (
            <path
              d={hardPath}
              fill="none"
              stroke="#ff3b5c"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${hardLen} ${hardLen}`}
              strokeDashoffset={hardOffset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center content inside Full Circle: Always shows Solved stats */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              {totalSolved}
            </span>
            <span className="text-lg sm:text-xl text-zinc-400 font-medium ml-0.5">
              /{totalProblems}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#00e699] font-semibold mt-1.5">
            <Check size={16} className="stroke-[3]" />
            <span className="text-white font-semibold">Solved</span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-400 mt-2 font-medium">
            {attempting} Attempting
          </div>
        </div>
      </div>

      {/* Right side: Difficulty Cards */}
      <div className="flex flex-col gap-3.5 w-full sm:w-52">
        {/* Easy Card */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-950/20 px-5 py-3.5 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-950/30 transition-all shadow-sm">
          <span className="text-sm font-bold text-[#00e699]">Easy</span>
          <span className="text-lg font-bold text-white mt-0.5">
            {easy.solved}/{easy.total}
          </span>
        </div>

        {/* Medium Card */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-amber-950/20 px-5 py-3.5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-950/30 transition-all shadow-sm">
          <span className="text-sm font-bold text-[#ffb800]">Med.</span>
          <span className="text-lg font-bold text-white mt-0.5">
            {medium.solved}/{medium.total}
          </span>
        </div>

        {/* Hard Card */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-rose-950/20 px-5 py-3.5 border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-950/30 transition-all shadow-sm">
          <span className="text-sm font-bold text-[#ff3b5c]">Hard</span>
          <span className="text-lg font-bold text-white mt-0.5">
            {hard.solved}/{hard.total}
          </span>
        </div>
      </div>
    </div>
  );
}
