package org.gms.manager;

import lombok.Getter;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.gms.ServerApplication;
import org.gms.constants.net.ServerConstants;
import org.gms.net.server.Server;
import org.gms.util.I18nUtil;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.InetAddress;

@Component
@Slf4j
public class ServerManager implements ApplicationContextAware, ApplicationRunner, DisposableBean {
    @Getter
    private static ApplicationContext applicationContext;

    /**
     * 在 refresh() 之前抢先把上下文塞进静态字段，由 {@link org.gms.ServerApplication#main} 注册为
     * ApplicationContextInitializer 调用。
     * <p>
     * 不能只靠下面的 {@link #setApplicationContext}：那是本类作为 Bean 被创建时才触发的，
     * 而 Bean 的创建顺序不受控。任何排在 serverManager 之前的 Bean，只要其类初始化链上碰到
     * I18nUtil（典型路径：字段初始化器引用 InventoryType / Job 这类枚举，枚举常量在 clinit 期就调
     * I18nUtil），拿到的就是 null 上下文，启动直接 NPE。
     * 初始化器跑在所有 Bean 之前，从根上消除这段空窗。
     */
    public static void setEarlyContext(ConfigurableApplicationContext context) {
        ServerManager.applicationContext = context;
    }

    /**
     * 保留兜底：走不到 main 的场景（如 Spring Boot 测试自建上下文）没有上述初始化器，
     * 仍需靠这里赋值。正常启动时与 setEarlyContext 赋同一个对象，重复无害。
     */
    @Override
    public void setApplicationContext(@NonNull ApplicationContext applicationContext) throws BeansException {
        ServerManager.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Server.getInstance().init();

        SpringDocConfigProperties springDocConfigProperties = applicationContext.getBean(SpringDocConfigProperties.class);
        SwaggerUiConfigProperties swaggerUiConfigProperties = applicationContext.getBean(SwaggerUiConfigProperties.class);
        Environment environment = applicationContext.getBean(Environment.class);
        log.info(I18nUtil.getLogMessage("ServerManager.run.info3"), ServerConstants.BEI_DOU_VERSION, ServerConstants.BEI_DOU_BUILD_TIME);
        if (springDocConfigProperties.getApiDocs().isEnabled() && swaggerUiConfigProperties.isEnabled()) {
            log.info(I18nUtil.getLogMessage("ServerManager.run.info1"), InetAddress.getLocalHost().getHostAddress(), environment.getProperty("server.port"));
        }
        // 判断是否集成前端，集成则提示前端地址
        try(InputStream resource = ServerApplication.class.getClassLoader().getResourceAsStream("static/index.html")) {
            if (resource != null) {
                log.info(I18nUtil.getLogMessage("ServerManager.run.info2"), InetAddress.getLocalHost().getHostAddress(), environment.getProperty("server.port"));
            }
        }
    }

    @Override
    public void destroy() throws Exception {
        Server.getInstance().shutdownInternal(false);
    }
}
