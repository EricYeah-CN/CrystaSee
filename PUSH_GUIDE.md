# GitHub 推送操作说明

## 网络诊断（2026-11-26 22:20，本机实测）

| 通道 | 结果 | 可用性 |
|---|---|---|
| `https://api.github.com` | HTTP 200，0.67 s（走 `127.0.0.1:8522` 代理） | 可用 |
| `https://github.com` 网页 | CONNECT 超时，12 s 无响应 | 不可用 |
| Git HTTPS `git ls-remote` | `CONNECT tunnel failed, response 502` | 不可用 |
| SSH `git@github.com:22` | 握手成功，返回 `Permission denied (publickey)` | **通道打通，缺密钥** |
| `codeload.github.com` | HTTP 301 | 可用 |

结论：**HTTPS Git 推送仍不通，SSH 通道已通**。本机已生成 `~/.ssh/id_ed25519`（指纹 `SHA256:II5Q4MPCC0ZbMAH8+xaQ1rA+wPmVBWI+mrMTBADwuS8`），只需把公钥添加到 GitHub 账户即可走 SSH 推送。若网页端仍打不开，可改用 PAT + `api.github.com` 路径（见文末）。

当前仍未执行任何推送。

## 0. 先确认仓库内容

```bash
cd "C:/Users/Eric Ye/WorkBuddy/2026-11-10-15-40-14/github-crystasee-v13"
git status --short
```

确认没有 `*.ttf`、`*.exe`、`*.dll`、`node_modules/`、`dist/` 被纳入。

## 1. 设置提交身份（本机 Git 全局身份为空）

```bash
git config user.name  "Yang Ye"
git config user.email "<你的 GitHub 注册邮箱>"
```

> 若希望不暴露邮箱，可用 GitHub no-reply 邮箱：`<数字ID>+<用户名>@users.noreply.github.com`。

## 2. 提交并打标签

```bash
git add -A
git commit -m "CrystaSee V1.13 source snapshot from official onedir release"
git tag -a v1.13 -m "CrystaSee V1.13"
```

## 3. 在 GitHub 网页端建空仓库

- 仓库名建议：`CrystaSee`
- 可见性按你的开源策略选择
- **不要**勾选 “Add a README file”、“Add license”、“.gitignore”，否则首次推送会冲突

## 4. 配置远程并推送（二选一）

### 方式 A：HTTPS + Personal Access Token

```bash
git remote add origin https://github.com/<USER>/CrystaSee.git
git push -u origin main
git push origin v1.13
```

首次推送会弹凭证窗口：用户名填 GitHub 用户名，密码填 PAT（需要 `repo` 权限）。  
本机未安装 `gh` CLI，也可先安装后用 `gh auth login` 管理凭证。

### 方式 B：SSH

```bash
ssh-keygen -t ed25519 -C "<你的 GitHub 邮箱>"
# 将 ~/.ssh/id_ed25519.pub 内容添加到 GitHub → Settings → SSH and GPG keys
git remote add origin git@github.com:<USER>/CrystaSee.git
git push -u origin main
git push origin v1.13
```

### 方式 C：GitHub Desktop（最省事）

1. File → Clone repository → 建好的空仓库
2. 把本目录内容（含 `.git` 除外的全部文件）复制进去
3. Desktop 里填写 commit message → Commit → Publish / Push

## 5. 推送后核验

```bash
git remote -v
git ls-remote --tags origin | grep v1.13
```

网页端检查：

- `version.txt` 显示 `V1.13`
- `LICENSE` 与 `THIRD_PARTY_NOTICES.md` 存在
- 仓库里没有字体 TTF、DLL、EXE、PYC、构建产物目录
- README 的“完整性声明”仍然可见

## 6. 如果你要的是“完整可构建源码”

不要在此仓库直接混入 V1.17 文件。建议：

```bash
git checkout -b v1.17-main
# 从当前工作树补齐 CrystaSee.py、构建脚本、index.src.html、extra.js 等
# 再单独提交，主线从 V1.17 开始
```

## 7. 网页打不开时的备用路径：PAT + API

`api.github.com` 已验证可用。若无法访问 `github.com` 网页添加 SSH 公钥，可改用 GitHub REST API：

1. 在能访问 GitHub 的设备上生成 Fine-grained PAT（至少 `Contents: read/write`、`Metadata: read`）。
2. 用 API 建仓并逐文件上传（Git Database API：create blob → create tree → create commit → update ref）。
3. 这条路不依赖 `git push`，但凭证只应在受信任环境中使用，不要写入仓库文件。

需要我直接执行这条路径时，把 PAT 通过安全方式提供，并明确授权创建公开/私有仓库。
