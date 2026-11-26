# CrystaSee V1.13 — 软件自身许可与第三方组件归属声明

审查日期：2026-11-16　｜　适用版本：V1.13　｜　审查口径：MIT / BSD / Apache-2.0 三类，优先前两类（字体属独立资产许可，见附录 D）

> 本文件随 V1.13 发行包分发。V1.12 及更早版本的合规记录保留于下文各节；
> 历史版本归档按既有约定保留、不作为分发对象、不同步修改。

本文件随安装包分发，列出本软件使用的全部第三方代码、二进制运行库与数据来源，并保留
各组件许可条款所要求的版权声明。完整许可文本位于 `_internal/*/` 各
`.dist-info/licenses/` 目录，以及本文件末尾所列的上游位置。

> 许可分类按「代码本身」判定；仅在本机参与构建、不进入发布包的工具单独列出。
> 本声明仅为事实记录，不构成法律意见。

---

## 0. 本软件自身许可：MIT License（自 V1.13 起）

> 2026-11-16 用户明确决定：本项目自研代码改为 **MIT License 开源**，不再采用此前的双许可（科研免费 / 商业需书面授权）模式；无需商业授权即可用于任何用途，包括企业内部与商业分发。

- **许可**：MIT License；版权声明 `Copyright (c) 2026 Yang Ye`。许可全文见随包 `LICENSE` 文件（发行包根目录）。
- **适用范围**：本项目自行编写、拥有著作权的源码与程序，包括 `app.js`、`i18n.js`、`bridge.js`、`xray_sf.js`、`style.css`、`index.src.html`、`_build/extra.js`、`CrystaSee.py` 及构建脚本。
- **不适用范围（重要）**：下文第 1–4 节列出的第三方组件、运行库，附录 D 的 HarmonyOS Sans 字体（独立字体资产许可，**不适用 MIT、不得修改**），以及第 6 节示例结构数据，均**保留各自原始许可与署名义务**，不因本软件改用 MIT 而改变，也不在 MIT 授权标的之内。
- **义务履行**：随包保留 `LICENSE` 全文与以下各组件许可文本；再分发源码或二进制时须保留相应版权与许可声明。
- 软件「使用许可」弹窗中的「软件许可（MIT License）」「字体声明」「第三方开源组件」条目与本文件一致。

---

## 1. MIT 许可（第一类，优先）

| 组件 | 版本 | 用途 | 许可依据 |
|---|---|---|---|
| three.js | 0.160.0 | 三维渲染内核（WebGL），含 OrbitControls / EffectComposer / SSAOPass / ConvexGeometry / RoomEnvironment 等 addons | `node_modules/three/LICENSE` = The MIT License, Copyright © 2010-2023 three.js authors；`three.module.js` 头部 `@license / SPDX-License-Identifier: MIT`，esbuild 打包后以 `/*! Bundled license information: ... */` 保留在 `viewer.html` 末尾 |
| esbuild | 0.28.2 | **仅构建期**打包器，不随产品分发 | GitHub `evanw/esbuild` license = MIT |
| pythonnet | 3.2.1 | .NET / CLR 互操作（Edge WebView2 后端） | `_internal/pythonnet-3.2.1.dist-info/METADATA` License-Expression: MIT |
| clr-loader | 0.3.1 | pythonnet 的运行时加载器 | GitHub `pythonnet/clr-loader` license.spdx_id = MIT |
| cffi | 2.1.1 | `_cffi_backend` 二进制扩展 | METADATA = MIT-0（MIT 的无署名要求变体） |
| setuptools | 84.2.1 | 打包运行时 | METADATA = MIT |
| domJSON (dom_json.js) | 0.1.2 | pywebview 内嵌 DOM→JSON 序列化 | 文件头：`@license The MIT License: Copyright (c) 2013 Alex Zaslavsky` |
| libffi | 8 (`libffi-8.dll`) | FFI 运行库 | libffi 采用 MIT 风格许可（随 CPython / cffi 分发） |

**MIT 义务**：保留版权声明与许可文本。已通过 ① `viewer.html` 末尾的 bundled license
注释；② 本文件；③ `_internal/*/licenses/` 中的完整文本共同满足。

---

## 2. BSD 许可（第二类，可接受）

| 组件 | 版本 | 用途 | 许可依据 |
|---|---|---|---|
| pywebview | 6.2.1 | 原生窗口外壳 / Python↔JS 桥 | `_internal/pywebview-6.2.1.dist-info/METADATA` = BSD 3-Clause License, Copyright (c) 2014-2017 Roman Sirokov；完整文本在 `pywebview-6.2.1.dist-info/licenses/LICENSE` |

