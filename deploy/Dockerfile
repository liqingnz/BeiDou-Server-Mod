# syntax=docker/dockerfile:1
#
# BeiDou 生产镜像 —— 三阶段构建，编译发生在容器里，宿主机不需要 JDK/Maven/Node。
#
# 构建（上下文必须是仓库根目录，不是 deploy/）：
#   docker build -f deploy/Dockerfile -t beidou:dev .
#
# ⚠️ 不要在 2G 内存的服务器上构建：阶段 1 的 yarn build 光 Node 就要 1.5-2G 堆。
#    构建放本地或 GitHub Actions，服务器只 pull。见 docs/docker-deploy.md。

# ============================================================
# 阶段 1：编译前端
# 产物最终塞进 jar 的 static/，由 Undertow 在 8686 同源托管，
# 不需要额外的 nginx 容器（与官方 release 版形态一致）。
# ============================================================
FROM node:20 AS ui
WORKDIR /build

# 先只拷依赖清单：改业务代码时这一层缓存仍然命中，不必重装依赖
COPY gms-ui/package.json gms-ui/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY gms-ui/ ./
RUN yarn build

# ============================================================
# 阶段 2：编译后端
# ============================================================
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build

# 同理，先拷 pom 预热依赖层
COPY pom.xml ./pom.xml
COPY gms-server/pom.xml ./gms-server/pom.xml
RUN mvn dependency:resolve -B --no-transfer-progress

COPY gms-server/src ./gms-server/src
# 前端产物进 static/，随 jar 一起打包
COPY --from=ui /build/dist ./gms-server/src/main/resources/static
RUN mvn package -B -DskipTests --no-transfer-progress

# ============================================================
# 阶段 3：运行时
# Maven、node_modules、源码都停留在上面两个阶段，不进最终镜像。
# 用 alpine 没问题：我们用的是基础镜像自带的 musl 版 JRE，
# 不像官方 release 包那样捆绑了 glibc 编译的 JRE。
# ============================================================
FROM eclipse-temurin:21-jre-alpine

# Asia/Shanghai 需要 tzdata，alpine 默认不带（不装的话 TZ 环境变量无效）
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /opt/server

# ⚠️ 下面的 COPY 顺序按“变化频率从低到高”排列，这是本文件最关键的设计。
#    Docker 层缓存以层为单位失效：某层变了，它之后的所有层都要重建重传。
#
#      wz            561 MB   几乎永远不变
#      wz-zh-CN       34 MB   汉化时才动
#      scripts         9 MB   偶尔改
#      BeiDou.jar    113 MB   每次改 Java 代码都变
#
#    所以 jar 必须放最后。日常迭代只有 113 MB 的层需要重传，
#    561 MB 的 wz 层原封不动 —— 这是用镜像仓库而非 docker save 的最大收益。
COPY gms-server/wz            ./wz
COPY gms-server/wz-zh-CN      ./wz-zh-CN
COPY gms-server/scripts       ./scripts
COPY gms-server/scripts-zh-CN ./scripts-zh-CN
COPY --from=backend /build/gms-server/target/BeiDou.jar ./BeiDou.jar

# 2G 内存服务器的默认值（实测空服堆用 442 MB，20 人以内 1g 够用）。
# compose 里可用同名环境变量覆盖。
ENV JAVA_OPTS="-Xms512m -Xmx1g -XX:MaxMetaspaceSize=192m"

# 8686 后台+API，8484 登录服，7575-7577 频道服
# 频道端口规则：WWCC，WW = 75 + 世界号，CC = 75 + 频道号（均从 0 起）
EXPOSE 8686 8484 7575 7576 7577

# 用 sh -c 是为了展开 $JAVA_OPTS；末尾的 "sh" 占位 $0，
# 这样 "$@" 才能正确接收 compose 里 command: 传进来的 --key=value 参数。
ENTRYPOINT ["/bin/sh", "-c", "exec java $JAVA_OPTS -jar /opt/server/BeiDou.jar \"$@\"", "sh"]
