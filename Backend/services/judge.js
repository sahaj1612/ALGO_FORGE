const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LANGUAGES = {
  javascript: {
    image: 'node:20-alpine',
    file: 'solution.js',
    compileAndRun: ['node', '/workspace/solution.js'],
  },
  python: {
    image: 'algoforge-sandbox:latest',
    file: 'solution.py',
    compileAndRun: ['python3', '/workspace/solution.py'],
  },
  java: {
    image: 'algoforge-sandbox:latest',
    file: 'Solution.java',
    compileAndRun: ['bash', '-c', 'javac -d /tmp /workspace/Solution.java && (java -cp /tmp Runner 2>/dev/null || java -cp /tmp Solution)'],
  },
  cpp: {
    image: 'algoforge-sandbox:latest',
    file: 'solution.cpp',
    compileAndRun: ['bash', '-c', 'g++ -O2 -std=c++17 /workspace/solution.cpp -o /tmp/solution && /tmp/solution'],
  },
  c: {
    image: 'algoforge-sandbox:latest',
    file: 'solution.c',
    compileAndRun: ['bash', '-c', 'gcc -O2 /workspace/solution.c -o /tmp/solution -lm && /tmp/solution'],
  },
};

function sortKeys(val) {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sortKeys);
  const sorted = {};
  for (const key of Object.keys(val).sort()) {
    sorted[key] = sortKeys(val[key]);
  }
  return sorted;
}

function normalize(value) {
  const text = String(value ?? '').trim();
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(sortKeys(parsed));
  } catch {
    return text.replace(/\r\n/g, '\n').trim();
  }
}

function matches(actual, expected) {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;
  if (a.toLowerCase() === e.toLowerCase()) return true;
  const numA = Number(a);
  const numB = Number(e);
  if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) < 1e-5) return true;
  return false;
}

function formatInput(input) {
  if (typeof input === 'object') {
    return JSON.stringify(input);
  }
  return String(input ?? '');
}