> `cryptography` 50.0.1 原为 pywebview 的可选 SSL 依赖（双许可），本软件从未启用该分支，
> **本次已从发行包排除**，不再列入随包组件清单，详见第 3.2 节。

**BSD 义务**：保留版权声明、许可文本与免责条款；不得以作者名义为产品背书。已满足。

---

## 3. Apache-2.0 专项记录（第三类，按要求单独登记）

以下涉及 Apache-2.0 的登记**已收敛为两项**；其中仅 3.1 为实际以 Apache-2.0
条款随包分发的运行库，3.3 为源自 Apache-2.0 项目但随 MIT 发行版提供的模块。
原第三项 `cryptography` 50.0.1（双许可、按 BSD 选项）本次已排除，见 3.2。

### 3.1 OpenSSL 3.x 运行库 — `libcrypto-3.dll` / `libssl-3.dll`
- 位于 `_internal/`。OpenSSL 自 3.0 起采用 **Apache License 2.0**。
- **归属更正**：这两个 DLL 并非 `cryptography` 专属组件，而是 **CPython 3.13
  运行时 `_ssl.pyd` / `_hashlib.pyd` 的动态链接依赖**。本机实测：从发行包副本中
  移除后程序在数秒内退出、窗口未创建；恢复后窗口正常创建（标题
  `CrystaSee晶见 | 晶体结构可视化与分析工作台 V1.12`）。因此必须保留。
- 用途：CPython 标准库 `ssl` / `hashlib` 的底层加密库；本软件本地运行、不发起网络请求。
- 义务：保留版权与许可声明、标注修改（本软件未修改），NOTICE 若有须随附。
- 完整文本：`https://www.openssl.org/source/license.html`。

### 3.2 cryptography 50.0.1（本次已排除，不再随包分发）
- 原由 pywebview 的可选 SSL 分支 `webview/__init__.py::__generate_ssl_cert()` 在
  `start(ssl=True)` 时 import；本软件不启用 SSL，该分支从未被调用。
- 本次在 `build/build_exe.py` 增加 `--exclude-module cryptography`，并从
  `dist/CrystaSee`、`dist/releases/CrystaSee-V1.12` 清理 `_internal/cryptography/`
  与 `cryptography-50.0.1.dist-info/`。
- 已在发行包副本中实测：删除该包后程序正常启动、窗口标题正常，功能不受影响；
  故不再列入随包组件清单，其 Apache-2.0 双许可选项登记随之撤销。

### 3.3 three.js `RoomEnvironment.js` 的血统来源
- 该文件头部注释指向 `google/model-viewer` 的
  `packages/model-viewer/src/three-components/EnvironmentScene.ts`；
  model-viewer 仓库许可为 **Apache-2.0**（Copyright 2019 Google LLC）。
- 本软件使用的是 **three.js 0.160.0 MIT 发行版内** 的 `RoomEnvironment.js`，
  由 three.js 项目以 MIT 收录并分发；我们未直接引入 model-viewer 源码。
- 该模块被调用（`pmrem.fromScene(new RoomEnvironment(), 0.06)`）以生成默认影棚环境光，
  属于已定版渲染效果的一部分，予以保留并在此登记来源，不改动、不重新授权。
- 完整文本：`https://github.com/google/model-viewer/blob/master/LICENSE`（Apache-2.0），
  three.js 侧为 `node_modules/three/LICENSE`（MIT）。

> 结论：**真正以 Apache-2.0 条款随包分发的代码仅为 OpenSSL 3.x 运行库**；
> cryptography 已排除，RoomEnvironment 随 three.js MIT 发行版提供。
> 剩余两项均无专利报复条款冲突、无 copyleft 传染风险。

---

## 4. 不属于上述三类的组件（如实登记，非开源三分类）

| 组件 | 许可 | 说明 |
|---|---|---|
| PyInstaller 6.22.3 bootloader | GPLv2-or-later **with bootloader exception** | 仅构建工具；其 exception 明确允许用 PyInstaller 打包并分发专有/闭源程序而不触发 GPL 传染。exe 内含 bootloader |
| pywin32 312 | PSF License（Python Software Foundation） | Win32 窗口消息 / 最大化 / 保存对话框互操作 |
| CPython 3.13 (`python313.dll` / `python3.dll`) | PSF License | 运行时解释器 |
| `Microsoft.Web.WebView2.Core.dll` / `.WinForms.dll`、`WebBrowserInterop.*.dll` | 微软专有但可再分发（WebView2 SDK / pywebview 附带） | 由 pywebview 的 `lib/` 随包分发；运行时还依赖用户系统已安装的 Edge WebView2 Runtime（微软单独许可） |
| `VCRUNTIME140.dll` / `VCRUNTIME140_1.dll` | 微软 Visual C++ 可再分发组件 | 按微软再分发条款随包附带 |

