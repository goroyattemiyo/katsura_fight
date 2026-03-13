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

