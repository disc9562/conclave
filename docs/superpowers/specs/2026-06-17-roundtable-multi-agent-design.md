# Roundtable 多 Agent 同窗討論 — 設計文件

- 日期：2026-06-17
- 狀態：草案待審
- 目標讀者：實作者（後續會轉成 implementation plan）

## 1. 目標

讓 **Claude + Codex + Grok** 三方在 DreamCoder 的**同一個對話視窗**裡互相討論，並且在使用者逐一授權後能**實際動手**（改檔、跑指令）。

### 明確需求（已與使用者確認）

1. 三方在同一對話串裡，看得到彼此的發言、能互相討論。
2. 全部走**訂閱制**，不走 API key（這是硬約束，決定了所有驅動方式）。
3. 預設 `discuss`（各自發表意見、零副作用）；由使用者逐一授權升到 `act`（可動手）。
4. 討論節奏由**一個主持人編排**，主持人 = Claude。

### 非目標（YAGNI）

- 不做自主輪流辯論（會跑飛、燒錢）。
- 不做 API key 路線（使用者明確排除）。
- 不做 Grok 瀏覽器自動化（已被 Grok Build CLI 取代，作廢）。
- 不做跨機器/雲端編排；本機單機。

## 2. 三方驅動方式（訂閱制）

| 參與者 | 驅動方式 | 認證 | 能動手 |
|--------|---------|------|--------|
| **Claude** | DreamCoder 內建引擎（沿用 `conversationService` 子行程） | 現有 Claude 設定 | ✅ |
| **Codex** | Codex CLI headless 子行程 | ChatGPT 訂閱（`codex login`） | ✅（plan / approval） |
| **Grok** | Grok Build CLI headless 子行程 | SuperGrok / X Premium+ 訂閱（OAuth） | ✅（plan-review） |

關鍵：Codex 與 Grok 都是**官方 agentic CLI**、都支援**訂閱 OAuth 登入**、都有 **headless / 非互動模式**與 **plan/approval** 機制 —— 結構對稱，可用同一個抽象包起來。

> 前提：使用者已在本機完成 `codex login` 與 Grok Build 的訂閱登入。本系統不負責登入流程，只負責驅動已登入的 CLI。
> Grok Build 為 2026/5 早期 beta，介面可能變動 —— 隔離在單一 participant 後面以降低衝擊。

## 3. 架構

### 3.1 核心抽象：`Participant` 介面

把三個異質後端藏在同一個合約後面，任一方壞掉只動一個檔。

```ts
type ParticipantId = 'claude' | 'codex' | 'grok'
type CapabilityMode = 'discuss' | 'act'

interface Participant {
  id: ParticipantId
  /**
   * 給定目前的共享對話 + 能力模式，回傳這位參與者的這一輪發言。
   * discuss：以非套用模式（plan / read-only）驅動，輸出純意見。
   * act：允許套用變更，但每個副作用動作走 permission 核可。
   */
  send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent>
}

type ParticipantEvent =
  | { kind: 'text'; text: string }            // 串流文字
  | { kind: 'proposal'; action: ToolAction }  // discuss 模式下的「提議」，不執行
  | { kind: 'action-request'; action: ToolAction } // act 模式下請求核可
  | { kind: 'done' }
```

三個實作：

- **`ClaudeParticipant`** — 重用現有 `conversationService` 的子行程機制（`src/server/services/conversationService.ts`）。
- **`CodexParticipant`** — spawn Codex CLI headless，把共享對話**整份重餵**為 prompt，收 stdout。
- **`GrokParticipant`** — spawn Grok Build CLI headless，同上。

> 設計決策：CLI participant **每輪無狀態重餵整份共享對話**，不維護各自的 CLI session。少一個會壞掉的狀態同步點；代價是 prompt 較長，可接受。

### 3.2 編排器（主持人 = Claude）

新增 server 端服務 `src/server/services/roundtableService.ts`：

1. 維護**共享對話記錄** `SharedTranscript`：有序的 `{ author: ParticipantId | 'user'; text; actions? }`。
2. 每輪呼叫**主持人決策**（一個帶「你是主持人」system prompt + structured output 的 Claude 呼叫）：

   ```ts
   type ModeratorDecision = {
     nextSpeaker: ParticipantId | 'done'
     promptForSpeaker?: string  // 可選：幫該參與者改寫/聚焦問題
     reason?: string            // 顯示給使用者的編排理由（system 行）
   }
   ```

3. 呼叫 `nextSpeaker` 的 `Participant.send()`，串流事件 → append 進記錄（標上 `author`）→ 推給前端渲染。
4. 迴圈直到 `done` 或撞到 `maxRounds` 上限（燒錢護欄，預設 12）。**使用者可隨時中斷。**

