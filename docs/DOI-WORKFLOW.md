# CrystaSee DOI 工作流（概念 DOI 方案）

本仓库选择 **概念 DOI（concept DOI）作为主引用标识**。本文说明为什么这样选、如何拿到 DOI、拿到后要回填哪些位置。

## 1. 两种 DOI 的分工

Zenodo 在归档一次 GitHub Release 时，会**同时**生成两个 DOI，无法只申请其中一个：

| 类型 | 形态 | 指向 | 用途 |
|---|---|---|---|
| **概念 DOI**（本仓库主用） | `10.5281/zenodo.<concept-id>` | 该软件**所有版本**的落地页（自动指向最新版） | 论文正文、项目主页、徽章；以后发新版不用改引用 |
| 版本 DOI | `10.5281/zenodo.<version-id>` | V1.13 这一次归档的**固定快照** | 需要严格复现某个结果时补充引用 |

> 注意：概念 DOI 不能替代版本 DOI 的**可复现性**。如果论文结论依赖 V1.13 的具体行为，建议在参考文献里同时写上版本 DOI，或在正文标注“使用版本 V1.13”。

## 2. 获取 DOI 的步骤

### 2.1 已完成

- [x] 仓库已推送：`https://github.com/EricYeah-CN/CrystaSee`
- [x] `v1.13` 附注标签已推送
- [x] `CITATION.cff` 已就位（GitHub 会显示 “Cite this repository”）

### 2.2 需要你在网页上完成

1. 用 GitHub 账号登录 <https://zenodo.org>（若尚未注册）。
2. **Settings → Linked accounts → GitHub → Connect**，授权后启用仓库 `EricYeah-CN/CrystaSee`。
3. （可选但推荐）同页关联 ORCID，让引用能归属到你的 ORCID 记录。
4. 回到 GitHub 仓库 → **Releases → Create a new release**：
   - Tag 选已有的 `v1.13`
   - Title 建议：`CrystaSee V1.13 (source snapshot)`
   - Description 可直接粘贴 [`RELEASE-NOTES-V1.13.md`](RELEASE-NOTES-V1.13.md) 的内容
   - 点击 **Publish release**
5. Zenodo 后端通过 webhook 自动归档该 Release（含 `CITATION.cff` 元数据），处理需要几分钟，取决于文件大小与 Zenodo 负载。
6. **看记录的位置**（两个入口，任选其一）：
   - **入口 A（最直观，能看到处理状态）**：Zenodo 右上角**头像菜单 → GitHub** → 点选仓库 `EricYeah-CN/CrystaSee` → 列表里出现该 Release 及其状态；处理完成后点该行的 **record DOI** 链接进入记录页。若失败，展开该 Release → **Errors** 查看原因。
   - **入口 B（通用）**：右上角**头像菜单 → My dashboard → My uploads**，新记录会出现在这里（含草稿与已发布记录）。
7. 进入记录页后，页面上会同时出现两个 DOI（位置随 Zenodo 界面版本略有不同，通常在顶部的 DOI 徽章 / “Cite as” 面板与 “Versions” 区域）：
   - **Concept DOI**（概念 DOI，指向所有版本的最新页）→ 抄下来，这是本仓库的主引用标识
   - **Version DOI**（版本 DOI，对应 V1.13 这一次归档）→ 记到本文第 4 节
   - 也可在记录页确认归档状态：**External resources → Archived in**（Software Heritage）。

> Windows 本机实测：`zenodo.org` 网页可访问，`api.zenodo.org` 经代理返回 502。网页路径可用；Zenodo 归档由它自己的后端完成，不依赖本机 API。

## 3. 拿到概念 DOI 后要回填的位置

按顺序修改并提交：

### 3.1 `CITATION.cff`（根目录）

取消文件末尾 `identifiers` 段的注释，把 `<CONCEPT_DOI>` 换成真实值，例如：

