# CrystaSee V1.13（源码快照）

> **当前状态**：本地准备完成，**尚未推送 GitHub**。网络恢复后按 [`PUSH_GUIDE.md`](PUSH_GUIDE.md) 执行。

## 1. 这是什么

本目录是从 `CrystaSee/dist/releases/CrystaSee-V1.13/` 归档中提取的 **V1.13 运行态源码快照**，包含该版本实际随包的前端源码 / 构建产物、元素数据、项目许可证与第三方声明。

所有纳入文件均逐字节复制自 V1.13 归档，原文件 SHA-256 见 [`docs/V1.13-SOURCE-PROVENANCE.md`](docs/V1.13-SOURCE-PROVENANCE.md)。

> 行尾说明：归档中的 `.js` / `.html` / `.md` 等文本文件为 CRLF，入库时按 `.gitattributes` 统一为 LF。因此 Git blob 的 SHA-256 与原文件不同，但文本内容一致。`element_data.json` 与 `version.txt` 原本即为 LF，哈希一致。

## 2. 完整性声明（推送前必读）

V1.13 归档是 PyInstaller onedir 打包产物，**不包含**以下源码 / 构建输入：

| 缺失文件 | 作用 |
|---|---|
| `CrystaSee.py` | Python 外壳入口 |
| `crystalviz-demo/index.src.html` | 渲染内核源码 |
| `_build/extra.js` | 内核附加脚本 |
| `_build/build.py`、`CrystaSee/build/build_viewer.py`、`build_exe.py`、`*.spec` | 构建链 |

因此本仓库是 **快照**，不是可一键重建的完整源码树。

- 可以如实描述为：“CrystaSee V1.13 随包前端源码与构建产物快照”。
- 不要描述为：“完整可构建源码”，除非补齐上表文件。
- 当前工作树已是 V1.17，`app.js`、`bridge.js`、`i18n.js`、`style.css`、`index.html`、`viewer.html` 均与 V1.13 不同，**不能混用后打 `v1.13` 标签**。

## 3. 目录结构

```
.
├── LICENSE                         # 项目 MIT 许可（自研代码）
├── THIRD_PARTY_NOTICES.md          # 第三方组件许可清单
├── version.txt                     # V1.13
├── src/
│   ├── ui/
│   │   ├── app.js                  # 外壳前端逻辑（V1.13 原样）
│   │   ├── bridge.js               # iframe 桥接（V1.13 原样）
│   │   ├── i18n.js                 # 中英文词条（V1.13 原样）
│   │   ├── index.html              # 外壳页面（V1.13 原样）
│   │   ├── style.css               # 样式（V1.13 原样）
│   │   ├── viewer.html             # 构建产物，内含 three.js MIT 声明
│   │   ├── snaprmsd.js             # 对称感知 RMSD（自研）
│   │   └── xray_sf.js              # PXRD 结构因子（自研）
│   └── data/
│       └── element_data.json       # 元素基础数据
├── docs/
│   ├── V1.13-SOURCE-PROVENANCE.md  # 来源、哈希、缺失清单
│   ├── FONT-SETUP.md               # 字体获取与校验（字体不在仓库内）
│   └── HarmonyOS-Sans-Fonts-LICENSE.txt
├── tools/
│   └── verify_fonts.py             # 字体 SHA-256 校验脚本
├── .gitignore
├── .gitattributes
└── PUSH_GUIDE.md
```

## 4. 许可与资产边界

- `LICENSE`：MIT，仅覆盖本项目自研代码。
- `THIRD_PARTY_NOTICES.md`：随包第三方组件逐项登记；`viewer.html` 末尾保留 three.js 的 MIT 声明，勿再次压缩抹除。
- **HarmonyOS Sans SC 字体不入库**：其协议允许随软件捆绑分发，但禁止单独分发字体文件。仓库只保留许可文本与校验脚本，使用者需自行从华为官方渠道获取并放入 `src/ui/fonts/`。

## 5. 后续建议

1. 先用本快照建立 Git 历史并打 `v1.13` 标签，保住版本起点。
2. 另开 `main` 分支整理当前 V1.17 可构建源码，作为后续持续开源的主线。
3. 若需字节级重建 V1.13，请从历史备份补齐 Python 入口与构建输入；不要从 V1.17 倒推冒充 V1.13。
