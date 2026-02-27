from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, asdict
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Kawan Melayu API", version="2.0")

# Allow local dev + simple hosting (adjust as you deploy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

# Serve frontend (root)
app.mount("/static", StaticFiles(directory=".", html=False), name="static")


@app.get("/")
def index():
    return FileResponse("index.html")


@dataclass
class GameState:
    confidence: int = 100
    fluency: int = 0
    level: int = 1
    location: str = "Mamak Stall"
    vocabulary: list[str] = None

    def __post_init__(self):
        if self.vocabulary is None:
            self.vocabulary = []


class ChatRequest(BaseModel):
    provider: str = Field(..., description="openrouter|groq|gemini|openai")
    model: str = Field("auto")
    user_text: str
    history: list[dict[str, Any]] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)
    # Optional: allow frontend to pass key (not recommended)
    api_key: Optional[str] = None


class ChatResponse(BaseModel):
    ui_text: str
    raw_text: str
    action: dict[str, Any]
    state: dict[str, Any]


PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "env_key": "OPENROUTER_API_KEY",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1/chat/completions",
        "env_key": "GROQ_API_KEY",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "env_key": "GEMINI_API_KEY",
        "is_gemini": True,
    },
    "openai": {
        "base_url": "https://api.openai.com/v1/chat/completions",
        "env_key": "OPENAI_API_KEY",
    },
}


def build_system_prompt(state: GameState) -> str:
    if state.level <= 3:
        ratio_rule = "台灣華語為主、馬來文為輔（約 70%：30%）"
    elif state.level <= 6:
        ratio_rule = "馬來文為主、台灣華語為輔（約 70%：30%，可加入口語語氣詞：lah、meh）"
    else:
        ratio_rule = "幾乎全馬來文（約 90–100%），台灣華語只在必要時補充 1 句"

    return f"""你是馬來文（Bahasa Melayu）的情境教學導師，場景在馬來西亞嘛嘛檔（Mamak Stall）。

【硬性語言規則（非常重要）】
- 你只能使用兩種語言：①台灣華語（繁體中文）②馬來文。
- 禁止使用英文（包含解釋、例句、標題、條列、註解、縮寫都不可以）。
- 教學節奏：從 0 開始，初期以台灣華語為主、馬來文輔佐；隨著玩家等級提升，逐漸改成馬來文為主、台灣華語輔佐。
- 本回合語言比例：{ratio_rule}

【教學策略】
1. 回覆要短、可立即拿來講，避免長篇理論。
2. 每回合最多教 1–2 個新詞（新詞用馬來文呈現，台灣華語解釋）。
3. 依玩家狀態調整難度並鼓勵他開口。

【輸出格式（固定）】
- 先輸出教學引導/對話內容（依上方比例）。
- 最後一行一定要輸出 action（只能這個 JSON，不要加其他文字）：
<action>{{"confdelta":0,"fludelta":10,"leveldelta":0,"location":null,"vocabadded":""}}</action>

【目前玩家狀態】
- 信心值 confidence={state.confidence}/100
- 流利度 fluency={state.fluency}/100
- 等級 level=Lv.{state.level}
- 地點 location={state.location}
- 已學詞彙 vocabulary={', '.join(state.vocabulary)}
"""


_THINK_RE = re.compile(r"<\s*think\s*>[\s\S]*?<\/\s*think\s*>", re.IGNORECASE)
_ACTION_BLOCK_RE = re.compile(r"<\s*action\s*>([\s\S]*?)<\/\s*action\s*>", re.IGNORECASE)
_ACTION_MALFORM_RE = re.compile(r"\baction\s*\"?\s*({[\s\S]*?})", re.IGNORECASE)


