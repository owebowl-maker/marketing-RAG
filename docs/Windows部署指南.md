# Windows 部署指南（写给执行部署的 AI 助手）

> **读者**：在公司 Windows 电脑上帮用户部署本项目的 AI 助手。
> **目标**：把项目跑起来，用户在浏览器里打开 http://localhost:3000 能看到登录页，输入姓名后能正常对话。
> **预计耗时**：网络正常时 15～30 分钟。

---

## 0. 执行规则（先读完再动手）

1. **严格按步骤顺序执行**。每一步都有「检查」，检查通过了再进行下一步。
2. **本项目不需要以下任何东西，不要安装**：Python、Visual Studio / Build Tools、node-gyp、Docker、yarn、pnpm、数据库软件（MySQL、SQLite 等）、全局安装的 `next` 或 `typescript`。项目没有需要本地编译的依赖，数据库用的是 Node.js 自带的 SQLite。
3. **不要改动这些东西**：
   - 不要删除或重新生成 `package-lock.json`；
   - 不要运行 `npm update`、`npm audit fix`、`npm audit fix --force`；
   - 不要改 `package.json` 里的版本号；
   - 不要修改 `src/` 下的代码。
   遇到报错时，先查第 8 节的对照表。
4. **`npm warn` 开头的警告不用理会**，只有 `npm error` / `ERR!` 才是错误。启动后出现 `ExperimentalWarning: SQLite is an experimental feature` 是正常的。
5. **同一个步骤失败 2 次，就停下来**，把完整的报错原文发给用户，不要自己尝试其他方案。

---

## 1. 环境要求

| 项目 | 要求 | 说明 |
|---|---|---|
| 操作系统 | Windows 10 / 11，64 位 | |
| **Node.js** | **22.13 及以上，推荐 24.x LTS** | **唯一必须安装的软件**。低于 22.13 会报 `Cannot find module 'node:sqlite'` |
| npm | 跟随 Node.js 一起安装，不用单独装 | |
| Git | 可选 | 没有 Git 也可以直接下载 ZIP |
| 网络 | 要能访问 npm 源（官方源或国内镜像） | 只有 `npm ci` 这一步需要联网；装好之后，运行时不需要外网 |
| 磁盘 | 约 1 GB 空闲 | |

---

## 2. 打开终端

使用 **PowerShell**（开始菜单搜索「PowerShell」）。

**先执行这一行**，避免后面 `npm` 报「禁止运行脚本」：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

> 如果公司策略不允许修改，后面所有命令里的 `npm` 都改成 `npm.cmd`，`npx` 都改成 `npx.cmd`，效果完全一样。

---

## 3. 安装 Node.js

### 3.1 先检查是否已经装好

```powershell
node -v
```

- 输出 `v22.13.0` 或更高的版本（例如 `v24.x.x`）：**跳到第 4 步**。
- 提示「无法识别」或版本低于 v22.13：继续 3.2。

### 3.2 安装（三种方式，任选一种能用的）

**方式 A：winget（Windows 自带）**

```powershell
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
```

**方式 B：官网安装包**
打开 https://nodejs.org/zh-cn/download ，下载 **LTS 版本的 Windows Installer (.msi)，x64**，双击后一路点「下一步」。**不要勾选** "Automatically install the necessary tools"（会去装 Python 和 VS Build Tools，本项目用不到，而且非常耗时）。

**方式 C：国内镜像（官网下载太慢时使用）**
打开 https://npmmirror.com/mirrors/node/ ，进入最新的 `v24.x.x/` 目录，下载 `node-v24.x.x-x64.msi`，安装方法同方式 B。

### 3.3 检查

⚠️ **安装完成后，必须关闭当前 PowerShell 窗口，重新打开一个新窗口**，否则系统找不到 node 命令。

```powershell
node -v    # 应输出 v22.13.0 以上
npm -v     # 应输出 10.x 或 11.x
```

---

## 4. 获取项目代码

**项目位置统一放在 `C:\marketing-rag`**。路径里不要有中文和空格，也不要放在 OneDrive、桌面这类会自动同步的目录里，否则构建时可能出现文件被占用的错误。

**方式 A：有 Git**

```powershell
cd C:\
git clone https://github.com/owebowl-maker/marketing-RAG.git marketing-rag
cd C:\marketing-rag
```

**方式 B：没有 Git**