function wrapper(code, input, language) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); } catch {}
  }

  const isCycle = Boolean(parsed && typeof parsed === 'object' && 'nums' in parsed && 'pos' in parsed);
  const isDijkstra = Boolean(parsed && typeof parsed === 'object' && 'edges' in parsed && 'n' in parsed);

  // 1. JAVASCRIPT ADAPTER
  if (language === 'javascript') {
    return `
${code}

function __run_solution() {
  let input_data = ${JSON.stringify(input)};
  if (typeof input_data === 'string') {
    try { input_data = JSON.parse(input_data); } catch(e) {}
  }

  if (input_data && typeof input_data === 'object' && 'nums' in input_data && 'pos' in input_data) {
    function ListNode(val, next) {
      this.val = (val === undefined ? 0 : val);
      this.next = (next === undefined ? null : next);
    }
    const nums = input_data.nums || [];
    const nodes = nums.map(x => new ListNode(x));
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
    if (input_data.pos >= 0 && input_data.pos < nodes.length) nodes[nodes.length - 1].next = nodes[input_data.pos];
    const head = nodes.length > 0 ? nodes[0] : null;
    let res;
    if (typeof Solution === 'function') {
      const sol = new Solution();
      res = typeof sol.solve === 'function' ? sol.solve(head) : solve(head);
    } else {
      res = solve(head);
    }
    console.log(res ? "true" : "false");
    return;
  }

  if (input_data && typeof input_data === 'object' && 'edges' in input_data && 'n' in input_data) {
    const n = input_data.n;
    const edges = input_data.edges;
    const start = input_data.start || 0;
    let res;
    if (typeof Solution === 'function') {
      const sol = new Solution();
      res = typeof sol.solve === 'function' ? sol.solve(n, edges, start) : solve(n, edges, start);
    } else {
      res = solve(n, edges, start);
    }
    console.log(JSON.stringify(res).replace(/\\s+/g, ''));
    return;
  }

  let res;
  const isClassSol = typeof Solution === 'function';
  const instance = isClassSol ? new Solution() : null;
  const solver = (instance && typeof instance.solve === 'function') ? instance.solve.bind(instance) : (typeof solve === 'function' ? solve : null);

  if (!solver) {
    console.error("No solve function or Solution class found.");
    process.exit(1);
  }

  if (input_data && typeof input_data === 'object' && !Array.isArray(input_data)) {
    const vals = Object.values(input_data);
    try {
      res = solver.length > 1 ? solver(...vals) : solver(input_data);
    } catch(e) {
      res = solver(input_data);
    }
  } else if (Array.isArray(input_data)) {
    try {
      res = (solver.length > 1 && input_data.length === solver.length) ? solver(...input_data) : solver(input_data);
    } catch(e) {
      res = solver(input_data);
    }
  } else {
    res = solver(input_data);
  }

  if (typeof res === 'object') {
    console.log(JSON.stringify(res));
  } else {
    console.log(String(res));
  }
}

__run_solution();
`;
  }

  // 2. PYTHON ADAPTER
  if (language === 'python') {
    return `${code}

import json, sys

def __run_solution():
    input_data = ${JSON.stringify(input)}
    if isinstance(input_data, str):
        try:
            input_data = json.loads(input_data)
        except:
            pass

    if isinstance(input_data, dict) and 'nums' in input_data and 'pos' in input_data:
        nums = input_data.get('nums', [])
        pos = input_data.get('pos', -1)
        node_cls = globals().get('ListNode')
        if not node_cls:
            class ListNode:
                def __init__(self, val=0, next=None):
                    self.val = val
                    self.next = next
            node_cls = ListNode
        nodes = [node_cls(x) for x in nums]
        for i in range(len(nodes) - 1):
            nodes[i].next = nodes[i + 1]
        if 0 <= pos < len(nodes):
            nodes[-1].next = nodes[pos]
        head = nodes[0] if nodes else None
        if 'Solution' in globals():
            sol = Solution()
            res = sol.solve(head) if hasattr(sol, 'solve') else solve(head)
        else:
            res = solve(head)
        print("true" if res else "false")
        return

    if isinstance(input_data, dict) and 'edges' in input_data and 'n' in input_data:
        n = input_data['n']
        edges = input_data['edges']
        start = input_data.get('start', 0)
        if 'Solution' in globals():
            sol = Solution()
            res = sol.solve(n, edges, start) if hasattr(sol, 'solve') else solve(n, edges, start)
        else:
            res = solve(n, edges, start)
        print(json.dumps(res).replace(" ", ""))
        return

    if 'Solution' in globals():
        sol = Solution()
        if hasattr(sol, 'solve'):
            if isinstance(input_data, list):
                try:
                    res = sol.solve(*input_data)
                except:
                    res = sol.solve(input_data)
            elif isinstance(input_data, dict):
                res = sol.solve(**input_data)
            else:
                res = sol.solve(input_data)
            print(json.dumps(res) if not isinstance(res, str) else res)
            return

    if 'solve' in globals():
        if isinstance(input_data, list):
            try:
                res = solve(*input_data)
            except:
                res = solve(input_data)
        elif isinstance(input_data, dict):
            res = solve(**input_data)
        else:
            res = solve(input_data)
        print(json.dumps(res) if not isinstance(res, str) else res)
        return

if __name__ == '__main__':
    __run_solution()
`;
  }

  // 3. CPP ADAPTER
  if (language === 'cpp') {
    if (code.includes('int main(') || code.includes('void main(')) {
      return code;
    }

    let extra = '';
    let runnerBody = '';

    if (isCycle) {
      if (!code.includes('struct ListNode') && !code.includes('class ListNode')) {
        extra = `struct ListNode { int val; ListNode *next; ListNode(int x) : val(x), next(nullptr) {} };\n`;
      }
      const numsArr = parsed.nums || [];
      const numsStr = numsArr.join(', ');
      runnerBody = `
    std::vector<int> nums = { ${numsStr} };
    int pos = ${parsed.pos ?? -1};
    std::vector<ListNode*> nodes(nums.size());
    for (size_t i = 0; i < nums.size(); i++) nodes[i] = new ListNode(nums[i]);
    for (size_t i = 0; i + 1 < nums.size(); i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && pos < (int)nums.size()) nodes.back()->next = nodes[pos];
    ListNode* head = nums.empty() ? nullptr : nodes[0];
    Solution sol;
    bool res = sol.solve(head);
    std::cout << (res ? "true" : "false") << std::endl;
`;
    } else if (isDijkstra) {
      const edgesArr = parsed.edges || [];
      const edgesStr = edgesArr.map(e => `{${e.join(',')}}`).join(', ');
      runnerBody = `
    int n = ${parsed.n || 0};
    int start = ${parsed.start || 0};
    std::vector<std::vector<int>> edges = { ${edgesStr} };
    Solution sol;
    std::vector<int> dist = sol.solve(n, edges, start);
    std::cout << "[";
    for (size_t i = 0; i < dist.size(); i++) {
        std::cout << dist[i] << (i + 1 < dist.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
`;
    } else {
      const arr = Array.isArray(parsed) ? parsed : [];
      runnerBody = `
    std::vector<int> nums = { ${arr.join(', ')} };
    Solution sol;
    std::cout << sol.solve(nums) << std::endl;
`;
    }

    return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <queue>

${extra}
${code}

int main() {
${runnerBody}
    return 0;
}
`;
  }

  // 4. C ADAPTER
  if (language === 'c') {
    if (code.includes('int main(') || code.includes('void main(')) {
      return code;
    }

    let extra = '';
    let runnerBody = '';

    if (isCycle) {
      if (!code.includes('struct ListNode')) {
        extra = `struct ListNode { int val; struct ListNode *next; };\n`;
      }
      const numsArr = parsed.nums || [];
      const numsStr = numsArr.length ? numsArr.join(', ') : '0';
      runnerBody = `
    int nums[] = { ${numsStr} };
    int numsSize = ${numsArr.length};
    int pos = ${parsed.pos ?? -1};
    struct ListNode* nodes[numsSize > 0 ? numsSize : 1];
    for (int i = 0; i < numsSize; i++) {
        nodes[i] = (struct ListNode*)malloc(sizeof(struct ListNode));
        nodes[i]->val = nums[i];
        nodes[i]->next = NULL;
    }
    for (int i = 0; i < numsSize - 1; i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && pos < numsSize) nodes[numsSize - 1]->next = nodes[pos];
    struct ListNode* head = numsSize > 0 ? nodes[0] : NULL;
    int res = solve(head);
    printf("%s\\n", res ? "true" : "false");
`;
    } else if (isDijkstra) {
      const edgesArr = parsed.edges || [];
      const edgesStr = edgesArr.length ? edgesArr.map(e => `{${e.join(',')}}`).join(', ') : '{0,0,0}';
      runnerBody = `
    int n = ${parsed.n || 0};
    int start = ${parsed.start || 0};
    int edges[][3] = { ${edgesStr} };
    int edgesSize = ${edgesArr.length};
    int returnSize = 0;
    int* dist = solve(n, edges, edgesSize, start, &returnSize);
    printf("[");
    for (int i = 0; i < returnSize; i++) {
        printf("%d%s", dist[i], i + 1 < returnSize ? "," : "");
    }
    printf("]\\n");
`;
    } else {
      const arr = Array.isArray(parsed) ? parsed : [];
      const arrStr = arr.length ? arr.join(', ') : '0';
      runnerBody = `
    int nums[] = { ${arrStr} };
    int n = ${arr.length};
    printf("%d\\n", solve(nums, n));
`;
    }

    return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${extra}
${code}

int main() {
${runnerBody}
    return 0;
}
`;
  }

  // 5. JAVA ADAPTER
  if (language === 'java') {
    if (code.includes('public static void main(')) {
      return code;
    }

    let extra = '';
    let runnerBody = '';

    if (isCycle) {
      if (!code.includes('class ListNode')) {
        extra = `class ListNode { int val; ListNode next; ListNode(int x) { val = x; next = null; } }\n`;
      }
      const numsArr = parsed.nums || [];
      const numsStr = numsArr.length ? numsArr.join(', ') : '';
      runnerBody = `
        int[] nums = new int[]{ ${numsStr} };
        int pos = ${parsed.pos ?? -1};
        ListNode[] nodes = new ListNode[nums.length];
        for (int i = 0; i < nums.length; i++) nodes[i] = new ListNode(nums[i]);
        for (int i = 0; i < nums.length - 1; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0 && pos < nums.length) nodes[nums.length - 1].next = nodes[pos];
        ListNode head = nums.length > 0 ? nodes[0] : null;
        Solution sol = new Solution();
        boolean res = sol.solve(head);
        System.out.println(res ? "true" : "false");
      `;
    } else if (isDijkstra) {
      const edgesArr = parsed.edges || [];
      const edgesStr = edgesArr.map(e => `new int[]{${e.join(',')}}`).join(', ');
      runnerBody = `
        int n = ${parsed.n || 0};
        int start = ${parsed.start || 0};
        int[][] edges = new int[][]{ ${edgesStr} };
        Solution sol = new Solution();
        int[] dist = sol.solve(n, edges, start);
        System.out.println(Arrays.toString(dist).replaceAll("\\\\s", ""));
      `;
    } else {
      const arr = Array.isArray(parsed) ? parsed : [];
      runnerBody = `
        int[] nums = new int[]{ ${arr.join(', ')} };
        Solution sol = new Solution();
        System.out.println(sol.solve(nums));
      `;
    }

    return `import java.util.*;

${extra}
${code}

class Runner {
    public static void main(String[] args) {
${runnerBody}
    }
}
`;
  }

  return code;
}

