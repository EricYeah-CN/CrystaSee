# CrystaSee V1.13 (source snapshot)

> 发布时间：2026-11-26

## 关于这次发布

这是 CrystaSee **V1.13 随包前端源码与构建产物的快照**，从官方 PyInstaller onedir 归档（`dist/releases/CrystaSee-V1.13/`）逐字节提取。对应标签为 `v1.13`。

**这不是完整可构建源码**：归档本身不含 Python 外壳入口、前端构建输入与构建脚本。缺失清单见 [`V1.13-SOURCE-PROVENANCE.md`](V1.13-SOURCE-PROVENANCE.md)。

## 包含内容

- 8 个 UI 文件（外壳与渲染内核，V1.13 原样）
- `element_data.json` 元素基础数据
- `LICENSE`（MIT，自研代码）与 `THIRD_PARTY_NOTICES.md`
- 字体许可文本与 SHA-256 校验脚本（字体文件本身不随仓库分发）

## 引用

本软件采用 Zenodo **概念 DOI** 作为主引用标识（会指向所有版本的最新页）。DOI 将在本次 Release 被 Zenodo 归档后生成并回填到本仓库的 `CITATION.cff` 与 README。详见 [`DOI-WORKFLOW.md`](DOI-WORKFLOW.md)。

需要精确复现 V1.13 行为时，请同时注明版本 `V1.13` 与版本 DOI。

## 已知边界

- HarmonyOS Sans SC 字体需从华为官方渠道自行获取；仓库仅提供许可与校验脚本。
- 行尾按 `.gitattributes` 归一化为 LF，Git blob 哈希与原始归档文件不同，文本内容一致。
