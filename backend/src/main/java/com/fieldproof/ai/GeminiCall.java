package com.fieldproof.ai;

import java.util.List;

/**
 * Encapsulates all inputs required for an LLM grading or ping call.
 *
 * @param promptVersion       identifier for the prompt template (e.g. "grading_signs_v1")
 * @param systemInstruction   system instructions passed to Gemini
 * @param parts               ordered list of input parts (text instructions and/or image bytes)
 * @param responseSchemaClass Jackson target class for validating structured JSON
 * @param pass                pass index (1 or 2) for two-pass agreement gating
 * @param anchorOrder         ordered list or string of anchor labels used, if any
 */
public record GeminiCall(
        String promptVersion,
        String systemInstruction,
        List<PartInput> parts,
        Class<?> responseSchemaClass,
        int pass,
        String anchorOrder
) {
    public GeminiCall {
        parts = parts == null ? List.of() : List.copyOf(parts);
    }

    /**
     * Input part representing either text or an image.
     */
    public record PartInput(
            String text,
            byte[] imageBytes,
            String mimeType,
            String label
    ) {
        public static PartInput text(String text) {
            return new PartInput(text, null, null, null);
        }

        public static PartInput image(byte[] bytes, String mimeType, String label) {
            if (bytes == null || bytes.length == 0) {
                throw new IllegalArgumentException("imageBytes must not be empty");
            }
            return new PartInput(null, bytes, mimeType == null ? "image/jpeg" : mimeType, label);
        }

        public boolean isImage() {
            return imageBytes != null && imageBytes.length > 0;
        }

        public boolean isText() {
            return text != null && !text.isBlank();
        }
    }
}