async function execute({ code, input, language = 'javascript', timeLimit, memoryLimit = 256 }) {
  const config = LANGUAGES[language];
  if (!config) {
    return {
      verdict: 'server_error',
      error: `Unsupported language: ${language}`,
      time: 0,
      memory: null,
    };
  }

  const runDir = await fs.mkdtemp(path.join(os.tmpdir(), 'algoforge-'));
  const filePath = path.join(runDir, config.file);
  const wrappedCode = wrapper(code, input, language);

  try {
    await fs.writeFile(filePath, wrappedCode, 'utf8');

    const defaultLimit = language === 'java' ? 7000 : 4000;
    const timeoutMs = Math.min(Math.max(timeLimit || defaultLimit, 1000), 15000);
    const started = process.hrtime.bigint();

    const mount = `${runDir.replace(/\\/g, '/')}:/workspace:ro`;
    const inputStr = formatInput(input);

    const result = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--memory',
        `${memoryLimit}m`,
        '--cpus',
        '1.0',
        '--pids-limit',
        '64',
        '-v',
        mount,
        config.image,
        ...config.compileAndRun,
      ],
      {
        input: inputStr,
        encoding: 'utf8',
        timeout: timeoutMs,
        windowsHide: true,
      }
    );

    const time = Number(process.hrtime.bigint() - started) / 1e6;

    if (result.error?.code === 'ETIMEDOUT' || result.signal) {
      return {
        verdict: 'time_limit',
        error: `Execution exceeded the time limit (${(timeoutMs / 1000).toFixed(1)}s).`,
        time: Math.round(time),
        memory: null,
      };
    }

    if (result.error) {
      return {
        verdict: 'server_error',
        error: result.error.message,
        time: Math.round(time),
        memory: null,
      };
    }

    const output = (result.stdout || '').trim();
    const error = (result.stderr || '').trim();

    if (result.status !== 0) {
      const isCompError = /error:|javac|cannot find symbol|SyntaxError|IndentationError/i.test(error);
      const verdict = isCompError ? 'compilation_error' : 'runtime_error';
      return {
        verdict,
        error: error || 'Program exited with non-zero status.',
        time: Math.round(time),
        memory: null,
      };
    }

    return {
      verdict: 'accepted',
      output,
      time: Math.round(time),
      memory: null,
    };
  } finally {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { execute, matches, normalize, wrapper, LANGUAGES };
