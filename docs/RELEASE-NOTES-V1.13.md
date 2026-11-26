# CrystaSee V1.13 (source snapshot)

> Released: 2026-11-26

## About this release

This is a snapshot of the **front-end sources and build artifacts shipped with CrystaSee V1.13**, extracted byte-for-byte from the official PyInstaller onedir archive (`dist/releases/CrystaSee-V1.13/`). Corresponding Git tag: `v1.13`.

**This is not a complete, buildable source tree**: the archive does not contain the Python entry point, front-end build inputs, or build scripts. See [`V1.13-SOURCE-PROVENANCE.md`](V1.13-SOURCE-PROVENANCE.md) for the full list (in Chinese).

## Contents

- 8 UI files (shell and rendering kernel, unmodified from V1.13)
- `element_data.json` — element data
- `LICENSE` (MIT, project code) and `THIRD_PARTY_NOTICES.md`
- Font license text and a SHA-256 verification script (font files themselves are not distributed in this repository)

## Citation

CrystaSee uses a Zenodo **concept DOI** as its primary citation identifier; it always resolves to the latest version. The DOI will be generated once this release is archived by Zenodo, and will then be added to `CITATION.cff` and the README of this repository. See [`DOI-WORKFLOW.md`](DOI-WORKFLOW.md) for the workflow (in Chinese).

For exact reproducibility of V1.13 behavior, please also state the version `V1.13` and the version DOI.

## Known limitations

- HarmonyOS Sans SC fonts must be obtained from Huawei's official channels; this repository contains only the license text and verification script.
- Line endings are normalized to LF by `.gitattributes`, so Git blob hashes differ from the original archived files; the text content is identical.

---

## 中文说明

> 发布时间：2026-11-26

### 关于这次发布

这是 CrystaSee **V1.13 随包前端源码与构建产物的快照**，从官方 PyInstaller onedir 归档（`dist/releases/CrystaSee-V1.13/`）逐字节提取。对应标签为 `v1.13`。

**这不是完整可构建源码**：归档本身不含 Python 外壳入口、前端构建输入与构建脚本。缺失清单见 [`V1.13-SOURCE-PROVENANCE.md`](V1.13-SOURCE-PROVENANCE.md)。

### 包含内容

- 8 个 UI 文件（外壳与渲染内核，V1.13 原样）
- `element_data.json` 元素基础数据
- `LICENSE`（MIT，自研代码）与 `THIRD_PARTY_NOTICES.md`
- 字体许可文本与 SHA-256 校验脚本（字体文件本身不随仓库分发）

### 引用

本软件采用 Zenodo **概念 DOI** 作为主引用标识（会指向所有版本的最新页）。DOI 将在本次 Release 被 Zenodo 归档后生成并回填到本仓库的 `CITATION.cff` 与 README。流程见 [`DOI-WORKFLOW.md`](DOI-WORKFLOW.md)。

需要精确复现 V1.13 行为时，请同时注明版本 `V1.13` 与版本 DOI。

### 已知边界

- HarmonyOS Sans SC 字体需从华为官方渠道自行获取；仓库仅提供许可与校验脚本。
- 行尾按 `.gitattributes` 归一化为 LF，Git blob 哈希与原始归档文件不同，文本内容一致。
