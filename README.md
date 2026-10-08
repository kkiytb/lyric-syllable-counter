# 音节计数器 · Syllable Counter

![CI](https://github.com/kkiytb/lyric-syllable-counter/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

多语言歌词/文本的**逐行·逐字音节数（拍数）**计算桌面小工具。纯前端，可打包成 Windows EXE。

日语按唱歌 **mora（拍）** 计算，其余语言按发音音节数精确统计。支持导入常见歌词/字幕文件、日文 vs 中文逐行对比高亮、词典联网兜底，并可一键打包为免安装的 Windows 可执行文件。

![主界面](docs/screenshot.png)

## 目录

- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [打包成 EXE](#打包成-exe)
- [测试](#测试)
- [CI 与自动打包](#ci-与自动打包)
- [如何发布新版本](#如何发布新版本)
- [语言支持](#语言支持)
- [目录结构](#目录结构)
- [开发指南](#开发指南)
- [贡献指南](#贡献指南)
- [鸣谢](#鸣谢)
- [许可](#许可)

## 功能特性

- **逐行 + 逐字**音节/拍数：每行总计 + 每个字/词右上角标注拍数。
- **日语按唱歌 mora**：通过在线注音（[shirabe.dev](https://shirabe.dev)，IPAdic）把汉字转换为假名读音后数拍；离线时自动降级到本地规则。
- **60+ 语言精确计数**：英语（CMU 发音词典）、法语/葡语/西语/意语/德语/希腊语/拉脱维亚语/立陶宛语/蒙古语/亚美尼亚语/威尔士语/爱尔兰语/泰语等均做了规则化；200 项单元测试锁定精确值。
- **歌词/字幕导入**：`.lrc` / `.ass` / `.srt` / `.txt`，自动识别类型与语言；自动剥离 `[mm:ss.xx]` 与 `<mm:ss.xx>` 时间戳（含行内交错多时间戳）。
- **对比视图**：任意两种语言逐行对齐，剔除空白行，**高亮不一致**的行，可复制单行或全部结果。
- **可搜索的两级分组语言选择**：按国家分组 → 方言子层，可按缩写排序、实时搜索，默认普通话。
- **词典联网兜底**：英语/西语走 Datamuse，其他语言走 Wiktionary，查不到时优雅回退本地规则。
- **打包为 EXE**：`@electron/packager` 产出免安装的 Windows 可执行文件；GitHub CI 可在打 tag 时自动打包并发布 Release。

## 环境要求

- Node.js ≥ 18（推荐 20+）
- npm ≥ 9
- 打包 Windows EXE 需要 Windows 环境（本地或 GitHub Actions runner）

## 快速开始

```bash
npm install
npm run build        # 构建前端到 dist/
npx electron .       # 以桌面窗口运行（加载 dist）
```

开发调试（浏览器 + 热更新）：

```bash
npm run dev
```

## 打包成 EXE

本地打包（Windows）：

```bash
npm run electron:build
```

产物位于 `release/音节计数器-win32-x64/音节计数器.exe`。整个目录拷走即可运行（EXE 依赖同目录的 dll 与 resources，请勿单独拷贝 EXE）。

打包依赖说明：

- 使用 `@electron/packager`（`electron-builder` 因在部分环境下创建符号链接需管理员权限而放弃）。
- 打包前请关闭正在运行的 `音节计数器.exe`，否则 `release/` 目录被占用会报 `EBUSY`。

## 测试

```bash
npm test
```

包含：

- `test/counter.test.js` — 200 项计数逻辑断言（按读音数拍、各语言规则化、英语 CMU、唱歌惯例覆盖等）。
- `test/lyrics.test.js` — 16 项歌词/字幕解析断言（LRC/ASS/SRT、时间戳剥离、类型识别）。

新增或修改计数规则时，务必同步补充测试并保证 `npm test` 全部通过。

## CI 与自动打包

仓库通过 [GitHub Actions](https://github.com/kkiytb/lyric-syllable-counter/actions) 自动测试与打包，配置见 `.github/workflows/ci.yml`：

| Job | 触发 | 环境 | 职责 |
|---|---|---|---|
| `test` | push 到 `main`、PR | Ubuntu | `npm ci` → `npm test` → `npm run build` |
| `release` | 打 `v*` 标签 | Windows | `npm test` → 打包 EXE → 压缩 zip → 自动发布 GitHub Release |

- 测试失败会阻止发布，保证 Release 里的包是测试通过的。
- Release 资产为 `syllable-counter-vX.Y.Z.zip`（解压即运行，免安装）。

## 如何发布新版本

推荐用 CI 全自动发版（只做两步）：

```bash
npm version patch        # 或 minor / major；自动更新版本号并生成 v* tag 与 commit
git push origin main --tags
```

推送后 CI 会自动：跑测试 → 在 Windows 上打包 EXE → 压缩 zip → 创建 Release 并上传资产。发布完成后即可在 [Releases](https://github.com/kkiytb/lyric-syllable-counter/releases) 看到。

手动发布（不经 CI）也可用：

```bash
npm run electron:build
gh release create vX.Y.Z "release\音节计数器-win32-x64-vX.Y.Z.zip" --title "vX.Y.Z" --notes "..."
```

版本号语义：遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)（`主.次.修订`）。

## 语言支持

两级分组：国家 → 方言；默认普通话；方言层不设旗标，按缩写排序、可搜索。

已做精确规则化的语言（示例）：
英语、西班牙语、法语、葡萄牙语、意大利语、德语、希腊语、拉脱维亚语、立陶宛语、蒙古语、亚美尼亚语、威尔士语、爱尔兰语、泰语、日语（mora，在线注音+离线兜底）……共 60+ 语言。

部分语言的计数口径：

| 语言 | 口径 |
|---|---|
| 日语 | 唱歌 mora（促音/长音符各一拍、小假名并入前一拍） |
| 英语 | CMU 发音词典（元音音素数）+ 唱歌惯例覆盖 |
| 法语 | 发音元音数（词尾静音 e 不计、鼻元音/二重元音合并） |
| 泰语 | 发音音节数（泰国乐谱 1 音节 = 1 音） |

## 目录结构

```
mini-tool/
├── src/
│   ├── counter.js          # 计数引擎 + 语言注册表（62 语言规则）
│   ├── lyrics.js           # LRC/ASS/SRT/TXT 解析与时间戳剥离
│   ├── App.vue             # 主界面
│   ├── CompareView.vue     # 对比视图
│   ├── analyzeService.js   # 分析编排
│   └── patterns/en_dict.js # CMU 发音词典（13 万词 → 音节数）
├── electron/
│   ├── main.cjs            # 主进程入口
│   ├── preload.cjs         # 安全桥接（contextBridge）
│   └── ipc.cjs             # IPC（在线注音代理、词典兜底）
├── test/                   # 单元测试（counter + lyrics）
├── scripts/capture.cjs     # 离屏截图验证脚本
├── .github/workflows/ci.yml # CI：测试 + 自动打包发布
└── docs/screenshot.png
```

## 开发指南

架构：Vue 3 + Vite 5 + Electron 31，纯前端 + 主进程 IPC 代理（规避渲染进程 CORS）。Electron 文件一律 `.cjs`，`vite.config.js` 需 `base: './'` 以支持 `file://` 加载。

**新增一种语言的计数规则：**

1. 在 `src/counter.js` 的 `LANGUAGES` 注册表中加入该语言条目（`code` / 国家 / 方言分组 / 旗标）。
2. 若需元音核规则，用 `countVowelNuclei(text, vowels, { digraphs, longPair, normalize })` 实现（参见法语、葡语、希腊语等实现）。
3. 在 `test/counter.test.js` 补充该语言的精确断言（含已知精确值，见注释）。
4. 跑 `npm test` 保证全绿。

**修改界面 / 交互：** 主要在 `src/App.vue` 与 `src/CompareView.vue`；语言下拉、对比视图、词典兜底开关均在此。

**截图验证：** `scripts/capture.cjs` 可离屏渲染并截图界面，用于验证 UI 与计数结果（支持注入文本、切换语言、开启词典兜底等）。

## 贡献指南

欢迎任何形式的贡献（报告 Bug、提需求、改进规则、翻译等）。

1. **Fork** 本仓库并克隆到本地。
2. 新建分支：`git checkout -b feat/your-feature`。
3. 完成改动，遵循以下约定：
   - 提交信息建议使用前缀：`feat:` / `fix:` / `test:` / `docs:` / `ci:` / `refactor:`（如 `fix: 剥离 lrc 尖括号时间戳`）。
   - 保持 ES Module 风格、不引入额外运行时依赖（本项目刻意保持轻量）。
   - 修改计数规则必须补测试，并保证 `npm test` 全绿。
4. 推送分支并创建 **Pull Request**，描述改动内容与测试结果。
5. 维护者 review 后合并；合并到 `main` 会自动触发 CI 测试。

**报告问题**：请到 [Issues](https://github.com/kkiytb/lyric-syllable-counter/issues) 提交，说明复现步骤、输入文本、期望与实际结果，最好附截图。

## 鸣谢

- 日语注音：[shirabe.dev](https://shirabe.dev)（IPAdic）
- 英语音节：[CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict)
- 词典兜底：[Datamuse](https://www.datamuse.com/) / [Wiktionary](https://www.wiktionary.org/)

## 许可

[MIT](LICENSE)
