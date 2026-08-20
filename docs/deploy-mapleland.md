# mapleland 部署记录（117.72.222.117 / 京东云）

> 建立于 2026-08-20。第二台生产机的部署实录。
> 通用流程见 [docker-deploy.md](docker-deploy.md)，**本文只记这台机器与通用流程不同的地方**——
> 差异全部来自网络环境，不是配置口味问题。

---

## 1. 机器与访问

| 项 | 值 |
|---|---|
| 公网 IP | `117.72.222.117` |
| 厂商 / 系统 | 京东云 · Ubuntu 24.04.2 LTS · x86_64 |
| 规格 | 2 vCPU / 3.8 GiB / 59 G 盘 / **无 swap** |
| SSH 别名 | `ssh mapleland`（普通）、`ssh mapleland-tunnel`（带后台隧道） |
| 后台地址 | 开隧道后 `http://localhost:18687` |
| 部署目录 | `/opt/beidou`（与 beidou 那台同路径，两边运维命令可以照抄） |

隧道本地端口用 **18687**，刻意错开 beidou 的 18686，两条隧道可以同时挂着。
配置在 `~/.ssh/config`。

对照 beidou（`121.41.227.208`，阿里云）：那台 1.6 GiB 内存、堆只敢给 768m；
这台 3.8 GiB，堆给到 1536m。

---

## 2. 🔴 核心差异：这台机器的出网限制

部署前实测的连通性，这是全文最重要的一张表：

| 目标 | 结果 | 影响 |
|---|---|---|
| `ghcr.io` API（manifest） | ✅ 通 | 取摘要没问题 |
| `ghcr.io` blob（镜像层） | ⚠️ **~68 KB/s，且会卡死** | 直连拉镜像不可行 |
| `registry-1.docker.io` | ❌ **完全不通** | `mysql:8.4.0` 拉不到 |
| `download.docker.com` | ❌ 不通 | 装不了 Docker 官方 apt 源 |
| `mirrors.aliyun.com` | ✅ 通 | |
| `ghcr.nju.edu.cn` | ✅ **~1.4 MB/s** | 镜像层走这里 |
| `public.ecr.aws` | ✅ 快 | MySQL 走这里 |

> 实测记录：直连 ghcr 拉 180 MB 的镜像，20 分钟只下了约 20 MB 就彻底停在 0 KB/s；
> 换南大镜像后 **1 分 50 秒**拉完。

由此产生三处偏离通用流程的做法，下面三节分别说明。

---

## 3. 偏离一：Docker 装在阿里云 apt 源上

`download.docker.com` 不通，用阿里云的 docker-ce 镜像：

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

装出来是 Docker 29.7.2 + Compose v5.5.0（与 beidou 同版本）。
清华 `mirrors.tuna.tsinghua.edu.cn`、中科大 `mirrors.ustc.edu.cn` 的同名路径也通，可作备选。

---

## 4. 偏离二：MySQL 镜像换 AWS 官方站

Docker Hub 整个不通，`mysql:8.4.0` 改从 `public.ecr.aws/docker/library/mysql:8.4.0` 拉。

**这不是第三方代理**——`public.ecr.aws` 是 AWS 官方运营的 Docker Hub 官方镜像库，
部署时逐位核对过 manifest 摘要：

```
Docker Hub    sha256:dab7049abafe3a0e12cbe5e49050cf149881c0cd9665c289e5808b9dad39c9e0
public.ecr.aws sha256:dab7049abafe3a0e12cbe5e49050cf149881c0cd9665c289e5808b9dad39c9e0
```

为此把 `deploy/docker-compose.prod.yml` 里写死的 `image: mysql:8.4.0` 改成了
`image: ${MYSQL_IMAGE:-mysql:8.4.0}`，默认值不变——**能直连 Docker Hub 的机器不受影响**，
本机在 `.env` 里设 `MYSQL_IMAGE` 覆盖。

---

## 5. 偏离三：服务端镜像走南大镜像站 + 按摘要拉

`/opt/beidou/pull-image.sh` 封装了这个流程。**不要在这台机器上直接 `docker compose pull`**——
会卡在 ghcr 直连上。

```bash
cd /opt/beidou
./pull-image.sh e5d0465      # 或 ./pull-image.sh latest
docker compose up -d
```

脚本干三件事：

1. **摘要从 ghcr.io 官方 TLS 通道取**。manifest 只有几 KB，慢也无所谓。
2. **按摘要（不是 tag）去南大镜像站拉**。Docker 会逐层校验 sha256，
   镜像站没有篡改余地——这是「用镜像站」和「信任镜像站」的区别。
3. **重打成官方名** `ghcr.io/liqingnz/beidou-server-mod:<tag>`，
   所以 `.env` 和 `docker-compose.yml` 里始终写官方名，镜像站地址只存在于脚本里。

---

## 6. 当前部署状态（2026-08-20）

