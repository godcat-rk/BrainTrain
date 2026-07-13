# BrainTrain

> **⚠️ Status (2026-07-13): このリポジトリは「プロトタイプ v1」として凍結。**
> 新規ゲーム追加・機能開発はここでは行わない（GitHub Pages のデモは存置）。
> 後継の iOS 版 (Expo + TypeScript) の方針は [docs/direction-2026-07.md](docs/direction-2026-07.md)、
> 凍結時点の現状調査は [docs/status-2026-07.md](docs/status-2026-07.md) を参照。

脳トレゲームを収録するWebサイト。バックエンドなしの純粋フロントエンド SPA。

## Development Commands

```bash
npm run dev       # 開発サーバー起動 (localhost:5173)
npm run build     # プロダクションビルド → dist/
npm run preview   # ビルド成果物をローカルでプレビュー
docker compose up # Docker でローカル動作確認 (port 3000)
```

**注意**: Node.js v22.11.0 環境では Vite 6 を使用すること。Vite 7/8 は v22.12+ 要件のため動作しない。

## Project Structure

```
src/
├── components/       # 共通UIコンポーネント (NavBar など)
├── db/
│   └── index.ts      # Dexie.js (IndexedDB) スキーマ定義
├── pages/
│   ├── Home.tsx      # ゲーム一覧
│   ├── Dashboard.tsx # 成長グラフ・プレイ履歴
│   └── games/        # ゲームごとのページ
│       └── Memory.tsx
├── types/
│   └── index.ts      # PlayRecord / GameConfig 型定義
├── App.tsx           # ルーティング (BrowserRouter)
└── index.css         # Tailwind v4 + デザイントークン
```

## Architecture

### データ永続化

スコアは **IndexedDB (Dexie.js)** に保存。`src/db/index.ts` を参照。

```
PlayRecord { id, gameId, timestamp, score, metadata }
```

`score` は「高いほど良い」に正規化。ゲーム固有データは `metadata` に格納。
新しいゲームを追加してもスキーマ変更は不要。

### ルーティング

| パス | コンポーネント |
|------|--------------|
| `/` | ホーム（ゲーム一覧） |
| `/games/memory` | 神経衰弱 |
| `/dashboard` | ダッシュボード |

### スタイリング

Tailwind CSS v4（`@tailwindcss/vite` プラグイン方式）。設定ファイル不要。
デザイントークンは `src/index.css` の `@theme` ブロックで管理。

```css
--color-brand-primary: #6c63ff   /* メインパープル */
--color-brand-secondary: #ff6584 /* アクセントピンク */
```

## Code Conventions

- **コンポーネント**: PascalCase、props は interface で型定義
- **hooks**: `use` プレフィックス（例: `useMemoryGame`）
- **状態管理**: ローカル state のみ（グローバルストアなし）
- **immutability**: オブジェクトは必ず新しく作る、既存を変更しない
- **エラー処理**: `unknown` 型で受け取り、`instanceof Error` で絞り込む

## Adding a New Game

1. `src/pages/games/NewGame.tsx` を作成
2. `src/App.tsx` にルートを追加: `<Route path="/games/new-game" element={<NewGame />} />`
3. `src/pages/Home.tsx` の `GAMES` 配列にエントリを追加
4. プレイ完了時に `db.playRecords.add({ gameId, score, metadata })` で保存

## Branch Strategy

Git Flow ベースのブランチ戦略。

### 主要ブランチ

| ブランチ | 用途 | 直接 push |
|---------|------|----------|
| `main` | 本番リリース済みコード。常に動作する状態を保つ | 禁止（PR のみ） |
| `develop` | 開発の統合ブランチ。次のリリース候補 | 禁止（PR のみ） |

### 補助ブランチ

| プレフィックス | 例 | 分岐元 | マージ先 |
|--------------|-----|-------|---------|
| `feature/` | `feature/calc-game` | `develop` | `develop` |
| `fix/` | `fix/dashboard-meta` | `develop` | `develop` |
| `hotfix/` | `hotfix/score-calc` | `main` | `main` + `develop` |
| `release/` | `release/v1.1.0` | `develop` | `main` + `develop` |

### 運用ルール

- **新ゲーム・新機能**: `develop` から `feature/ゲーム名` を切って開発 → PR で `develop` へ
- **バグ修正**: `develop` から `fix/内容` を切る
- **本番障害**: `main` から `hotfix/内容` を切り、修正後に `main` と `develop` 両方にマージ
- **リリース**: `develop` が安定したら `release/vX.Y.Z` を作成 → `main` にマージしてタグを打つ
- コミットメッセージは `feat:`, `fix:`, `refactor:` など Conventional Commits に準拠

### バージョニング

セマンティックバージョニング（MAJOR.MINOR.PATCH）を採用。  
ゲームを 1 本追加するごとに MINOR を上げる目安。

## Key Decisions

- **バックエンドなし**: スコアは IndexedDB のみ。ログイン・同期機能は持たない
- **1人プレイのみ**: オンライン対戦は実装しない
- **スコアは汎用スキーマ**: ゲームごとに意味が異なるため `metadata` で柔軟に対応
