# BeiDou Docker 部署与踩坑笔记

> 建立于 2026-08-14。记录 BeiDou 服务端用 Docker 跑起来的完整流程、配置位置、以及一路踩到的坑。
> 本机（Windows 11）本地开发环境为主，末尾附 Linux 生产部署的注意事项。

---

## 0. 三个仓库的关系

| 仓库 | 位置 | 作用 |
|---|---|---|
| `BeiDou-Server-Mod` | `E:\Programming\MapleStoryServer\2026\BeiDou-Server-Mod` | 服务端源码（本仓库），fork 自 `BeiDouMS/BeiDou-Server` |
| `BeiDou-docker` | `../BeiDou-docker` | 上游 `BeiDouMS/BeiDou-docker` 的克隆。**不含任何服务端代码**，只有 Dockerfile / compose / CI 配方 |
| `BeiDou-Client` | 独立仓库 | 客户端资源（`Data/` 中文基础，`EN/` 英文覆盖层） |

**关键认知**：`BeiDou-docker` 里的镜像是从**上游** `BeiDouMS/BeiDou-Server` 构建的，
不是本仓库。直接 `docker compose up` 跑的是上游代码，不含本仓库的任何改动。
想跑自己的改动，见第 9 节。

---

## 1. Docker 概念速查（只列本项目用到的）

| 概念 | 一句话 | 本项目对应物 |
|---|---|---|
| 镜像 image | 只读的"打包好的文件系统 + 启动命令" | `ghcr.io/beidoums/beidou-server-all:v1.11`、`mysql:8.4.0` |
| 容器 container | 镜像跑起来的实例。**删掉容器，容器内写的东西就没了** | `beidou-server-all`、`beidou-db` |
| 卷 / bind mount | 把宿主机目录挂进容器，存"删容器也不能丢"的数据 | `./beidou-server-release`、`./docker-db-data` |
| 网络 network | 一组容器的虚拟局域网，**容器间用服务名当域名** | `beidou-network`；所以 JDBC 写 `jdbc:mysql://beidou-db:3306` |
| compose | 一个 yml 描述"这组容器怎么一起跑" | `docker-compose-release.yml` |

补两个高频语法：

- 端口映射 `"8686:8686"` = `宿主机端口:容器端口`。不写则该端口只在 `beidou-network` 内部可见。
- `command:` 覆盖镜像默认启动参数。本项目用它给 Spring Boot 传 `--key=value`，
  **优先级高于 jar 内的 application.yml**。

### 1.1 容器的本质：内核归宿主机，其余归镜像

一个 Linux 程序跑起来需要两层东西：

```
┌─────────────────────────────────────┐
│  用户态 userland                     │  ← 来自【镜像】
│  glibc、/usr/bin、配置文件、你的 jar   │
├─────────────────────────────────────┤
│  内核 kernel                         │  ← 来自【宿主机】，容器不带
│  进程调度、内存管理、网络栈、文件系统    │
└─────────────────────────────────────┘
```

容器只打包上面那层，内核借宿主机的。这与虚拟机不同 —— 虚拟机连内核带硬件全虚拟一套，
所以又大又慢；容器只是一组被 namespace + cgroup 隔离的普通进程，启动是秒级的。

**这条推论出两个重要结论**，见 1.2 和 10.7。

### 1.2 Windows 上为什么需要 WSL2

容器要借宿主机的 **Linux 内核**，而 Windows 没有 Linux 内核，所以 Linux 容器无处可借。

**WSL2 就是微软塞进 Windows 的一个真正的 Linux 内核**，跑在极轻量的 Hyper-V 虚拟机里
（所以必须开虚拟化）。Docker Desktop 会建一个专用发行版 `docker-desktop`，
真正干活的 `dockerd` 跑在里面：

```
wsl -l -v
  NAME              STATE     VERSION
* docker-desktop    Running   2
```

PowerShell 里敲的 `docker` 只是客户端，指令通过命名管道穿进这个 VM 执行。

由此解释几个会撞到的现象：

- `docker info` 显示 `Root=/var/lib/docker` —— 是 WSL VM **内部**的路径，
  镜像实际存在一个 vhdx 虚拟磁盘文件里，不是 C 盘上的普通目录。
- **Windows 上启动慢**（见 6.5）—— `deploy/beidou-server-release/` 是 Windows 真实目录，
  容器读它要跨 Windows↔WSL 边界走 9p/virtiofs，比 WSL 内部原生文件系统慢一个数量级。
  wz 有两万多个文件，加载时这个开销很明显。
- **WSL1 不行**，必须 WSL2。WSL1 是把 Linux 系统调用翻译成 Windows 系统调用，
  没有真内核，Docker 用不了。

