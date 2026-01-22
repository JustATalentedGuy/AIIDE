# 🧠 AI Learning Coach IDE

> **An AI-augmented VS Code extension that observes *****how***** you code and gives pedagogical feedback — not solutions.**

This project is designed for **DSA / Competitive Programming learners** (LeetCode, Codeforces, etc.) who want to improve *thinking*, *problem-solving habits*, and *conceptual clarity*, not just pass test cases.

---

## ✨ What Makes This Different?

Most tools:

* Check correctness
* Give hints or full solutions
* Ignore the coding process

**AI Learning Coach IDE** instead:

* Observes **1000+ micro-interactions** while you code
* Analyzes **temporal behavior** (planning, churn, rewrites)
* Uses **AST-level signals** to detect conceptual mistakes
* Produces **structured pedagogical feedback**

> 💡 It answers *“How am I thinking?”*, not *“What is the answer?”*

---

## 🧱 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎮 LAYER 1: VS Code Events → Raw Interactions (TypeScript)        │
│  eventCapture.ts + signalDeriver.ts                                 │
└─────────────────────────────────────────────────────────────────────┘
                           ↓ JSON (~2KB)
┌─────────────────────────────────────────────────────────────────────┐
│  🐍 LAYER 2: Python Agent Processing                                 │
│  agent.py + backend/ (signals → patterns → LLM)                     │
└─────────────────────────────────────────────────────────────────────┘
                           ↓ JSON
┌─────────────────────────────────────────────────────────────────────┐
│  🖥️ LAYER 3: Communication (Stdio IPC)                              │
│  agentManager.ts + backend.ts                                       │
└─────────────────────────────────────────────────────────────────────┘
                           ↓ Webview Data
┌─────────────────────────────────────────────────────────────────────┐
│  📱 LAYER 4: Feedback UI                                             │
│  ui/feedbackPanel.ts                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 What the IDE Observes

### 1️⃣ Behavioral Signals (Event-Based)

* Edit churn (insertions vs deletions)
* Undo/redo density
* Save frequency
* Idle vs active time (planning ratio)
* Cursor jumps (mental backtracking)
* Abandoned attempts

### 2️⃣ AST-Derived Signals (Conceptual)

* Boundary error density (off-by-one patterns)
* `range(len(arr))` usage
* Suspicious comparisons (`i == -1`, `len(arr) == 0`)
* Repeated data-structure rewrites

### 3️⃣ Temporal Learning Signals

* Repeated mistakes across sessions
* Persistent misconceptions
* Improvement / regression trends

---

## 🎓 Example Feedback Output

The model always returns **structured JSON**, rendered into a clean UI panel:

* **Observed Strengths**
* **Areas to Investigate** (with evidence)
* **Why It Matters** (DSA relevance)
* **Reflective Questions** (no hints!)

> ❌ No solutions
> ❌ No test case spoilers
> ✅ Pure learning feedback

---

## 🚀 End-to-End Flow (30 Seconds)

1. Paste a problem (LeetCode / CF)
2. Code naturally (events captured silently)
3. Trigger **“AI Learning IDE: Request Feedback”**
4. Python agent analyzes behavior + AST
5. LLM generates pedagogical feedback
6. Webview renders insights

---

## 📁 Repository Structure

```
ai-learning-ide/
└── vscode-extension/
    ├── src/
    │   ├── extension.ts
    │   ├── agentManager.ts
    │   ├── backend.ts
    │   ├── eventCapture.ts
    │   ├── signalDeriver.ts
    │   ├── problemContext.ts
    │   └── ui/feedbackPanel.ts
    ├── python-agent/
    │   ├── agent.py
    │   └── backend/
    │       ├── schemas.py
    │       ├── signal_processor.py
    │       ├── session_manager.py
    │       ├── llm_orchestrator.py
    │       └── feedback_generator.py
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

---

## 🧰 Prerequisites

You need:

* **Node.js** (LTS)
* **Python 3.9+** (in PATH)
* **VS Code**
* **Groq API Key**

Optional (for packaging):

```bash
npm install -g @vscode/vsce
```

---

## ⚡ Quick Start (Development Mode)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/ai-learning-ide.git
cd ai-learning-ide/vscode-extension
```

---

### 2️⃣ Install Node Dependencies

```bash
npm install
```

---

### 3️⃣ Create Python Virtual Environment

From `vscode-extension/`:

```bash
python -m venv .extension-agent
```

Activate it:

**Windows (PowerShell)**

```bash
.\.extension-agent\Scripts\Activate.ps1
```

**macOS / Linux**

```bash
source .extension-agent/bin/activate
```

Install Python dependencies:

```bash
pip install --upgrade pip
pip install groq pydantic python-dotenv fastapi uvicorn
```

---

### 4️⃣ Configure Environment Variables

Create a `.env` file inside `vscode-extension/`:

```
GROQ_API_KEY=your_groq_api_key_here
```

> `.env` is gitignored. Use `.env.example` as reference.

---

### 5️⃣ Build the Extension

```bash
npm run compile
```

---

### 6️⃣ Run the Extension

1. Open `vscode-extension/` in VS Code
2. Press **F5** (Run → Start Debugging)
3. A new **Extension Development Host** opens

---

## 🎮 Available Commands

Open Command Palette (`Ctrl+Shift+P`):

* **AI Learning IDE: Paste Problem**
* **AI Learning IDE: Request Feedback**
* **AI Learning IDE: Reset Session**
* **AI Learning IDE: Show Problem**

---

## 🧠 How the Pipeline Works (Short)

1. VS Code events captured (`eventCapture.ts`)
2. Signals derived (`signalDeriver.ts`)
3. JSON sent to Python agent (`agent.py`)
4. Signals → patterns → learner context
5. Groq LLM generates structured feedback
6. UI renders insights (`feedbackPanel.ts`)

All computation is **local**, except the LLM call.

---

## 📦 Packaging the Extension

### A️⃣ Generate a `.vsix` File

```bash
vsce package
```

Install manually:

```bash
code --install-extension ai-learning-ide-0.0.1.vsix
```

Users still need:

* Python 3.9+
* `.extension-agent` venv
* `.env` with Groq key

---

### B️⃣ VS Code Marketplace (Optional)

```bash
vsce login <publisher-id>
vsce publish
```

---

## 🛠️ Troubleshooting

**Python not found / ENOENT**

* Ensure venv exists
* Ensure correct Python path

**Groq API errors**

* Check `GROQ_API_KEY`
* Check network

**Pydantic validation errors**

* Signal schema mismatch (usually dev bug)

---

## 🎯 Project Philosophy

* IDEs are **event-driven systems**
* Learning is **temporal**, not snapshot-based
* LLMs need **structured context**, not raw logs
* Good feedback ≠ giving solutions

---

## 📜 License

MIT License (recommended for learning + research projects)

---

## 🙌 Final Note

If you are serious about improving at DSA:

> **This tool trains your thinking — not your memory.**

Happy learning 🚀