1. 浏览器打开 https://github.com/owebowl-maker/marketing-RAG ，点绿色按钮 **Code → Download ZIP**；
2. 解压到 `C:\`，得到的文件夹叫 `marketing-RAG-main`，把它**重命名为 `marketing-rag`**；
3. 然后执行：

```powershell
cd C:\marketing-rag
```

### 检查

```powershell
dir package.json, package-lock.json
```

两个文件都能列出来就说明位置对了。**如果提示找不到，多半是解压后多套了一层文件夹**，进到里面那一层再试。

---

## 5. 安装依赖

```powershell
cd C:\marketing-rag
npm ci
```

- 用 `npm ci`，**不要用 `npm install`**。`npm ci` 严格按 `package-lock.json` 安装，结果和开发者电脑上完全一致。
- 正常情况下 1～5 分钟完成，最后会显示 `added XXX packages`。

**如果超过 3 分钟没有进度，或者报 `ETIMEDOUT` / `ECONNRESET` / `ENOTFOUND`**，说明连不上 npm 官方源。按 `Ctrl + C` 停止，切换到国内镜像后重新安装：

```powershell
npm config set registry https://registry.npmmirror.com
npm ci
```

如果公司要求通过代理上网，先问用户要代理地址，再执行：

```powershell
npm config set proxy http://代理地址:端口
npm config set https-proxy http://代理地址:端口
```

### 检查

```powershell
dir node_modules\next
```

能列出内容就说明安装成功。

---

## 6. 配置

### 6.1 生成配置文件

```powershell
Copy-Item .env.example .env.local
```

### 6.2 生成一个随机密钥

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的那串字符，下一步要用。

### 6.3 编辑 `.env.local`

```powershell
notepad .env.local
```

在记事本里**只改下面这几行**，其他行保持不变：

| 配置项 | 填什么 | 示例 |
|---|---|---|
| `CHAT_BACKEND` | 保持 `mock` 不变（目前只有它能用） | `CHAT_BACKEND=mock` |
| `ACCESS_CODE` | 团队口令，**问用户**。只在本机演示的话可以留空 | `ACCESS_CODE=mk2026` |
| `SESSION_SECRET` | 粘贴 6.2 生成的那串字符 | `SESSION_SECRET=3f9a…` |
| `ADMIN_USERS` | 能进入管理后台的姓名，**问用户**，多个用英文逗号隔开。留空表示所有人都能进 | `ADMIN_USERS=张三,李四` |

`RAG_` 和 `DIFY_` 开头的几行**全部保持为空**，等以后对接时再填。

改完按 `Ctrl + S` 保存，然后关闭记事本。

注意：
- 等号两边**不要加空格**，值也**不要加引号**；
- 文件名必须是 `.env.local`，不能是 `.env.local.txt`。可以用 `dir -Force .env*` 确认。

---

## 7. 启动

有两种模式，**演示和日常使用请用 7.2**。

### 7.1 开发模式（只在修改代码时使用）

```powershell
npm run dev
```

看到 `Ready in ...` 后，浏览器打开 http://localhost:3000 。第一次打开页面要编译 10～30 秒，属于正常现象。

### 7.2 正式模式（推荐：速度快，适合演示）

```powershell
npm run build
npm start
```

- `npm run build` 需要 1～3 分钟，最后会列出页面路由表，没有 `Error` 就表示成功。
- `npm start` 之后看到 `Ready` 或 `started server on 0.0.0.0:3000` 即启动成功。
- **这个 PowerShell 窗口要一直开着，关掉窗口服务就停了。** 想停止服务时，在窗口里按 `Ctrl + C`。
- 以后再启动，只需要执行 `cd C:\marketing-rag` 和 `npm start`。只有代码更新之后，才需要重新 `npm run build`。

### 检查（全部通过才算部署完成）

1. 浏览器打开 http://localhost:3000 ，会自动跳转到登录页；
2. 输入任意姓名（如果设置了 `ACCESS_CODE`，再输入口令），进入首页，能看到 6 张主题卡片；
3. 点任意一张卡片，回答会逐字显示出来，里面有带**蓝色虚线**的词，鼠标移上去会弹出卡片；
4. 页面上有一条「当前使用的是示例词条……」的提示，这是正常的（还没有导入正式词条）；
5. 打开 http://localhost:3000/admin ，能看到管理后台。

---

## 8. 常见报错对照表

| 现象 / 报错 | 原因 | 解决 |
|---|---|---|
| `npm : 无法加载文件 ...npm.ps1，因为在此系统上禁止运行脚本` | PowerShell 执行策略 | 执行第 2 步那条命令；或者把 `npm` 改成 `npm.cmd` |
| `'node' 不是内部或外部命令` / 「无法识别」 | 装完没有重开终端，或者安装失败 | 关闭所有 PowerShell 窗口后重新打开；仍然不行就重装 Node.js |
| `Cannot find module 'node:sqlite'` / `No such built-in module: node:sqlite` | Node 版本太低 | 安装 Node 24 LTS（第 3 步） |
| `npm error code ETIMEDOUT` / `ECONNRESET` / `ENOTFOUND` | 连不上 npm 源 | 切换到国内镜像（第 5 步）；需要代理的话先问用户 |
| `npm error code EPERM` / `EBUSY` / `operation not permitted` | 文件被占用（杀毒软件、OneDrive，或者有服务还开着） | 关掉所有运行 `npm` 的窗口，确认目录不在 OneDrive 里，然后删除 `node_modules` 文件夹，重新执行 `npm ci` |
| `npm ci` 报 `package-lock.json` 与 `package.json` 不一致 | 文件被改过 | 重新下载代码（第 4 步）。**不要改用 `npm install`** |
| `Failed to load SWC binary` / `@next/swc-win32-x64-msvc` 相关报错 | 依赖没装完整 | 删除 `node_modules` 后重新执行 `npm ci` |
| `Port 3000 is in use` / `EADDRINUSE` | 3000 端口被占用 | 改用其他端口：`npm start -- -p 3001` 或 `npm run dev -- -p 3001`，然后访问 http://localhost:3001 |
| `Could not find a production build in the '.next' directory` | 没有 build 就直接 start 了 | 先执行 `npm run build` |
| 登录时提示口令错误 | `.env.local` 里的 `ACCESS_CODE` 跟输入的不一致 | 检查 `.env.local`，**改完必须按 `Ctrl + C` 停掉服务，再重新启动** |
| 改了 `.env.local` 但没生效 | 配置只在启动时读取 | 重启服务。正式模式下改配置只需要重启，不需要重新 build |
| `ExperimentalWarning: SQLite is an experimental feature` | 正常提示 | 忽略 |
| 同事用局域网 IP 访问不了 | Windows 防火墙拦截 | 见第 9.3 节，**需要用户同意并有管理员权限** |

---

## 9. 部署完成后的日常操作（给用户参考）

### 9.1 导入正式词条（私有数据）

1. 用 Excel 打开 `C:\marketing-rag\data\glossary-template.csv`，按照模板填写；
2. **另存为 →「CSV UTF-8（逗号分隔）」**。注意不要选普通的「CSV（逗号分隔）」，否则中文会变成乱码，导入时会提示「忽略无法识别的列」；
3. 执行导入命令：

```powershell
cd C:\marketing-rag
npm run glossary:import -- C:\路径\词条表.csv
```

4. 刷新网页即可看到效果，不需要重启服务。页面上「当前使用的是示例词条」的提示会消失。

> 正式词条保存在 `data\glossary.json`，使用记录保存在 `data\app.db`。这两个文件**不会**上传到 GitHub（已经在 `.gitignore` 里排除）。**不要**对 `data` 目录执行 `git add -f`。

### 9.2 更新代码

```powershell
cd C:\marketing-rag
# 停掉正在运行的服务（Ctrl + C）后执行：
git pull               # 没有 Git 的话，重新下载 ZIP，只覆盖除 data 和 .env.local 以外的文件
npm ci
npm run build
npm start
```

`data\` 目录和 `.env.local` 都不在 Git 管理范围内，更新代码不会影响它们。

### 9.3 让同事通过局域网访问（可选，先跟 IT 确认）

1. 查看本机 IP：执行 `ipconfig`，找到「IPv4 地址」，例如 `10.1.2.3`；
2. 放行防火墙。需要**以管理员身份**打开 PowerShell，执行：

```powershell
netsh advfirewall firewall add rule name="marketing-rag 3000" dir=in action=allow protocol=TCP localport=3000
```

3. 同事访问 `http://10.1.2.3:3000`；
4. 局域网开放之前，**必须在 `.env.local` 里设置 `ACCESS_CODE`**。

### 9.4 备份

把 `C:\marketing-rag\data` 整个文件夹复制到安全的位置就可以了。

---

## 10. 部署完成后，向用户汇报这些内容

- Node.js 版本（`node -v` 的输出）；
- 项目路径；
- 使用的启动方式（开发模式还是正式模式）、端口号；
- 第 7 节的 5 项检查是否都通过；
- 过程中遇到的报错以及是怎么解决的。