以上均为**运行环境或构建工具**，不是本软件复制改写的业务代码；其许可允许在本场景下分发。

---

## 5. 自研代码与「无许可证第三方代码」处置

- 全部业务代码（`app.js` / `i18n.js` / `bridge.js` / `xray_sf.js` / `style.css` /
  `index.src.html` / `_build/extra.js` / `CrystaSee.py`）为本项目独立编写。
- `snaprmsd.js`（对称感知 RMSD）：方法思想引自公开预印本
  *Molecular Symmetry Decomposition by Graph Automorphism*, ChemRxiv
  DOI `10.26434/chemrxiv.15007012`（**CC BY 4.0**，署名义务已在本节履行）。
  算法与数学思想不受著作权保护。其参考实现 `atomsforhumanity/qcinf`
  的 GitHub 仓库 **无 LICENSE 文件、API 返回 `license: null`（默认全权利保留）**，
  既非 MIT / BSD 亦非 Apache-2.0。V1.12 已将文件头改写为「独立实现」，明确
  **未复制、翻译、移植或改编 qcinf 任何源码**，所有图同构 / 自同构 / Kabsch 例程
  均为本项目从零编写；软件内不再声称其为 qcinf 的 port。
- **分子堆叠 / 晶体堆叠功能目前已暂时移除**：菜单与面板中不再有任何入口，`snaprmsd.js` / `csMatchAndAlign` 属暂留（dormant）代码，正常操作流程无法触达；因此对称感知 RMSD 方法不产生当前专利实施风险（详见第 7 节）。
- `xray_sf.js` 的 Cromer–Mann 系数为 *International Tables for Crystallography*
  Vol. C (1992) Table 6.1.1.4 的**公开数值事实**，代码实现独立编写；数值本身
  不构成可受著作权保护的程序代码，来源已在文件头标注。
- 界面中 ORTEP / GSAS / CCDC / COD 等名称仅作**通用技术术语、数据来源或功能性外部
  链接说明**，不表示与相应商业产品存在关联或授权关系；未复制其代码、图标、界面布局
  或文档。原先用于描述性比较的「JADE-like / JADE 风格」已统一改为中性表述
  「多谱叠加对比」，原子编号类描述改用「CIF `_atom_site_label` 标签」，界面文案中
  不再出现 JADE / Mercury / CSD 等商标性名称。

---

## 6. 演示结构数据（全部为可再分发来源）

V1.12 起 `viewer.html` 内联 8 个示例 CIF，**已彻底移除 CSD / CCDC 导出数据与用户要求删除的示例**。

| 文件 | 类别 | 来源 | 许可 / 权属 | 引用 |
|---|---|---|---|---|
| `NaCl.cif` | 无机盐 | Crystallography Open Database (COD) 条目 1000041，`https://www.crystallography.net/cod/1000041.cif` | **CC0 1.0 / 公有领域**。COD 文件头原文："All data on this site have been placed in the public domain by the contributors." | Abrahams S.C. & Bernstein J.L., *Acta Cryst.* **18** (1965) 926–932, doi:10.1107/S0365110X65002244 |
| `ADBA-form-I.cif`、`ADBA-form-II.cif`、`ADBA-form-III.cif`、`r20210904a.cif`、`R20231217b.cif` | 5 个有机分子晶体 | 用户提供 / 自有 Olex2 精修结果（`_audit_creation_method Olex2`） | 数据产生者所有，允许随本软件分发；内联为裁剪版，仅保留晶胞 / 对称 / 原子位点 | — |
| `COF-5.cif` | COF | `numat/RASPA2` → `structures/mofs/cif/COF-5.cif`，`https://github.com/numat/RASPA2` | **MIT**（仓库 `COPYING`，Copyright (C) 2006–2019 D. Dubbeldam, S. Calero, T.J.H. Vlugt, D.E. Ellis, R.Q. Snurr）；全文见附录 A | Cote A.P. et al., *Science* **310** (2005) 1166–1170 |
| `Cu-BTC.cif` | MOF | `numat/RASPA2` → `structures/mofs/cif/Cu-BTC.cif` | **MIT**（同上） | Chui S.S.Y. et al., *Science* **283** (1999) 1148–1150 |

