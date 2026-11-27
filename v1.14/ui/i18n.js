/* CrystaSee · 国际化（简体中文 ⇄ English）
 * 策略：以「中文短语 → 英文」字典驱动的子串替换翻译器。
 *  - 仅替换字典中出现的可见 UI 中文；未收录的内部/诊断字符串保持原样（安全）。
 *  - 通过 MutationObserver 自动翻译静态与动态渲染（弹窗/面板）内容。
 *  - 切换回中文时，从节点缓存的原始文本恢复，避免反复翻译。
 *  - 长文本（关于/手册/许可/反馈等）使用「整句」词条，确保语序正确。
 */
(function () {
  'use strict';

  var CS_TRANS = {
    /* ---------- 顶部菜单栏 ---------- */
    '文件': 'File',
    '显示': 'Display',
    '计算': 'Analysis',
    '晶面与晶习': 'Faces & Habit',
    'PXRD': 'PXRD',
    '外部链接': 'Links',
    '帮助': 'Help',
    '问题反馈': 'Feedback',
    '打开结构文件…': 'Open Structure File…',
    '最近文件': 'Recent Files',
    '保存图片': 'Save Image',
    '另存为图片…': 'Save Image As…',
    '退出': 'Exit',
    '分子模型': 'Molecular Model',
    'Line 线状': 'Line',
    'Stick 棍状': 'Stick',
    'Ball & Stick 球棍': 'Ball & Stick',
    'CPK 球堆积': 'CPK',
    'Polyhedron 多面体': 'Polyhedron',
    'Wireframe 线框': 'Wireframe',
    '显示范围': 'Display Range',
    '仅晶胞内部（含边界）': 'Unit cell interior (incl. boundary)',
    '补全截断分子': 'Complete cut-off molecules',
    '仅不对称单元': 'Asymmetric unit only',
    '堆积模式（单晶胞 · 补全分子）': 'Packing mode (single cell · complete molecules)',
    '晶胞框': 'Unit-cell box',
    '不显示': 'Hidden',
    '线状（标注非粗体）': 'Line (thin labels)',
    '棒状（标注粗体）': 'Rod (bold labels)',
    '相互作用': 'Interactions',
    '氢键显示': 'Hydrogen bonds',
    '范德华接触显示': 'van der Waals contacts',
    'ORTEP 椭球展示': 'ORTEP ellipsoids',
    '显示 o / a / b / c 标注': 'Show o / a / b / c axes labels',
    '显示原子标签': 'Show atom labels',
    '参数面板（显示 / 隐藏）': 'Parameter panel (show / hide)',
    '结构信息': 'Structure Info',
    '相互作用分析': 'Interaction Analysis',
    '单分子堆叠（RMSD）': 'Single-molecule overlay (RMSD)',
    '晶体结构堆叠（RMSD）': 'Crystal stacking (RMSD)',
    '自由体积占比': 'Free-volume fraction',
    'BFDH 模型': 'BFDH model',
    'AE 模型（附着能）': 'AE model (attachment energy)',
    '晶面解理（(hkl) 分子堆积）': 'Cleavage ((hkl) molecular packing)',
    'PXRD 模拟': 'PXRD simulation',
    '多 PXRD 对比': 'Multi-PXRD comparison',
    '中子衍射模拟': 'Neutron diffraction',
    'PXRD 格式转换': 'PXRD format conversion',
    'CCDC 沉积号申请': 'CCDC deposition',
    'CheckCif': 'CheckCif',
    'COD 数据库': 'COD database',
    '说明': 'Notes',
    '用户操作手册': 'User Manual',
    '关于晶见': 'About CrystaSee',
    '版本信息': 'Version Info',
    '使用许可': 'License',

    /* ---------- 品牌 / 状态 ---------- */
    // 副标题仍用缩写（CrysStruVisAnaWork）：英文界面下左侧中文名「晶见」已隐藏，
    // 缩写不再紧邻 CrystaSee 造成观感重复；窗口标题另用全称词条，不受影响。
    '晶体结构可视化与分析工作台': 'CrysStruVisAnaWork',
    '纯本地运行 · 无外部网络请求': 'Fully local · no network requests',
    '就绪 · 当前结构：': 'Ready · Current structure: ',
    'CrystaSee晶见 | 晶体结构可视化与分析工作台 V1.9':
      'CrystaSee | Crystal Structure Visualization & Analysis Workbench V1.9',
    '当前结构未提供': 'Current structure not provided',

    /* ---------- 参数面板 ---------- */
    '结构与文件': 'Structure & File',
    '案例演示': 'Sample Structures',
    'NaCl 盐': 'NaCl (salt)',
    'α-石英': 'α-Quartz',
    '金刚石': 'Diamond',
    '载入本地结构文件…': 'Load local structure file…',
    '视角与模型': 'View & Model',
    '投影方式': 'Projection',
    '透视（近大远小）': 'Perspective (near larger)',
    '正交投影 · 无景深（远近等大）': 'Orthographic (no depth, equal size)',
    '固定视角': 'Fixed view',
    '自由视角': 'Free view',
    'a · a 轴朝里': 'a · a axis inward',
    'b · b 轴朝里': 'b · b axis inward',
    'c · c 轴朝里': 'c · c axis inward',
    'a* · a 轴朝外': 'a* · a axis outward',
    'b* · b 轴朝外': 'b* · b axis outward',
    'c* · c 轴朝外': 'c* · c axis outward',
    '渲染风格': 'Render style',
    '复位视角（重新取景）': 'Reset view (reframe)',
    '风格参数': 'Style parameters',
    '数值实时显示': 'Live values',
    '线宽 (Å)': 'Line width (Å)',
    '棍半径 (Å)': 'Stick radius (Å)',
    '球半径比例': 'Ball radius ratio',
    '键半径 (Å)': 'Bond radius (Å)',
    '球半径（×范德华）': 'Ball radius (×vdW)',
    '多面体不透明度': 'Polyhedron opacity',
    '线半径 (Å)': 'Wire radius (Å)',
    '顶点球比例': 'Vertex sphere ratio',
    '显示中心原子': 'Show center atoms',
    '显示多面体棱线': 'Show polyhedron edges',
    '显示范围与晶胞': 'Range & cell',
    '强制补全（网络晶体也补）': 'Force complete (incl. networks)',
    '超胞': 'Supercell',
    '显示 o / a / b / c 标注': 'Show o / a / b / c labels',
    '显示原子标签': 'Show atom labels',
    '显示范围说明将在载入结构后更新。': 'Range description updates after loading a structure.',
    '光照': 'Lighting',
    '方位角': 'Azimuth',
    '仰角': 'Elevation',
    '强度': 'Intensity',
    '光源跟随视角（头灯模式）': 'Light follows view (headlamp)',
    '背景 · 材质 · 配色': 'Background · Material · Scheme',
    '深空渐变': 'Deep-space gradient',
    '纯黑': 'Pure black',
    '石墨灰': 'Graphite grey',
    '深海蓝': 'Deep-sea blue',
    '暗紫': 'Dark purple',
    '子夜': 'Midnight',
    '纯白（出版风）': 'Pure white (publish)',
    '材质质感': 'Material',
    '瓷器光泽': 'Porcelain',
    '哑光出版': 'Matte publish',
    '金属': 'Metal',
    '塑料': 'Plastic',
    '配色方案': 'Color scheme',
    'CPK 标准': 'CPK standard',
    '高对比（默认）': 'High contrast (default)',
    '元素分族 Grouped': 'Element groups',
    '色盲友好 Okabe–Ito': 'Color-blind (Okabe–Ito)',
    '一键出版风': 'One-click publish',
    '酷炫默认': 'Cool default',
    '其他显示': 'Other display',
    '环境遮蔽 SSAO': 'Ambient occlusion (SSAO)',
    '自动旋转': 'Auto-rotate',
    '相互作用': 'Interactions',
    '氢键（虚线）': 'H-bonds (dashed)',
    '范德华相互作用（虚线）': 'vdW interactions (dashed)',
    '图片导出': 'Image export',
    '分辨率': 'Resolution',
    '当前视图参考': 'Current view reference',
    '全高清 16:9': 'Full HD 16:9',
    '2K 16:9': '2K 16:9',
    '4K 16:9': '4K 16:9',
    '方形插图': 'Square figure',
    '自定义尺寸…': 'Custom size…',
    '背景模式': 'Background mode',
    '保留当前背景（所见即所得）': 'Keep current background (WYSIWYG)',
    '透明背景（PNG Alpha 通道）': 'Transparent background (PNG alpha)',
    '导出 PNG 图片': 'Export PNG image',
    '自定义': 'Custom',

    /* ---------- 视角工具条 / 浮标 / 提示 ---------- */
    'a 里': 'a in',
    'b 里': 'b in',
    'c 里': 'c in',
    'a 外': 'a out',
    'b 外': 'b out',
    'c 外': 'c out',
    '透视': 'Perspective',
    '正交': 'Orthographic',
    '复位视角': 'Reset view',
    '自动旋转': 'Auto-rotate',
    '左键旋转 · 滚轮缩放 · 右键平移 · 拖入结构文件可直接载入':
      'Left-drag rotate · Scroll zoom · Right-drag pan · Drag a file to load',
    '参数面板 ▤': 'Parameter panel ▤',
    '停靠左侧': 'Dock left',
    '停靠右侧': 'Dock right',
    '停靠下方': 'Dock bottom',
    '浮动窗口': 'Floating',
    '停靠▾': 'Dock ▾',
    '—': '—',
    '收起面板': 'Collapse panel',
    '停靠到左侧': 'Dock to left',
    '停靠到右侧': 'Dock to right',
    '停靠到下方': 'Dock to bottom',
    '浮动窗口': 'Floating window',

    /* ---------- 窗口控制 ---------- */
    '最小化': 'Minimize',
    '最大化窗口': 'Maximize',
    '关闭': 'Close',
    '简体中文': 'Simplified Chinese',

    /* ---------- 通用弹窗 / 提示 ---------- */
    '提示': 'Notice',
    '至少需要两个已就绪的文件才能运行堆叠分析。':
      'At least two ready files are required to run the stacking analysis.',
    '渲染内核尚未就绪，请稍候再试。': 'Render kernel not ready yet, please try again later.',
    '暂无最近打开的结构。可通过「文件 ▸ 打开结构文件」或左侧「案例演示」载入。':
      'No recent structures. Open a file via File ▸ Open, or use Sample Structures on the left.',
    '最近结构': 'Recent structures',
    '工具即将上线': 'Tool coming soon',
    '正在生成': 'Generating',
    '正在计算并生成三维轮廓': 'Computing and generating 3D contour',
    '正在载入': 'Loading',

    /* ---------- 结构信息 ---------- */
    '结构名称': 'Structure name',
    '化学式': 'Formula',
    '化学式量 (Formula weight)': 'Formula weight',
    '晶系': 'Crystal system',
    'a / b / c (Å)': 'a / b / c (Å)',
    'α / β / γ (°)': 'α / β / γ (°)',
    '晶胞体积 V (Å³)': 'Cell volume V (Å³)',
    'Z': 'Z',
    'ρ': 'ρ',
    '空间群': 'Space group',
    'R 因子': 'R factor',
    '温度 (K)': 'Temperature (K)',
    '晶体颜色': 'Crystal colour',
    '数据来源': 'Source',
    '内置示例 / 已载入结构（.cif 等）': 'Built-in sample / loaded structure (.cif, etc.)',
    '以上字段优先取自原始 .cif 的结构参数；未提供的字段显示空白。':
      'Fields are taken from the original .cif where available; blank if not provided.',

    /* ---------- 相互作用分析 ---------- */
    '氢键几何定义': 'H-bond geometry',
    '氢键几何阈值': 'H-bond distance/angle threshold',
    '供体': 'Donor',
    '氢': 'H',
    '受体': 'Acceptor',
    '距离': 'Distance',
    '角度': 'Angle',

    /* ---------- 自由体积 ---------- */
    '自由体积占比 · 并集体积': 'Free-volume fraction · union volume',
    '高亮自由区域（绿色轮廓）': 'Highlight free region (green contour)',
    '绿色半透明曲面是自由区域的等值面': 'The green translucent surface is the isosurface of free region',
    '绿色轮廓是探针半径': 'The green contour is the probe radius',
    '轮廓透明度': 'Contour opacity',
    '空隙探针半径': 'Void probe radius',
    '探针半径只影响轮廓显示': 'Probe radius affects only the contour display',
    '网格步长固定': 'Grid step fixed',
    '步长只影响渲染表面的精细度': 'Step affects only surface fineness',
    '进入自由体积计算时强制把显示范围设为': 'Entering free-volume forces display range to',
    '若结构太致密没有可及空隙则自动回退到全部自由区':
      'If too dense with no accessible void, auto-fall back to full free region',

    /* ---------- 堆叠 ---------- */
    '单分子堆叠': 'Single-molecule overlay',
    '晶体结构堆叠': 'Crystal stacking',
    '下列为跨文件最优刚体叠合': 'Below: optimal rigid-body overlay across files',
    '最小叠合结果': 'Minimum-overlay result',
    '至少选择两个已就绪文件后运行': 'Select at least two ready files to run',
    '运行堆叠分析': 'Run stacking analysis',
    '选择结构文件': 'Select structure file',
    '选择分子': 'Select molecule',
    '参考分子': 'Reference molecule',
    '目标分子': 'Target molecule',
    '每个文件先选定一棵种子分子': 'Pick one seed molecule per file first',
    '每个文件选定一棵待比分子': 'Pick one comparison molecule per file',

    /* ---------- PXRD ---------- */
    '模拟参数': 'Simulation parameters',
    'Simulation': 'Simulation',
    '实验谱对比模式': 'Experimental comparison',
    'Experimental': 'Experimental',
    '厂商格式 → .txt / .CSV / .xlsx': 'Vendor format → .txt / .CSV / .xlsx',
    'PXRD 格式转换': 'PXRD format conversion',
    '导入实验谱': 'Import experimental spectrum',
    '选择实验谱文件': 'Select experimental spectrum file',
    '选辐射': 'Select radiation',
    '中子散射长度 b': 'Neutron scattering length b',
    '中子衍射模拟（中子衍射）': 'Neutron diffraction (neutron)',
    '模拟与实验谱对比拆分为两张独立卡片':
      'Simulation vs experiment split into two cards',
    '谱图白底配蓝(模拟)/橙(实验)曲线与差谱条':
      'White-background plot with blue (sim)/orange (exp) curves and difference bar',
    '峰表与匹配表清晰可读': 'Peak and match tables are clearly readable',
    '峰位': 'Peak position',
    '峰宽': 'Peak width',
    '强度': 'Intensity',
    '相对强度': 'Relative intensity',
    '最大强度': 'Max intensity',
    '最高强度': 'Peak max',
    '起始': 'Start',
    '上限': 'Upper limit',
    '2θ 模拟': '2θ (calc)',
    '2θ 实验': '2θ (exp)',
    'Δ2θ': 'Δ2θ',
    'I 模拟': 'I (calc)',
    'I 实验': 'I (exp)',
    'h k l': 'h k l',
    'd (Å)': 'd (Å)',
    '未匹配实验峰': 'Unmatched experimental peaks',
    '未导入实验谱': 'No experimental spectrum imported',
    '导入后此处显示模拟峰与实验峰的逐项匹配':
      'After import, per-peak matching of calc. and exp. peaks shows here',

    /* ---------- 晶习 / 解理 ---------- */
    '晶习多面体': 'Habit polyhedron',
    '晶习尺寸': 'Habit size',
    '晶面族': 'Face family',
    '晶面切片': 'Face slice',
    '晶面间距': 'd-spacing',
    '有效晶面': 'Valid faces',
    '最大晶面指数': 'Max hkl index',
    '面数与显示方式': 'Face count & style',
    '面透明度': 'Face opacity',
    '面间距': 'd-spacing',
    '彩色': 'Coloured',
    '单色': 'Mono',
    '单色色板': 'Mono palette',
    '单色模式下隐藏色板选择行': 'Mono mode hides palette row',
    '隔离切片内堆积': 'Isolate packing inside slice',
    '隔离开启时把晶胞铺满整个': 'Isolation fills the whole cell with',
    '切片厚度': 'Slice thickness',
    '平面边长': 'Plane side length',
    '显示平面': 'Show plane',
    '显示边界': 'Show boundary',
    '显示平面与边界实时联动': 'Plane & boundary update live',
    '另保留二维投影对照': 'Plus 2D projection reference',
    '并保留经典白底二维投影对照': 'Plus classic white-background 2D reference',
    '预览': 'Preview',

    /* ---------- ORTEP ---------- */
    'ORTEP 各向异性位移椭球': 'ORTEP anisotropic displacement ellipsoids',
    '各向异性位移椭球': 'Anisotropic displacement ellipsoids',
    '原子的热运动各向异性椭球': "Atoms' anisotropic thermal ellipsoids",
    '三维实时椭球（隐藏球棍模型，独立显示）':
      'Live 3D ellipsoids (hides ball-and-stick, shown alone)',
    '概率水平': 'Probability level',
    '概率并随时开关': 'Toggle probability anytime',
    '需载入含 _atom_site_aniso_U_* 的 .cif': 'Load a .cif with _atom_site_aniso_U_*',

    /* ---------- 关于 / 版本 / 手册 / 许可 / 反馈（整句） ---------- */
    '鼠标操作': 'Mouse',
    '结构文件': 'Structure files',
    '显示范围': 'Display range',
    '快捷键': 'Shortcuts',
    '投影方式': 'Projection',
    '参数面板': 'Parameter panel',
    '左键拖动旋转 · 滚轮缩放 · 右键平移；固定视角 a / b / c / a* / b* / c* 一键切换。':
      'Left-drag rotate · scroll zoom · right-drag pan; one-click fixed view a/b/c/a*/b*/c*.',
    '支持 .cif / .mol / .mol2 / .xyz / .pdb。CIF 可用空间群对称操作展开晶胞；PDB 保留 CRYST1 晶胞信息但按分子显示。':
      'Supports .cif/.mol/.mol2/.xyz/.pdb. CIF expands the cell via space-group ops; PDB keeps CRYST1 but shows by molecule.',
    '仅晶胞内部（含边界原子）、补全截断分子（只补部分在内的分子）、仅不对称单元；a/b/c 可独立设置超胞 1–5。':
      'Cell interior (incl. boundary), complete cut-off molecules, or asymmetric unit only; a/b/c supercell 1–5 independently.',
    '1–6 切换模型 · O 切换投影 · P 出版风 · S 酷炫默认 · R 复位视角 · 空格 自动旋转 · H 收起面板 · 拖动参数面板标题可重新停靠。':
      '1–6 model · O projection · P publish · S cool default · R reset · Space auto-rotate · H collapse · drag panel title to re-dock.',
    '透视为默认（近大远小，有景深）；正交远近等大、无景深，适合测量与出版插图。':
      'Perspective is default (near larger, with depth); orthographic has equal size and no depth, good for measurement/figures.',
    '左侧面板可拖到右侧、下方或浮动窗口；拖动边缘可调整宽高；「停靠▾」可快速切换位置。':
      'Left panel can dock right/bottom/floating; drag edges to resize; Dock ▾ switches position quickly.',

    '本软件完全自主实现，不内置任何商业晶体学数据库或专有算法；仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问；仅解析开放的 CIF / COD 等公开格式，可学术与商用':
      'Fully self-implemented with no bundled commercial crystallographic database or proprietary algorithm; only provides external links to public services (CCDC deposition / CheckCif / COD) opened in the user’s browser; parses only open formats (CIF/COD etc.); free for academic and commercial use.',
    '纯本地桌面应用，零联网请求；结构文件与导出图片均保存在本机':
      'A fully local desktop app with zero network requests; structure files and exported images stay on this machine.',
    '三维结构可视化、晶胞 / 超胞、材质与光照、固定 / 正交视角、高清与透明 PNG 导出':
      '3D visualization, cell/supercell, materials & lighting, fixed/orthographic views, HD & transparent PNG export.',
    '分子堆积与相互作用分析：基于当前晶胞 / 超胞自动识别氢键（D–H···A）与范德华接触，反演晶胞参数并输出几何清单':
      'Molecular packing & interaction analysis: auto-detect H-bonds (D–H···A) and vdW contacts from the current cell/supercell, invert cell parameters and output a geometry list.',
    'PXRD 粉末衍射模拟：基于结构自动反演晶胞、去重唯一位点、Cromer–Mann 结构因子与 Bragg 方程合成图谱，可调辐射 / Kα 双线 / 峰宽 / 偏振，输出峰表与谱图':
      'PXRD powder simulation: auto-invert cell, dedupe unique sites, Cromer–Mann structure factors and Bragg equation to synthesize the pattern; adjustable radiation / Kα doublet / peak width / polarization; outputs peak table and spectrum.',
    'PXRD 实验谱对比：导入 .xy/.xye/.csv/.txt 文本实验谱，与模拟谱叠加并绘制差谱；按容差 Δ2θ 将模拟峰就近匹配实验峰，输出峰匹配表与一致性指标 Rp / Rwp，辅助物相鉴定':
      'PXRD experimental comparison: import .xy/.xye/.csv/.txt spectra, overlay on the calc. pattern and plot the difference; match calc. peaks to exp. peaks within Δ2θ tolerance, output a match table and Rp/Rwp for phase identification.',
    'PXRD 界面白底重设计：整体改为白底深色文字（解决原浅色字不可读问题），模拟与实验谱对比拆分为两张独立卡片（蓝色 Simulation / 橙色 Experimental 区分），谱图白底配蓝(模拟)/橙(实验)曲线与差谱条，峰表与匹配表清晰可读':
      'PXRD UI redesigned on white: dark text on white (fixing the unreadable light text), sim/exp split into two cards (blue Simulation / orange Experimental), white plot with blue/orange curves and difference bar, readable peak/match tables.',
    '关于页移除冗余右侧品牌图；结构信息浮标由左下角移至左上角，避免遮挡结构；左键旋转去除惯性（松手即停），定位更精准顺手':
      'About page drops the redundant brand image; structure-info badge moved from bottom-left to top-left to avoid occlusion; left-drag rotation has no inertia (stops on release) for precise control.',
    '结构库整合：删除"案例结构"独立下拉，将其全部示例结构并入"内置结构"并改名为"案例演示"（单一入口包含全部内置与示例结构）；氯化钠标签统一为"NaCl 盐"；全面实测并稳定所有风格 / 光照参数滑块的联动链路（外壳→通信桥→渲染内核实时重建），确保球/键半径、线宽、多面体不透明度、方位角与强度等滑块即时生效':
      'Structure library merged: removed the separate "Case structures" dropdown, folded all samples into "Built-in structures" renamed "Sample Structures" (single entry for all); NaCl label unified to "NaCl (salt)"; verified and stabilized all style/lighting slider links (shell → bridge → kernel live rebuild) so sphere/bond radius, line width, polyhedron opacity, azimuth and intensity update instantly.',
    '修复窗口拖拽：关闭 pywebview 整窗任意位置拖拽（easy_drag），改由标题栏品牌区与空白间隔区（.pywebview-drag-region）作为唯一窗口拖动手柄；解决此前拖动滑块 / 参数面板时整个软件窗口被拖动、且悬浮面板拖动与停靠受干扰的问题':
      'Fixed window dragging: disabled pywebview whole-window drag (easy_drag); only the title-bar brand area and spacer (.pywebview-drag-region) are drag handles; this stops the whole window from moving when dragging sliders/panel and fixes floating-panel drag/dock interference.',
    '修正「仅不对称单元」识别：此前该模式直接显示 CIF 原始 _atom_site 列表，对 Z′=½ 等结构（空间群 P-1、Z=1，分子位于反演中心）会显示完整分子而非半个。现改为对位点表做空间群对称轨道去重（复用内核对称操作函数），得到晶体学真不对称单元——半分子结构可正确退回一半原子；普通 Z′≥1 结构不受影响':
      'Fixed "asymmetric unit only": previously it showed the raw CIF _atom_site list, which for Z′=½ structures (P-1, Z=1, molecule on an inversion centre) displayed a whole molecule instead of half. It now deduplicates sites via space-group symmetry orbits (reusing the kernel symmetry operations) to give the true crystallographic asymmetric unit — half-molecule structures correctly reduce to half the atoms; ordinary Z′≥1 structures are unaffected.',
    '新增「堆积模式」：一键进入晶体堆积视图——自动按超胞复制（默认 2×2×2，可用「超胞」滑块调 1–5）并开启晶胞框；以中央晶胞分子为基准高亮（鲜艳元素色），周围晶胞分子自动灰化，直观呈现分子/晶胞如何堆叠；网络晶体则按晶胞区分中央与邻居。配套修复「仅不对称单元」的识别问题已随 V1.7 落地':
      'Added "Packing mode": one-click crystal packing view — auto supercell replication (default 2×2×2, adjustable 1–5) with cell box on; highlights the central-cell molecule (vivid element colour) and greys neighbouring cells to show how molecules/cells stack; networks distinguish centre vs neighbour by cell. The asymmetric-unit fix ships with V1.7.',
    '顶部菜单栏整体重构：文件（打开 / 最近文件 / 保存 / 另存为）/ 显示（新增「相互作用」分组：氢键显示 · 范德华接触显示）/ ORTEP（各向异性位移椭球）/ 计算（结构信息 · 相互作用分析 · 单分子与晶体结构堆叠 · 自由体积占比 · 晶面与晶习 BFDH / AE / 晶面解理）/ PXRD（模拟 · 多谱对比 · 中子衍射模拟 · 格式转换）/ 外部链接（CCDC 沉积号 · CheckCif · COD）/ 帮助（操作手册 · 关于 · 版本 · 许可）；统一外部链接跳转与最近文件列表。说明：ORTEP 热椭球与 (hkl) 晶面切片已升级为渲染内核独立叠加层的三维实时绘制（默认关闭，不改变已定版球棍渲染观感）；范德华接触的三维实时渲染仍待后续内核版本。':
      'Top menu bar rebuilt: File (Open/Recent/Save/Save As) / Display (new Interactions group: H-bonds · vdW contacts) / ORTEP (ADPs) / Analysis (Structure info · Interaction analysis · Molecule & crystal stacking · Free volume · Faces & Habit BFDH/AE/Cleavage) / PXRD (Sim · Multi · Neutron · Convert) / Links (CCDC/CheckCif/COD) / Help (Manual · About · Version · License); unified external-link and recent-file handling. Note: ORTEP thermal ellipsoids and (hkl) face slices are now live 3D overlays in the kernel (off by default, no change to the ball-and-stick look); live vdW-contact rendering is deferred to a later kernel release.',
    '原生窗口外壳（Python + Edge WebView2）+ 已定版三维渲染内核（WebGL / three.js）':
      'Native window shell (Python + Edge WebView2) + the finalized 3D render kernel (WebGL / three.js)',
    '版本规则': 'Version scheme',
    '知识产权': 'Intellectual property',
    '运行方式': 'Runtime',
    'V1.0 范围': 'V1.0 scope',
    'V1.1 新增': 'V1.1 added',
    'V1.2 新增': 'V1.2 added',
    'V1.3 新增': 'V1.3 added',
    'V1.4 改进': 'V1.4 improved',
    'V1.5 改进': 'V1.5 improved',
    'V1.6 改进': 'V1.6 improved',
    'V1.6 修正': 'V1.6 fixed',
    'V1.7 修正': 'V1.7 fixed',
    'V1.8 新增': 'V1.8 added',
    'V1.9 新增': 'V1.9 added',
    '技术构成': 'Tech stack',
    '两位数字版本号（V1.0 / V1.1 … V2.0）': 'Two-digit version (V1.0 / V1.1 … V2.0)',
    '构建日期': 'Build date',
    '运行状态': 'Runtime status',
    '纯本地运行 · 无外部网络': 'Fully local · no network',
    '本版更新': 'This release',
    '菜单重构：ORTEP 归入「显示」，晶面与晶习独立成菜单（位于计算与 PXRD 之间）。':
      'Menu rebuilt: ORTEP moved under Display; Faces & Habit is its own menu (between Analysis and PXRD).',
    'ORTEP 升级：载入含 _atom_site_aniso_U_* 的 .cif 即在 3D 主视图实时叠加半透明热椭球（随相机旋转、概率 50%·90% 可调），并保留经典白底二维投影对照。':
      'ORTEP upgrade: a .cif with _atom_site_aniso_U_* overlays live translucent thermal ellipsoids in the 3D view (rotate with camera, 50%/90% probability adjustable) plus a classic white-background 2D reference.',
    '晶面与晶习：BFDH 与 AE 模型在 3D 主视图实时生成晶习多面体并在各晶面标注 (hkl)；晶面解理（沿 (hkl) 的三维切片：Depth / Area / Displacement / 显示平面与边界实时联动，并保留二维投影对照）。':
      'Faces & Habit: BFDH and AE models generate live habit polyhedra in the 3D view with (hkl) labels; cleavage (3D slice along (hkl): Depth/Area/Displacement, plane & boundary update live, plus a 2D reference).',
    '完全自主实现，可学术与商用': 'Fully self-implemented; free for academic and commercial use',
    '软件许可': 'Software license',
    '软件许可（MIT License）': 'Software license (MIT License)',
    '数据与隐私': 'Data & privacy',
    '示例结构数据': 'Example structure data',
    '内置示例 CIF 均为可再分发数据：NaCl.cif 来自 Crystallography Open Database 条目 1000041（CC0 公有领域）；COF-5.cif 与 Cu-BTC.cif 来自 numat/RASPA2（MIT 许可）；其余 5 个有机分子晶体为用户提供/自有的 Olex2 精修结果。此前随包的 CSD/CCDC 导出数据已全部移除。完整来源、引用与许可全文见随包 THIRD_PARTY_NOTICES.md。':
      'All bundled example CIFs are redistributable: NaCl.cif comes from Crystallography Open Database entry 1000041 (CC0 public domain); COF-5.cif and Cu-BTC.cif come from numat/RASPA2 (MIT license); the other five organic molecular crystals are user-provided / own Olex2 refinements. CSD/CCDC-exported data previously shipped with the app has been removed. Full sources, citations and license texts are in the bundled THIRD_PARTY_NOTICES.md.',
    '免责声明': 'Disclaimer',
    '第三方开源组件': 'Third-party open-source components',
    'CrystaSee（晶见）为本地运行的晶体结构可视化与分析工具。本项目自行编写、拥有著作权的源码以 MIT License 开源（Copyright (c) 2026 Yang Ye）：任何人均可免费使用、复制、修改、合并、发布、分发、再授权及销售，包括商业用途，无须事先取得书面授权；唯一条件是保留版权声明与许可文本。许可全文见随包 LICENSE 文件。随软件分发的第三方组件、字体、示例结构数据与运行库不在本 MIT 授权范围内，仍按其各自许可条款执行（见下文及随包 THIRD_PARTY_NOTICES.md）。本软件按「原样」提供，不提供任何明示或暗示担保。':
      'CrystaSee is a locally-run crystal-structure visualization and analysis tool. Source code written and owned by this project is released under the MIT License (Copyright (c) 2026 Yang Ye): anyone may use, copy, modify, merge, publish, distribute, sublicense and/or sell copies for any purpose, including commercial use, without prior written authorization; the only condition is to retain the copyright notice and permission notice. The full license text is in the bundled LICENSE file. Third-party components, fonts, bundled example structures and runtime libraries are outside the scope of this MIT license and remain governed by their own respective licences (see below and the bundled THIRD_PARTY_NOTICES.md). The software is provided "as is", without express or implied warranty.',
    '所有结构解析与计算均在本地完成，零外部网络请求；结构文件与导出图片仅保存在用户本机。':
      'All structure parsing and computation run locally with zero network requests; structure files and exported images stay only on the user’s machine.',
    '计算结果（峰位、强度、体积、R 因子等）为基于结构模型的理论估算，仅供参考；精确值以实验与权威数据库为准。':
      'Computed results (peak positions, intensities, volumes, R factors, etc.) are theoretical estimates from the structure model and for reference only; authoritative values come from experiments and databases.',
    '本软件分发中包含以下开源组件，并遵照其许可条款保留版权与许可声明：':
      'This distribution includes the following open-source components, with copyright and license notices retained per their terms:',
    '各组件完整许可文本随安装包分发于对应的 .dist-info/licenses/ 目录；运行环境还依赖 Microsoft Edge WebView2 运行时（由微软单独许可）。':
      'Full license texts ship in the corresponding .dist-info/licenses/ directory; the runtime also depends on the Microsoft Edge WebView2 runtime (licensed separately by Microsoft).',
    '提交说明：': 'Submission notes: ',
    '提交后将唤起您系统默认的邮件客户端，并自动预填以下反馈内容（软件版本、当前结构等环境信息将一并附上）。若您选择了问题截图（最多 5 张），请在弹出的邮件中手动将这些图片添加为附件后再发送。我们收到后会尽快处理，感谢您的反馈！':
      'Submitting opens your default mail client with the report prefilled (software version, current structure and other environment details included). If you selected screenshots (up to 5), please manually add them as attachments before sending. We will get back to you shortly — thank you for your feedback!',
    '问题截图（可选，最多 5 张）': 'Screenshots (optional, up to 5)',
    '问题截图（可选）': 'Screenshot (optional)',
    '选择图片…': 'Choose images…',
    '清空全部': 'Clear all',
    '移除这张截图': 'Remove this screenshot',
    '移除截图': 'Remove screenshot',
    '问题文字描述': 'Problem description',
    '请尽量详细描述问题：复现步骤、期望行为、实际表现，以及出错时正在查看的结构或进行的操作等。':
      'Please describe the problem in detail: steps to reproduce, expected vs actual behaviour, and the structure/operation you were viewing when it occurred.',
    '请填写问题文字描述（必填）。': 'Please enter a problem description (required).',
    '取消': 'Cancel',
    '提交反馈': 'Submit feedback',
    '（如已上传问题截图，请在此邮件中添加该图片作为附件后发送。）':
      'If you uploaded a screenshot, please attach the image to this email before sending.)',

    /* ---------- 复合/数据标签（精确全句，避免片段错拼） ---------- */
    '结构文件': 'structure file',
    'ADBA Form I': 'ADBA Form I',
    'ADBA Form II': 'ADBA Form II',
    'ADBA Form III': 'ADBA Form III',
    'NaCl (halite, COD)': 'NaCl (halite, COD)',
    'COF-5 (COF)': 'COF-5 (COF)',
    'Cu-BTC (MOF)': 'Cu-BTC (MOF)',
    'NACL': 'NACL', 'COF5': 'COF5', 'CUBTC': 'CUBTC',

    /* ---------- 通用小词（仅保留安全的片段） ---------- */
    '文件': 'File',
    '原子': 'atom'
  };

  /* =======================================================================
     V1.11 补全：全量英文词条。
     旧版只收录了 358 个词条，且把「氢 / 显示 / 文件 / 原子 / 计算 / 强度」这类
     单字或通用词也放进「子串替换」正则里 —— 未收录的长句会被切成
     「已DisplayH键」「File读取失败」这类中英夹杂病句。
     新版策略：
       ① CS_TRANS + CS_EXTRA 先做「整串精确匹配」（含去空白容错）；
       ② 只有 ≥3 个汉字、且不在通用词黑名单里的词条才参与子串替换；
       ③ 残余中文由 CS_WORD（词级）兜底清除，并把中文标点转成半角；
     因此英文模式下界面不会残留任何中文，长句也不再被切碎。
     ======================================================================= */
  var CS_EXTRA = {
    /* ---------- 品牌 / 窗口 / 顶栏 ---------- */
    'CrystaSee晶见 | 晶体结构可视化与分析工作台 V1.14':
      'CrystaSee | Crystal Structure Visualization & Analysis Workbench V1.14',
    'CrystaSee晶见': 'CrystaSee',
    'CrystaSee晶见 V1.14 已就绪': 'CrystaSee V1.14 is ready',
    '晶见': 'CrystaSee',
    '晶见 LOGO': 'CrystaSee logo',
    '使用说明': 'User Guide',
    '界面语言': 'Interface language',
    '界面语言 / UI language': 'Interface language / UI language',
    '停靠位置': 'Dock position',
    '三维结构视图': '3D structure view',
    'a 轴朝里': 'a axis inward', 'b 轴朝里': 'b axis inward', 'c 轴朝里': 'c axis inward',
    'a 轴朝外': 'a axis outward', 'b 轴朝外': 'b axis outward', 'c 轴朝外': 'c axis outward',
    '透视投影（近大远小）': 'Perspective (near larger)',
    '正交投影（远近等大）': 'Orthographic (equal size)',
    '透视投影 · 近大远小（有景深）': 'Perspective · near larger (with depth)',
    '正交（无景深）': 'Orthographic (no depth)',
    '仅不对称单元（CIF 位点表）': 'Asymmetric unit only (CIF site list)',
    'Ball &amp; Stick 球棍': 'Ball & Stick',
    'Ball & Stick 球棍': 'Ball & Stick',
    'ORTEP（各向异性位移参数椭球）': 'ORTEP (anisotropic displacement ellipsoids)',
    '配位多面体': 'Coordination polyhedra',
    '配位多面体（Coordination Polyhedra）': 'Coordination polyhedra',
    '参数选择': 'Options',
    '背景': 'Background', '高对比': 'High contrast', '线状': 'Line', '棒状': 'Rod',
    '宽': 'Width', '高': 'Height', '标题': 'Title',
    '保留当前背景': 'Keep current background',
    '还原窗口': 'Restore window', '重新打开': 'Reopen',
    '窗口控制仅在桌面版中可用': 'Window controls are available in the desktop build only',

    /* ---------- 状态 / 提示 / 文件 ---------- */
    '正交（无景深）': 'Orthographic (no depth)',
    '堆积模式': 'Packing mode', '元素分族': 'Element groups',
    '色盲友好': 'Colour-blind friendly', '透明背景': 'Transparent background',
    '自定义颜色': 'Custom colour', '自定义尺寸': 'Custom size',
    '未知结构': 'Unknown structure', '当前结构': 'Current structure',
    '视角已复位': 'View reset',
    '已切换纯白背景（出版风）': 'Switched to pure-white background (publish style)',
    '已显示氢键（青绿色虚线）': 'H-bonds shown (teal dashed lines)',
    '已隐藏氢键': 'H-bonds hidden',
    '已显示范德华相互作用（橙色虚线）': 'vdW interactions shown (orange dashed lines)',
    '已隐藏范德华相互作用': 'vdW interactions hidden',
    '已载入案例：': 'Sample loaded: ',
    '渲染内核提示': 'Render kernel notice',
    '渲染内核尚未就绪。': 'Render kernel not ready yet.',
    '已载入结构：': 'Structure loaded: ',
    '文件读取失败': 'Failed to read file',
    '打开失败：': 'Open failed: ',
    '导出图…': 'Exporting image…',
    '已保存：': 'Saved: ',
    '已取消保存': 'Save cancelled',
    '保存失败：': 'Save failed: ',
    '保存失败': 'Save failed',
    '已触发下载：': 'Download started: ',
    '透明背景（Alpha）': 'Transparent background (alpha)',
    '。确认无误后点击「保存 PNG…」选择本机路径；透明背景会写入 Alpha 通道。</p>':
      '. Check the preview, then click "Save PNG…" to choose a local path; transparency is written to the alpha channel.</p>',
    '<button class="pp-btn primary" id="exp-save">保存 PNG…</button>':
      '<button class="pp-btn primary" id="exp-save">Save PNG…</button>',
    '保存 PNG…': 'Save PNG…',
    '已在浏览器打开外部链接': 'Link opened in browser',
    '打开链接失败：': 'Failed to open link: ',
    '无法打开链接（非桌面版）': 'Cannot open link (desktop build only)',
    '出版风：纸白 + 瓷器': 'Publish style: paper white + porcelain',
    '已回到酷炫默认': 'Back to cool default',
    '已收起参数面板': 'Parameter panel collapsed',
    '已显示参数面板': 'Parameter panel shown',
    '已导出': 'Exported',
    '重新计算': 'Recalculate', '计算中…': 'Computing…',
    '解析失败': 'Parse failed', '匹配失败': 'Match failed',
    '请先选择文件': 'Please select a file first',
    '【软件】': '[Software] ', '【当前结构】': '[Current structure] ',
    '【问题描述】': '[Problem description]', '【晶见问题反馈】': '[CrystaSee feedback] ',
    '（构建：': ' (Build: ',
    '已唤起邮件客户端，请补充截图附件后发送':
      'Mail client opened — attach the screenshot before sending',
    '已唤起邮件客户端，请将所选截图作为附件添加后发送':
      'Mail client opened — please attach the selected screenshots before sending',
    '问题截图（可选）': 'Screenshot (optional)',
    '清空全部': 'Clear all', '移除这张截图': 'Remove this screenshot',
    '最多 5 张，多余 ': 'Up to 5 images; ', ' 张已忽略': ' extra image(s) ignored',
    '已忽略 ': ' ignored: ', ' 个非图片文件': ' non-image file(s)',
    '已跳过 ': ' skipped: ', ' 张重复图片': ' duplicate image(s)',
    '已选 ': 'Selected ', ' 张': ' images',
    '唤起邮件失败：': 'Failed to open mail client: ',
    '已唤起邮件客户端': 'Mail client opened',
    '无法唤起邮件客户端': 'Could not open the mail client',
    '0 字': '0 characters', '字': ' characters',
    '问题截图预览': 'Screenshot preview',
    '"; alt="问题截图预览">': '"; alt="Screenshot preview">',
    '" alt="问题截图预览">': '" alt="Screenshot preview">',
    '后再发送。我们收到后会尽快处理，感谢您的反馈！':
      ' before sending. We will get back to you shortly — thank you for your feedback!',
    '提交后将唤起您系统默认的邮件客户端，并自动预填以下反馈内容（软件版本、当前结构等环境信息将一并附上）。若您选择了问题截图（最多 5 张），请在弹出的邮件中手动将这些图片添加为':
      'Submitting opens your default mail client with the report prefilled (software version, current structure and other environment details included). If you selected screenshots (up to 5), please manually add them as',
    '附件': 'attachment',
    '（如已上传问题截图，请在此邮件中添加该图片作为附件后发送。）':
      '(If you uploaded a screenshot, please attach it to this email before sending.)',
    '请填写问题文字描述（必填）。': 'Please enter a problem description (required).',

    /* ---------- 用户手册（截图中英文夹杂的重灾区） ---------- */
    '文件 ▸ 打开结构文件（或左侧「案例演示」）。支持 .cif / .mmcif / .mol / .mol2 / .xyz / .pdb；也可将文件直接拖入视图。':
      'File ▸ Open Structure File (or Sample Structures on the left). Supports .cif / .mmcif / .mol / .mol2 / .xyz / .pdb; you can also drag a file directly into the view.',
    '显示 ▸ 显示范围：仅晶胞内部 / 补全截断分子 / 仅不对称单元 / 堆积模式（单晶胞 · 补全分子）；超胞 a·b·c 可在左侧面板设 1–5。':
      'Display ▸ Display Range: unit-cell interior / complete cut-off molecules / asymmetric unit only / packing mode (single cell · complete molecules); the a·b·c supercell can be set to 1–5 in the left panel.',
    '显示 ▸ 相互作用：氢键显示（虚线）与范德华接触显示；两者亦可在「计算 ▸ 相互作用分析」中查看完整清单（供体 / 氢 / 受体 / 距离 / 角度）。':
      'Display ▸ Interactions: hydrogen bonds (dashed) and van der Waals contacts; both also have full lists (donor / H / acceptor / distance / angle) under Analysis ▸ Interaction Analysis.',
    'PXRD ▸ PXRD 模拟：选辐射/波长、2θ 上限、峰宽、Lorentz–偏振，计算并绘制谱图与峰表；导入实验谱做叠加对比（Rp / Rwp）。多 PXRD 对比可叠加多组实验谱；中子衍射模拟切换散射长度；格式转换导出 .txt / .CSV / .xlsx（Excel 工作簿）。':
      'PXRD ▸ PXRD Simulation: choose radiation/wavelength, 2θ upper limit, peak width and Lorentz–polarization, then compute the pattern and peak table; import an experimental spectrum to overlay and compare (Rp / Rwp). Multi-PXRD overlays several experimental patterns; neutron diffraction switches to scattering lengths; format conversion exports .txt / .CSV / .xlsx (Excel workbook).',
    '结构信息、相互作用分析、自由体积占比等量化工具；ORTEP 热椭球（计算 ▸ ORTEP 椭球展示）；晶面与晶习（BFDH 晶习模拟 / 晶面解理切片）。':
      'Quantitative tools such as Structure Info, Interaction Analysis and Free-volume fraction; ORTEP thermal ellipsoids (Analysis ▸ ORTEP ellipsoids); Faces & Habit (BFDH habit simulation / cleavage slices).',
    '在「计算 ▸ ORTEP 椭球展示」打开三维实时热椭球浮动面板：需载入含 _atom_site_aniso_U_* 的 .cif；3D 主视图以经典出版风叠加':
      'Open the live 3D thermal-ellipsoid panel under Analysis ▸ ORTEP ellipsoids: load a .cif containing _atom_site_aniso_U_*; the main 3D view overlays classic publication-style',
    '实心遮光热椭球': 'opaque shaded thermal ellipsoids',
    '（白底 + 黑色主轴十字 + 黑色化学键圆柱，随相机实时旋转），可切换 50%·90% 概率、按分子范围过滤（先在主视图用「分子」工具选取，再在面板勾选「仅显示所选分子」）并随时开关；关闭面板即恢复开启前显示（背景与球棍模型）。面板内保留经典白底二维投影对照（可拖拽旋转 / 缩放 / 沿 a·b·c 轴视角）。':
      ' (white background, black principal-axis crosses and black bond cylinders, rotating live with the camera). Switch between 50%/90% probability, filter by molecule (first pick molecules in the main view, then tick "Selected molecules only") and toggle at any time; closing the panel restores the previous background and ball-and-stick model. A classic white-background 2D projection reference is retained inside the panel (drag to rotate / zoom / view along a·b·c).',
    '已并入「计算」菜单：BFDH 模型（晶面间距 + 多重性表）在 3D 主视图生成晶习多面体并逐面标注 (hkl)，可调最大晶面指数、晶习尺寸、面透明度与颜色；晶面解理（沿 (hkl) 的三维切片，Depth / Area / Displacement / 显示平面与边界实时联动，另保留二维投影对照）。AE 附着能模型为后续待上线功能。':
      'Now under the Analysis menu: the BFDH model (d-spacing + multiplicity table) builds a habit polyhedron in the 3D view with (hkl) labels on each face; adjust max hkl index, habit size, face opacity and colour. Cleavage produces a 3D slice along (hkl) with linked Depth / Area / Displacement / plane and boundary, plus a 2D reference. The AE attachment-energy model is planned for a later release.',
    '左侧面板「图片导出」选分辨率 / 背景（含透明 PNG），点「导出 PNG 图片」；或文件 ▸ 保存 / 另存为图片。':
      'In the left panel, use Image Export to pick resolution / background (including transparent PNG) and click "Export PNG image"; or use File ▸ Save / Save Image As.',
    '1–6 切换模型 · O 投影 · P 出版风 · S 酷炫默认 · R 复位视角 · 空格 自动旋转 · H 收起面板。':
      '1–6 switch model · O projection · P publish style · S cool default · R reset view · Space auto-rotate · H collapse panel.',
    '打开结构': 'Open Structure', '导出图片': 'Export Image',
    '晶面与晶习': 'Faces & Habit', '计算 · ORTEP': 'Analysis · ORTEP',
    '快捷键': 'Shortcuts',

    /* ---------- 关于 / 版本 ---------- */
    'V1.10 新增': 'V1.10 added', 'V1.11 新增': 'V1.11 added', 'V1.12 新增': 'V1.12 added', 'V1.13 新增': 'V1.13 added', 'V1.14 新增': 'V1.14 added',
    'V1.0 起，后续版本统一为两位数字（V1.1 / V1.2 … V2.0）':
      'Starting with V1.0, all versions use a two-part number (V1.1 / V1.2 … V2.0)',
    '完全自主实现，不内置任何商业晶体学数据库或专有算法；仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问；仅解析开放的 CIF / COD 等公开格式，可学术与商用':
      'Fully self-implemented, with no bundled commercial crystallographic database or proprietary algorithm; only external links to public online services (CCDC deposition / CheckCif / COD), opened independently in the user’s browser; parses only open formats such as CIF / COD; free for academic and commercial use',
    '本软件完全自主实现：不内置任何商业晶体学数据库或专有算法；仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问，仅解析开放的 CIF / COD 等公开格式。散射因子采用国际晶体学表（Cromer–Mann / 中子相干散射长度）公开参数。':
      'This software is fully self-implemented: no bundled commercial crystallographic database or proprietary algorithm; only external links to public online services (CCDC deposition / CheckCif / COD) opened independently in the user’s browser; parses only open formats such as CIF / COD. Scattering factors use published International Tables parameters (Cromer–Mann / neutron coherent scattering lengths).',
    '完全自主实现，可学术与商用': 'Fully self-implemented; free for academic and commercial use',
    '纯本地运行 · 无外部网络': 'Fully local · no network',
    '界面语言改为顶栏下拉选择框：按钮显示当前语言全称（简体中文 / English）并带展开箭头，点击展开二选一菜单，当前项高亮，选择后即时切换并记忆；「计算 ▸ 配位多面体」新增独立 3D 叠加层（面颜色 / 透明度、边线颜色 / 半径、顶点与中心原子、中心—配体键等可调），多面体从「渲染风格」中移除，底层球棍与配体球 / 键完整保留。':
      'Interface language is now a top-bar dropdown: the button shows the full current language name (简体中文 / English) with a chevron and opens a two-option menu with the active item highlighted; the choice applies instantly and is remembered. Analysis ▸ Coordination Polyhedra adds a standalone 3D overlay with adjustable face colour / opacity, edge colour / radius, vertex and centre atoms, and centre–ligand bonds; polyhedra were removed from Render Style, and the underlying ball-and-stick model with ligand spheres and bonds is fully retained.',
    '分子堆叠 / 晶体堆叠集成 SNAP（snapRMSD）算法：基于分子图 1-WL 不变量、回溯图同构与自同构群枚举，自动寻找对称等价原子的最优置换，取单一全局 Kabsch 最小 RMSD，彻底解决「两个基本一致的构象 RMSD 却虚高」的问题；堆叠结果视图改为白底多分子叠加、每分子独立配色并附色块图例。':
      'Molecule / crystal stacking now integrates SNAP (snapRMSD): molecular-graph 1-WL invariants, backtracking graph isomorphism and automorphism enumeration find the optimal permutation of symmetry-equivalent atoms and a single global Kabsch minimum RMSD, eliminating artificially high RMSD for near-identical conformers. The result view uses a white background with individually coloured molecules and a colour legend.',
    '① 界面语言改为顶栏下拉选择框（简体中文 / English），首次启动按安装电脑的系统语言自动切换，英文模式下全界面（菜单 / 手册 / 关于 / 反馈 / 各分析面板 / 三维内核）均为英文，手动选择后记忆优先。<br>② 其余功能与 V1.11 一致：配位多面体独立 3D 叠加层、分子堆叠 SNAP（snapRMSD）算法、ORTEP 经典出版风实心遮光热椭球、晶面与晶习 BFDH / 晶面解理等。':
      '① Interface language is now a top-bar dropdown (Simplified Chinese / English). On first launch it follows the operating-system language automatically; in English mode the entire UI — menus, manual, About, feedback, all analysis panels and the 3D kernel — is in English. A manual choice is remembered and takes priority.<br>② Other features match V1.11: standalone 3D coordination-polyhedra overlay, SNAP (snapRMSD) molecular stacking, classic publication-style opaque ORTEP ellipsoids, BFDH Faces & Habit and cleavage slices.',
    '① 语言选择由顶部下拉框改为分段切换按键（中文 / EN），选中项蓝底高亮，点击即时切换界面语言。':
      '① Interface language is now a top-bar dropdown (简体中文 / English) with automatic OS-language detection on first launch.',
    '② 其余功能与 V1.10 一致：分子堆叠 SNAP（snapRMSD）算法、ORTEP 经典出版风实心遮光热椭球（支持仅显示所选分子）、晶面与晶习 BFDH / 晶面解理等。':
      '② Other features: SNAP (snapRMSD) molecular stacking, classic publication-style opaque ORTEP ellipsoids (selected molecules only), BFDH Faces & Habit and cleavage slices.',
    /* <br> 会把「本版更新」拆成两个文本节点，两段各自也要有整句译文 */
    '① 界面语言改为顶栏下拉选择框（简体中文 / English），首次启动按安装电脑的系统语言自动切换，英文模式下全界面（菜单 / 手册 / 关于 / 反馈 / 各分析面板 / 三维内核）均为英文，手动选择后记忆优先。':
      '① Interface language is now a top-bar dropdown (Simplified Chinese / English). On first launch it follows the operating-system language automatically; in English mode the entire UI — menus, manual, About, feedback, all analysis panels and the 3D kernel — is in English. A manual choice is remembered and takes priority.',
    '② 其余功能与 V1.11 一致：配位多面体独立 3D 叠加层、分子堆叠 SNAP（snapRMSD）算法、ORTEP 经典出版风实心遮光热椭球、晶面与晶习 BFDH / 晶面解理等。':
      '② Other features match V1.11: standalone 3D coordination-polyhedra overlay, SNAP (snapRMSD) molecular stacking, classic publication-style opaque ORTEP ellipsoids, BFDH Faces & Habit and cleavage slices.',

    /* ---------- V1.12 本版更新（<br> 会拆成两个文本节点，整串 + 两段都要有译文） ---------- */
    '① 修复英文界面下「问题反馈」输入框提示仍显示中文；问题截图由单张改为可选 0–5 张，可逐张移除或一键清空。<br>② 完成第三方代码许可证、著作权与专利合规审查：补齐开源组件归属声明，分子堆叠 RMSD 改为独立实现并标注公开文献来源。':
      '① Fixed a Chinese placeholder remaining in the feedback form in English mode; screenshots are now optional (0–5 images) with per-image removal and Clear all.<br>② Completed a compliance review of third-party code licences, copyright and patents: added open-source attribution notices and rewrote the stacking RMSD routine as an independent implementation citing the public preprint.',
    '① 修复英文界面下「问题反馈」输入框提示仍显示中文；问题截图由单张改为可选 0–5 张，可逐张移除或一键清空。':
      '① Fixed a Chinese placeholder remaining in the feedback form in English mode; screenshots are now optional (0–5 images) with per-image removal and Clear all.',
    '② 完成第三方代码许可证、著作权与专利合规审查：补齐开源组件归属声明，分子堆叠 RMSD 改为独立实现并标注公开文献来源。':
      '② Completed a compliance review of third-party code licences, copyright and patents: added open-source attribution notices and rewrote the stacking RMSD routine as an independent implementation citing the public preprint.',
    '修复英文界面下「问题反馈」输入框提示仍显示中文；问题截图由单张改为可选 0–5 张，支持逐张移除与一键清空；完成第三方代码许可证、著作权与专利合规审查，补齐开源组件归属声明与数据来源记录。':
      'Fixed a Chinese placeholder remaining in the feedback form in English mode; screenshots are now optional (0–5 images) with per-image removal and Clear all; completed a compliance review of third-party code licences, copyright and patents, and added open-source attribution notices and data-source records.',

    /* ---------- V1.13 字体统一：许可声明 / 关于页 / 本版更新（中英同步） ---------- */
    '字体声明 · HarmonyOS Sans Fonts': 'Font notice · HarmonyOS Sans Fonts',
    '字体': 'Fonts',
    '本软件界面全部文字均使用 HarmonyOS Sans SC 字体：标题、软件名等使用 HarmonyOS Sans SC Black，正文与详细内容使用 HarmonyOS Sans SC Regular。字体著作权归华为终端有限公司所有（Copyright 2021 Huawei Device Co., Ltd.），依《HarmonyOS Sans Fonts License Agreement》以未经修改的原始 TTF 文件随本软件捆绑分发，允许免费商业使用；本软件未对该字体作任何修改，亦未单独分发该字体。协议全文见随包 _internal/ui/fonts/LICENSE.txt，资产登记见 THIRD_PARTY_NOTICES.md 附录 D。':
      'All interface text uses HarmonyOS Sans SC: headings and the product name use HarmonyOS Sans SC Black, while body text and detailed content use HarmonyOS Sans SC Regular. The fonts are copyright (c) 2021 Huawei Device Co., Ltd. and are bundled with this software as unmodified original TTF files under the HarmonyOS Sans Fonts License Agreement, which permits royalty-free commercial use. This software does not modify the fonts in any way and does not redistribute them on a stand-alone basis. The full agreement ships at _internal/ui/fonts/LICENSE.txt; the asset register is in appendix D of THIRD_PARTY_NOTICES.md.',
    '界面使用 HarmonyOS Sans SC（Black / Regular 两个字重），© 2021 Huawei Device Co., Ltd.，依 HarmonyOS Sans Fonts License Agreement 随软件捆绑分发；协议全文见随包 fonts/LICENSE.txt，完整登记见 THIRD_PARTY_NOTICES.md 附录 D。':
      'The interface uses HarmonyOS Sans SC (Black / Regular weights), (c) 2021 Huawei Device Co., Ltd., bundled under the HarmonyOS Sans Fonts License Agreement. The full agreement ships at fonts/LICENSE.txt; the complete register is in appendix D of THIRD_PARTY_NOTICES.md.',
    '界面字体统一为 HarmonyOS Sans SC：标题与软件名使用 Black 字重，详细内容使用 Regular 字重；按许可协议在「使用许可」中显著声明字体归属，并以未经修改的原始 TTF 随包分发、附协议全文。':
      'The interface now uses HarmonyOS Sans SC throughout: Black for headings and the product name, Regular for detailed content. A prominent font attribution notice appears in the Software License dialog as required by the licence, and the unmodified original TTF files ship with the full agreement.',
    '① 界面字体统一为 HarmonyOS Sans SC（标题 / 软件名使用 Black 字重，正文与详细内容使用 Regular 字重），并在「使用许可」弹窗中显著声明字体归属与许可、随包保留协议全文。<br>② 其余功能与 V1.12 一致：元素基础数据统一为单一权威数据源、配位多面体、PXRD 多谱叠加对比、ORTEP、晶面与晶习、自由体积等。':
      '① The interface now uses HarmonyOS Sans SC throughout (Black for headings and the product name, Regular for body text), with a prominent font attribution and licence notice in the Software License dialog and the full agreement bundled.<br>② Other features match V1.12: a single authoritative source for all element data, coordination polyhedra, PXRD multi-pattern overlay, ORTEP, faces & habit, free volume, etc.',
    '① 界面字体统一为 HarmonyOS Sans SC（标题 / 软件名使用 Black 字重，正文与详细内容使用 Regular 字重），并在「使用许可」弹窗中显著声明字体归属与许可、随包保留协议全文。':
      '① The interface now uses HarmonyOS Sans SC throughout (Black for headings and the product name, Regular for body text), with a prominent font attribution and licence notice in the Software License dialog and the full agreement bundled.',
    '② 其余功能与 V1.12 一致：元素基础数据统一为单一权威数据源、配位多面体、PXRD 多谱叠加对比、ORTEP、晶面与晶习、自由体积等。':
      '② Other features match V1.12: a single authoritative source for all element data, coordination polyhedra, PXRD multi-pattern overlay, ORTEP, faces & habit, free volume, etc.',

    /* ---------- V1.14：ORTEP 归口 / 原子与键着色 / 键选择（中英同步） ---------- */
    'ORTEP 椭球展示从「显示」菜单移至「计算」菜单；新增「原子 / 键着色」——可用取色器逐对象自定义颜色，也可一键应用至所有同元素原子与对应键半段，并恢复元素默认配色；右侧选择工具新增「化学键」模式，可点选单根化学键并查看成键元素与键长。':
      'ORTEP ellipsoids moved from the Display menu to the Analysis menu; added Atom / Bond Colouring — customise colours per object with a colour picker, apply one colour to every atom of the same element (and its matching bond halves), or restore the element default; the right-side selection tool gains a Bond mode to click a single bond and view its bonded elements and length.',
    '① ORTEP 椭球展示从「显示 ▸ ORTEP」调整到「计算 ▸ ORTEP」，与其分析类功能归口一致。':
      '① ORTEP ellipsoids moved from Display ▸ ORTEP to Analysis ▸ ORTEP, grouping it with the other analysis functions.',
    '② 新增「原子 / 键着色」：点选原子或化学键后可逐对象自定义颜色；「应用至所有同元素」让 C、O 等全部原子与对应键半段同步改色，也可恢复该元素默认配色。':
      '② Added Atom / Bond Colouring: select an atom or bond to customise it individually; Apply to All Same Elements recolours every atom of C, O, etc. together with the corresponding bond halves, and can also restore the element default.',
    '③ 右侧选择工具新增「化学键」模式：点选单根化学键即整体高亮，显示成键元素与键长；其余功能与 V1.13 一致。':
      '③ The right-side selection tool gains a Bond mode: clicking a single bond highlights it as a whole and shows the bonded elements and length; all other features match V1.13.',
    '① ORTEP 椭球展示从「显示 ▸ ORTEP」调整到「计算 ▸ ORTEP」，与其分析类功能归口一致。<br>② 新增「原子 / 键着色」：点选原子或化学键后可逐对象自定义颜色；「应用至所有同元素」让 C、O 等全部原子与对应键半段同步改色，也可恢复该元素默认配色。<br>③ 右侧选择工具新增「化学键」模式：点选单根化学键即整体高亮，显示成键元素与键长；其余功能与 V1.13 一致。':
      '① ORTEP ellipsoids moved from Display ▸ ORTEP to Analysis ▸ ORTEP, grouping it with the other analysis functions.<br>② Added Atom / Bond Colouring: select an atom or bond to customise it individually; Apply to All Same Elements recolours every atom of C, O, etc. together with the corresponding bond halves, and can also restore the element default.<br>③ The right-side selection tool gains a Bond mode: clicking a single bond highlights it as a whole and shows the bonded elements and length; all other features match V1.13.',

    /* ---------- 许可 ---------- */
    '本软件核心代码自主实现；不内置商业晶体学数据库检索功能，仅提供跳转至公开在线服务（CCDC 沉积号 / CheckCif / COD）的外部链接，由用户浏览器独立访问，仅解析开放的 CIF / COD 等公开格式。随附演示结构文件与散射因子参数的来源、权属及授权状态详见随包 THIRD_PARTY_NOTICES.md；散射因子采用国际晶体学表（Cromer–Mann / 中子相干散射长度）公开参数。':
      'The core code is an independent implementation. No commercial crystallographic database is embedded; the app only links to public online services (CCDC deposition numbers / CheckCif / COD), opened separately in the user browser, and parses open formats such as CIF / COD. Provenance, ownership and licensing of the bundled demo structure files and scattering-factor parameters are documented in the accompanying THIRD_PARTY_NOTICES.md; scattering factors use published International Tables (Cromer-Mann / neutron coherent scattering lengths) parameters.',
    '本软件分发中包含以下开源组件，并遵照其许可条款保留版权与许可声明：three.js 0.160.0（MIT，© 2010–2023 Three.js Authors，三维渲染内核）；pywebview 6.2.1（BSD-3-Clause，© 2014–2017 Roman Sirokov，原生窗口外壳）；pythonnet 3.2.1、clr-loader 0.3.1、cffi 2.1.1（MIT-0）、setuptools 84.2.1、domJSON 0.1.2（MIT，© 2013 Alex Zaslavsky）；three.js 的 RoomEnvironment 模块源自 google/model-viewer（Apache-2.0），随 three.js MIT 发行版提供。pywebview 未启用的可选 SSL 依赖 cryptography 已从发行包排除。随包的 OpenSSL 3.x 运行库（libcrypto-3.dll / libssl-3.dll，Apache-2.0）为 CPython 运行时自身所需，并非 cryptography 组件，已按条款单独登记。完整许可文本、Apache-2.0 专项记录与数据来源说明见随包 THIRD_PARTY_NOTICES.md 及 _internal 内各 .dist-info/licenses/ 目录；运行环境另依赖 Microsoft Edge WebView2 运行时与 VC++ 运行库（各自单独许可）。':
      'This distribution contains the following open-source components, with copyright and licence notices retained per their terms: three.js 0.160.0 (MIT, 2010-2023 Three.js Authors, 3D render kernel); pywebview 6.2.1 (BSD-3-Clause, 2014-2017 Roman Sirokov, native window shell); pythonnet 3.2.1, clr-loader 0.3.1, cffi 2.1.1 (MIT-0), setuptools 84.2.1 and domJSON 0.1.2 (MIT, 2013 Alex Zaslavsky); and three.js RoomEnvironment, derived from google/model-viewer (Apache-2.0) and shipped as part of the MIT-licensed three.js distribution. The unused optional pywebview SSL dependency, cryptography, has been removed from the distribution. The bundled OpenSSL 3.x runtime (libcrypto-3.dll / libssl-3.dll, Apache-2.0) is required by the CPython runtime itself rather than by cryptography and is registered under its own terms. Full licence texts, the Apache-2.0 register and data-source notes are in THIRD_PARTY_NOTICES.md and the .dist-info/licenses/ folders under _internal. The runtime additionally depends on the Microsoft Edge WebView2 runtime and the VC++ redistributables, each licensed separately.',
    'CrystaSee（晶见）为本地运行的晶体结构可视化与分析工具。本项目自行编写、拥有著作权的源码以 MIT License 开源（Copyright (c) 2026 Yang Ye）：任何人均可免费使用、复制、修改、合并、发布、分发、再授权及销售，包括商业用途，无须事先取得书面授权；唯一条件是保留版权声明与许可文本。许可全文见随包 LICENSE 文件。随软件分发的第三方组件、字体、示例结构数据与运行库不在本 MIT 授权范围内，仍按其各自许可条款执行（见下文及随包 THIRD_PARTY_NOTICES.md）。本软件按「原样」提供，不提供任何明示或暗示担保。':
      'CrystaSee is a locally-run crystal-structure visualization and analysis tool. Source code written and owned by this project is released under the MIT License (Copyright (c) 2026 Yang Ye): anyone may use, copy, modify, merge, publish, distribute, sublicense and/or sell copies for any purpose, including commercial use, without prior written authorization; the only condition is to retain the copyright notice and permission notice. The full license text is in the bundled LICENSE file. Third-party components, fonts, bundled example structures and runtime libraries are outside the scope of this MIT license and remain governed by their own respective licences (see below and the bundled THIRD_PARTY_NOTICES.md). The software is provided "as is", without express or implied warranty.',
    '本软件分发中包含以下开源组件，并遵照其许可条款保留版权与许可声明：<br>· three.js（MIT License，© 2010–2023 Three.js Authors）—— 三维渲染内核（WebGL），其许可头已内联于渲染内核源码；<br>· pywebview（BSD 3-Clause License，© 2014–2017 Roman Sirokov）—— 原生窗口外壳（Python 绑定）；<br>· pythonnet（MIT License，© 2006–2021 the contributors of the Python.NET project）—— .NET/CLR 互操作。<br>各组件完整许可文本随安装包分发于对应的 .dist-info/licenses/ 目录；运行环境还依赖 Microsoft Edge WebView2 运行时（由微软单独许可）。':
      'This distribution includes the following open-source components, with copyright and license notices retained per their terms:<br>· three.js (MIT License, © 2010–2023 Three.js Authors) — 3D WebGL render kernel, license header inlined in the kernel source;<br>· pywebview (BSD 3-Clause License, © 2014–2017 Roman Sirokov) — native window shell (Python bindings);<br>· pythonnet (MIT License, © 2006–2021 the contributors of the Python.NET project) — .NET/CLR interop.<br>Full license texts ship in the corresponding .dist-info/licenses/ directory; the runtime also depends on the Microsoft Edge WebView2 runtime (licensed separately by Microsoft).',

    /* ---------- PXRD 格式转换 / 谱图 ---------- */
    '厂商格式 → .txt / .CSV / .xlsx': 'Vendor format → .txt / .CSV / .xlsx',
    '选择实验谱文件…': 'Select experimental spectrum file…',
    '保留表头注释行': 'Keep header comment line',
    '导出 .txt': 'Export .txt', '导出 .CSV': 'Export .CSV', '导出 .xlsx': 'Export .xlsx',
    '将厂商 / GSAS 等格式实验谱（2θ, 强度[, σ]）统一转换为纯文本、CSV 或 Excel 工作簿。当前支持 .txt / .CSV / .xlsx 导出：.xlsx 是含「2θ / 强度 / σ」多列数值的真正工作簿，可直接用 Excel、WPS 打开绘图；勾选「保留表头注释行」时会在首行写入原文件名。输入侧仍为文本谱（仪器二进制 .raw 暂不支持）。':
      'Convert vendor / GSAS experimental spectra (2θ, intensity[, σ]) into plain text, CSV or an Excel workbook. Exports to .txt / .CSV / .xlsx are supported; .xlsx is a real workbook with separate 2θ / intensity / σ columns that opens directly in Excel or WPS for plotting. With "Keep header comment line" ticked, the original filename is written to the first row. Input must still be a text spectrum (binary instrument .raw files are not supported).',
    '无法从该文件解析出至少两列数值（2θ, 强度）。请确认是 .xy/.xye/.csv/.txt 等文本格式（仪器二进制 .raw 暂不支持）。':
      'Could not parse at least two numeric columns (2θ, intensity) from this file. Please use a text format such as .xy/.xye/.csv/.txt (binary instrument .raw files are not supported).',
    '白底多谱叠加对比：模拟谱蓝色曲线，多组实验谱以不同颜色叠加。导入 .xy/.xye/.csv/.txt 文本谱；仪器二进制 .raw 暂不支持（会提示）。':
      'White-background multi-pattern overlay: the simulated pattern is blue and multiple experimental patterns are overlaid in distinct colours. Import .xy/.xye/.csv/.txt text spectra; binary instrument .raw files are not supported (a notice is shown).',
    '尚未导入实验谱。导入后此处显示模拟峰与实验峰的逐项匹配（含 Δ2θ）与一致性指标 Rp / Rwp。':
      'No experimental spectrum imported yet. After import, per-peak matching of calculated and observed peaks (including Δ2θ) and the Rp / Rwp agreement factors appear here.',
    '实验谱数据对比': 'Experimental data comparison',
    '谱图画布不可用': 'Plot canvas unavailable',
    '谱图尚未计算完成': 'Pattern calculation not finished',
    '读取实验谱失败': 'Failed to read experimental spectrum',
    '不支持的导出格式：': 'Unsupported export format: ',
    '.png 图片': '.png image', '.jpg 图片': '.jpg image',
    '.txt 数据': '.txt data', '.csv 数据': '.csv data', '.raw 数据': '.raw data',
    '多组实验谱对比': 'Multi-pattern comparison',
    '多谱叠加对比': 'Multi-pattern overlay',
    '实验谱峰匹配（模拟峰 ↔ 实验峰）': 'Peak matching (calc. ↔ exp.)',
    '差谱（模拟 − 实验，按自身最大残差缩放）': 'Difference (calc. − exp., scaled by its own max residual)',
    '模拟峰位表': 'Calculated peak table',
    '按最强峰对齐': 'Align to strongest peak',
    '辐射 / 波长：': 'Radiation / wavelength: ',
    '波长 λ (Å)': 'Wavelength λ (Å)',
    '匹配容差 Δ2θ': 'Match tolerance Δ2θ',
    '2θ 范围': '2θ range', '结束 2θ (°)': 'End 2θ (°)', '步长 (°)': 'Step (°)',
    '相对 (%)': 'Relative (%)', '多重性': 'Multiplicity',
    'Lorentz–偏振': 'Lorentz–polarization',
    '显示差谱': 'Show difference', '■ 模拟': '■ Calc.',
    '· 实验谱已叠加': '· experimental pattern overlaid',
    '· 匹配模拟峰': '· matched calculated peaks',
    '自动取自 CIF 的 _diffrn_radiation_wavelength':
      'Automatically read from the CIF _diffrn_radiation_wavelength',
    '当前结构未提供 CIF 辐射字段，使用默认 Cu Kα':
      'The current structure has no CIF radiation field; using default Cu Kα',
    '手动指定波长（CIF 值': 'Manual wavelength (CIF value',
    '自动（实取': 'Auto (actual ',
    '唯一位点': 'unique sites', '导出格式': 'Export format',
    '未读取到原子': 'No atoms read', '晶胞数据无效': 'Invalid cell data',
    '注意：以下元素缺少文献基础数据，已按统一回退值处理，相关结果仅供参考：':
      'Note: literature data are unavailable for the following elements; a uniform fallback was applied, so related results are indicative only:',
    '缺少晶胞数据。': 'Cell data missing.',
    '（CIF 缺少晶胞参数 _cell_length_* / _cell_angle_*）':
      '(CIF is missing cell parameters _cell_length_* / _cell_angle_*)',
    '（CIF 缺少 _atom_site 坐标循环）': '(CIF is missing the _atom_site coordinate loop)',

    /* ---------- 结构信息 / 相互作用 ---------- */
    '晶胞 a=': 'Cell a=', '（由坐标反演）': '(inverted from coordinates)',
    '晶胞未知': 'Cell unknown',
    '半轴 aᵢ = √(−ln(1−p)·λᵢ)，λᵢ 为笛卡尔 U 张量特征值，主轴由特征向量给出。对称等价原子按 CIF 标签 / 模 1 分数坐标匹配 ADP，纯平移副本共用同一张量（方向不随对称操作旋转，属近似）。':
      'Semi-axes aᵢ = √(−ln(1−p)·λᵢ), where λᵢ are the eigenvalues of the Cartesian U tensor and the principal axes are its eigenvectors. Symmetry-equivalent atoms are matched to ADPs by CIF label / modulo-1 fractional coordinates; pure translational copies share the same tensor (directions are not rotated by symmetry operations — an approximation).',
    '或其等价 B 因子）。': 'or equivalent B factors).',
    '的 .cif 后再试。': '.cif file and try again.',
    'ORTEP 需要结构含各向异性位移参数（CIF 的':
      'ORTEP requires anisotropic displacement parameters (CIF',
    '请在「文件 ▸ 打开结构文件」载入一个含上述字段的':
      'Please use File ▸ Open Structure File to load a file containing those fields',
    '三维实时椭球由渲染内核的独立叠加层绘制（默认关闭、不影响已定版球棍渲染）。当前结构缺少可解析的 CIF 文本或各向异性参数，请载入含':
      'Live 3D ellipsoids are drawn as a separate overlay in the render kernel (off by default; the finalized ball-and-stick rendering is unaffected). The current structure has no parseable CIF text or anisotropic parameters — please load a',
    '取 t ∝ 1/d（大面间距的面生长慢、暴露面积大），各晶面在 3D 主视图实时标注 (hkl)，随相机一起旋转。':
      'Using t ∝ 1/d (faces with larger d-spacing grow slowly and expose more area), each face is labelled (hkl) live in the 3D view and rotates with the camera.',
    'Wulff 构造：按劳埃类展开完整晶面族，每个晶面族取半空间 n·x ≤ t。':
      'Wulff construction: expand the full face family by Laue class and take the half-space n·x ≤ t for each family.',
    '仅显示最短的 ': 'Showing only the shortest ',
    ' 条，共识别 ': ' contacts, ',
    ' 条。': ' detected in total.',
    '分析晶体中的分子堆积模式与分子间相互作用（氢键、卤键、π–π、CH···π、范德华接触等）':
      'Analyse molecular packing motifs and intermolecular interactions (H-bonds, halogen bonds, π–π, CH···π, van der Waals contacts, …)',
    '读取已展开的晶胞 / 超胞，按对称等价与最短接触距离识别分子内与分子间键':
      'Read the expanded cell / supercell and identify intra- and intermolecular bonds from symmetry equivalence and shortest contact distances',
    '计算分子对之间的距离、角度与几何参数，输出接触图谱与统计':
      'Compute distances, angles and geometry for molecule pairs; output a contact map and statistics',
    '在三维视图中高亮标记相互作用，支持阈值筛选与导出报告':
      'Highlight interactions in the 3D view with threshold filtering and report export',
    '根据晶体结构计算粉末 X 射线衍射图谱（峰位、相对强度、全谱），用于物相鉴定与峰归属':
      'Compute a powder X-ray diffraction pattern (peak positions, relative intensities, full profile) from the crystal structure for phase identification and peak assignment',
    '从结构计算晶面间距 d 与结构因子 F':
      'Compute d-spacings and structure factors F from the structure',
    '按 Debye–Scherrer / 峰形函数合成衍射图谱':
      'Synthesize the diffraction pattern with Debye–Scherrer / profile functions',
    '叠加 Kα 双线、展宽与背景，输出可对比的模拟谱':
      'Add the Kα doublet, broadening and background to produce a comparable simulated pattern',
    '基于生长形貌理论（如 BFDH）预测晶体的理想外形，对比不同环境下生长得到的晶习':
      'Predict the ideal crystal shape from growth-morphology theory (e.g. BFDH) and compare habits grown under different conditions',
    '解析晶面间距与对称等价的晶面族':
      'Resolve d-spacings and symmetry-equivalent face families',
    '按选定模型计算各晶面相对生长速率并生成生长形':
      'Compute relative growth rates per face for the chosen model and generate the growth form',
    '交互调整主导晶面、可视化习最终外形':
      'Interactively adjust dominant faces and visualize the final habit',
    '该模块将在后续版本中开放（规划方案如下），V1.0 聚焦于三维可视化与出版级图片导出。当前可执行的部分（结构读取、晶胞展开、超胞、视角与图片导出）已在主界面提供。':
      'This module will be enabled in a later release (planned below); V1.0 focuses on 3D visualization and publication-quality image export. The parts already available (structure reading, cell expansion, supercells, views and image export) are in the main interface.',
    '规划的功能步骤': 'Planned steps',
    '修改后立即应用于相互作用分析清单与三维可视化窗口':
      'Changes apply immediately to the interaction-analysis list and the 3D view',
    '氢键几何定义（默认标准值）': 'H-bond geometry (standard defaults)',
    ' Å · D–H···A 夹角下限': ' Å · Minimum D–H···A angle',
    "Å' +\r\n      ' &nbsp;·&nbsp; D–H···A 夹角下限":
      "Å' +\r\n      ' &nbsp;·&nbsp; Minimum D–H···A angle",
    '切断 H': 'Cut-off H', '切断 vdW': 'Cut-off vdW', 'H…接触': 'H…contacts',
    '范德华接触': 'vdW contacts',
    '二维投影对照（经典 ORTEP 白底）': '2D reference (classic white ORTEP)',
    '二维投影对照（旧版）': '2D reference (legacy)',
    '二维投影 · 显示原子': '2D projection · show atoms',
    '拖拽旋转 / 滚轮缩放': 'Drag to rotate / scroll to zoom',
    '仅显示所选分子': 'Selected molecules only',
    '分子范围（可选）': 'Molecule scope (optional)',
    '应用所选分子': 'Apply selected molecules',
    '尚未选择分子：请用右侧「分子」工具在视图中选取后，点「应用所选分子」':
      'No molecules selected: pick them with the Molecule tool on the right, then click "Apply selected molecules"',
    '个分子（右侧「分子」工具选取）；勾选上方复选框即仅显示这些分子':
      ' molecules (pick with the Molecule tool on the right); tick the checkbox above to show only these',
    '分子 / 连通分量（已选': 'Molecules / connected components (selected ',
    '个）': ' selected)',
    '">分子 #': '">Molecule #',
    '缺失分子补全': 'Complete missing molecules',
    '个原子（点「缺失分子补全」按当前半径刷新）':
      ' atoms (click "Complete missing molecules" to refresh with the current radii)',
    '注：离子 / 无限网络晶体（如 NaCl）整体为一个连通分量。':
      'Note: ionic / infinite-network crystals (e.g. NaCl) form a single connected component.',

    /* ---------- 堆叠 ---------- */
    '不同来源的分子 / 晶型以不同颜色区分，全部叠加于同一张 3D 视图中对比（拖拽旋转，滚轮缩放）。右侧图例标明各分子 / 晶型配色。下方表格为跨文件最优刚体叠合（Kabsch）后的最小 RMSD 数值。':
      'Molecules / polymorphs from different sources are colour-coded and overlaid in one 3D view for comparison (drag to rotate, scroll to zoom). The legend on the right maps each colour; the table below lists the minimum RMSD after optimal cross-file rigid-body superposition (Kabsch).',
    'RMSD（Å，越接近 0 表示相似度越高）。支持多文件导入，每导入一个文件完成一次选择；至少选择两个已就绪文件后运行。':
      'RMSD (Å; closer to 0 means higher similarity). Multiple files can be imported, one selection per file; select at least two ready files before running.',
    '两个及以上晶体结构': 'At least two crystal structures',
    '两个及以上分子': 'At least two molecules',
    '分子 / 晶型配色': 'Molecule / polymorph colours',
    '旋转角 / 分子式': 'Rotation angle / formula',
    '种子分子': 'Seed molecule', '参考': 'Reference', '目标': 'Target',
    '对比文件': 'Comparison file', '匹配原子': 'Matched atoms',
    '返回选择': 'Back to selection',
    '可重复选择以追加多个文件': 'Repeat the selection to append more files',
    '· 分子': '· molecule', '个分子 ·': ' molecules ·',
    '单分子堆叠（原子匹配 + RMSD）': 'Single-molecule overlay (atom matching + RMSD)',
    '晶体结构堆叠（分子匹配 + RMSD）': 'Crystal stacking (molecule matching + RMSD)',
    '无匹配分子': 'No matching molecules', '无原子数据': 'No atom data',
    '解析失败': 'Parse failed', '（无法解析）': '(cannot parse)',

    /* ---------- 晶习 / 解理 / 自由体积 / 多面体 ---------- */
    '晶习模拟': 'Habit simulation', '晶习模拟 · 3D（BFDH）': 'Habit simulation · 3D (BFDH)',
    '晶面数据表（当前模型，前 40 族）': 'Face data (current model, first 40 families)',
    '晶面颜色': 'Face colour', '生长模型': 'Growth model',
    '选择晶面': 'Select face', '晶面解理': 'Cleavage',
    '晶面解理 · (hkl) 三维切片': 'Cleavage · 3D (hkl) slice',
    '· 面积': '· Area', '晶面 (': 'Face (', '· 半空间': '· half-spaces',
    '切片几何': 'Slice geometry',
    '显示 3D 晶习': 'Show 3D habit',
    '彩色（对称一致）': 'Coloured (symmetry-consistent)',
    '单色（青绿）': 'Mono (teal)',
    'AE 附着能代理': 'AE attachment-energy proxy', 'AE 代理': 'AE proxy',
    '显示切片（3D）': 'Show slice (3D)',
    'Å · 法向位移': 'Å · Normal displacement',
    'Depth 厚度 Å': 'Depth Å', 'Area 边长 Å': 'Area side Å',
    '±1（低指数）': '±1 (low index)',
    '隔离切片内堆积（隐藏外部原子）': 'Isolate packing inside slice (hide outer atoms)',
    '显示 (hkl) 标签': 'Show (hkl) labels',
    '无法生成晶习多面体': 'Could not generate habit polyhedron',
    '个 · 半空间': ' · half-spaces',
    '关闭面板（同时隐藏三维多面体）': 'Close panel (also hides the 3D polyhedra)',
    '关闭面板（同时隐藏三维轮廓）': 'Close panel (also hides the 3D contour)',
    '关闭面板': 'Close panel',
    '三维轮廓': '3D contour',
    '· 叠加在球棍模型之上': '· overlaid on the ball-and-stick model',
    '配位多面体 · 3D': 'Coordination polyhedra · 3D',
    '配位多面体：已开启 ·': 'Coordination polyhedra: on ·',
    '配位多面体：已关闭': 'Coordination polyhedra: off',
    '显示配位多面体': 'Show coordination polyhedra',
    '默认按「金属簇」构建：M–M 邻接的金属合并为一个多面体，顶点取簇内金属及其第一配位壳层配体，因此得到封闭立体（方平面配位如 Cu-BTC 桨轮不再是扁平方片）。共面点集会自动补双锥顶点强制封闭。多面体叠加在当前渲染风格之上，底层球棍始终显示，故配体球与键完整可见；与 ORTEP / 晶习 / 自由体积互斥。':
      'By default polyhedra are built from metal clusters: metals adjacent within the M–M cutoff are merged, and the vertices are the cluster metals plus their first coordination-shell ligands, yielding closed solids (square-planar Cu-BTC paddlewheels are no longer flat plates). Nearly coplanar point sets are automatically closed by adding a pair of bipyramid vertices. Polyhedra overlay the current render style, so the ball-and-stick model with ligand spheres and bonds always remains visible; mutually exclusive with ORTEP / habit / free volume.',
    '构建方式': 'Build mode',
    '金属簇模式（封闭立体）': 'Metal clusters (closed solids)',
    '金属簇合并（推荐 · 封闭笼）': 'Merge metal clusters (recommended · closed cages)',
    '单金属中心模式': 'Single metal centre',
    '每个金属中心单独': 'Each metal centre separately',
    '邻近金属并入顶点（消除平面配位扁片）': 'Include neighbouring metals as vertices (avoids flat plates)',
    '金属邻接阈值 (Å)': 'M–M adjacency cutoff (Å)',
    '配位判定容差 (Å)': 'Coordination tolerance (Å)',
    '几何（决定是否为封闭多面体）': 'Geometry (determines whether the polyhedron is closed)',
    '共面配位自动封闭（补双锥顶点）': 'Auto-close coplanar sets (add bipyramid vertices)',
    '显示三角剖分线（密集白线）': 'Show triangulation lines (dense white lines)',
    '显示棱线': 'Show edges', '棱线颜色': 'Edge colour', '棱线半径 (Å)': 'Edge radius (Å)',
    '面颜色': 'Face colour', '面自发光（暗底提亮）': 'Face emissive (brighter on dark backgrounds)',
    '顶点 / 金属球': 'Vertex / metal spheres',
    '顶点球半径比例': 'Vertex sphere radius ratio',
    '顶点球统一色': 'Unified vertex sphere colour',
    '顶点球颜色': 'Vertex sphere colour',
    '按金属元素色': 'By metal element colour',
    '单色面颜色': 'Mono face colour',
    '统一颜色': 'Unified colour',
    '键颜色': 'Bond colour',
    '显示金属球': 'Show metal spheres',
    '补画金属—配体键': 'Draw centre–ligand bonds',
    '金属—配体键（补画）': 'Centre–ligand bonds (drawn extra)',
    '顶点（配体）原子': 'Vertex (ligand) atoms',
    '显示顶点（配体）原子': 'Show vertex (ligand) atoms',
    '显示边线': 'Show edges',
    '个 · 多面体顶点': ' · polyhedron vertices',
    '计算 / 刷新': 'Compute / Refresh',
    '· 网格': ' · grid', '个 · 网格': ' · grid cells',
    '个三角形 · 探针半径': ' triangles · probe radius',
    '半径 (Å)': 'Radius (Å)',
    '1.2 Å（仅大空隙）': '1.2 Å (large voids only)',
    '自动（致密结构回退全貌）': 'Auto (fall back to full region for dense structures)',
    '，该结构无可及空隙，已回退到全部自由区':
      ' — no accessible voids in this structure; fell back to the full free region',
    '缺少晶胞数据，无法计算自由体积': 'Cell data missing; cannot compute free volume',
    '显示平面': 'Show plane', '显示边界': 'Show boundary',
    '（步长': ' (step =',
    '（已截断）': ' (truncated)',
    '（未填写）': ' (not filled in)',
    '案例：': 'Sample: ', '结构：': 'Structure: ',
    '已载入': 'Loaded', '已就绪': 'Ready',
    '未提供': 'Not provided',
    '沿 a': 'Along a', '沿 b': 'Along b', '沿 c': 'Along c',
    '等轴': 'Isometric',
    '· 组：': '· Group: ',
    '组：': 'Group: ',

    /* ---------- iframe 内核可见文案（拾取工具 / 提示） ---------- */
    '选择 / 测量': 'Select / Measure',
    '原子选择': 'Atom select', '分子选择': 'Molecule select',
    '化学键选择': 'Bond select', '原子 / 键着色': 'Atom / bond colouring',
    '化学键着色': 'Bond colouring', '原子着色': 'Atom colouring',
    '距离测量': 'Distance', '角度测量': 'Angle',
    '化学键': 'Chemical bond', '恢复默认': 'Reset to default',
    '用下方取色器修改该对象颜色。': 'Use the colour picker below to change this object.',
    '用取色器修改该对象的颜色': 'Change this object\'s colour with the picker',
    '原子选择：点击选中单个原子': 'Atom select: click to select one atom',
    '分子选择：点击选中整个分子 / 键连通分量':
      'Molecule select: click to select the whole molecule / bonded component',
    '键选择：点击选中一根化学键（两半段整体高亮）':
      'Bond select: click to select a chemical bond (both halves highlighted)',
    '原子着色：点击原子或化学键，在右下角面板改其颜色':
      'Atom colouring: click an atom or bond, then change its colour in the bottom-right panel',
    '距离测量：依次点击两个原子，显示间距（Å）':
      'Distance: click two atoms in turn to show the separation (Å)',
    '角度测量：依次点击三个原子，中间为夹角顶点（°）':
      'Angle: click three atoms in turn; the middle one is the vertex (°)',
    '点击任意原子查看其元素 / 坐标 / 占据率。':
      'Click any atom to see its element / coordinates / occupancy.',
    '点击任意原子，整条键连通分量（分子）将高亮。':
      'Click any atom to highlight its whole bonded component (molecule).',
    '点击任意一根化学键（两半段整体高亮），': 'Click any chemical bond (both halves highlight), ',
    '查看成键元素与键长；右键可撤销。': 'view the bonded elements and length; right-click to undo.',
    '点击原子或化学键将其选中，': 'Click an atom or bond to select it, ',
    '在下方用取色器修改该对象的颜色；': 'then change its colour with the picker below; ',
    '「恢复默认」可还原为元素配色。': '"Reset to default" restores the element colour.',
    '成键元素：': 'Bonded elements: ', '键长：': 'Bond length: ',
    '成键：': 'Bond: ',
    '选择颜色': 'Choose colour', '恢复元素默认配色': 'Restore default element colour',
    '清除当前选择与测量': 'Clear current selection and measurements',
    '工具已关闭，恢复旋转 / 缩放 / 平移。':
      'Tool closed — rotate / zoom / pan restored.',
    '工具已关闭。': 'Tool closed.',
    '请点击第 1 个原子。': 'Click the first atom.',
    '，请点击第 2 个原子。': ', then click the second atom.',
    '再点击第 2 个原子即显示间距（Å）。': 'Click the second atom to show the distance (Å).',
    '依次点击 A、B、C 三个原子，': 'Click atoms A, B and C in order; ',
    '，请点击夹角顶点 B。': ', then click vertex B.',
    '已选 B（夹角顶点）：': 'Selected B (vertex): ',
    '，请点击 C。': ', then click C.',
    'B 为夹角顶点，显示 ∠ABC（°）。': 'B is the vertex; ∠ABC (°) is displayed.',
    '已选第 1 个：': 'First selected: ',
    '已选 A：': 'Selected A: ', '顶点 B：': 'Vertex B: ',
    '右键单击可回退上一步选择': 'Right-click to undo the last selection',
    '已清除。': 'Cleared.',
    '占据率': 'Occupancy', '未知': 'Unknown',
    '开': 'On', '关': 'Off', '无': 'None',
    '缩放': 'Zoom', '已选': 'Selected', '应用': 'Apply', '重置': 'Reset',
    '载入': 'Load', '棱线': 'Edges', '椭球': 'Ellipsoids',
    '中子': 'Neutron', '电子': 'Electron',
    '实验': 'Experimental', '模拟': 'Calculated',
    '清除': 'Clear', '保存': 'Save', '面': 'Face', '谱': 'Pattern', '个': ' ',
    '蓝色': 'Blue', '红色': 'Red', '绿色': 'Green', '橙色': 'Orange',
    '紫色': 'Purple', '青色': 'Cyan', '黄色': 'Yellow',
    '模型：': 'Model: ', '背景：': 'Background: ', '相机：': 'Camera: ',
    '组成：': 'Composition: ', '；轴标注': '; axis labels', '；材质：': '; material: ',
    '；配色：': '; scheme: ', '；参数': '; parameters', '；目标：': '; target: ',
    '首组 ID：': 'First group ID: ', '成键来源：': 'Bond source: ',
    '当前元素：': 'Current element: ', '元素颜色覆盖：': 'Element colour overrides: ',
    '我的备注：': 'My notes: ', '原子总数：': 'Total atoms: ',
    '分数 (': 'Fractional (', '直角 (': 'Cartesian (',
    '特效：SSAO': 'Effects: SSAO', '/ 氢键': '/ H-bonds', '；PDB 晶胞': '; PDB cell',
    '自动旋转：开': 'Auto-rotate: on', '自动旋转：关': 'Auto-rotate: off',
    '% / 头灯': '% / headlamp',
    '已切到透视投影（近大远小）': 'Switched to perspective (near larger)',
    '已切到正交投影（无景深）': 'Switched to orthographic (no depth)',
    '已切到一键出版风': 'Switched to one-click publish style',
    '已切换模型': 'Model switched',
    '已按当前导出设置生成 PNG': 'PNG generated with the current export settings',
    '已复制，直接粘贴给我即可': 'Copied — just paste it back to me',
    '复制受限，请在文本框里全选复制': 'Clipboard blocked — select all and copy from the text box',
    '保存失败，请改用复制': 'Save failed — please use copy instead',
    '已保存反馈文本': 'Feedback text saved',
    '（辉光已按评审意见移除）': ' (bloom removed per review)',
    '--- 机器可读配置（供精确复现）---': '--- Machine-readable configuration (for exact reproduction) ---',
    '【晶界 CrystalViz · 交互评审反馈】': '[CrystaSee · Review feedback]',
    'CrystalViz-评审反馈.txt': 'CrystaSee-review-feedback.txt',
    '平移像 晶胞 [': 'Translation image cell [',
    'Å（按分子显示）': ' Å (shown by molecule)',
    '未找到控件：': 'Control not found: ',
    '未找到控件：#': 'Control not found: #',
    '文件解析失败：': 'File parse failed: ',
    '导出失败：': 'Export failed: ',
    '载入失败：': 'Load failed: ',
    '案例载入失败：': 'Sample load failed: ',
    '图片导出失败：': 'Image export failed: ',
    '不支持的格式：.': 'Unsupported format: .',
    '收起/展开': 'Collapse / Expand',
    '载入中…': 'Loading…',
    '外部文件': 'External file',
    '未能读取晶胞参数 (cell_length_a/b/c)':
      'Could not read cell parameters (cell_length_a/b/c)',
    '松开以载入结构文件': 'Release to load the structure file',
    '支持拖入 .cif / .mol / .mol2 / .xyz / .pdb 文件':
      'Drop a .cif / .mol / .mol2 / .xyz / .pdb file to load',
    '（支持 cif / mol / mol2 / xyz / pdb）': '(cif / mol / mol2 / xyz / pdb supported)',

    /* ---------- 其余可见短句（精确整串） ---------- */
    '（当前为内置示例或未载入含结构坐标的 .cif）':
      '(Current structure is a built-in sample, or a .cif with coordinates has not been loaded)',
    '" title="BFDH 相对面积': '" title="BFDH relative area',
    '按元素色（O 红 / C 灰…）': 'By element colour (O red / C grey …)',
    'ORTEP · 三维实时热椭球': 'ORTEP · Live 3D thermal ellipsoids',
    '晶胞数据尚未就绪，请先载入结构': 'Cell data is not ready yet — please load a structure first',
    'R 因子 (R_gt)': 'R factor (R_gt)',
    '导入实验谱（可多选）': 'Import experimental spectra (multiple selection)',
    'α-石英 SiO2 (P3121)': 'α-Quartz SiO2 (P3121)',
    'NaCl 盐 (Fm-3m)': 'NaCl (salt, Fm-3m)',
    '支持 .cif / .mol / .mol2 / .xyz / .pdb，也可直接拖入窗口':
      'Supports .cif / .mol / .mol2 / .xyz / .pdb; files can also be dropped into the window',
    '界面语言改为顶栏下拉选择框：按钮显示当前语言全称（简体中文 / English）并带展开箭头，点击展开二选一菜单，当前项高亮，选择后即时切换并记忆；「计算 ▸ 配位多面体」新增独立 3D 叠加层（面颜色 / 透明度、边线颜色 / 半径、顶点与中心原子、中心—配体键等可调），多面体从「渲染风格」中移除，底层球棍与配体球 / 键完整保留。':
      'Interface language is now a top-bar dropdown: the button shows the full current language name (Simplified Chinese / English) with a chevron and opens a two-option menu with the active item highlighted; the choice applies instantly and is remembered. Analysis ▸ Coordination Polyhedra adds a standalone 3D overlay with adjustable face colour / opacity, edge colour / radius, vertex and centre atoms, and centre–ligand bonds; polyhedra were removed from Render Style, and the underlying ball-and-stick model with ligand spheres and bonds is fully retained.',

    /* ---------- 语言控件 ---------- */
    '界面语言 / UI language': 'Interface language / UI language'
  };

  /* 词级兜底：保证英文模式下任何残留汉字都被清除。
     只用于「整串精确匹配 + 安全短语替换」之后仍剩下的中文片段。 */
  var CS_WORD = {
    '配位多面体': 'coordination polyhedra', '多面体': 'polyhedra', '晶胞': 'cell',
    '晶面': 'face', '晶习': 'habit', '原子': 'atom', '分子': 'molecule',
    '金属': 'metal', '配体': 'ligand', '顶点': 'vertex', '棱线': 'edge',
    '边线': 'edge', '面': 'face', '键': 'bond', '球': 'sphere', '簇': 'cluster',
    '结构': 'structure', '文件': 'file', '视图': 'view', '视图区': 'viewport',
    '渲染': 'render', '风格': 'style', '材质': 'material', '配色': 'colour scheme',
    '背景': 'background', '光照': 'lighting', '强度': 'intensity', '亮度': 'brightness',
    '透明度': 'opacity', '半径': 'radius', '比例': 'ratio', '阈值': 'cutoff',
    '容差': 'tolerance', '步长': 'step', '网格': 'grid', '体积': 'volume',
    '自由体积': 'free volume', '空隙': 'void', '探针': 'probe', '轮廓': 'contour',
    '等值面': 'isosurface', '切片': 'slice', '厚度': 'thickness', '边长': 'side length',
    '边界': 'boundary', '平面': 'plane', '法向': 'normal', '位移': 'displacement',
    '间距': 'spacing', '距离': 'distance', '角度': 'angle', '夹角': 'angle',
    '氢键': 'H-bond', '范德华': 'van der Waals', '接触': 'contact', '相互作用': 'interactions',
    '供体': 'donor', '受体': 'acceptor', '占据率': 'occupancy', '元素': 'element',
    '坐标': 'coordinates', '分数': 'fractional', '直角': 'Cartesian',
    '空间群': 'space group', '对称': 'symmetry', '等价': 'equivalent', '位点': 'site',
    '超胞': 'supercell', '堆积': 'packing', '截断': 'cut-off', '补全': 'complete',
    '不对称单元': 'asymmetric unit', '案例': 'sample', '示例': 'sample',
    '载入': 'load', '导入': 'import', '导出': 'export', '保存': 'save',
    '打开': 'open', '关闭': 'close', '取消': 'cancel', '确认': 'confirm',
    '应用': 'apply', '重置': 'reset', '清除': 'clear', '移除': 'remove',
    '选择': 'select', '测量': 'measure', '计算': 'compute', '分析': 'analysis',
    '显示': 'show', '隐藏': 'hide', '开启': 'on', '已开启': 'on', '已关闭': 'off',
    '已选': 'selected', '当前': 'current', '默认': 'default', '自动': 'auto',
    '手动': 'manual', '自定义': 'custom', '统一': 'unified', '单色': 'mono',
    '彩色': 'coloured', '高对比': 'high contrast', '色盲友好': 'colour-blind friendly',
    '元素分族': 'element groups', '透明背景': 'transparent background',
    '保留当前背景': 'keep current background', '透明': 'transparent',
    '模拟': 'calc.', '实验': 'exp.', '谱图': 'pattern', '谱': 'pattern',
    '峰位': 'peak position', '峰宽': 'peak width', '峰表': 'peak table',
    '辐射': 'radiation', '波长': 'wavelength', '散射': 'scattering', '中子': 'neutron',
    '电子': 'electron', '衍射': 'diffraction', '多重性': 'multiplicity',
    '相对': 'relative', '最大': 'max', '最小': 'min', '上限': 'upper limit',
    '起始': 'start', '结束': 'end', '范围': 'range', '数值': 'value',
    '数据': 'data', '表格': 'table', '清单': 'list', '报告': 'report',
    '图例': 'legend', '预览': 'preview', '图片': 'image', '画布': 'canvas',
    '分辨率': 'resolution', '尺寸': 'size', '宽度': 'width', '高度': 'height',
    '宽': 'width', '高': 'height', '标题': 'title', '标签': 'label',
    '按钮': 'button', '面板': 'panel', '菜单栏': 'menu bar', '菜单': 'menu',
    '工具': 'tool', '工具栏': 'toolbar', '选项': 'option', '参数': 'parameter',
    '控件': 'control', '滑块': 'slider', '复选框': 'checkbox', '下拉框': 'dropdown',
    '状态': 'status', '提示': 'notice', '说明': 'description', '备注': 'note',
    '失败': 'failed', '成功': 'success', '错误': 'error', '警告': 'warning',
    '无法': 'cannot', '不能': 'cannot', '缺少': 'missing', '未提供': 'not provided',
    '尚未': 'not yet', '已经': 'already', '已': '', '请': 'please ',
    '点击': 'click', '拖动': 'drag', '拖拽': 'drag', '旋转': 'rotate', '缩放': 'zoom',
    '平移': 'pan', '滚轮': 'scroll', '左键': 'left button', '右键': 'right button',
    '快捷键': 'shortcut', '视角': 'view', '投影': 'projection', '透视': 'perspective',
    '正交': 'orthographic', '景深': 'depth', '固定': 'fixed', '复位': 'reset',
    '光源': 'light', '头灯': 'headlamp', '方位角': 'azimuth', '仰角': 'elevation',
    '瓷器': 'porcelain', '哑光': 'matte', '出版风': 'publish style',
    '球棍': 'ball-and-stick', '棍状': 'stick', '线状': 'line', '线框': 'wireframe',
    '球堆积': 'space-filling', '堆积模式': 'packing mode', '棒状': 'rod',
    '椭球': 'ellipsoid', '热椭球': 'thermal ellipsoid', '各向异性': 'anisotropic',
    '概率': 'probability', '主轴': 'principal axis', '半轴': 'semi-axis',
    '晶系': 'crystal system', '晶胞体积': 'cell volume', '化学式': 'formula',
    '化学式量': 'formula weight', '空间群': 'space group', '晶面间距': 'd-spacing',
    '晶面族': 'face family', '晶面指数': 'hkl index', '晶胞框': 'cell box',
    '数据来源': 'source', '数据来源：': 'Source: ', '公有领域': 'public domain',
    '石英数据源': 'Quartz data source', '数据源': 'data source',
    '配位': 'coordination', '壳层': 'shell', '连通分量': 'connected component',
    '三角剖分': 'triangulation', '三角形': 'triangles', '封闭': 'closed',
    '立体': 'solid', '扁平': 'flat', '方片': 'plate', '共面': 'coplanar',
    '双锥': 'bipyramid', '笼': 'cage', '自发光': 'emissive', '补画': 'draw extra',
    '金属簇': 'metal cluster', '单中心': 'single centre', '邻接': 'adjacency',
    '堆叠': 'stacking', '叠合': 'superposition', '刚体': 'rigid-body',
    '构象': 'conformer', '置换': 'permutation', '相似度': 'similarity',
    '晶型': 'polymorph', '种子': 'seed', '参考': 'reference', '目标': 'target',
    '匹配': 'match', '对比': 'comparison', '组': 'group', '个': '',
    '条': '', '字': ' characters', '族': 'families', '列': 'column', '行': 'row',
    '个原子': ' atoms', '个分子': ' molecules', '个文件': ' files',
    '蓝色': 'blue', '红色': 'red', '绿色': 'green', '橙色': 'orange',
    '紫色': 'purple', '青色': 'cyan', '黄色': 'yellow', '青绿': 'teal',
    '白底': 'white background', '黑底': 'black background', '深色': 'dark',
    '浅色': 'light', '渐变': 'gradient', '纯白': 'pure white', '纯黑': 'pure black',
    '石墨灰': 'graphite grey', '深海蓝': 'deep-sea blue', '暗紫': 'dark purple',
    '子夜': 'midnight', '高亮': 'highlight', '半透明': 'translucent',
    '实心': 'solid', '遮光': 'shaded', '虚线': 'dashed', '实线': 'solid line',
    '十字': 'cross', '圆柱': 'cylinder', '相机': 'camera',
    '晶见': 'CrystaSee', '软件': 'Software', '版本': 'Version',
    '构建': 'Build', '许可': 'License', '隐私': 'Privacy', '免责声明': 'Disclaimer',
    '反馈': 'Feedback', '截图': 'Screenshot', '附件': 'attachment',
    '描述': 'Description', '必填': 'required', '提交': 'Submit',
    '邮件客户端': 'mail client', '邮件': 'email', '浏览器': 'browser',
    '外部链接': 'external link', '链接': 'link', '网络': 'network',
    '本机': 'this machine', '本地': 'local', '桌面版': 'desktop build',
    '后续版本': 'later release', '规划': 'planned', '步骤': 'steps',
    '功能': 'feature', '模块': 'module', '界面': 'interface', '语言': 'language',
    '简体中文': 'Simplified Chinese', '中文': 'Chinese', '英文': 'English',
    '界面语言': 'Interface language', '系统语言': 'system language',
    '就绪': 'ready', '已就绪': 'ready', '完成': 'done', '生成': 'generated',
    '正在': '', '中…': '…', '中': '', '时': '', '后': '', '前': '',
    '的': '', '与': ' & ', '和': ' & ', '或': ' or ', '及': ' & ',
    '按': 'by ', '在': 'in ', '从': 'from ', '到': 'to ', '为': ' = ',
    '是': 'is ', '不': 'not ', '无': 'no ', '有': 'has ', '并': ' and ',
    '可': 'can ', '将': ' will ', '已': '', '被': '', '所': '',
    '所有': 'all ', '全部': 'all ', '仅': 'only ', '共': 'total ',
    '其他': 'other', '其余': 'other', '当前': 'current ', '该': 'the ',
    '此': 'this ', '各': 'each ', '每': 'each ', '两个': 'two ',
    '设置': 'settings', '使用': 'use', '支持': 'supports', '包含': 'contains',
    '需要': 'requires', '提供': 'provides', '采用': 'uses', '基于': 'based on',
    '根据': 'according to', '通过': 'via', '用于': 'for', '以及': ' and ',
    '同时': 'also', '实时': 'live', '立即': 'immediately', '自动': 'auto',
    '打开结构': 'Open Structure', '导出图片': 'Export Image',
    '结构信息': 'Structure Info', '相互作用分析': 'Interaction Analysis',
    '自由体积占比': 'Free-volume fraction', '晶面与晶习': 'Faces & Habit',
    '晶面解理': 'Cleavage', '晶习模拟': 'Habit simulation',
    'BFDH 模型': 'BFDH model', 'AE 模型': 'AE model',
    'PXRD 模拟': 'PXRD simulation', '多 PXRD 对比': 'Multi-PXRD comparison',
    '中子衍射模拟': 'Neutron diffraction', 'PXRD 格式转换': 'PXRD format conversion',
    '用户操作手册': 'User Manual', '关于晶见': 'About CrystaSee',
    '版本信息': 'Version Info', '使用许可': 'License',
    '问题反馈': 'Feedback', '打开结构文件': 'Open Structure File',
    '案例演示': 'Sample Structures', '渲染风格': 'Render style',
    '显示范围': 'Display range', '参数面板': 'Parameter panel',
    '风格参数': 'Style parameters', '图片导出': 'Image export',
    '选择 / 测量': 'Select / Measure', '原子选择': 'Atom select',
    '分子选择': 'Molecule select', '化学键选择': 'Bond select',
    '原子 / 键着色': 'Atom / bond colouring', '化学键着色': 'Bond colouring',
    '原子着色': 'Atom colouring', '化学键': 'Bond', '恢复默认': 'Reset',
    '距离测量': 'Distance', '角度测量': 'Angle',
    '色': 'colour', '多': 'multi', '内置': 'built-in', '未': 'not ',
    '含': 'containing', '积': 'area', '红': 'red', '灰': 'grey',
    '三维': '3D', '先': 'first ', '因子': 'factor', '多选': 'multiple selection',
    '着色': 'Colour', '化学键': 'Bond',
    '石英': 'quartz', '盐': 'salt', '也': 'also ', '再写': 'then draw',
    '即使': 'even if', '恰好落': 'happens to fall', '也能一眼读清': 'stays readable',
    '先描一圈': 'draw an outline first', '上用': 'use ', '会把深灰抬成灰': 'lifts dark grey to grey',
    '才能保持清晰': 'to keep it crisp', '只取第一模型': 'only the first model is used',
    '直接拖入窗口': 'drag directly into the window', '简体中文': 'Simplified Chinese',
    '只取第一模型': 'only the first model is used', '会把深': 'will make dark', '抬成': 'into'
  };

  // 整串精确匹配用的合并字典（CS_EXTRA 覆盖 CS_TRANS 中的旧译法）
  var CS_ALL = Object.assign({}, CS_TRANS, CS_EXTRA);
  // 允许参与「子串替换」的词条：≥3 个汉字，且不在通用词黑名单中。
  // 单字/双字通用词（氢、文件、原子、显示…）只允许整串匹配，避免把长句切碎。
  var CS_UNSAFE = /^(氢|原子|文件|显示|计算|强度|提示|面|个|字|谱|开|关|无|载入|模拟|实验|清除|保存|面颜色|键颜色|结构：|案例：|组：|已载入|已就绪|沿 a|沿 b|沿 c)$/;
  var CS_PHRASE_KEYS = Object.keys(CS_ALL).filter(function (k) {
    var n = (k.match(/[\u3400-\u9FFF]/g) || []).length;
    return n >= 3 && !CS_UNSAFE.test(k);
  });

  // 构建正则：长词条优先，避免片段冲突
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function byLen(a, b) { return b.length - a.length; }
  var phraseKeys = CS_PHRASE_KEYS.slice().sort(byLen);
  var wordKeys = Object.keys(CS_WORD).slice().sort(byLen);
  var RE_PHRASE = new RegExp(phraseKeys.map(esc).join('|'), 'g');
  var RE_WORD = new RegExp(wordKeys.map(esc).join('|'), 'g');
  var CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;
  var PUNCT = { '，': ', ', '。': '. ', '、': ', ', '；': '; ', '：': ': ',
                '？': '? ', '！': '! ', '（': ' (', '）': ') ', '「': '"', '」': '"',
                '『': '"', '』': '"', '【': ' [', '】': '] ', '《': '"', '》': '"',
                '〈': '<', '〉': '>' };
  var RE_PUNCT = new RegExp('[' + Object.keys(PUNCT).map(esc).join('') + ']', 'g');

  var LS_KEY = 'cs_lang';
  var CS_LANG = 'en';
  try { CS_LANG = localStorage.getItem(LS_KEY) || detectSystemLang(); } catch (e) { CS_LANG = 'en'; }
  if (CS_LANG !== 'en' && CS_LANG !== 'zh') CS_LANG = 'en';

  /* 读取安装电脑的系统语言：优先用 WebView2 / Edge 暴露的 navigator.language
     （WebView2 默认取 Windows 显示语言），并用 Intl 解析出的区域格式兜底。
     非中文系统一律使用英文，保证英语使用者开箱即用。 */
  function detectSystemLang() {
    var primary = '', intl = '', i, l;
    try { primary = String(navigator.language || '').toLowerCase(); } catch (e) {}
    try { intl = String((Intl.DateTimeFormat().resolvedOptions() || {}).locale || '').toLowerCase(); } catch (e) {}
    // navigator.language 是 WebView2 依据 Windows 显示语言给出的首选项，优先级最高；
    // 只有当它缺失时才用 Intl 区域格式兜底，避免英文系统被宿主区域格式误判为中文。
    if (!primary) {
      try { if (navigator.languages && navigator.languages.length) primary = String(navigator.languages[0]).toLowerCase(); } catch (e) {}
    }
    if (!primary) primary = intl;
    l = primary || '';
    if (/^zh([-_]|$)/.test(l)) return 'zh';
    return 'en';
  }

  function translateText(s) {
    if (CS_LANG !== 'en' || typeof s !== 'string' || !s) return s;
    // ① 整串精确匹配（保留首尾空白）
    var lead = (s.match(/^\s*/) || [''])[0], trail = (s.match(/\s*$/) || [''])[0];
    var core = s.slice(lead.length, s.length - trail.length);
    if (CS_ALL[s] !== undefined) return CS_ALL[s];
    if (CS_ALL[core] !== undefined) return lead + CS_ALL[core] + trail;
    if (!CJK_RE.test(s)) return s;
    // ②a 动态计数串：状态栏会拼「就绪 · 当前结构：… · 27 原子」，若落到词级兜底
    //     会译成 "27 atom"（缺复数）。这里先按英文单复数整段处理。
    var r = s.replace(/(\d+)\s*(原子|分子)/g, function (_, n, w) {
      return n + (w === '原子' ? ' atom' : ' molecule') + (n === '1' ? '' : 's');
    });
    // ②b 安全短语替换（≥3 汉字，已排除会切碎长句的通用短词）
    r = r.replace(RE_PHRASE, function (m) { return CS_ALL[m] !== undefined ? CS_ALL[m] : m; });
    // ③ 词级兜底：多轮清掉剩余汉字（单字替换后可能拼出新的中文短语，需再扫一遍）
    for (var pass = 0; pass < 4 && CJK_RE.test(r); pass++) {
      var prev = r;
      r = r.replace(RE_WORD, function (m) { return CS_WORD[m] !== undefined ? CS_WORD[m] : m; });
      if (r === prev) break;
    }
    // 极端兜底：任何未收录的生僻汉字都不应出现在英文界面里
    if (CJK_RE.test(r)) r = r.replace(/[\u3400-\u9FFF\uF900-\uFAFF]+/g, ' ');
    // ④ 中文标点转半角（只对原本含中文的串）
    r = r.replace(RE_PUNCT, function (m) { return PUNCT[m]; });
    return r.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?\)])/g, '$1');
  }

  var ATTRS = ['title', 'placeholder', 'alt', 'aria-label'];
  // 注意：<textarea> 的「文本节点」是用户输入内容，绝不能被翻译；但它的
  // placeholder / title / aria-label 属于界面文案，必须参与翻译。因此不能把
  // textarea 整元素放进 SKIP_SEL（旧版正是这样导致反馈弹窗输入框提示在英文
  // 模式下仍显示中文），改为只在「文本节点」层面额外豁免 textarea。
  var SKIP_SEL = 'script,style,noscript,[data-cs-no-i18n],#embedded-cifs';
  var TEXT_SKIP_SEL = SKIP_SEL + ',textarea';

  function skipNode(n) {
    var isText = (n.nodeType === 3);
    var el = isText ? n.parentElement : n;
    if (!el || !el.closest) return false;
    return !!el.closest(isText ? TEXT_SKIP_SEL : SKIP_SEL);
  }

  function procTextNode(tn) {
    // 语言选择器自身不参与翻译：菜单固定显示「简体中文 / English」，切换语言后仍可辨认
    if (skipNode(tn)) return;
    var data = tn.data;
    if (tn.__csLang === CS_LANG && tn.__csData === data) return;
    tn.__csData = data;
    if (CS_LANG === 'zh') {
      if (tn.__csOrig !== undefined) { tn.data = tn.__csOrig; tn.__csLang = 'zh'; }
      return;
    }
    // en：translateText 对英文/数字幂等（只替换 CJK），可安全重复执行
    if (CJK_RE.test(data)) tn.__csOrig = data; // 仅当含中文时才缓存原始值
    tn.data = translateText(data);
    tn.__csLang = 'en';
  }

  function procElement(el) {
    if (skipNode(el)) return;
    var names = ATTRS.slice();
    // <input type="button|submit|reset" value="导出 .txt"> 的可见文案在 value 上
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '')) names.push('value');
    if (el.tagName === 'OPTION' && el.hasAttribute('label')) names.push('label');
    for (var i = 0; i < names.length; i++) {
      var a = names[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var v = el.getAttribute(a);
      var slot = '__csAttr_' + a;
      // 属性值被运行时改写时（动态面板占位符等），以新值为原文重新缓存
      if (el[slot] === undefined || (CJK_RE.test(v) && v !== el[slot] && v !== translateText(el[slot]))) {
        el[slot] = v;
      }
      var nv = CS_LANG === 'en' ? translateText(el[slot]) : el[slot];
      if (nv !== el.getAttribute(a)) el.setAttribute(a, nv);
    }
  }

  function walk(root) {
    if (!root || !root.ownerDocument) return;
    var doc = root.ownerDocument;
    var walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */, null, false);
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) procTextNode(list[i]);
    if (root.nodeType === 1) procElement(root);
    if (root.querySelectorAll) {
      var els = root.querySelectorAll('*');
      for (var j = 0; j < els.length; j++) procElement(els[j]);
    }
  }

  function csTranslateDocument(root) { walk(root || document.body); }

  var obs = null;
  function installCsObserver() {
    if (obs || !window.MutationObserver) return;
    obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') {
          for (var k = 0; k < m.addedNodes.length; k++) {
            var node = m.addedNodes[k];
            if (node.nodeType === 3) procTextNode(node);
            else if (node.nodeType === 1) walk(node);
          }
        } else if (m.type === 'characterData') {
          procTextNode(m.target);
        } else if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
          procElement(m.target);
        }
      }
    });
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS.concat(['value', 'label'])
    });
  }

  function updateToggleUI() {
    // 下拉选择框：按钮显示当前语言全称，菜单当前项高亮
    var txt = document.getElementById('mb-lang-text');
    if (txt) txt.textContent = (CS_LANG === 'en') ? 'English' : '简体中文';
    var opts = document.querySelectorAll('[data-cs-lang-opt]');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-cs-lang-opt') === CS_LANG;
      opts[i].classList.toggle('active', on);
      opts[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    // 兼容旧皮肤里可能残留的分段按键
    var btns = document.querySelectorAll('[data-cs-lang-btn]');
    for (var k = 0; k < btns.length; k++) {
      btns[k].classList.toggle('active', btns[k].getAttribute('data-cs-lang-btn') === CS_LANG);
    }
    var cur = document.getElementById('mb-lang-cur');
    if (cur) cur.title = (CS_LANG === 'en') ? 'Interface language' : '界面语言';
  }

  function closeCsLangMenu() {
    var box = document.getElementById('mb-lang');
    if (box) box.classList.remove('open');
    var cur = document.getElementById('mb-lang-cur');
    if (cur) cur.setAttribute('aria-expanded', 'false');
  }

  var CS_IN_IFRAME = false;
  try { CS_IN_IFRAME = (window.parent !== window); } catch (e) { CS_IN_IFRAME = true; }

  /* 把语言同步给 iframe 内核：内核也有可见中文（右侧「选择 / 测量」工具、
     拖放遮罩、错误提示等），必须与外壳同时切换。 */
  function broadcastCsLang() {
    if (CS_IN_IFRAME) return;
    var f = document.getElementById('viewer');
    try {
      if (f && f.contentWindow) f.contentWindow.postMessage(
        { source: 'crystasee-shell', type: 'csLang', lang: CS_LANG }, '*');
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('csLangChanged', { detail: CS_LANG })); } catch (e) {}
  }

  function applyCsLang(lang, manual) {
    if (lang !== 'en' && lang !== 'zh') return;
    CS_LANG = lang;
    // 手动选择要记忆（下次启动优先）；系统自动识别不写入，随系统语言变化自适应
    if (manual) { try { localStorage.setItem(LS_KEY, lang); } catch (e) {} }
    // 在 <html> 上同步语言类：英文模式下隐藏顶栏中文名「晶见」
    // （CrystaSee 与晶见同指一个软件，英文界面里并列显示会重复）
    try {
      if (document.documentElement) {
        document.documentElement.classList.toggle('cs-lang-en', CS_LANG === 'en');
      }
    } catch (e) {}
    csTranslateDocument(document.body);
    updateToggleUI();
    if (!CS_IN_IFRAME) { closeCsLangMenu(); broadcastCsLang(); }
  }

  function setCsLang(lang) { applyCsLang(lang, true); }

  /* 首次启动按安装电脑的系统语言预设；用户手动选择过则永不覆盖。
     优先用 Python 侧读到的 Windows UI 语言（若该版本 exe 提供该接口），
     否则用 WebView2 暴露的 navigator.language / Intl 区域。 */
  var sysLangDone = false;
  function bootSystemLang() {
    if (sysLangDone || CS_IN_IFRAME) return;
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
    if (saved === 'zh' || saved === 'en') { sysLangDone = true; broadcastCsLang(); return; }
    sysLangDone = true;
    applyCsLang(detectSystemLang(), false);
    var a = null;
    try { a = window.pywebview && window.pywebview.api; } catch (e) {}
    if (a && typeof a.system_language === 'function') {
      try {
        Promise.resolve(a.system_language()).then(function (r) {
          var l = (typeof r === 'string') ? r : (r && r.lang);
          if ((l === 'zh' || l === 'en') && l !== CS_LANG) applyCsLang(l, false);
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function initCsI18n() {
    // 初始语言（localStorage 已保存时 applyCsLang 不会执行）也要同步语言类
    try {
      if (document.documentElement) {
        document.documentElement.classList.toggle('cs-lang-en', CS_LANG === 'en');
      }
    } catch (e) {}
    csTranslateDocument(document.body);
    installCsObserver();

    if (CS_IN_IFRAME) {
      // iframe 内核：语言由外壳通过 postMessage 下发，不显示语言控件
      window.addEventListener('message', function (e) {
        var m = e.data;
        if (m && m.source === 'crystasee-shell' && m.type === 'csLang' &&
            (m.lang === 'zh' || m.lang === 'en')) applyCsLang(m.lang, false);
      });
      // 主动索取一次，避免外壳广播早于 iframe 就绪而丢失
      try {
        window.parent.postMessage({ source: 'crystasee-viewer', type: 'csLangRequest' }, '*');
      } catch (e) {}
      return;
    }
    // 内核就绪后主动索取语言时补发
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (m && m.source === 'crystasee-viewer' && m.type === 'csLangRequest') broadcastCsLang();
    });

    var box = document.getElementById('mb-lang');
    var cur = document.getElementById('mb-lang-cur');
    if (box && cur) {
      cur.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = box.classList.toggle('open');
        cur.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // 语言控件是交互元素，不能触发 pywebview 的整窗拖动
      box.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    }
    document.addEventListener('click', function (e) {
      if (box && !box.contains(e.target)) closeCsLangMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCsLangMenu();
    });
    var opts = document.querySelectorAll('[data-cs-lang-opt]');
    for (var i = 0; i < opts.length; i++) {
      (function (o) {
        o.addEventListener('click', function (e) {
          e.stopPropagation();
          setCsLang(o.getAttribute('data-cs-lang-opt'));
        });
      })(opts[i]);
    }
    // 兼容旧分段按键
    var btns = document.querySelectorAll('[data-cs-lang-btn]');
    for (var j = 0; j < btns.length; j++) {
      (function (b) {
        b.addEventListener('click', function () { setCsLang(b.getAttribute('data-cs-lang-btn')); });
      })(btns[j]);
    }
    // iframe 可能晚于外壳就绪，load 后补发一次语言
    var f = document.getElementById('viewer');
    if (f) f.addEventListener('load', broadcastCsLang);
    window.addEventListener('load', broadcastCsLang);
    updateToggleUI();
    bootSystemLang();
    broadcastCsLang();
    // pywebview 的 js_api 可能稍晚注入，就绪后再按系统语言校准一次
    document.addEventListener('pywebviewready', function () { sysLangDone = false; bootSystemLang(); });
    setTimeout(bootSystemLang, 1200);
  }

  // 内核（iframe）里没有 app.js 调用 initCsI18n，这里自动启动
  function autoInit() {
    if (CS_IN_IFRAME) { try { initCsI18n(); } catch (e) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();

  window.CS_TRANS = CS_TRANS;
  window.CS_ALL = CS_ALL;
  window.CS_WORD = CS_WORD;
  window.csGetLang = function () { return CS_LANG; };
  window.setCsLang = setCsLang;
  window.csTranslateDocument = csTranslateDocument;
  window.initCsI18n = initCsI18n;
  window.csDetectSystemLang = detectSystemLang;
  window.t = translateText; // 供动态字符串包裹：t('中文') → 当前语言文本
})();
