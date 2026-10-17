package com.fieldproof.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards client-side single page app (SPA) routes to index.html (docs/DAY3 §T3.14).
 * Ensures refreshing /farmer, /insurer, or /validation does not return a 404 from Spring Boot.
 */
@Controller
public class SpaForwardController {

    @GetMapping(value = {
            "/farmer",
            "/farmer/**",
            "/insurer",
            "/insurer/**",
            "/validation",
            "/validation/**",
            "/doctor",
            "/doctor/**"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