```
BEIDOU_IMAGE=ghcr.io/liqingnz/beidou-server-mod:e5d0465
MYSQL_IMAGE=public.ecr.aws/docker/library/mysql:8.4.0
WAN_HOST=117.72.222.117
JAVA_OPTS="-Xms512m -Xmx1536m -XX:MaxMetaspaceSize=192m"
```

`e5d0465` 是部署当时分支 `port/lichking-mod` 的 HEAD，也是 ghcr 上 `latest` 指向的构建。
（其后的 `00789dca7` 是纯文档提交，代码未变，不需要重新构建镜像。）
按 docker-deploy.md §9.3 钉短 sha 而非 `latest`。
> 同日 20:43，beidou 那台也被升到了同一个构建（走南大镜像），
> 两台现在跑的摘要都是 `sha256:e680e59c63b3…`。
> 通用的镜像站方案与实测数据见 docker-deploy.md **§9.9**——那节是在 beidou（阿里云）
> 上测的，南大速率 9.57 MB/s；本机（京东云）只有 1.4 MB/s，结论一致但数量级不同。

首启核对结果：

| 项 | 结果 |
|---|---|
| Flyway | 107 条全部成功，`max_version=1000.2.1`，无 `success=0` |
| `command_info` | 193 |
| `game_config` | 281 |
| `drop_data` | 23450 |
| 内存占用 | 服务端 948 MiB ／ MySQL 265 MiB ／ 全机 1.8 GiB of 3.8 GiB |
| 管理后台 | `http://127.0.0.1:8686/` 返回 200，`<title>BeiDou</title>`（前端已打进 jar） |
| 隧道 | `ssh mapleland-tunnel` → `http://localhost:18687` 实测 200 |

`.env` 里的 `DB_PASSWORD` / `JWT_SECRET` 是部署时用 `openssl rand` 现生成的随机值，
与 beidou 那台不同，文件 `chmod 600`。要看值：`grep ^DB_PASSWORD= /opt/beidou/.env`。

---

## 7. ⚠️ 未完成事项

1. **京东云安全组没放行游戏端口**。宿主机 `ufw` 是 inactive，容器端口在服务器本地
   回环全部正常，但从外网连 `8484` / `7575-7577` 全部不通——卡在云厂商安全组。
   需要在京东云控制台放行入方向 TCP `8484` 和 `7575-7577`。
   **`8686` 不要放行**，它只绑 `127.0.0.1`，看后台走 SSH 隧道。
2. **默认 `admin` 账号**。库里已有种子账号 `admin`（密码 bcrypt，60 字符，
   多半是上游默认密码）和角色 `Admin`。开服前改掉。
3. **无 swap**。beidou 那台有 2 G swap。这台内存宽裕暂时没加，
   真要加：`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`，
   再写进 `/etc/fstab`。
4. **新机器仍开着 SSH 密码登录**。公钥已装好，建议关掉
   （`/etc/ssh/sshd_config` 设 `PasswordAuthentication no` 后 `systemctl reload ssh`）。
5. **`stop_grace_period` 没设，停服只有 10 秒宽限期**。compose 里没写这个键，
   Docker 默认 10 秒后 SIGKILL；北斗关服要保存所有在线角色，10 秒很可能不够，**会丢存档**。
   mapleland 目前只有种子账号、没有玩家，暂时无风险，但**上线前必须处理**——
   给 `beidou-server` 加 `stop_grace_period: 120s`，或停服统一用 `docker compose stop -t 120`。
   这一条 beidou 那台同样存在（docker-deploy.md §9.9 也提到了），
   建议两台连同 `deploy/docker-compose.prod.yml` 一起改，不要各改各的。
6. **本机的 `pull-image.sh` 与 beidou 的 `upgrade-mirror.sh` 是两套东西**。
   后者更完整（带重试、先拉后停、`stop -t 120`、停库后再备份、脱终端跑），
   前者只管拉取。两份待合并，见上一条与 docker-deploy.md §9.9。

---

## 8. 日常运维速查

```bash
# 看状态 / 日志
ssh mapleland 'cd /opt/beidou && docker compose ps'
ssh mapleland 'cd /opt/beidou && docker compose logs -f --tail=100 beidou-server'

# 升级（⚠️ 用脚本，不要用 docker compose pull——会卡在 ghcr 直连上）
ssh mapleland 'cd /opt/beidou && ./pull-image.sh <短sha>'
ssh mapleland 'cd /opt/beidou && sed -i "s|^BEIDOU_IMAGE=.*|BEIDOU_IMAGE=ghcr.io/liqingnz/beidou-server-mod:<短sha>|" .env && docker compose up -d'

# 带迁移的升级要先停服备份，见 docker-deploy.md §9.5 与 §9.9
ssh mapleland 'cd /opt/beidou && docker compose stop -t 120 && tar czf db-backup-$(date +%F-%H%M).tar.gz docker-db-data/'

# 开后台
ssh mapleland-tunnel        # 然后浏览器 http://localhost:18687
```