日常不需要碰 WSL，它是管道。偶尔排查问题可以钻进去看：

```
wsl -d docker-desktop
```

**到了真正的 Linux 服务器上，WSL 这一层完全不存在** ——
`dockerd` 直接用宿主机内核，没有任何虚拟化开销（见 10.6）。

#### 装 WSL 时踩的坑

`VirtualMachinePlatform` 和 `Microsoft-Windows-Subsystem-Linux` 两个 Windows 功能
显示"已启用"，**不代表 WSL 本体装了**。本机当时的状态是功能开着但运行时缺失，
Docker Desktop 报的却是有误导性的 "Virtualization support not detected"。
诊断三连：

```
wsl --status                                            # 最直接，会说清缺什么
Get-CimInstance Win32_ComputerSystem | Select HypervisorPresent
Get-CimInstance Win32_Processor | Select VirtualizationFirmwareEnabled
```

- `VirtualizationFirmwareEnabled = True` → BIOS 里 VT-x 是开的，别去翻 BIOS 了
- `HypervisorPresent = False` 但 VMP 已启用且已重启 → 多半是 BCD 里
  `hypervisorlaunchtype` 被设成了 `off`，管理员执行 `bcdedit /set hypervisorlaunchtype auto` 后重启
- 装 WSL：管理员执行 `wsl --install --no-distribution`（Docker Desktop 自带发行版，
  不需要额外的 Ubuntu），**装完必须重启**

---

## 2. BeiDou-docker 仓库结构

```
BeiDou-docker/
├── docker-compose-release.yml   ← 正式版，单镜像 all-in-one（推荐）
├── docker-compose-nightly.yml   ← 每日构建版，前后端拆两个镜像
├── docker-bake.hcl              ← 构建定义（CI 用）
├── release/
│   ├── docker/release.Dockerfile
│   └── entrypoint-release.sh
├── nightly/
│   ├── docker/backend.Dockerfile
│   ├── docker/frontend.Dockerfile
│   ├── entrypoint-nightly.sh
│   └── nginx-ui.conf
├── legacy/                      ← 重构前的旧版，保留参考，别用
└── .github/workflows/           ← 定时构建推 ghcr.io / docker.io
```

### release 与 nightly 的区别

| | release（正式版） | nightly（每日构建） |
|---|---|---|
| 镜像数 | 1 个 `beidou-server-all` | 2 个 `beidou-server` + `beidou-ui` |
| 来源 | 下载 GitHub Release 的 `.tar.gz` **成品包**（含捆绑 JRE） | `git clone` 上游 master **现编译** |
| 前端 | jar 内嵌 static，Undertow 同源 8686 | 独立 nginx 容器，静态未命中再反代到后端 |
| 稳定性 | 跟版本号走（当前 v1.11） | 每天 UTC 21:00 自动重建，可能是坏的 |
| 适用 | **日常开服 / 本地跑通** | 尝鲜上游最新提交 |

### entrypoint 的核心逻辑（理解一切的关键）

`release/entrypoint-release.sh`：

```sh
if [ ! -f "/opt/server/.initialized" ]; then
    cp -r /opt/server_backup/* /opt/server/     # 只在第一次拷
    touch /opt/server/.initialized
fi
cd /opt/server
JAVA_EXEC=$(find . -name java -path "*/bin/java" | head -1)   # 用 release 包自带 JRE
exec "$JAVA_EXEC" ${JAVA_OPTS} -jar ./BeiDou.jar --spring.config.location=./application.yml "$@"
```

含义：

1. 首次启动把整个服务端目录"倒"进宿主机的 `./beidou-server-release/`。
   之后 `application.yml`、`scripts-zh-CN/*.js`、`wz-zh-CN/` **都是宿主机上的普通文件**，
   直接编辑 + restart 即生效 —— 体验和手动部署没区别。
2. `"$@"` 就是 compose 里 `command:` 那一串，追加到 java 命令末尾，覆盖 yml。
3. `${JAVA_OPTS}` 支持通过环境变量注入 JVM 参数。
4. **有 `.initialized` 标记后，换新镜像也不会更新这个目录** —— 升级大坑，见第 7 节。

---

## 3. 本地跑起来（Windows）

### 3.1 装 Docker Desktop

```
winget install Docker.DockerDesktop
```

装完需重启。**Docker Desktop 不会帮你装 WSL**，缺 WSL 时它只会报
"Virtualization support not detected"，排查方法见 1.2。

验证就绪：

```
docker version --format "Client {{.Client.Version}} / Server {{.Server.Version}}"
```

