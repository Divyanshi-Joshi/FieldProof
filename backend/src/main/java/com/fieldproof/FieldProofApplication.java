package com.fieldproof;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * FieldProof Spring Boot application entry point.
 * <p>
 * Serves the REST API for the Index Doctor slider and future
 * claim processing endpoints.
 */
@SpringBootApplication
@ConfigurationPropertiesScan("com.fieldproof.config")
public class FieldProofApplication {

    public static void main(String[] args) {
        SpringApplication.run(FieldProofApplication.class, args);
    }
}
