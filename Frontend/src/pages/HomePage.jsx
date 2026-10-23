import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Code2,
  Sparkles,
  Users,
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { problems } from "../data/problems";
import "../index.css";

const demoCode = `// Find two numbers that add up to target
vector<int> twoSum(nums, target) {
  unordered_map<int, int> seen;
  for (int i = 0; i < nums.size(); i++) {
    int need = target - nums[i];
    if (seen.count(need))
      return {seen[need], i};
    seen[nums[i]] = i;
  }
  return {};
}`;

function highlightLine(line) {
  const pieces = line.split(/(\/\/.*|\b(?:vector|unordered_map|int|for|if|return)\b|\b\d+\b|twoSum|"[^"]*")/g);
  return pieces.map((part, index) => {
    let kind = "";
    if (part.startsWith("//")) kind = "comment";
    else if (/^(vector|unordered_map|int|for|if|return)$/.test(part)) kind = "keyword";
    else if (/^\d+$/.test(part)) kind = "number";
    else if (part === "twoSum") kind = "function";
    else if (part.startsWith('"')) kind = "string";
    return <span className={kind} key={`${index}-${part}`}>{part}</span>;
  });
}

function CodePreview() {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    let timeout;
    let position = 0;
    let deleting = false;
    const tick = () => {
      if (!deleting) {
        position += 1;
        setVisibleChars(position);
        if (position >= demoCode.length) {
          deleting = true;
          timeout = window.setTimeout(tick, 1800);
          return;
        }
        timeout = window.setTimeout(tick, 33);
      } else {
        position = 0;
        setVisibleChars(0);
        deleting = false;
        timeout = window.setTimeout(tick, 500);
      }
    };
    timeout = window.setTimeout(tick, 700);
    return () => window.clearTimeout(timeout);
  }, []);

  const lines = demoCode.slice(0, visibleChars).split("\n");
  return (
    <div className="af-editor" aria-label="Live typing code preview">
      <div className="af-editor-top">
        <div className="af-window-dots" aria-hidden="true"><i /><i /><i /></div>
        <div className="af-file-name"><Code2 size={15} /> <span>two-sum.cpp</span></div>
        <span className="af-language">C++ 17 <span aria-hidden="true">⌄</span></span>
      </div>
      <div className="af-code-area" aria-live="off">
        {lines.map((line, index) => (
          <div className="af-code-line" key={index}>
            <span className="af-line-number">{index + 1}</span>
            <code>{highlightLine(line)}{index === lines.length - 1 && <span className="af-caret" />}</code>
          </div>
        ))}
      </div>
      <div className="af-console">
        <div className="af-console-label"><span className="af-run-icon">▶</span> TEST RESULTS <span className="af-console-divider">·</span> 4 cases</div>
        <div className="af-pass"><span /> All passed</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("algoforge-theme") || "dark");

  useEffect(() => {
    localStorage.setItem("algoforge-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const practice = () => requireAuth(
    () => navigate("/practice"),
    "Please sign in with your Google account first to start practicing problems."
  );
  const explore = () => requireAuth(
    () => navigate("/explore"),
    "Please sign in with your Google account first to explore all problems."
  );

  const featured = problems.slice(0, 3);

  return (
    <div className={`af-home theme-${theme}`}>
      <SiteHeader
        homeTheme={theme}
        onToggleTheme={() => setTheme(current => current === "dark" ? "light" : "dark")}
      />

      <main className="af-shell">
        <section className="af-hero">
          <div className="af-hero-copy">
            <Motion.div className="af-eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="af-live-dot" /> YOUR NEXT INTERVIEW ADVANTAGE
            </Motion.div>
            <Motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              Think sharper.<br /><span>Code stronger.</span>
            </Motion.h1>
            <Motion.p className="af-lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }}>
              Build real problem-solving skills with curated challenges, a focused coding workspace, and instant feedback that helps you improve with every attempt.
            </Motion.p>
            <div className="af-hero-actions">
              <button className="af-button af-button-primary" onClick={practice}>Start practicing <ArrowRight size={17} /></button>
              <button className="af-button af-button-secondary" onClick={explore}>Explore problems <ArrowUpRight size={16} /></button>
            </div>
            <div className="af-social-proof">
              <div className="af-avatar-marquee" role="img" aria-label="Learner initials A, R, and M">
                <div className="af-avatar-group" aria-hidden="true"><span>A</span><span>R</span><span>M</span></div>
              </div>
              <span><strong>Join fellow learners</strong> leveling up together</span>
              <Sparkles className="af-proof-sparkle" size={15} />
            </div>
          </div>

          <Motion.div className="af-demo-wrap" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.7 }}>
            <CodePreview />
          </Motion.div>
        </section>

        <section className="af-stats" aria-label="Platform highlights">
          <div><strong>Curated</strong><span>Practice problems</span></div>
          <div><strong>5</strong><span>Languages supported</span></div>
          <div><strong>Every day</strong><span>A chance to improve</span></div>
        </section>

        <section className="af-problems" id="problems">
          <div className="af-section-heading">
            <div><span className="af-section-kicker">A GOOD PLACE TO START</span><h2>Pick up where you grow</h2><p>Handpicked challenges to help you build momentum.</p></div>
            <button className="af-text-link" onClick={explore}>Browse problems <ArrowRight size={15} /></button>
          </div>
          <div className="af-problem-grid">
            {featured.map((problem, index) => (
              <Motion.button className="af-problem-card" key={problem.id} onClick={explore} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4 }}>
                <div className="af-card-tags"><span>{problem.topic}</span><span className={`af-difficulty difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span></div>
                <h3>{problem.title}</h3>
                <p>{problem.description.split("\n")[0]}</p>
                <div className="af-card-bottom"><span><Users size={14} /> Try this challenge</span><ArrowDownRight size={16} /></div>
              </Motion.button>
            ))}
          </div>
        </section>
      </main>

      <footer className="af-footer"><div><span className="af-footer-brand"><Code2 size={16} /> AlgoForge</span><span>Sharpen your thinking, one problem at a time.</span></div><span>Made for curious minds <Sparkles size={14} /></span></footer>
    </div>
  );
}