能同时打出 Client 和 Server 两段版本号才算引擎起来了（只有 Client 说明守护进程没跑）。

### 3.2 起服

用本仓库的 `deploy/docker-compose.yml`（改编自上游 release 版，
放在本仓库是为了不弄脏 `../BeiDou-docker` 那个上游克隆）。在 `deploy/` 目录下：

```
docker compose up -d
```

首次会拉几百 MB 镜像 + 初始化 MySQL + 跑 Flyway 建表，比较慢。

相对上游版做的改动：删掉废弃的 `version:` 字段、加了 `JAVA_OPTS` 堆上限、
MySQL 加了 `TZ`、把各段注释补全（端口规则 / host 含义 / 安全开关）。
数据落在 `deploy/beidou-server-release/` 和 `deploy/docker-db-data/`，两者均已 gitignore。

### 3.3 访问

- 管理后台 / REST API：<http://localhost:8686>
- 客户端登录服：`127.0.0.1:8484`
- 频道服：`7575` / `7576` / `7577`

日志里那句 `Web地址：http://172.18.0.3:8686` **别照着敲** ——
那是容器在 bridge 网络里的内网 IP，只在容器之间有意义。宿主机访问走端口映射，即 `localhost`。

### 3.4 首次启动耗时基准（本机实测，i7-13700KF / 32G / Win11 + WSL2）

首次启动很慢，但**慢不等于卡死**。分三段，有个基准好判断：

| 阶段 | 日志特征 | 耗时 | 说明 |
|---|---|---|---|
| 卷初始化 | `First run - initializing volume...` 之后长时间无输出 | 约 10 分钟 | 拷 27,234 个文件 / 872 MB 到 Windows 目录，跨 WSL 边界，慢在这（见 1.2） |
| Flyway 建表 | `Root WebApplicationContext initialization completed` 之后断层 | 约 4 分钟 | 对空库跑全部迁移脚本，**一次性** |
| 北斗自身启动 | `北斗 v83 正在启动...` → `启动完成` | 16 秒 | WZ 加载仅 4 秒 |

`Started ServerApplication in 235.492 seconds` 这个数字包含了 Flyway 那段。
**第二次启动只剩最后 16 秒那段**，前两段都不会再有。

期间千万别 `restart` 打断卷初始化，会留下半拉子目录。
判断是否还在拷，看宿主机目录体积涨没涨：

```
(Get-ChildItem .\beidou-server-release -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
```

启动成功的标志（`docker compose logs -f`）：

```
频道 1：开放的端口 7575
已开启登录端口 8484
北斗 启动完成，耗时：16.293 s
```

另外 `Adding welcome page: class path resource [static/index.html]` 这行印证了
release 版 jar 内嵌前端，8686 由 Undertow 同源托管，不需要单独的 nginx 容器。

---

## 4. 常用命令

以下都在 `deploy/` 目录下执行（compose 默认读当前目录的 `docker-compose.yml`，
所以不需要 `-f`）。

跟日志（出问题全靠它，`Ctrl+C` 只退出跟随，不停服）：

```
docker compose logs -f beidou-server-all
```

看容器状态：

```
docker compose ps
```

停 / 重启：

```
docker compose stop
```

```
docker compose restart beidou-server-all
```

删掉容器（宿主机目录里的数据不受影响）：

```
docker compose down
```

进数据库：

```
docker compose exec beidou-db mysql -uroot -proot beidou
```

---

## 5. 配置改在哪

有三个层次，**优先级从低到高**：

1. **jar 内的 `application.yml`** —— 镜像里带的默认值，不用管。
2. **`deploy/beidou-server-release/application.yml`** —— 首次启动铺到宿主机的那份，
   entrypoint 用 `--spring.config.location=./application.yml` 显式指定加载它。
   改这里适合放大段的、结构化的配置。
3. **compose 的 `command:` 列表** —— 最高优先级，适合放少量关键覆盖项。

已经在 compose 里的覆盖项：

```yaml
command:
  - --mybatis-flex.datasource.mysql.url=jdbc:mysql://beidou-db:3306/beidou?...
  - --mybatis-flex.datasource.mysql.username=root
  - --mybatis-flex.datasource.mysql.password=root
  - --gms.service.wan-host=127.0.0.1
  - --gms.service.lan-host=127.0.0.1
  - --gms.service.localhost=127.0.0.1
```

另有一类**运营参数（经验倍率 / 金币倍率 / 掉落率等）不走这里**，
它们在数据库 `game_config` 表里，由 `org.gms.config.GameConfig` 管理，
可以在管理后台热改，无需重启。别去 `application.yml` 里找。

