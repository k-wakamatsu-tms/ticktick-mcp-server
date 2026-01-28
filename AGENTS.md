# AGENTS.md (ticktick-mcp-server)

このリポジトリは Cloudflare Workers 上で動く TickTick 向け MCP (Model Context Protocol) サーバです。
主な技術: TypeScript (ESM), Wrangler, Hono, @modelcontextprotocol/sdk, zod, vitest。

## 重要ファイル/構成

- `src/index.ts`: Workers エントリ + MCP サーバ登録
- `src/tools/*.ts`: MCP tool 登録 (projects / tasks-crud / tasks-query / tasks-gtd)
- `src/ticktick/*`: TickTick API クライアント + 型 + 表示フォーマッタ
- `src/github-handler.ts`: GitHub OAuth フロー (Hono)
- `src/workers-oauth-utils.ts`: CSRF/state/cookie 等の OAuth セキュリティユーティリティ
- `wrangler.jsonc`: Workers 設定 (Durable Object / KV / port)
- `.dev.vars.example`: ローカル開発用の環境変数テンプレ
- `worker-configuration.d.ts`: Wrangler が生成する Env 型 (手編集しない)
- `test/*.test.ts`: vitest テスト

## セットアップ

```bash
npm install
cp .dev.vars.example .dev.vars
# .dev.vars を編集して値を入れる
```

注意:
- `.dev.vars` や秘密情報はコミットしない。
- Workers 本番用の secret は `wrangler secret put ...` で管理する。

## よく使うコマンド (build/lint/test)

このリポジトリは現状「専用 lint/format スクリプト」はありません。基本は TypeScript + vitest を回します。

### 開発サーバ

```bash
npm run dev
```

- `wrangler.jsonc` の `dev.port` は 8788。

### デプロイ

```bash
npm run deploy
```

### テスト (vitest)

全テスト:

```bash
npm test
# (= vitest run)
```

watch:

```bash
npm run test:watch
```

単体テスト (ファイル指定):

```bash
npm test -- test/client.test.ts
npm test -- test/formatters.test.ts
```

単体テスト (テスト名/パターン指定):

```bash
npm test -- -t "throws on non-ok response"
npm run test:watch -- -t "CSRF"
```

組み合わせ例 (ファイル + テスト名):

```bash
npm test -- test/client.test.ts -t "handles 204 No Content"
```

vitest を直接実行したい場合:

```bash
npx vitest run
npx vitest run test/client.test.ts
npx vitest run -t "Type definitions"
```

### 型チェック (推奨)

`tsconfig.json` は `noEmit: true` / `strict: true` です。リポジトリには型チェック用 script がないため、必要なら以下を使います。

```bash
npx tsc -p tsconfig.json --noEmit
```

### Wrangler 型生成

Env 型を更新したいとき:

```bash
npm run types
# (= wrangler types)
```

## コードスタイル/設計ガイド

### TypeScript/モジュール

- ESM (`package.json` の `"type": "module"`)。
- ローカル import は `.js` 拡張子で書く (例: `./utils.js`)。
- 型だけの import は `import type { ... }` を使う。
- `any` は極力避け、やむを得ない場合も範囲を最小化する (例: 外部ライブラリ境界のみ)。

### import の並び

- グルーピング: 外部依存 → ローカル → `import type` (同一グループ内で混ぜない/混ぜるのどちらでも良いが、既存ファイルに合わせる)。
- ローカルは相対パスを維持し、index まとめ import は乱用しない。

### フォーマット

- 既存コードに合わせる (2スペースインデント、セミコロンあり、複数行の末尾カンマあり)。
- 大きな自動整形を入れない (lint/formatter が未導入のため差分が膨らみやすい)。

### 命名

- ファイル名: `kebab-case.ts` (例: `workers-oauth-utils.ts`)。
- 関数/変数: `camelCase`、クラス/型: `PascalCase`、定数: `UPPER_SNAKE_CASE`。
- MCP tool 名: 文字列で `snake_case` (例: `"get_project_tasks"`)。
- MCP tool の入力パラメータ: `snake_case` (例: `project_id`)。
- 内部モデル/クライアント API: `camelCase` (例: `projectId`)。境界で明示的に変換する。

### 入力検証

- MCP tool の引数は `zod` でスキーマを定義する。
- 必須/任意の区別をスキーマで表し、内部では `undefined` を適切に扱う。

### エラーハンドリング

- HTTP ハンドラ (例: `src/github-handler.ts`) は失敗時に適切な `Response` を返す。
- OAuth 関連の「想定されるエラー」は `OAuthError` を使い、`toResponse()` で JSON エラーに落とす。
- 外部 API 失敗はメッセージに機密を含めない (token/secret を出さない)。
- `TickTickClient` の `request()` は `!res.ok` で例外を投げる設計。呼び出し側で握りつぶさず、必要なら境界で `Response` に変換する。

### セキュリティ/Workers 特有

- HTML に値を埋め込む場合は必ずサニタイズする (`src/workers-oauth-utils.ts` の `sanitizeText()` のように)。
- Cookie は `__Host-` 接頭辞、`HttpOnly` / `Secure` / `SameSite` / `Path` を維持する。
- CSP は既存の方針を維持し、緩める変更は避ける。

### 追加/変更時のチェックリスト

- 新しい MCP tool を追加したら:
  - `src/index.ts` で登録されているか
  - `src/tools/*` で zod 入力・戻り値の整形が一貫しているか
  - 可能なら `test/` に最小のテストを追加する
- Env 変数を追加/変更したら:
  - `worker-configuration.d.ts` を手で直さず、`npm run types` を実行
  - `.dev.vars.example` と `README.md` の変数一覧を更新

## ルールファイル (Cursor/Copilot)

- `.cursor/rules/`: 見つかりませんでした
- `.cursorrules`: 見つかりませんでした
- `.github/copilot-instructions.md`: 見つかりませんでした