def extract_ui_text(raw: str) -> str:
    t = str(raw or "")
    t = _THINK_RE.sub("", t)
    t = _ACTION_BLOCK_RE.sub("", t)

    # Strip trailing malformed action-like lines aggressively
    t = t.replace("\r\n", "\n")
    for _ in range(5):
        before = t
        t = re.sub(r"\n?\s*\baction\s*\"?\s*{[\s\S]*?}\s*$", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\n?\s*<\s*action\s*>[\s\S]*$", "", t, flags=re.IGNORECASE)
        t = t.rstrip()
        if t == before:
            break
    return t.strip()


def parse_action(raw: str) -> dict[str, Any]:
    t = str(raw or "")

    m = _ACTION_BLOCK_RE.search(t)
    if m and m.group(1):
        s = m.group(1).strip().replace("```json", "").replace("```", "")
        try:
            return json.loads(s)
        except Exception:
            pass

    m = _ACTION_MALFORM_RE.search(t)
    if m and m.group(1):
        try:
            return json.loads(m.group(1))
        except Exception:
            pass

    # last resort: find any json with expected keys
    for c in re.findall(r"{[\s\S]*?}", t):
        if not re.search(r"confdelta|fludelta|leveldelta|location|vocabadded", c, flags=re.IGNORECASE):
            continue
        try:
            return json.loads(c)
        except Exception:
            continue

    return {"confdelta": 0, "fludelta": 0, "leveldelta": 0, "location": None, "vocabadded": ""}


def apply_action(state: GameState, action: dict[str, Any]) -> GameState:
    try:
        if isinstance(action.get("confdelta"), (int, float)):
            state.confidence += int(action["confdelta"])
        if isinstance(action.get("fludelta"), (int, float)):
            state.fluency += int(action["fludelta"])
        if isinstance(action.get("leveldelta"), (int, float)):
            state.level += int(action["leveldelta"])

        loc = action.get("location")
        if loc is not None and str(loc).strip() != "":
            state.location = str(loc)

        vocab = action.get("vocabadded")
        if vocab is not None:
            for w in str(vocab).split(","):
                w = w.strip()
                if w and w not in state.vocabulary:
                    state.vocabulary.append(w)
    except Exception:
        pass

    # Clamp & level up
    state.confidence = max(0, min(100, state.confidence))
    state.fluency = max(0, state.fluency)
    while state.fluency >= 100:
        state.level += 1
        state.fluency -= 100

    return state


async def call_llm(provider: str, model: str, api_key: str, messages: list[dict[str, Any]]) -> str:
    if provider not in PROVIDERS:
        raise HTTPException(400, "Unknown provider")

    meta = PROVIDERS[provider]
    base_url = meta["base_url"]
    is_gemini = bool(meta.get("is_gemini"))

    if provider == "openrouter" and model == "auto":
        model = "meta-llama/llama-3.3-70b-instruct:free"

    url = base_url
    headers = {"Content-Type": "application/json"}
    if is_gemini:
        url = f"{base_url}?key={api_key}"
    else:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {"model": model, "messages": messages, "temperature": 0.7}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text)
        data = r.json()

    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(502, "Bad upstream response")


def resolve_api_key(req: ChatRequest) -> str:
    meta = PROVIDERS.get(req.provider)
    if not meta:
        raise HTTPException(400, "Unknown provider")

    # Prefer env key
    env_key = meta["env_key"]
    k = (os.getenv(env_key) or "").strip()
    if k:
        return k

    # Fallback to request api_key (not recommended)
    if req.api_key and req.api_key.strip():
        return req.api_key.strip()

    raise HTTPException(400, f"Missing API key: set {env_key} or provide api_key")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    state = GameState(**{**{"confidence": 100, "fluency": 0, "level": 1, "location": "Mamak Stall", "vocabulary": []}, **(req.state or {})})

    system = {"role": "system", "content": build_system_prompt(state)}

    history = req.history or []
    # Keep only a few turns; server is source of truth
    history = history[-12:]

    messages = [system, *history, {"role": "user", "content": req.user_text}]

    api_key = resolve_api_key(req)
    raw_text = await call_llm(req.provider, req.model, api_key, messages)

    action = parse_action(raw_text)
    state = apply_action(state, action)

    ui_text = extract_ui_text(raw_text)

    return ChatResponse(
        ui_text=ui_text,
        raw_text=raw_text,
        action=action,
        state=asdict(state),
    )
