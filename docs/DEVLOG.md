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


---

## 2026-03-13 / v1.0.7 — コロベイニキBGM実装

### 変更内容
- `blessings.js`: Web Audio API オシレーターでコロベイニキ（ロシア民謡）BGMを実装
  - メロディ: square wave、ベースライン: triangle wave
  - BPM 140、ループ再生
  - 音量: 0.08（控えめ設定）
- `ui_screens.js`: ゲーム開始時にBGM再生開始
- `game.js`: ゲームオーバー時にBGM停止
- `index.html`: キャッシュバスター v1.0.7

### 著作権根拠
- 「コロベイニキ」は1843年作曲のロシア民謡（パブリックドメイン）
- メロディデータは楽譜から独自にコード化
- 音源はWeb Audio APIで独自生成（録音物の利用なし）
- 任天堂等のテトリス音源・アレンジは一切使用していない

### 技術的判断
- `blessings.js`（元スタブ）にBGM機能を配置（読み込み順4番目、game.jsのAudioManager初期化後）
- 新ファイル追加を回避しスコープ厳守


---

## 2026-03-13 / v1.0.8 — BGMレベル連動テンポ変化

### 変更内容
- `blessings.js`: レベル別BPMテーブル追加
  - Lv.1: 130 BPM → Lv.7: 220 BPM（段階的加速）
  - ループ開始時に現在レベルのBPMを取得して適用
- `index.html`: キャッシュバスター v1.0.8

### BPMテーブル
| Level | BPM | 体感 |
|-------|-----|------|
| 1 | 130 | ゆったり |
| 2 | 140 | 標準 |
| 3 | 150 | やや速い |
| 4 | 165 | 速い |
| 5 | 180 | かなり速い |
| 6 | 200 | 焦る |
| 7 | 220 | パニック |


---

## 2026-03-13 / v1.1.0 — ジョーク演出強化

### Synapse Council 議論結果
- ジョークゲームにはやりすぎ感が必要。中途半端が一番ダサい
- 演出は派手だがスムーズであること（チープに見せない）

### 変更内容
- **スクリーンシェイク**: キャッチ時（微震）、マッチ時（中震）、障害物（強震）
- **パーティクルシステム**: キャッチ（白い粒）、マッチ（金+虹色爆発+星）、ボム（橙爆発）
- **フローティングテキスト**: +10、+300、COMBO x2、BLOCKED!、BOOM!
- **背景ウィッグ**: 半透明カツラが雪のようにゆっくり降る
- **スタック揺れ**: 上に行くほど大きく揺れる（バランス感の演出）
- **ゲームオーバー吹き飛ばし**: 全カツラが四方に飛散
- 全ファイル: data.js, game.js, systems.js, render.js, update.js, ui_screens.js

### ファイルサイズ確認
実装後要確認（systems.js, render.js が増量）


---

## 2026-03-13 / v1.1.1 — SE強化 + ゲームオーバー吹き飛ばし修正

### バグ修正
- **triggerGameOver のパーティクルが即消滅**: clearEffects() が particles をクリアしていた
  - 修正: clearEffects から particles/bgWigs のクリアを除外
  - 修正: clearEffects を吹き飛ばしパーティクル追加の前に実行

### SE強化
- キャッチ: ポップな上昇音（400→800Hz sine）
- マッチ: 華やかな上昇和音（C5-E5-G5-C6 アルペジオ）
- 障害物: 不快な低ブザー（150Hz sawtooth + 155Hz square ビート）
- ボム: 爆発音（200→40Hz sawtooth 下降 + 80→20Hz square）
- ゲームオーバー: 下降音階（C5→C3 段階的下降）


---

## 2026-03-13 / v1.1.2 — カートゥーンSE全面実装 + ゲームオーバー吹き飛ばし修正

### Synapse Council SE品質審査結果
- 全員一致: v1.1.1のSEは「普通のゲーム」レベル。ジョークとして不十分
- カートゥーン的・バラエティ番組的な過剰さが必要

### SE設計（採用）
| SE | 技法 | 音のイメージ |
|----|------|-------------|
| キャッチ | 周波数バウンス 600→1200→400→700 | 「ポコッ」 |
| マッチ | 5音アルペジオ C5-E5-G5-C6-E6 + 高周波キラキラ 3k→6k→2kHz | 華やかファンファーレ |
| 障害物 | デチューン sawtooth+square 140/148Hz + sine 80→30Hz | 「ブブー…ドスン」 |
| ボム | sawtooth 300→30Hz下降 + ノイズバースト + square 600→100Hz | 「ドカーン！パーン」 |
| ゲームオーバー | sawtooth 400→100Hz + LFOビブラート6Hz + sine 300→80Hz | 「ワーワーワー…ポテッ」 |
| コンボ | triangle (500+combo*100)Hz 上昇 | テンション上がる |

### バグ修正
- game.js clearEffects() から particles/bgWigs クリアを除外
- triggerGameOver: clearEffects→パーティクル追加の順に修正
- 同時発音ガード追加（MAX_NODES: 12）

### ファイルサイズ
- game.js: 要確認（SE追加で増量）


---

## 2026-03-13 / v1.1.3 — モバイル音声修正

### バグ
- **スマホで音が出ない**: AudioContext.resume() のPromise完了前に initialized が false のまま
- モバイルブラウザは AudioContext を suspended 状態で生成する仕様

### 修正内容
- `initSync`: resume()呼び出し直後に楽観的に `initialized = true` を設定
  - ジェスチャーコンテキスト内で呼ばれるためブラウザは即座に許可する
- `_canPlay`: suspended状態でも再度resume()を試行してから再生を許可
  - resume直後の一瞬のsuspended状態でも音が鳴るようにする

### 根拠
- iOS Safari / Android Chrome ともにユーザーインタラクション内でのAudioContext操作を要求
- initSync はTAP TO STARTのpointerdownイベント→handleClick→_startGame経由で呼ばれるため条件を満たす
- resume()のPromise完了を待つとジェスチャーコンテキストが失われるリスクがある（特にiOS）


---

## 2026-03-13 / v1.1.4 — ゲームオーバー演出フェーズ追加

### 問題
- triggerGameOver直後にGAMEOVER画面（黒オーバーレイ）が表示され、カツラ吹き飛ばし演出が見えない

### 修正
- 新状態 `GAMEOVER_ANIM` を追加（約2.5秒間）
- フロー: PLAYING → GAMEOVER_ANIM（吹き飛ばし演出）→ GAMEOVER（結果画面）
- GAMEOVER_ANIM中: ゲーム画面描画継続 + 徐々に暗くなるオーバーレイ + GAME OVERテキストフェードイン
- パーティクル全消滅 or タイマー切れで GAMEOVER に遷移

### 変更ファイル
- game.js: GameStates に GAMEOVER_ANIM 追加、triggerGameOver の遷移先変更
- update.js: GAMEOVER_ANIM 状態のティック処理
- render.js: GAMEOVER_ANIM 状態の描画（暗転 + テキストフェードイン）
