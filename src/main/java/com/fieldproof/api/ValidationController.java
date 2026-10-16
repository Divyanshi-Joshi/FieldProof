package com.fieldproof.api;

import com.fieldproof.service.ValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/validation")
public class ValidationController {

    private final ValidationService validationService;

    public ValidationController(ValidationService validationService) {
        this.validationService = validationService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getValidationSummary() {
        return ResponseEntity.ok(validationService.getValidationSummary());
    }
}