### 端口号规则

频道端口 = `WWCC`，其中 `WW = 75 + 世界号`，`CC = 75 + 频道号`（都从 0 起）。
所以 world 0 的 ch0/1/2 = 7575 / 7576 / 7577。
想开 5 个频道，compose 里要改成 `"7575-7579:7575-7579"`。

### 顺手能开的两个东西

`deploy/docker-compose.yml` 末尾注释了 `adminer` 服务（上游版还带了 `phpmyadmin`），
取消注释即可得到网页版数据库管理界面（<http://localhost:8080>，服务器填 `beidou-db`，
用户 `root`，密码 `root`），比装 Navicat 省事。

MySQL 的 `ports` 默认是注释掉的（只在 `beidou-network` 内部可达）。
要用本地客户端连，取消 `- "3306:3306"` 的注释再重启。

---

## 6. 坑点清单

### 6.1 🔴 官方镜像不含本仓库的改动

`backend.Dockerfile` 里写死 `git clone https://github.com/BeiDouMS/BeiDou-Server --depth 1`，
release 线更是直接下上游 release 包。**本仓库的改动一行也进不去。**
解决见第 9 节。

### 6.2 🔴 升级镜像 ≠ 升级服务端

因为 `.initialized` 标记，把 `image:` 从 `v1.11` 改成 `v1.12` 再 `up -d`，
容器是新的，但 `/opt/server` 挂的还是旧目录，**跑的还是旧 jar**。
正确升级流程见第 8 节。

### 6.3 winget 装不了 Maven

`winget install Apache.Maven` 报 `No package found matching input criteria`。
**winget 官方源里根本没有 Apache Maven**（Apache 没提交过）。
只能手动下 `apache-maven-3.9.x-bin.zip` 解压 + 加 PATH，或用 IDE 自带的 Maven。
走 Docker 路线的话宿主机根本不需要 Maven。

JDK 则可以：`winget install EclipseAdoptium.Temurin.21.JDK`，
装完自动写好机器级 `JAVA_HOME` 和 PATH（当前装在
`C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot`），**需要开新终端**才生效。

### 6.4 `gms.service.wan-host` 决定客户端去连谁

这三个 `gms.service.*-host` 不是"服务端监听地址"，而是
**登录服发给客户端、让它去连频道服的地址**。填 `127.0.0.1` 时只有本机能玩：
别人的机器登录后被告知"去连 127.0.0.1:7575"，结果连到他自己机器上 → 卡在选频道。

- 本机自己玩：`127.0.0.1`
- 局域网：填本机内网 IP
- 公网：填公网 IP / 域名

### 6.5 Windows 上启动慢是正常的

bind mount 跨 WSL2 边界读写有开销，wz 数据加载会明显比原生慢。启动慢≠卡死。

### 6.6 `version: '3.4'` 已废弃

新版 `docker compose` 会警告 `the attribute 'version' is obsolete`。
删掉这行即可，不影响功能。

### 6.7 数据库全部身家在 `deploy/docker-db-data/`

被 `.gitignore` 排除。备份就是停服后打包这个目录。
`docker compose down -v` 的 `-v` 会删卷，但这里用的是 bind mount（宿主机目录），
`-v` 删不掉 —— 但也别养成敲 `-v` 的习惯。

---

## 7. 升级流程（务必按顺序）

1. 停服：`docker compose stop`
2. 备份 `deploy/beidou-server-release/`（尤其改过的 `application.yml`、`scripts-zh-CN/`）
3. 备份 `deploy/docker-db-data/`
4. 改 compose 里的 `image:` tag
5. **删掉 `deploy/beidou-server-release/.initialized`**（或整个目录）
6. `docker compose up -d`
7. 把步骤 2 里的自定义改动合回新铺出来的目录

漏掉第 5 步 = 白升级。

---

## 8. 备份与恢复

需要备份的只有两个宿主机目录：

| 目录 | 内容 |
|---|---|
| `deploy/docker-db-data/` | MySQL 全部数据（账号、角色、装备……） |
| `deploy/beidou-server-release/` | 服务端目录（配置、脚本、wz、jar） |

恢复 = 停服 → 把两个目录换回去 → 起服。镜像本身不需要备份，随时能拉。

---

## 9. 部署自己改过的服务端

**这条链路本仓库已经建好了**，涉及四个文件：

