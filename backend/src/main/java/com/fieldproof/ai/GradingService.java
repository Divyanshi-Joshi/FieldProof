package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.api.dto.Contracts.SeverityBand;
import com.fieldproof.core.GradingResult;
import com.fieldproof.core.SeverityMapper;
import com.fieldproof.tools.ImageResizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service orchestrating multi-image Gemini grading passes with optional calibrated reference anchors.
 * <p>
 * Meets specifications in {@code docs/DAY1_PERSON_A.md §T9}:
 * <ul>
 *   <li>Builds multi-image calls with 3 anchors first (shuffled by pass seed), then claim photos.</li>
 *   <li>Accepts 1 to 3 claim photos (supporting single images or plot photo bundles).</li>
 *   <li>Records anchor order on every result.</li>
 *   <li>Downscales images to ~768 px on the long edge before dispatching.</li>
 *   <li>Maps scored sign vectors deterministically to {@link SeverityBand} via {@link SeverityMapper}.</li>
 * </ul>
 */
@Service
public class GradingService {

    private static final Logger log = LoggerFactory.getLogger(GradingService.class);

    private final GeminiGateway gateway;
    private final PromptLibrary promptLibrary;
    private final AnchorLibrary anchorLibrary;
    private final ObjectMapper objectMapper;

    public record PhotoInput(String fileName, byte[] bytes, String mimeType) {}

    public record RawBaselineResult(boolean damaged, String damageType, double confidence) {}

    public record GradingExecution(
            GradingResult gradingResult,
            SeverityBand severityBand,
            String anchorOrder,
            GeminiResult rawResult
    ) {}

    public record RawExecution(
            RawBaselineResult baselineResult,
            GeminiResult rawResult
    ) {}

    public GradingService(GeminiGateway gateway,
                          PromptLibrary promptLibrary,
                          AnchorLibrary anchorLibrary,
                          ObjectMapper objectMapper) {
        this.gateway = gateway;
        this.promptLibrary = promptLibrary;
        this.anchorLibrary = anchorLibrary;
        this.objectMapper = objectMapper;
    }

    /**
     * Executes a signs-rubric grading pass (either calibrated with anchors or uncalibrated).
     *
     * @param photos     1 to 3 claim photos
     * @param useAnchors true to prepend the 3 calibrated reference photos
     * @param pass       pass index (1 or 2)
     * @return {@link GradingExecution} with the parsed result, band, and execution metadata
     */
    public GradingExecution grade(List<PhotoInput> photos, boolean useAnchors, int pass) {
        if (photos == null || photos.isEmpty()) {
            throw new IllegalArgumentException("photos list must contain at least 1 photo");
        }
        if (photos.size() > 3) {
            throw new IllegalArgumentException("photos list cannot exceed 3 photos (got " + photos.size() + ")");
        }

        String promptVersion = PromptLibrary.PROMPT_SIGNS_V1;
        String systemInstruction = promptLibrary.getFormattedPrompt(promptVersion);

        List<GeminiCall.PartInput> parts = new ArrayList<>();
        String anchorOrder = "none";

        // 1. Add anchors if requested and available
        if (useAnchors && anchorLibrary.isAvailable()) {
            List<AnchorLibrary.Anchor> shuffledAnchors = anchorLibrary.getAnchorsShuffled(pass);
            anchorOrder = AnchorLibrary.getAnchorOrderString(shuffledAnchors);

            for (AnchorLibrary.Anchor anchor : shuffledAnchors) {
                byte[] resizedAnchor = ImageResizer.resizeIfNeeded(anchor.imageBytes(), "image/jpeg");
                parts.add(GeminiCall.PartInput.text("Reference Anchor Image [" + anchor.level().toUpperCase() + " REFERENCE]"));
                parts.add(GeminiCall.PartInput.image(resizedAnchor, "image/jpeg", "Reference Anchor: " + anchor.level()));
            }
        }

        // 2. Add claim photos
        int photoIndex = 1;
        for (PhotoInput photo : photos) {
            byte[] resized = ImageResizer.resizeIfNeeded(photo.bytes(), photo.mimeType());
            parts.add(GeminiCall.PartInput.text("Claim Photo #" + photoIndex + " (" + photo.fileName() + ")"));
            parts.add(GeminiCall.PartInput.image(resized, photo.mimeType(), "Claim Photo #" + photoIndex));
            photoIndex++;
        }

        // 3. Dispatch call via GeminiGateway
        GeminiCall call = new GeminiCall(
                promptVersion,
                systemInstruction,
                parts,
                GradingResult.class,
                pass,
                anchorOrder
        );

        GeminiResult geminiResult = gateway.generate(call);

        // 4. Parse Jackson output
        GradingResult gradingResult;
        try {
            gradingResult = objectMapper.readValue(geminiResult.json(), GradingResult.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Gemini output into GradingResult: " + geminiResult.json(), e);
        }

        // 5. Deterministically map signs to SeverityBand
        SeverityBand band = (gradingResult.signs() != null)
                ? SeverityMapper.map(gradingResult.signs())
                : SeverityBand.NONE;

        return new GradingExecution(gradingResult, band, anchorOrder, geminiResult);
    }

    /**
     * Executes the baseline raw prompt pass (Arm 1 for ablation testing).
     */
    public RawExecution gradeRaw(List<PhotoInput> photos, int pass) {
        if (photos == null || photos.isEmpty()) {
            throw new IllegalArgumentException("photos list must contain at least 1 photo");
        }

        String promptVersion = PromptLibrary.PROMPT_RAW_V0;
        String systemInstruction = promptLibrary.getFormattedPrompt(promptVersion);

        List<GeminiCall.PartInput> parts = new ArrayList<>();
        int photoIndex = 1;
        for (PhotoInput photo : photos) {
            byte[] resized = ImageResizer.resizeIfNeeded(photo.bytes(), photo.mimeType());
            parts.add(GeminiCall.PartInput.text("Claim Photo #" + photoIndex + " (" + photo.fileName() + ")"));
            parts.add(GeminiCall.PartInput.image(resized, photo.mimeType(), "Claim Photo #" + photoIndex));
            photoIndex++;
        }

        GeminiCall call = new GeminiCall(
                promptVersion,
                systemInstruction,
                parts,
                RawBaselineResult.class,
                pass,
                "none"
        );

        GeminiResult geminiResult = gateway.generate(call);

        RawBaselineResult rawBaselineResult;
        try {
            rawBaselineResult = objectMapper.readValue(geminiResult.json(), RawBaselineResult.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Gemini output into RawBaselineResult: " + geminiResult.json(), e);
        }

        return new RawExecution(rawBaselineResult, geminiResult);
    }
}