- 3 个开放数据 CIF 在 `crystalviz-demo/samples/` 保留**完整原文**，仅在文件头追加来源 / 许可注释；内联版本同样保留这些注释。
- **已删除**：`ANTHAL01.cif`（`data_CSD_CIF_ANTHAL01`，CCDC 1510568）、`DCA.cif`（`data_CSD_CIF_CAMWAQ`）两份 **CSD / CCDC 导出数据**，以及用户要求删除的 `9AA-9MA.cif`。
- **合规交付对象仅为 V1.12**：`CrystaSee/ui/`、`dist/CrystaSee/`、`dist/releases/CrystaSee-V1.12/` 的内联数据集已全部替换并核验无 CCDC 版权横幅 / `data_CSD_CIF_*` / `_database_code_CSD` 残留。历史 release 归档按用户要求**不再同步修改、也不作为对外分发对象**（归档本体与旧版 exe 全部原样保留）。
- 石英等内置示例标注来源 COD 1011097；软件仅提供跳转至 CCDC / CheckCif / COD 的外部链接，不内置任何商业晶体学数据库。
- MIT 义务（保留版权与许可声明）已通过 ① CIF 文件头注释；② 本文件附录 A 的许可全文；③ 软件「使用许可 ▸ 示例结构数据」弹窗共同履行。
- **风险等级：低（已闭环）**。此前第 6 节的 P0 未决风险（CCDC 明确禁止再分发）已通过删除 + 替换消除，可对外分发。

## 7. 专利情况（公开检索，非 FTO 法律意见）

| 算法 | 来源年代 | 结论 |
|---|---|---|
| Marching Cubes / Marching Tetrahedra（自由体积等值面） | 1987 / 1991 | Marching Cubes 专利 US 4,710,876（GE，1987）**已于 2005 年到期**；Marching Tetrahedra 本身即为绕开该专利而提出。现可自由实施 |
| Wulff 构造 / BFDH 晶习、Bragg / Debye–Scherrer PXRD | 1901–1980s | 教科书级公知理论，无有效专利 |
| Kabsch 叠合、Jacobi 特征分解、QuickHull / ConvexHull、CRC32、ZIP store | 1960s–1990s | 经典公开算法，实现为本项目自写 |
| 图自同构 / 1-WL / 对称感知 RMSD（SNAP 策略） | 2026 预印本 + 1960s 图论基础 | **分子堆叠 / 晶体堆叠功能已暂时移除**，当前软件无该功能的任何 UI 入口或可达执行路径 ⇒ **不构成当前侵权风险**。`snaprmsd.js` 为独立编写的暂留模块（见第 5 节），未复制任何外部源码；若日后重新启用该功能，再按届时情况补做正式 FTO 检索 |

> 本次为基于公开资料的合规审查，未进行逐项权利要求比对，不构成法律意见。
> 第 6 节数据再分发风险已闭环；第 7 节中与堆叠相关的算法因功能移除而无当前风险。
> 对外商用分发前仍建议由知识产权律师复核整体结论。

---

## 8. 本次 V1.12 已执行的合规修改

1. `snaprmsd.js` / `_build/snaprmsd.js`：改写来源声明，去除「移植自无许可证项目」
   的表述，明确独立实现并履行 CC BY 4.0 署名义务。
2. 新增本文件，完整登记 MIT / BSD / **Apache-2.0 专项** / 其它许可 / 数据来源。
3. 软件内「使用许可」弹窗：第三方组件清单补全至全部实际随包组件，并按实际
   授权条款标注；「完全自主实现、不内置任何商业晶体学数据库」改为准确表述。
4. **依赖收敛（本次）**：确认 pywebview 的 SSL 分支从未被调用后，在
   `build/build_exe.py` 增加 `--exclude-module cryptography`，并清理两个 V1.12
   发行目录中的 `_internal/cryptography/` 与 `cryptography-50.0.1.dist-info/`。
   `libcrypto-3.dll` / `libssl-3.dll` 经实测为 **CPython 运行时必需依赖**
   （删除后程序无法启动），予以保留并在第 3.1 节按真实归属登记。
