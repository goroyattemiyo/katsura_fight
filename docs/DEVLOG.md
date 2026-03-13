# カツラ・スタック・パズル DX — 開発ログ

文書ID: KATSURA-DEVLOG
最終更新: 2026-03-13

---

## ログ運用ルール

- 各エントリは日付降順（新しいものが上）
- エントリ追加時は `---` で区切り、先頭に追記する
- 議論結果・対立点の結論・技術的負債は必ず記録する
- コード変更時はファイル名と変更概要を併記する

---

## 2026-03-13 / Sprint 1-1: プロジェクト基盤構築

---

## 2026-03-13 / v1.0.2: バグ精査 + 障害物/ボム方針審議

### 概要

v1.0.1 の全ファイル精査により6件のバグを発見。障害物/ボムの画像方針について3つの対立点を議論し結論を出した。

### Synapse Council 議論サマリー

#### 召喚専門家

| ID | 名前 | 召喚理由 |
|---|---|---|
| qa_reviewer | QA Reviewer | コード全行精査によるバグ発見 |
| systems_architect | Systems Architect | 構造的問題と依存関係バグの分析 |
| implementer | Implementer | 実装上の地雷と修正コスト見積もり |
| uiux_designer | UI/UX Designer | 障害物/ボムの視覚的識別性評価 |

#### バグ一覧（6件）

| ID | 深刻度 | バグ | ファイル | 修正方針 |
|---|---|---|---|---|
| BUG-1 | 🟡中 | wig_obstacle.webpが無視されている | data.js, game.js | MANIFESTに追加、ハイブリッド方式 |
| BUG-2 | 🔴高 | data.jsでCanvas未初期化のままapplyLogicalSize() | data.js, game.js | data.jsから削除、boot()内で呼ぶ |
| BUG-3 | 🟡中 | _startGameがasyncだがawaitされない | ui_screens.js | AudioManager.initSync()に分離 |
| BUG-4 | 🟡中 | エフェクト画像のImageが非同期デコード | game.js | Canvasオブジェクトをそのまま保持 |
| BUG-5 | 🟢低 | 落下物フィルタの二重実行 | update.js | update.js側のフィルタを削除 |
| BUG-6 | 🟢低 | ゲーム開始時にポインタ位置がリセットされない | ui_screens.js | startGame()内でpointerXをリセット |

#### 対立点と結論（3件）

| ID | 対立点 | 結論 | 根拠 |
|---|---|---|---|
| DP-1 | 障害物/ボム画像方針 | ハイブリッド（専用画像優先、なければエフェクト生成） | wig_obstacle.webp既存。bombはPhase2で専用画像化 |
| DP-2 | エフェクト画像の保持形式 | Canvasオブジェクトのまま保持 | Imageへの変換は非同期リスク。Canvasは即時利用可能 |
| DP-3 | AudioManager初期化方式 | 同期/非同期分離（initSync） | iOS Safariのジェスチャーコンテキスト問題回避 |

#### 技術的負債（追加分）

| 負債内容 | 理由 | 返済時期 | リスク |
|---|---|---|---|
| bomb専用画像が未作成 | Phase1ではエフェクト生成で代替 | Phase 2 | ブラウザ間で見た目微差 |

### 変更ファイル

| ファイル | 操作 | 概要 |
|---|---|---|
| game.js | 修正 | BUG-2: boot()内でapplyLogicalSize呼出。BUG-4: Canvas保持。AudioManager.initSync追加 |
| data.js | 修正 | BUG-1: wig_obstacleをMANIFEST追加。BUG-2: applyLogicalSize()削除 |
| ui_screens.js | 修正 | BUG-3: async廃止、initSync使用。BUG-6: pointerXリセット |
| update.js | 修正 | BUG-5: 二重フィルタ削除 |
| docs/DEVLOG.md | 追記 | 本議論ログ |


### 概要

元データ（単一HTML）をクリーン再設計し、モジュラーアーキテクチャの骨格を構築した。

### Synapse Council 議論サマリー

#### 召喚専門家

| ID | 名前 | 召喚理由 |
|---|---|---|
| concept_designer | Concept Designer | 世界観・コアコンセプト設計 |
| roguelite_designer | Roguelite Designer | リプレイ性設計 |
| game_balance_designer | Game Balance Designer | 数値バランス基盤 |
| systems_architect | Systems Architect | モジュラーアーキテクチャ設計 |
| uiux_designer | UI/UX Designer | グローバルUI品質 |
| qa_reviewer | QA Reviewer | バグ予測 |
| implementer | Implementer | 実装現実性 |

#### バグ予測マトリクス（13件）

| ID | カテゴリ | バグ | 深刻度 | 対策 |
|---|---|---|---|---|
| A-1 | 状態管理 | リセット漏れ | 🔴高 | GameState.reset() + INITIAL_STATE |
| A-2 | 状態管理 | スポーンタイマー二重起動 | 🟡中 | SpawnController クラス化 |
| A-3 | 状態管理 | ゲームオーバー多重発火 | 🔴高 | state enum + 冒頭ガード |
| B-1 | 当たり判定 | スタック高でキャッチ領域膨張 | 🔴高 | 最上部 WIG_H のみ判定 |
| B-2 | 当たり判定 | レスポンシブ座標破綻 | 🟡中 | 固定論理サイズ + 双方向スケール |
| B-3 | 当たり判定 | 同フレーム複数キャッチ | 🟡中 | 最上部連続マッチで対応 |
| C-1 | 描画 | 画像ロード未完了 | 🟡中 | Promise.all + ローディング画面 |
| C-2 | 描画 | カットイン中ゲームオーバー | 🟡中 | clearEffects() |
| C-3 | 描画 | ctx.filter パフォーマンス | 🟡中 | 別画像 or キャッシュ |
| D-1 | 音声 | AudioContext suspended | 🟡中 | async/await resume |
| D-2 | 音声 | Oscillator リーク | 🟡中 | onended disconnect |
| E-1 | 入力 | タッチ+マウス二重発火 | 🟡中 | Pointer Events 統一 |
| E-2 | 入力 | canvas外瞬間移動 | 🟡中 | document リスナー + lerp |