### 3.3 能力模式（`discuss` / `act`）

| 模式 | 行為 | 實作 |
|------|------|------|
| `discuss`（預設） | 只回文字；副作用動作以 `proposal` 事件**渲染成「提議」不執行** | CLI 以 plan-only / read-only 旗標驅動 |
| `act`（逐一授權） | 副作用動作發 `action-request` → 走**現有 permission 流程**核可後才執行 | 重用 `src/remote/remotePermissionBridge.ts` + CLI 各自的 plan-approval |

- 切換點：圓桌 UI 上每個參與者一個鎖 🔒 `discuss` / 🔓 `act`，**預設全鎖**。
- Grok / Codex 在 `discuss` 時必須以**非套用模式**驅動（雙保險：prompt 指示 + CLI plan/read-only 旗標），確保零副作用。
- 具體旗標於實作期對各 CLI 驗證確認。

### 3.4 資料模型改動

- 在 `UIMessage`（`desktop/src/types/chat.ts:233+`）與 server transcript 訊息型別加 **`author?: ParticipantId | 'user'`** 欄位。這是審計時已確認的缺口（目前只有 user/assistant，無法分辨「哪個 agent 說的」）。
- 重用 Teams 既有的 per-member 顏色 `AGENT_COLORS`（`desktop/src/stores/teamStore.ts`）。

### 3.5 UI

把目前仍是 mock 的 `desktop/src/pages/AgentTeams.tsx`（`:2` import `mockTeam`）做成真的圓桌畫面：
- 單一視窗、依 `author` 著色的氣泡。
- 主持人的編排決策（`reason`）以淡色 system 行呈現。
- 每個參與者的 🔒/🔓 能力切換。
- 中斷按鈕。

## 4. 資料流

```
使用者發話
  → roundtableService 接收，append 進 SharedTranscript（author: 'user'）
  → 主持人(Claude) 決策 nextSpeaker
  → Participant.send(transcript, mode) 串流事件
       ├ text      → append + 渲染（標 author）
       ├ proposal  → 渲染為「提議」（discuss）
       └ action-request → permission 核可 → 執行（act）
  → append 該參與者發言
  → 回到主持人決策（直到 done 或 maxRounds）
  → 主持人收斂 → 交還給使用者
```

## 5. 錯誤處理

- 任一 participant 失敗（CLI 未登入 / 子行程崩潰 / Grok beta 變動）：該輪標記為失敗、顯示原因、主持人略過該參與者繼續，**不中斷整場**。
- `maxRounds` 撞頂：停止並提示使用者可手動續。
- permission 被拒：該 action 不執行，以「使用者拒絕」記入對話，participant 可據此調整。

## 6. 分期（先把可靠的跑起來）

- **Phase 1 — 編排骨架**：`Participant` 介面 + `author` 欄位 + `roundtableService` 主持人迴圈 + **Claude & Codex** 兩個 participant + 能力模式。目標：兩方對話 + discuss/act 可跑。
- **Phase 2 — Grok**：接 `GrokParticipant`（Grok Build CLI），對稱套用 Phase 1 抽象。
- **Phase 3 — UI**：把 `AgentTeams.tsx` mock 做成真的圓桌畫面並接上 store。

## 7. 誠實的風險

1. **延遲**：三個異質後端循序跑 + 主持人每輪多一次決策呼叫 → 一輪偏慢。agentic CLI 純討論回合用最輕量/單發模式，別每句都跑整輪 agent。
2. **Grok Build beta 變動**：隔離在 `GrokParticipant`，壞了只動一檔。
3. **訂閱前提**：Codex 需 ChatGPT 訂閱、Grok 需 SuperGrok / X Premium+，且都需事先登入。
4. **燒錢/跑飛**：`maxRounds` 上限 + 使用者隨時中斷。

## 8. 受影響 / 重用的既有檔案

| 檔案 | 用途 |
|------|------|
| `src/server/services/conversationService.ts` | Claude participant 重用子行程機制 |
| `src/server/ws/handler.ts` | runtime 設定、訊息通道 |
| `src/remote/remotePermissionBridge.ts` | act 模式的核可流程 |
| `desktop/src/types/chat.ts` | 加 `author` 欄位 |
| `desktop/src/stores/chatStore.ts` | 訊息 → UI 映射（已有 teammate 偵測可參考） |
| `desktop/src/stores/teamStore.ts` | 重用 `AGENT_COLORS` |
| `desktop/src/pages/AgentTeams.tsx` | mock → 真實圓桌 UI |
| `src/server/services/roundtableService.ts` | **新增** 編排器 |
| `src/server/services/participants/*.ts` | **新增** 三個 participant 實作 |