```yaml
identifiers:
  - type: doi
    value: "10.5281/zenodo.1234567"
    description: "Concept DOI - resolves to the latest version of CrystaSee"
```

这一步让 GitHub 的 “Cite this repository” 按钮输出带 DOI 的引用。

### 3.2 `README.md`

把“引用”一节里的占位徽章替换为（`<CONCEPT_DOI>` 换成真值）：

```markdown
[![DOI](https://zenodo.org/badge/DOI/<CONCEPT_DOI>.svg)](https://doi.org/<CONCEPT_DOI>)
```

### 3.3 可选：ORCID 与单位

补全 `CITATION.cff` 中 `orcid` 与 `affiliation` 两行（目前是注释状态）。

回填后执行：

```bash
git add -A
git commit -m "docs: add Zenodo concept DOI"
git push origin main
```

**不要**重新发 Release 或新建标签——回填只是文档更新，不需要新的 DOI。

## 4. 记录区（拿到 DOI 后填写）

- 概念 DOI：`<待回填>`
- V1.13 版本 DOI：`<待回填>`
- Zenodo 记录 URL：`<待回填>`

回填后建议在此处写一句引用示例，例如：

```bibtex
@software{crystasee,
  title = {CrystaSee: Interactive Crystal Structure Visualization and Analysis},
  author = {Ye, Yang},
  version = {V1.13},
  year = {2026},
  doi = {<CONCEPT_DOI>},
  url = {https://github.com/EricYeah-CN/CrystaSee}
}
```

## 5. 排查：Release 已发布但 Zenodo 迟迟不出现 DOI

实测案例（2026-11-26）：Release 22:48 发布，25 分钟后 Zenodo 全站搜索 `CrystaSee` 仍无任何记录。这种“搜索完全查不到”的情况不是处理慢，而是**归档没有被触发**。按下列顺序排查：

1. **仓库是否真的启用了**（最常见）：Zenodo 头像菜单 → **GitHub** → 页面上找 `EricYeah-CN/CrystaSee`，确认开关已 toggle 为启用；没有就先启用。注意“Linked accounts 里连接 GitHub 账号”和“GitHub 页面里启用具体仓库”是**两个独立步骤**，只做前者不会触发归档。
2. **启用与发布的先后顺序**：Zenodo 只对**启用之后新发布**的 Release 做归档，不回溯已有 Release。如果你是先 publish 了 Release 才去启用仓库，那个 Release 永远不会出现在 Zenodo。解决办法：在 GitHub 上把该 Release 删除后重新 publish（同一标签 `v1.13` 即可），或在 Zenodo 的 GitHub 页面里点该仓库 → **Create release** 重新走一遍发布流程。
3. **看失败原因**：Zenodo 头像菜单 → GitHub → 选仓库 → 展开对应 Release → **Errors**，会给出具体错误（如 `CITATION.cff` 元数据不合法）。可用 cff-converter 校验 `CITATION.cff`。
4. **确认归档状态**：进入 Zenodo 记录页 → **External resources → Archived in**（Software Heritage）。
5. 真正的处理延迟通常发生在记录已经生成、但 Software Heritage 归档尚未完成时，而不是连记录都没有。

## 6. 常见坑

- **CITATION.cff 与 .zenodo.json 二选一**：Zenodo 联动时若存在 `CITATION.cff`，`.zenodo.json` 会被忽略。本仓库只用前者。
- **Release 发布即冻结**：Zenodo 归档后该版本的文件不能再改；要改只能新建 Release，会得到新的版本 DOI，但概念 DOI 不变。
- **本仓库是快照**：V1.13 归档缺 Python 入口与构建输入，Zenodo 记录会如实反映“运行态源码快照”这一状态，切勿描述成完整可构建源码。
- **替代平台**：Figshare、OSF、机构知识库也发软件 DOI；JOSS 发的是论文 DOI，不是软件 DOI。
