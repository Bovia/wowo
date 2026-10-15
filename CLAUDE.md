@AGENTS.md

# Portfolio Hub 子项目约定

本仓库会被 [portfolio-hub](https://github.com/Bovia/portfolio-hub) 聚合展示。

## portfolio.md

- 根目录维护 `portfolio.md`，字段见 Hub：`docs/portfolio-contract.md`
- 根目录 `portfolio.md` 建议写 `published: true`；未 ready 时改为 `false`

## 演示模式（有登录时必做）

- Hub iframe 会附加 `?embed=1`
- 须支持：无账号直接进入，登录仅用于云同步
- 详见 Hub：`docs/guest-demo-mode.md`
- Next.js 模板：`docs/spoke-templates/nextjs/`

## 不要

- 不要在 portfolio.md 加 `guestDemo` 等 Hub 专用字段
- 不要用共享 demo 账号写数据库
