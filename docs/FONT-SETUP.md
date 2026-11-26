# 字体获取与校验

## 为什么不入库

HarmonyOS Sans SC 使用《HarmonyOS Sans Fonts License Agreement》。协议要点：

- 允许：随软件 **捆绑** 使用、复制、嵌入、再分发、销售未修改副本。
- 禁止：修改字体或其组件；**单独以基础形式再分发或销售**。
- 要求：软件中显著声明使用了该字体。

公开仓库直接放 TTF 有被认定为“单独分发”的风险，因此本快照不含字体文件，仅保留许可全文 `docs/HarmonyOS-Sans-Fonts-LICENSE.txt`。

## 使用方法

1. 从华为官方字体渠道下载 HarmonyOS Sans SC Regular / Black。
2. 放到 `src/ui/fonts/`，文件名必须为：

```
HarmonyOS_Sans_SC_Regular.ttf
HarmonyOS_Sans_SC_Black.ttf
```

3. 校验：

```bash
D:/Python/Python313/python.exe tools/verify_fonts.py
```

预期输出两行 `OK`。

## 预期 SHA-256

| 文件 | SHA-256 |
|---|---|
| `HarmonyOS_Sans_SC_Regular.ttf` | `b8485d72ec40b9030ee19b10a5d24a14df446e9b4d9b7ebd54bfd5f374161f79` |
| `HarmonyOS_Sans_SC_Black.ttf` | `7342bf79a64e95eaaa2577dddea1948f29b63e61555b415fa0a34d4386fcaaae` |

校验通过后还需按 V1.13 的实际使用方式保留 `ui/style.css` 与 `build_viewer.py` 中的 `@font-face` 声明；`file://` 场景不要加 `crossorigin`。
