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
# 阶段 2.5：拆分层 jar
# 按 jar 里的 BOOT-INF/layers.idx 拆成 dependencies / spring-boot-loader /
# snapshot-dependencies / application 四块，好让阶段 3 分成四个独立的层。
# 依赖那 109 MB 只在改 pom 时才变，日常改代码只重传 application 那 5.3 MB。
# 完整背景见 docs/docker-deploy.md 9.2.1、9.2.2。
#
# ⚠️ 不要加 --launcher。加了会展开成 BOOT-INF/ + org/ 的散文件布局，启动方式得从
#    java -jar 改成 org.springframework.boot.loader.launch.JarLauncher，还要靠当前工作目录
#    当 classpath。不加则产出 application/BeiDou.jar + dependencies/lib/，新 jar 的
#    MANIFEST 是 Main-Class: org.gms.ServerApplication + Class-Path: lib/xxx.jar，
#    Class-Path 相对 jar 自身位置解析，**启动命令原样不变**，收益却完全一样。
#    这是 Spring Boot 3.3 文档推荐的默认展开方式，也是风险最小的那条路。
# ⚠️ Spring Boot 3.3 起用 jarmode=tools，旧的 jarmode=layertools 已废弃。
# ⚠️ --destination 不能指向 jar 所在目录：非空目录会直接报
#    "already exists and is not empty" 让构建失败。所以 jar 放 /build、拆到 /extract。
# ⚠️ 本项目没有 SNAPSHOT 依赖，且这种布局下 spring-boot-loader 也是空的，
#    但这两块**必须照拷**：哪天真加了 SNAPSHOT 依赖，漏掉那层就是运行时缺 jar。
#    下面的 mkdir 是兜底，防止版本差异导致阶段 3 的 COPY 源路径不存在。
# ============================================================
FROM eclipse-temurin:21-jre-alpine AS extractor
WORKDIR /build

COPY --from=backend /build/gms-server/target/BeiDou.jar ./BeiDou.jar
RUN java -Djarmode=tools -jar BeiDou.jar extract --layers --destination /extract \
    && mkdir -p /extract/dependencies /extract/spring-boot-loader \
                /extract/snapshot-dependencies /extract/application

# ============================================================
# 阶段 3：运行时
# Maven、node_modules、源码都停留在上面几个阶段，不进最终镜像。
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
#    Docker 层缓存以层为单位失效，而一条 COPY 产出的层包含它拷进去的全部内容：
#    里面改一个字节，整层都要重建重传，没有文件级增量。
#
#    2026-08-20/21 实测（压缩后 / 落盘后）：
#      wz                     30.7 MB / 685 MB   几乎永远不变
#      wz-zh-CN                4.5 MB /  38.7 MB 汉化时才动
#      scripts                 0.6 MB /  10.0 MB 偶尔改
#      scripts-zh-CN           1.0 MB /  12.3 MB 偶尔改
#      jar:dependencies       ~65   MB / 109 MB  101 个依赖，只在改 pom 时变
#      jar:spring-boot-loader      0 /       0   本布局下为空
#      jar:snapshot-dependencies   0 /       0   本项目无 SNAPSHOT 依赖
#      jar:application        ~5    MB /   5.3 MB 每次改代码都变
#
#    所以 application 必须放最后。日常迭代只有约 5 MB 需要重传，
#    而不是拆分层之前的 72.6 MB。
COPY gms-server/wz            ./wz
COPY gms-server/wz-zh-CN      ./wz-zh-CN
COPY gms-server/scripts       ./scripts
COPY gms-server/scripts-zh-CN ./scripts-zh-CN

# dependencies 展开成 ./lib/*.jar，application 展开成 ./BeiDou.jar，
# 后者 MANIFEST 里的 Class-Path 相对自身位置指向 lib/，所以两块必须落在同一层目录。
COPY --from=extractor /extract/dependencies/          ./
COPY --from=extractor /extract/spring-boot-loader/    ./
COPY --from=extractor /extract/snapshot-dependencies/ ./
COPY --from=extractor /extract/application/           ./

# 2G 内存服务器的默认值（实测空服堆用 442 MB，20 人以内 1g 够用）。
# compose 里可用同名环境变量覆盖。
ENV JAVA_OPTS="-Xms512m -Xmx1g -XX:MaxMetaspaceSize=192m"

# 8686 后台+API，8484 登录服，7575-7577 频道服
# 频道端口规则：WWCC，WW = 75 + 世界号，CC = 75 + 频道号（均从 0 起）
EXPOSE 8686 8484 7575 7576 7577

# 拆分层之后启动方式**不变**，仍是 java -jar：提取出来的 BeiDou.jar 的 MANIFEST 里
# Main-Class 直接指向 org.gms.ServerApplication，Class-Path 指向同目录的 lib/。
# 用 sh -c 是为了展开 $JAVA_OPTS；末尾的 "sh" 占位 $0，
# 这样 "$@" 才能正确接收 compose 里 command: 传进来的 --key=value 参数。
ENTRYPOINT ["/bin/sh", "-c", "exec java $JAVA_OPTS -jar /opt/server/BeiDou.jar \"$@\"", "sh"]