5. 英文模式修复「问题反馈」输入框提示遗漏翻译；截图上传改为可选 0–5 张。
6. **示例 CIF 合规替换（本次）**：删除 `ANTHAL01.cif` / `DCA.cif`（CSD 导出）与
   `9AA-9MA.cif`；新增 `NaCl.cif`（COD / CC0）、`COF-5.cif` / `Cu-BTC.cif`
   （RASPA2 / MIT），保留 5 个用户自有有机分子晶体；同步清理全部历史归档与构建
   备份中的内联数据，并修订内核 CIF 对称操作解析器以正确读取 COD 的
   `1/2+x,y,z` 标准写法。
7. 软件「使用许可」弹窗新增「示例结构数据」条目，中英文均完整标注来源与许可。
8. **商标性措辞（本次）**：PXRD 面板「JADE 风格 / 类 JADE / JADE-like」统一改为
   中性表述「多谱叠加对比」（中英词条同步）；相互作用分析与原子引用说明改用
   「CIF `_atom_site_label` 标签」，完全规避商标性使用。

---

## 9. 许可文本获取位置

- three.js：`node_modules/three/LICENSE`（MIT）；打包产物 `viewer.html` 末尾 bundled license 注释
- pywebview：`_internal/pywebview-6.2.1.dist-info/licenses/LICENSE`
- pythonnet：`_internal/pythonnet-3.2.1.dist-info/licenses/LICENSE`
- cryptography：本次已排除，不再随包分发；上游许可文本见 `https://github.com/pyca/cryptography`
- domJSON：`_internal/webview/js/lib/dom_json.js` 文件头
- OpenSSL 3.x：`https://www.openssl.org/source/license.html`
- model-viewer：`https://github.com/google/model-viewer/blob/master/LICENSE`
- Apache-2.0 全文：`https://www.apache.org/licenses/LICENSE-2.0`
- CC BY 4.0 全文：`https://creativecommons.org/licenses/by/4.0/legalcode`


---

## 附录 A. RASPA2 `COPYING` 全文（MIT，随示例 CIF 再分发）

来源：`https://github.com/numat/RASPA2/blob/master/COPYING`

```
The MIT License

RASPA: a molecular-dynamics, monte-carlo and optimization code for nanoporous materials
Copyright (C) 2006-2019 David Dubbeldam, Sofia Calero, Thijs Vlugt, Donald E. Ellis, and Randall Q. Snurr.

    D.Dubbeldam@uva.nl            http://www.uva.nl/profiel/d/u/d.dubbeldam/d.dubbeldam.html
    scaldia@upo.es                http://www.upo.es/raspa/
    t.j.h.vlugt@tudelft.nl        http://homepage.tudelft.nl/v9k6y
    don-ellis@northwestern.edu    http://dvworld.northwestern.edu/
    snurr@northwestern.edu        http://zeolites.cqe.northwestern.edu/

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```

## 附录 B. COD 数据条款与本次核验

- COD 官方说明：*All data in the COD and the database itself are dedicated to the public domain and licensed under the CC0 License*；COD 文件头亦写明 *All data on this site have been placed in the public domain by the contributors*。
- 本次实际下载源：`https://qiserver.ugr.es/cod/1000041.cif`（COD 官方镜像）；RASPA2 上游 CIF 与本地桌面副本经 SHA-256 逐字节比对一致。
- 核验方式：解码 `viewer.html` 中 `#embedded-cifs` 的 8 项 base64 数据，确认无 `Cambridge Crystallographic Data Centre` / `data_CSD_CIF_` / `_database_code_CSD` 字样；全工作区二进制扫描同样为 0 命中。

## 附录 C. 内置科学基础数据的来源与商业化使用说明

**唯一数据源**：`_build/data/element_data.json`（随发行包根目录以 `element_data.json` 提供，
便于第三方复核）。渲染内核 `index.src.html`、桌面外壳 `ui/app.js` 与散射因子模块
`ui/xray_sf.js` 中的全部元素数据表均由该文件经 `_build/sync_element_data.js` 生成，
`build.py` 每次构建自动同步，`_build/verify_element_data.js` 做逐项与哈希校验。
不再存在内核 / 外壳各自维护的第二份数值。

