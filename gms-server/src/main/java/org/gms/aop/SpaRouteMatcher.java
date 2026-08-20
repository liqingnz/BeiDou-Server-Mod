package org.gms.aop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * 匹配前端路由（vue-router的history模式）的页面请求。
 * 前端刷新或者直接输入 /game/config 这类地址时请求会打到服务端，它既不是接口也不是静态资源，
 * 需要交给index.html让前端路由自己解析，所以这类请求要放行并转发（见{@link SpaRouteFilter}）。
 * 判定条件：GET + 浏览器导航（Accept包含text/html）+ 不带扩展名 + 不是接口路径（接口统一带 /v{n}/ 版本段）。
 */
@Component
public class SpaRouteMatcher implements RequestMatcher {
    private static final Pattern API_PATH = Pattern.compile("/v\\d+/");

    @Override
    public boolean matches(HttpServletRequest request) {
        if (!HttpMethod.GET.matches(request.getMethod())) {
            return false;
        }
        // 只处理浏览器导航，接口请求（Accept是application/json）不受影响
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept == null || !accept.contains(MediaType.TEXT_HTML_VALUE)) {
            return false;
        }
        String uri = request.getRequestURI();
        // 首页和带扩展名的静态资源本来就能正常访问，不用转发
        if ("/".equals(uri) || uri.lastIndexOf('.') > uri.lastIndexOf('/')) {
            return false;
        }
        return !API_PATH.matcher(uri).find();
    }
}
