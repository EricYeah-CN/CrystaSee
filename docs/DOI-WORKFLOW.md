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
5. Zenodo 后端通过 webhook 自动归档该 Release（含 `CITATION.cff` 元数据），几分钟后在 Zenodo 账户的 Records 里出现新记录。
6. 打开该记录，页面右侧 “Cite as” 区域会同时给出两个 DOI：
   - 标有 “Concept DOI” 的那条 → 抄下来备用
   - 标有 “Version DOI” 的那条 → 记到本文第 4 节

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

## 5. 常见坑

- **CITATION.cff 与 .zenodo.json 二选一**：Zenodo 联动时若存在 `CITATION.cff`，`.zenodo.json` 会被忽略。本仓库只用前者。
- **Release 发布即冻结**：Zenodo 归档后该版本的文件不能再改；要改只能新建 Release，会得到新的版本 DOI，但概念 DOI 不变。
- **本仓库是快照**：V1.13 归档缺 Python 入口与构建输入，Zenodo 记录会如实反映“运行态源码快照”这一状态，切勿描述成完整可构建源码。
- **替代平台**：Figshare、OSF、机构知识库也发软件 DOI；JOSS 发的是论文 DOI，不是软件 DOI。