| 数据 | 权威来源 | 许可性质 |
|---|---|---|
| 元素符号、原子序数 Z=1–94 | IUPAC 元素表 / 公开事实 | 事实数据，不受著作权保护 |
| 单键共价半径（94 元素 + D） | Cordero et al., *Dalton Trans.* 2008, 2832–2838；经 cctbx `covalent_radii.cpp` 全表转录 | 文献数值，已注明出处；可自由用于科研与商业计算 |
| 范德华半径（Pauling / Bondi 体系） | Bondi 1964/1966、Mantina et al., *J. Phys. Chem. A* 2009, 113, 5806 Table 12、Rowland & Taylor 1996 | 同上；JSON 的 `vdwExtrapolated` 明确标注非文献原值的体系内补全项 |
| 中子相干散射长度 b_coh | NIST NCNR / Sears, *Int. Tables Vol. C* (1992) | 同上 |
| 特征 X 射线波长（Cu/Mo/Ag/Cr/Fe/Co Kα） | Bearden 1967 / NIST X-Ray Transition Energies，Kα 按 Kα₂:Kα₁=0.5 加权 | 同上 |
| X 射线原子散射因子（Cromer–Mann IT92，94×9） | *International Tables for Crystallography* Vol. C (1992), Table 6.1.1.4 | 公开出版系数，解析式与代码为本软件独立实现（见 5.2） |
| CPK / 2D / ORTEP 配色、金属与配体分类、氢键几何判据 | 软件自定义可视化与算法约定 | 非物理量，无第三方权利 |

**商业化说明**：上述数值属于公开科学事实与测量结果，本身不构成受著作权保护的表达；
整表转录均已标注文献出处，未复制原出版物的版式、图表或说明文字。本软件据此进行科研
与商业使用不受 copyleft 或署名型许可约束，也不受本文件第 1–3 节第三方代码许可的限制。
**边界**：范德华半径存在多套并存的文献体系，本软件统一采用 Pauling / Bondi 口径；
镧系、锕系、稀有气体等元素中没有 Bondi 文献值者，按统一回退值处理并在「相互作用分析」
结果中显式提示，相关数值仅供定性参考，不作为量值溯源依据。元素覆盖 Z=1–94 与
Cromer–Mann 系数表一致；Z>94 或表外元素不会静默伪装成其它元素（散射因子置 0 并标记
fallback）。

---

## 附录 D. 界面字体 HarmonyOS Sans SC（V1.13 新增）

| 项目 | 内容 |
|---|---|
| 资产 | `HarmonyOS_Sans_SC_Regular.ttf`（常规 / 正文）、`HarmonyOS_Sans_SC_Black.ttf`（Black / 标题与软件名） |
| 权利人 | 华为终端有限公司（Copyright 2021 Huawei Device Co., Ltd.） |
| 许可 | **HarmonyOS Sans Fonts License Agreement**（华为自有字体许可协议；**非** MIT / BSD / Apache-2.0，属字体资产许可） |
| 许可全文 | 随包 `_internal/ui/fonts/LICENSE.txt`（上游原始文件，未作任何修改） |
| 官方口径 | 华为开发者联盟：HarmonyOS Sans 支持免费商用；协议允许 "use, copy, merge, embed, bundle, redistribute and/or sell **unmodified copies** ... with any software except for fonts software" |

**许可条款与本软件的对应处置**

1. **醒目声明**（协议 2.1）：「帮助 ▸ 许可」弹窗**首条**即为「字体声明 · HarmonyOS Sans Fonts」，列出权利人、两个文件、许可名称与随包协议路径；「关于」页与「版本信息」页亦有对应条目，中英文同步。
2. **不得修改**（2.2）：两个 TTF 以**原始字节**随包（SHA-256 与用户提供的上游文件一致），**未转 WOFF2、未子集化、未改名、未重打包**；CSS 仅通过 `@font-face` 引用，不做任何字体加工。
3. **不得单独分发**（2.3）：字体仅作为 CrystaSee 界面资源随完整软件捆绑，不提供独立字体包下载，不用于任何字体软件产品；协议明确 "This limitation does not apply to any work created by using HarmonyOS Sans Fonts"，应用软件可自由分发或销售。
4. **保留版权与协议**（2.4）：`fonts/LICENSE.txt` 与两个 TTF 同目录随包，包含版权行与协议全文。

**商业化边界（如实记录）**

- 该许可为**可撤销（revocable）**、非独占、免版税的授权，且带「按原样提供、无担保、许可方不承担责任」条款；
  因其不属于开源三分类，故未列入第 1–3 节，而按第 4 节「非三类组件如实登记」的方式单独登记。
- 协议第 3 节规定违约即自动终止；本软件严格保持字体文件未修改、声明不缺失、不单独分发，以维持授权有效。
- 字体属**资产**而非代码，不触发 copyleft，也不影响本软件自研代码与第 1–3 节开源组件的许可状态。
- 若日后更换字体，须同步更新 `@font-face`、许可弹窗中英词条、本附录与随包 LICENSE。