#### 対立点と結論（6件）

| ID | 対立点 | 結論 | 根拠 |
|---|---|---|---|
| D-1 | マッチ判定範囲 | 最上部連続一致（可変長） | 中間消しは状態複雑化。Phase1外 |
| D-2 | 難易度基準 | 経過時間ベース＋スコア補正 | 急速難化リスク回避 |
| D-3 | 障害物解除 | ボムアイテムのみ（Phase1） | 自然消滅は状態増。ボムは1タイプ追加 |
| D-4 | プレイヤー移動 | 高速lerp（0.4） | 即応性と瞬間移動防止の両立 |
| D-5 | 名前空間 | window.KS 単一＋サブオブジェクト | script順序依存下の最適解 |
| D-6 | コンボ方式 | 時間制限コンボ（5秒窓） | 連続マッチは最上部方式と相性悪い |

#### 技術的負債

| 負債内容 | 理由 | 返済時期 | リスク |
|---|---|---|---|
| ES Modules未使用 | ユーザー指定の読み込み順を尊重 | Phase 2 COUNCIL審議 | ファイル間依存が暗黙的 |
| アセットがプレースホルダー | Phase 1は機能優先 | Phase 2 | リリースビルドに使えない |
| 多言語対応なし | Phase 1スコープ外 | Phase 3 | グローバルリリースまでに必須 |
| 音声が合成音のみ | Phase 1スコープ外 | Phase 2 | 品質感に影響 |
| 中間マッチ（連鎖消し）未実装 | Phase 1スコープ外 | Phase 3 | ゲーム深度の上限が早い |
| Pointer Events未対応ブラウザのフォールバック | 主要ブラウザのみ対応 | Phase 2 | 古いAndroid WebViewで動かない |
| 障害物の自然消滅システム | ボムのみ実装 | Phase 2 | 障害物溜まりすぎ場面あり |

### 変更ファイル

| ファイル | 操作 | 概要 |
|---|---|---|
| docs/DEVLOG.md | 新規 | 開発ログ |
| docs/GDD.md | 新規 | ゲームデザインドキュメント |
| index.html | 新規 | エントリーポイント（CSS＋スクリプト読み込み） |
| game.js | 新規 | KS名前空間、GameStateクラス、アセットローダー |
| data.js | 新規 | バランステーブル、定数、初期値 |
| enemies.js | 新規 | FallingWigクラス、SpawnController |
| blessings.js | 新規 | Phase2拡張ポイント（スタブ） |
| systems.js | 新規 | 当たり判定、スコアリング、コンボ、難易度制御 |
| nodemap.js | 新規 | Phase2拡張ポイント（スタブ） |
| ui.js | 新規 | HUD描画、コンボ表示 |
| ui_screens.js | 新規 | タイトル/ゲームオーバー/ローディング画面 |
| update.js | 新規 | メインupdate関数 |
| render.js | 新規 | メイン描画関数 |


---

## 2026-03-13 / v1.0.3 — 画像透過対応＋obstacle画像方針変更

### 変更内容
- 全画像を透過webpに差し替え（背景黒の問題を解消）
- `wig_obstacle.webp` が透過差替え時に削除されたため、DP-1結論を更新
  - 旧: obstacle=専用画像あり、bomb=エフェクト生成
  - 新: **obstacle/bomb ともにエフェクト生成に統一**
- `data.js`: IMAGE_MANIFEST から obstacle エントリを削除
- `index.html`: キャッシュバスター v1.0.2 → v1.0.3

### 技術的判断根拠
- `game.js` の `EffectImageGenerator.generate()` にフォールバック実装済み
- 存在しないファイルを MANIFEST に残すと 404 エラー + ロード遅延
- 統一方針により管理対象画像が減り、保守性向上

### 技術的負債（更新）
| ID | 内容 | 返済時期 | リスク |
|----|------|----------|--------|
| TD-1 | ES modules未使用 | Phase 2 | 中 |
| TD-2 | プレースホルダーアセット | Phase 2 | 低 |
| TD-3 | 多言語未対応 | Phase 3 | 低 |
| TD-4 | 合成音声のみ | Phase 2 | 低 |
| TD-5 | ~~bomb専用画像なし~~ → obstacle/bombともにエフェクト生成 | Phase 2で専用画像検討 | 低 |


---

## 2026-03-13 / v1.0.6 — マッチ発生率改善、NEXTプレビュー追加

### Synapse Council 議論結果
- **問題**: ウィッグ3種ランダムでスタック上端3連続マッチの確率が極めて低い（体感5%以下）
- **対立点**: 全スタック走査（案C） vs スポーンバイアス（案A）
- **結論**: Phase 1 では案A（スポーンバイアス）を採用。案CはPhase 2に先送り

### 変更内容
- `data.js`: SPAWN_BIAS_RATE = 0.40 追加、STACK_OFFSET 22→30 に拡大
- `enemies.js`: SpawnController にバイアスロジック追加、次ウィッグ事前決定
- `ui.js`: NEXTプレビューボックス追加、スタックバー位置調整
- `index.html`: キャッシュバスター v1.0.6

### 技術的負債（追加）
| ID | 内容 | 返済時期 | リスク |
|----|------|----------|--------|
| TD-6 | 全スタック走査マッチ未実装 | Phase 2 | 中（ゲーム性に影響） |