| 文件 | 作用 |
|---|---|
| `.dockerignore` | 挡掉 `deploy/beidou-server-release/`（872 MB）、`node_modules`、`.git`。缺它构建慢到没法用 |
| `deploy/Dockerfile` | 三阶段构建，宿主机不需要 JDK/Maven/Node |
| `deploy/docker-compose.prod.yml` | 生产编排，含 2G 内存调优与安全加固 |
| `deploy/.env.example` | 密钥与公网地址模板；真实的 `deploy/.env` 已 gitignore |
| `.github/workflows/build-image.yml` | 推 master 自动构建并推送到 ghcr.io |

### 9.1 流水线

```
IDEA 改代码 → git push master
                  ↓
       GitHub Actions 自动触发
                  ↓
  ┌─────────────────────────────────────┐
  │ 阶段 1  node:20    → yarn build      │ 出前端 dist/
  │ 阶段 2  maven:21   → mvn package     │ dist 塞进 static/ 再打 jar
  │ 阶段 3  temurin:21-jre-alpine        │ 只留运行时
  └─────────────────────────────────────┘
                  ↓
        ghcr.io/<用户名>/<仓库名>:latest
                  ↓
        服务器 docker compose pull && up -d
```

前端产物被塞进 `src/main/resources/static/` **再**打 jar，所以出来的是单镜像、
8686 同源提供后台，不需要额外的 nginx 容器（与官方 release 版形态一致）。

### 9.2 层顺序是最关键的设计

Docker 层缓存以层为单位失效：某层变了，它**之后**的所有层全部重建重传。
本项目各成分的变化频率极不均衡：

| 内容 | 体积 | 变化频率 |
|---|---|---|
| `wz/` | 561 MB | 几乎永不变 |
| `wz-zh-CN/` | 34 MB | 汉化时才动 |
| `scripts/` + `scripts-zh-CN/` | 9 MB | 偶尔改 |
| `BeiDou.jar` | 113 MB | 每次改 Java 代码都变 |

所以 `Dockerfile` 里 **jar 必须 COPY 在最后**。日常迭代只有 113 MB 的层需要
重新构建和传输，561 MB 的 wz 层原封不动 —— 这是用镜像仓库而非 `docker save`
的最大收益（后者每次都是全量约 900 MB）。改这个文件时别打乱顺序。

### 9.3 首次部署

服务器上（只需要装 Docker，不需要 JDK/Maven/Node）：

```
git clone <你的仓库> && cd deploy
cp .env.example .env && vi .env
docker compose -f docker-compose.prod.yml up -d
```

`.env` 要填四个值：`BEIDOU_IMAGE`、`DB_PASSWORD`、`WAN_HOST`（公网 IP）、
`JWT_SECRET`（`openssl rand -hex 10` 生成）。compose 里用了 `${VAR:?}` 语法，
漏填会直接报错而不是带着默认值跑起来。

### 9.4 日常升级

```
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

**没有第三步**。本文件刻意不使用官方镜像那套"首次拷贝到卷 + `.initialized` 标记"
的模式，代码和 wz 全部烤在镜像里，卷只挂日志 —— 因此不存在 6.2 那个
"换了新镜像但卷里还是旧 jar"的陷阱。

代价是服务器上不能直接改 `.js` 脚本或 wz。但那些本来就在 git 里，
正确流程就该是「改 → 提交 → 重新构建」。

### 9.5 不要在小内存服务器上构建

阶段 1 的 `yarn build` 光 Node 就要 1.5-2G 堆，Maven 编译也要 1G+。
**2G 内存的机器上 `docker compose build` 必然 OOM**。
构建放 GitHub Actions（免费额度够用）或你本机，服务器只负责 `pull`。

### 9.6 备选：不用镜像仓库

不想用 ghcr.io 的话，本机构建后直传：

```
docker build -f deploy/Dockerfile -t beidou:v1 .
docker save beidou:v1 | gzip | ssh user@服务器 "gunzip | docker load"
```

缺点是每次全量（约 900 MB，gzip 后 wz 是 XML 能压到 150-250 MB），
且没有分层增量的好处。适合服务器无法访问 ghcr.io 的情况。

### 9.7 只想快速验证一次改动

不走镜像也行：本地 `mvn clean package -DskipTests` 出 jar，
覆盖进 `deploy/beidou-server-release/` 再 `docker compose restart`
（那套本地环境的 `/opt/server` 是 bind mount 到宿主机的）。

⚠️ 如果改了 wz 数据，**必须连 wz 一起同步**。只换 jar 会出现
"服务端行为和数据对不上"的诡异 bug，很难查。这条路只适合临时验证，
正式部署走 9.1。

---

## 10. 将来部署到 Linux 服务器时

### 10.1 🔴 Docker 会绕过 ufw / firewalld

`ports: - "8686:8686"` 直接写 iptables 的 DOCKER 链，**优先级高于 ufw 规则**。
你以为 `ufw deny 8686` 挡住了，实际上全世界都能访问管理后台。

管理后台只监听回环：

```yaml
ports:
  - "127.0.0.1:8686:8686"   # 只本机可达
  - "8484:8484"             # 登录服，必须公网
  - "7575-7577:7575-7577"   # 频道服，必须公网
