# cleanness

コード品質を **CLEAN** の5軸で計測する Agent Skill / プラグインです。

| 軸 | 意味 |
|----|------|
| **C**ohesive | 凝集性 — 一つの明確な目的にまとまっているか |
| **L**oosely coupled | 疎結合 — 依存が少なく変更が局所に収まるか |
| **E**ncapsulated | カプセル化 — 内部が隠れ、境界で不変条件を守っているか |
| **A**ssertive | 断定的 — 意図がはっきりし、推測的な実装が少ないか |
| **N**onredundant | 非冗長 — 重複・死んだコードが少ないか |

各軸を 1–5 で採点し、根拠付きの CLEAN レポートを出します。  
[Agent Skills](https://agentskills.io) 形式の `SKILL.md` なので、**Claude Code** と **Grok Build** の両方から同じマーケットプレイスで使えます。

## Install

### Claude Code

```text
/plugin marketplace add nahcnuj/cleanness
/plugin install cleanness@cleanness
```

### Grok Build

```bash
grok plugin marketplace add nahcnuj/cleanness
grok plugin install cleanness --trust
```

TUI では `/marketplace` から追加・インストールもできます。

公式 xAI カタログへの掲載 PR: https://github.com/xai-org/plugin-marketplace/pull/570  
（マージ後は `grok plugin install cleanness --trust` だけでインストールできます）

### 手動（プロジェクトローカル）

`plugins/cleanness/skills/cleanness/` を `.claude/skills/cleanness/` または `.grok/skills/cleanness/` にコピー（またはシンボリックリンク）してください。

## Usage

インストール後:

```text
/cleanness
/cleanness src/auth
/cleanness the diff for this PR
```

または「CLEAN でコード品質を測って」「凝集性と疎結合を見て」などと依頼すると、スキルが自動で選ばれます。

出力はスコープ、総合スコア、5軸の表、根拠（`path:line`）、優先度の高い改善案です。

## Layout

```text
.claude-plugin/marketplace.json   # Claude Code 用カタログ
.grok-plugin/marketplace.json     # Grok Build 用カタログ
plugins/cleanness/
  .claude-plugin/plugin.json
  .grok-plugin/plugin.json
  skills/cleanness/
    SKILL.md
    references/clean-rubric.md
```

## License

MIT
