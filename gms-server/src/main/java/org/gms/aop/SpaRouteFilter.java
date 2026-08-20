package org.gms.aop;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 把前端路由地址转发到index.html，让刷新或者直接访问 /game/config 这类页面地址也能正常打开，
 * 而不是被security当成未认证请求拦掉返回401。
 * 排在过滤器链末尾，此时security已经放行了{@link SpaRouteMatcher}匹配的请求，转发后由静态资源处理器返回首页。
 */
@Component
@AllArgsConstructor
public class SpaRouteFilter extends HttpFilter implements Ordered {
    private static final String INDEX_PAGE = "/index.html";
    private final SpaRouteMatcher spaRouteMatcher;

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (spaRouteMatcher.matches(request)) {
            request.getRequestDispatcher(INDEX_PAGE).forward(request, response);
            return;
        }
        chain.doFilter(request, response);
    }
}