```

自己走 SSH 隧道访问后台：

```
ssh -L 8686:127.0.0.1:8686 user@your-server
```

### 10.2 生产必须换 jwt.secret + 关 Swagger

Swagger 开启时可以用字面量 `swagger` 当 token 越权访问所有 API，
等于后台无密码。compose 注释里已备好开关：

```yaml
command:
  - --jwt.secret=<生成的密钥>
  - --springdoc.api-docs.enabled=false
  - --springdoc.swagger-ui.enabled=false
```

生成密钥：`openssl rand -hex 10`

### 10.3 JVM 内存要显式给

entrypoint 是 `exec java ${JAVA_OPTS} -jar ...`，compose 里加环境变量即可：

```yaml
environment:
  TZ: Asia/Shanghai
  JAVA_OPTS: "-Xms512m -Xmx1g -XX:MaxMetaspaceSize=192m"
```

不给的话 JVM 按容器可见内存的 1/4 取堆上限，wz 全量加载进内存很容易 OOM。
具体给多少见 10.4。

### 10.4 2G 内存服务器的调优

**目标机器**：阿里云 `ecs.e-c1m1.large` —— 经济型 e 系列，**2 vCPU / 2 GiB / amd64**。

命名拆解：`e` = 经济型实例族（x86），`c1m1` = CPU:内存 1:1，`large` = 2 vCPU。
阿里云的 ARM 实例是倚天 710 那几个族（`g8y`/`c8y`/`r8y`，带 `y` 后缀），
命名上区分明显。拿到机器后仍应确认一次：

```
uname -m        # x86_64 = amd64，aarch64 = arm64
```

架构决定 `.github/workflows/build-image.yml` 里的 `platforms:` 值，目前是 `linux/amd64`。

**实测数据**（本机运行，空服零玩家）：

```
工作集（实际物理内存）: 960 MB
G1 堆: total 698 MB, used 442 MB
Metaspace: used 112 MB
```

内存账（Linux，2G 机器）：

| 组件 | 默认占用 | 调优后 |
|---|---|---|
| BeiDou JVM | ~960 MB | ~700-800 MB（`-Xmx1g`，堆实测只用 442 MB，有余量）|
| MySQL 8 | ~400 MB | ~200 MB（见下）|
| Linux 系统 | ~150-250 MB | 同 |

**已知可行**：有人在 2G 机器上跑到 20 人同时在线正常。所以 2G 能用，
但没有太多余量，人数上来要盯着。建议加 2G swap 当保险丝防 OOM killer ——
但只是保险丝，真吃到 swap 会有肉眼可见卡顿。

#### 生产实测（2026-08-15 首次部署，零玩家在线）

```
Mem:   1.6Gi 总 / 1.4Gi 已用 / 可用 145Mi     ← 标称 2GiB，系统可见只有 1.6Gi
Swap:  2.0Gi 总 / 0B 已用                     ← 未被动用

beidou-server   732.2 MiB   （-Xmx1g，堆上限尚未摸到）
beidou-db       270.5 MiB
系统 + 阿里云安骑士等  ~400 MiB
```

启动耗时对比（同一份代码）：

| | 本地 Windows（24 核 / WSL2） | 服务器（2 核 / Linux 原生） |
|---|---|---|
| Spring 含 Flyway | 235 s | **42.7 s** |
| 北斗自身 | 16.3 s | 30.0 s |

Flyway 从 4 分钟降到几十秒，印证 1.2 的说法：本地慢在跨 WSL 边界的文件 I/O，
Linux 原生没这个税。北斗自身反而慢一倍，那是 2 核与 24 核的 CPU 差距。

#### ⚠️ 事故记录：2026-08-15 首日即卡死

部署当天打开管理后台后不久，整机失去响应。**这段是本节最重要的内容。**

**症状与诊断信号**：

```
ICMP            3/3 回复，0% 丢包，26ms      ← 网络与内核正常
TCP 22/8484     三次握手成功                 ← 内核在正常收包
SSH banner      拿不到                       ← 用户态进程被饿死
load average    18.50 / 13.35 / 6.42         ← 2 核机器，极高
Swap used       0B                           ← 关键：并没有在换页
可用内存         90 MiB
```

**这个组合是判断"内存压死用户态"的特征指纹**：ICMP 回复和 TCP 握手都在内核里
完成、不需要调度任何进程，所以网络看起来完全正常；而 sshd 是用户态进程，
连吐一行版本号都做不到。别被"能 ping 通、端口能连"误导成网络问题。

**根因不是 swap 抖动，而是页缓存抖动。** `vm.swappiness=0` 让内核拒绝换出
匿名内存（JVM 堆），在可用内存只剩 90 MiB 时只能反复回收**页缓存**，
于是 JVM 和 MySQL 需要的可执行页、映射文件被不断驱逐又从磁盘读回。
经济型实例云盘 IOPS 基线低，进一步放大成雪崩。

**因此本文档早先"`swappiness=0` 正好合适"的说法是错的**，那个判断建立在
"内存充裕、swap 只做保险丝"的前提上。内存余量只有百 MiB 级别时，
让内核换出冷的 JVM 堆页远好于死磕页缓存 —— 换出冷页只损失一点性能，
反复重读可执行页是灾难性的。**配了 2 GB swap 却设 swappiness=0，等于白配。**

**触发源不明**。当时曾判断是管理后台加载引发的尖峰，但 08-15 修复后的
定量实测推翻了这个结论：完整加载后台（18 条并发连接、持续 90 秒）只让
JVM RSS 涨了 6 MiB，load 全程低于 0.05，可用内存没有下降。**后台不是扳机。**

真正的问题是状态本身的脆弱：可用内存只剩 90 MiB 且 swap 形同虚设时，
**任何一点分配尖峰都可能引发雪崩** —— JVM 的一次 GC、InnoDB 刷盘、
云厂商安全代理扫描、`unattended-upgrades`（它在内存占用榜上排第六）都有可能。
后台访问只是时间上恰好同时发生，把相关当成了因果。

因此修复方向不是「别开后台」，而是**恢复内存余量并让 swap 真正可用**。

**修复后的实测**（2026-08-15 11:31 起，`swappiness=30` + `-Xmx768m`）：

| 指标 | 事故前 | 修复后 |
|---|---|---|
| 可用内存 | 145 MiB | **290~300 MiB** |
| buff/cache | 153 MiB | **381 MiB** |
| Swap 已用 | 0 B（内核拒绝换出） | **60~71 MiB**（正常工作） |
| beidou-server | 732 MiB | 671 MiB |
| beidou-db | 270 MiB | 224 MiB |
| 空闲 load | — | 0.00~0.05 |

那几十 MiB 的 swap 正是修复生效的证据：内核把冷的 JVM 堆页换出，
腾出的物理内存回到页缓存（153 → 381 MiB）。这正是雪崩时缺的那一环。

另外补一条实测结论：**管理后台开着但空闲时开销约等于零**
（7 分钟内 load 0.00、JVM 仅涨 5 MiB），加载时也只有 +6 MiB。
不需要为了省内存而回避使用它。

**修复步骤**（如果换机器或重装，按序执行）：

```
sysctl -w vm.swappiness=30
echo "vm.swappiness=30" > /etc/sysctl.d/99-beidou.conf
# /opt/beidou/.env 里改成：
# JAVA_OPTS=-Xms384m -Xmx768m -XX:MaxMetaspaceSize=160m
docker compose up -d
```

⚠️ 重启实例后 `restart: unless-stopped` 会自动拉起容器，用的仍是旧参数。
必须抢在 JVM 加载完之前介入：开机后立刻 `docker stop beidou-server`，
改完参数再 `up -d`。

**监控要点（已按事故修正）**：不能只看 Swap。`swappiness=0` 时系统濒死
Swap 依然是 0，该指标会给出虚假的安全感。**改看 `uptime` 的 load average** ——
2 核机器持续超过 2.0 就是过载，上双位数说明已经在雪崩。
调高 swappiness 之后，Swap used 才重新具有预警价值。

在看到明确信号之前不要盲目下调 `-Xmx` —— 调太小会触发 JVM 内部 OOM，
比换页严重得多。

`jcmd` 在 alpine JRE 镜像里不存在，拿不到堆细节。需要深入分析时，
可临时把运行阶段基础镜像换成 `eclipse-temurin:21-jdk-alpine`。

MySQL 侧的调优（已写进 `deploy/docker-compose.prod.yml`）：

```yaml
command:
  - --innodb-buffer-pool-size=64M
  - --performance-schema=OFF     # 省 200-400 MB，最大的一块
  - --max-connections=64
```

✅ `performance-schema=OFF` **已实测通过**（2026-08-15 首次生产部署）。
Flyway 99 个迁移脚本全部成功执行到 `1.11.5`，MyBatis-Flex 建连接正常，
MySQL healthcheck 通过。`gms-server/README.md` 里那条
`performance_schema.user_variables_by_thread` 权限要求不影响 root 用户使用。
省下的 200-400 MB 是实打实的。

#### GC 的取舍（2 vCPU 特有）

JVM 在「≥2 核 且 ≥1792MB 内存」时自动选 G1，这台机器正好卡在门槛上，会选 G1。
但 G1 要开并发标记线程、维护 remembered set，在 2 核 / 1G 堆的场景下开销占比不低。
备选是串行 GC：

```
JAVA_OPTS=-Xms512m -Xmx1g -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC
```

| | G1（默认） | SerialGC |
|---|---|---|
| 内存开销 | 高几十 MB | 低 |
| CPU 开销 | 常态占用并发线程 | 低 |
| 停顿 | 短，可控 | Full GC 完全停顿，1G 堆约几百毫秒~1 秒 |

游戏服对停顿敏感，所以**先用默认的 G1 跑，攒一段时间的基线数据再决定**。
没有基线的调优是瞎猜。只有在观察到内存吃紧或 CPU 长期跑满时才换 SerialGC 对比。

### 10.5 CPU 架构

官方 release / nightly 镜像都有 `linux/amd64` + `linux/arm64`，ARM 服务器没问题。
但自建镜像时注意：Windows 上 `docker build` 默认出 amd64，
推到 ARM 服务器跑不起来，需要 `docker buildx build --platform linux/arm64`。

### 10.6 Linux 上 Docker 的开销可以忽略

是 namespace 不是虚拟机，和 Windows 上 WSL2 那种损耗完全不是一回事。
"Docker 慢"这个顾虑在 Linux 生产环境不成立。

### 10.7 服务器装什么发行版无所谓

Dockerfile 里的 `FROM ubuntu:20.04` 指的是**容器内部的用户态**，
和宿主机装什么发行版**毫无关系**（原理见 1.1）。
你完全可以在 Debian 12 / Rocky 9 / AlmaLinux / Ubuntu 24.04 上，
跑一个内部是 Ubuntu 20.04 的容器 —— 两边 `/etc/os-release` 各说各话，共用同一个内核。

这套东西里的基础镜像本来就是混搭的，正好印证：

| 镜像 | 基底 |
|---|---|
| `beidou-server-all`（release） | `ubuntu:20.04` |
| `beidou-server`（nightly，temurin 变体） | `eclipse-temurin:21-jre-alpine` |
| `beidou-ui` | `nginx:alpine` |
| `beidou-db` | `mysql:8.4.0`（Oracle Linux 基底） |

四个容器四种发行版，同一台宿主机上和平共处。

**release 版为什么用 ubuntu 而不是更小的 alpine？**
Dockerfile 里作者的注释是「alpine好像缺点东西」，真实原因是
**Alpine 用 musl libc 而非 glibc**。release 的 `.tar.gz` 里捆绑了一个预编译 JRE
（就是 `launch.bat` 里那个 `jdk-21.0.11+10-jre`），它是按 glibc 编译的，
扔进 Alpine 跑不起来。nightly 版没这问题，因为用的是官方为 Alpine 编的 musl 版 JRE。

**服务器真正需要满足的只有三条**：

1. 能装 Docker（主流发行版都行，内核别太古老）
2. CPU 架构对得上（amd64 / arm64，见 10.5）
3. 内存够（MySQL + JVM 堆，建议 ≥ 4G）

非要推荐发行版的话选 Ubuntu LTS 或 Debian，纯粹因为出问题时资料最多，与 BeiDou 无关。

---

## 11. 附：不走 Docker 的本地构建（备查）

需要 JDK 21 + Maven（Maven 需手动装，见 6.3）。在**仓库根**执行：

```
mvn clean package -DskipTests
```

产物 `gms-server/target/BeiDou.jar`。

`-DskipTests` 是必须的：`src/test/java` 下的 `CodeGen` / `ExportPatch` / `Xml*`
是开发工具不是单测，`CodeGen` 会直连本地 `beidou` 库，没 MySQL 时 `mvn test` 直接失败。

前端另外构建（Node 20.15 + Yarn）：

```
cd gms-ui && yarn install && yarn build
```

产物 `gms-ui/dist/`，拷进 `gms-server/src/main/resources/static/` 后重新打包，
即可由服务端 8686 同源托管。注意该 static 目录被 `.gitignore` 排除，仓库里默认不存在。

IDE 直接跑 `org.gms.ServerApplication.main` 时，
**Working directory 必须设为 `gms-server`**，否则相对路径找 wz/scripts/logs 会错。
