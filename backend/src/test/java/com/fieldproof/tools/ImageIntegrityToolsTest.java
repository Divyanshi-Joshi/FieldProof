package com.fieldproof.tools;

import com.fieldproof.tools.ImageIntegrityTools.*;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JUnit 5 tests for FieldProof's image integrity tools.
 * <p>
 * All test images are programmatically generated as synthetic field patterns
 * written to {@code @TempDir}, ensuring reproducibility with zero external
 * test fixtures.
 * <p>
 * Test scenarios cover:
 * <ol>
 *   <li>Clean 3-photo bundle — all distinct → all pass</li>
 *   <li>Wanjiru P-0142 cross-claim near-duplicate — partial bundle continuation</li>
 *   <li>Intra-claim duplicate detection</li>
 *   <li>Full integrity hold — all photos are duplicates</li>
 *   <li>Metadata extraction — graceful handling of missing EXIF</li>
 *   <li>pHash and dHash correctness</li>
 * </ol>
 */
class ImageIntegrityToolsTest {

    @TempDir
    Path tempDir;

    @BeforeEach
    void clearRegistry() {
        ImageIntegrityTools.clearRegistry();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Helper: Synthetic Image Generators
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Creates a synthetic "field" image with a distinct color pattern.
     * Each pattern uses a different base color and stripe direction so
     * the perceptual hash is distinct.
     */
    private Path createDistinctFieldImage(String filename, int pattern,
            int width, int height) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();

        switch (pattern) {
            case 0 -> {
                // Green field with horizontal brown stripes (plowed rows)
                g.setColor(new Color(34, 139, 34));
                g.fillRect(0, 0, width, height);
                g.setColor(new Color(139, 90, 43));
                for (int y = 0; y < height; y += 20) {
                    g.fillRect(0, y, width, 5);
                }
            }
            case 1 -> {
                // Dry yellow-brown field with diagonal cracks
                g.setColor(new Color(218, 165, 32));
                g.fillRect(0, 0, width, height);
                g.setColor(new Color(101, 67, 33));
                g.setStroke(new BasicStroke(3));
                for (int i = 0; i < width + height; i += 30) {
                    g.drawLine(i, 0, 0, i);
                }
            }
            case 2 -> {
                // Wilted dark green field with circular brown patches
                g.setColor(new Color(0, 100, 0));
                g.fillRect(0, 0, width, height);
                g.setColor(new Color(160, 82, 45));
                for (int cx = 50; cx < width; cx += 100) {
                    for (int cy = 50; cy < height; cy += 100) {
                        g.fillOval(cx - 25, cy - 25, 50, 50);
                    }
                }
            }
            case 3 -> {
                // Blue sky over a wheat-colored field
                g.setColor(new Color(135, 206, 235));
                g.fillRect(0, 0, width, height / 2);
                g.setColor(new Color(210, 180, 140));
                g.fillRect(0, height / 2, width, height / 2);
            }
            default -> {
                // Random noise pattern
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        int r = (x * 7 + y * 13 + pattern * 37) % 256;
                        int gVal = (x * 11 + y * 3 + pattern * 59) % 256;
                        int b = (x * 5 + y * 17 + pattern * 23) % 256;
                        img.setRGB(x, y, new Color(r, gVal, b).getRGB());
                    }
                }
            }
        }

        g.dispose();

        Path path = tempDir.resolve(filename);
        ImageIO.write(img, "png", path.toFile());
        return path;
    }

    /**
     * Creates a resized/re-compressed copy of a source image (simulating
     * a re-uploaded near-duplicate).
     */
    private Path createResizedCopy(String filename, Path sourcePath,
            int newWidth, int newHeight) throws IOException {
        BufferedImage original = ImageIO.read(sourcePath.toFile());
        BufferedImage resized = new BufferedImage(
            newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(
            RenderingHints.KEY_INTERPOLATION,
            RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(original, 0, 0, newWidth, newHeight, null);
        g.dispose();

        Path path = tempDir.resolve(filename);
        ImageIO.write(resized, "png", path.toFile());
        return path;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 1. Clean 3-Photo Bundle — All Distinct → All Pass
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Clean bundle — 3 distinct field photos")
    class CleanBundleTests {

        @Test
        @DisplayName("3 distinct photos → all pass, stored in historical registry")
        void cleanBundle_allPass() throws IOException {
            Path p0 = createDistinctFieldImage("field_a.jpg", 0, 1024, 768);
            Path p1 = createDistinctFieldImage("field_b.jpg", 1, 1024, 768);
            Path p2 = createDistinctFieldImage("field_c.jpg", 2, 1024, 768);

            HashResult result = ImageIntegrityTools.hashImages(
                "CLM-001", List.of(p0, p1, p2));

            // All 3 photos should pass
            assertTrue(result.integrityPassed(), "Integrity should pass for distinct photos");
            assertEquals(3, result.hashes().size());
            assertEquals(3, result.validPhotoIndices().size());
            assertTrue(result.rejectedPhotoIndices().isEmpty(),
                "No photos should be rejected");
            assertTrue(result.withinClaimDuplicates().isEmpty(),
                "No within-claim duplicates");
            assertTrue(result.crossClaimMatches().isEmpty(),
                "No cross-claim matches for first claim");

            // Verify hashes are all different
            long h0 = result.hashes().get(0).hashValue();
            long h1 = result.hashes().get(1).hashValue();
            long h2 = result.hashes().get(2).hashValue();
            assertNotEquals(h0, h1);
            assertNotEquals(h1, h2);
            assertNotEquals(h0, h2);

            // Verify stored in historical registry
            assertTrue(ImageIntegrityTools.getRegistry().containsKey("CLM-001"));
            assertEquals(3, ImageIntegrityTools.getRegistry().get("CLM-001").size());
        }

        @Test
        @DisplayName("Hash hex strings are 16 characters (64-bit)")
        void hashHexFormat() throws IOException {
            Path p0 = createDistinctFieldImage("hex_test.jpg", 0, 512, 512);

            HashResult result = ImageIntegrityTools.hashImages(
                "CLM-HEX", List.of(p0));

            String hex = result.hashes().getFirst().hashHex();
            assertEquals(16, hex.length(), "Hash hex should be 16 chars (64-bit)");
            assertTrue(hex.matches("[0-9a-f]{16}"),
                "Hash hex should contain only hex digits");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. Wanjiru P-0142 Cross-Claim Near-Duplicate — Partial Continuation
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Cross-claim near-duplicate — Wanjiru P-0142 story")
    class CrossClaimDuplicateTests {

        @Test
        @DisplayName("Photo 3 is a resized copy from earlier claim → rejected, Photos 1 & 2 continue")
        void crossClaimDuplicate_partialContinuation() throws IOException {
            // ── Earlier claim: register 3 distinct photos ──
            Path earlier0 = createDistinctFieldImage("earlier_0.jpg", 0, 1024, 768);
            Path earlier1 = createDistinctFieldImage("earlier_1.jpg", 1, 1024, 768);
            Path earlier2 = createDistinctFieldImage("earlier_2.jpg", 2, 1024, 768);

            HashResult earlierResult = ImageIntegrityTools.hashImages(
                "CLM-EARLIER", List.of(earlier0, earlier1, earlier2));
            assertTrue(earlierResult.integrityPassed());

            // ── Wanjiru's claim: Photo 3 is a resized copy of earlier_2 ──
            Path wanjiru0 = createDistinctFieldImage("wanjiru_0.jpg", 3, 1024, 768);
            Path wanjiru1 = createDistinctFieldImage("wanjiru_1.jpg", 4, 1024, 768);
            // Photo 3: scaled from 1024x768 to 768x576 (resized near-duplicate)
            Path wanjiru2 = createResizedCopy("wanjiru_2.jpg", earlier2, 768, 576);

            HashResult wanjResult = ImageIntegrityTools.hashImages(
                "CLM-P0142", List.of(wanjiru0, wanjiru1, wanjiru2));

            // Bundle should still pass (2 valid photos remain)
            assertTrue(wanjResult.integrityPassed(),
                "Partial bundle should pass with 2+ valid photos");

            // Photo 2 (index 2) should be rejected as cross-claim duplicate
            assertTrue(wanjResult.rejectedPhotoIndices().contains(2),
                "Photo at index 2 should be rejected");
            assertEquals(2, wanjResult.validPhotoIndices().size(),
                "2 valid photos should remain");

            // Cross-claim match should reference the earlier claim
            assertFalse(wanjResult.crossClaimMatches().isEmpty(),
                "Should detect cross-claim match");
            assertEquals("CLM-EARLIER",
                wanjResult.crossClaimMatches().getFirst().matchedClaimId());

            // Integrity flags should explain partial continuation
            assertTrue(wanjResult.integrityFlags().stream()
                .anyMatch(f -> f.contains("cross_claim_duplicate")),
                "Should flag cross-claim duplicate");
            assertTrue(wanjResult.integrityFlags().stream()
                .anyMatch(f -> f.contains("partial_bundle")),
                "Should note partial bundle continuation");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. Intra-Claim Duplicate Detection
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Within-claim duplicate detection")
    class IntraClaimDuplicateTests {

        @Test
        @DisplayName("Photo 1 and Photo 2 are resized copies → flagged as within-claim duplicate")
        void intraClaimDuplicate_detected() throws IOException {
            Path p0 = createDistinctFieldImage("intra_original.jpg", 0, 1024, 768);
            // Photo 1 is a resized copy of Photo 0
            Path p1 = createResizedCopy("intra_copy.jpg", p0, 800, 600);
            Path p2 = createDistinctFieldImage("intra_distinct.jpg", 2, 1024, 768);

            HashResult result = ImageIntegrityTools.hashImages(
                "CLM-INTRA", List.of(p0, p1, p2));

            // Should detect within-claim duplicate
            assertFalse(result.withinClaimDuplicates().isEmpty(),
                "Should detect within-claim duplicate");

            // The copy (index 1) should be rejected
            assertTrue(result.rejectedPhotoIndices().contains(1),
                "Duplicate copy (index 1) should be rejected");

            // Bundle should still pass (2 valid: index 0 and 2)
            assertTrue(result.integrityPassed(),
                "Bundle should pass with 2 valid photos remaining");
            assertEquals(2, result.validPhotoIndices().size());

            // Verify flags
            assertTrue(result.integrityFlags().stream()
                .anyMatch(f -> f.contains("within_claim_duplicate")),
                "Should flag within-claim duplicate");
        }

        @Test
        @DisplayName("Identical photos (exact copy) detected as duplicates")
        void intraClaimDuplicate_exactCopy() throws IOException {
            Path p0 = createDistinctFieldImage("exact_a.jpg", 0, 512, 512);
            // Write the same image again to a different file
            Path p1 = createResizedCopy("exact_b.jpg", p0, 512, 512);
            Path p2 = createDistinctFieldImage("exact_c.jpg", 2, 512, 512);

            HashResult result = ImageIntegrityTools.hashImages(
                "CLM-EXACT", List.of(p0, p1, p2));

            assertFalse(result.withinClaimDuplicates().isEmpty(),
                "Exact copies should be detected");
            // Distance for near-identical should be very low
            DuplicatePair pair = result.withinClaimDuplicates().getFirst();
            assertTrue(pair.normalizedDistance() <= ImageIntegrityTools.NEAR_DUPLICATE_THRESHOLD);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. Full Integrity Hold — All Photos Are Duplicates
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Full INTEGRITY_HOLD — all photos fail")
    class FullIntegrityHoldTests {

        @Test
        @DisplayName("All 3 photos are duplicates → integrityPassed = false")
        void allDuplicates_integrityHold() throws IOException {
            Path original = createDistinctFieldImage("hold_src.jpg", 0, 1024, 768);
            // All three are copies of the same photo
            Path p0 = createResizedCopy("hold_0.jpg", original, 1024, 768);
            Path p1 = createResizedCopy("hold_1.jpg", original, 800, 600);
            Path p2 = createResizedCopy("hold_2.jpg", original, 640, 480);

            HashResult result = ImageIntegrityTools.hashImages(
                "CLM-HOLD", List.of(p0, p1, p2));

            assertFalse(result.integrityPassed(),
                "All duplicates should trigger INTEGRITY_HOLD");
            assertTrue(result.integrityFlags().stream()
                .anyMatch(f -> f.contains("INTEGRITY_HOLD")),
                "Should flag INTEGRITY_HOLD");
            // At most 1 valid photo (fewer than MIN_VALID_PHOTOS=2)
            assertTrue(result.validPhotoIndices().size() < ImageIntegrityTools.MIN_VALID_PHOTOS);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. Metadata Extraction
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Metadata extraction — EXIF and dimensions")
    class MetadataExtractionTests {

        @Test
        @DisplayName("Synthetic images without EXIF → exif_missing flag, dimensions extracted")
        void noExif_gracefulHandling() throws IOException {
            Path p0 = createDistinctFieldImage("meta_0.jpg", 0, 1024, 768);
            Path p1 = createDistinctFieldImage("meta_1.jpg", 1, 800, 600);

            MetadataResult result = ImageIntegrityTools.readMetadata(List.of(p0, p1));

            // Synthetic JPGs have no EXIF
            assertFalse(result.anyExifTimestampPresent(),
                "Synthetic images should have no EXIF timestamps");
            assertFalse(result.anyExifGpsPresent(),
                "Synthetic images should have no GPS data");

            // Global flag about missing EXIF
            assertTrue(result.flags().stream()
                .anyMatch(f -> f.contains("exif_missing")),
                "Should flag missing EXIF at global level");

            // Per-photo metadata should have dimensions
            assertEquals(2, result.photoMetadata().size());

            PhotoMetadata pm0 = result.photoMetadata().get(0);
            assertTrue(pm0.imageWidth() > 0, "Width should be extracted");
            assertTrue(pm0.imageHeight() > 0, "Height should be extracted");
            assertTrue(pm0.aspectRatio() > 0, "Aspect ratio should be computed");

            // Per-photo flags should include exif_missing
            assertTrue(pm0.flags().stream().anyMatch(f -> f.contains("exif_missing")),
                "Per-photo flag should note missing EXIF");
        }

        @Test
        @DisplayName("Aspect ratio correctly computed")
        void aspectRatio() throws IOException {
            Path landscape = createDistinctFieldImage("landscape.jpg", 0, 1024, 768);
            Path square = createDistinctFieldImage("square.jpg", 1, 512, 512);

            MetadataResult result = ImageIntegrityTools.readMetadata(
                List.of(landscape, square));

            double landscapeRatio = result.photoMetadata().get(0).aspectRatio();
            double squareRatio = result.photoMetadata().get(1).aspectRatio();

            // 1024/768 ≈ 1.333
            assertEquals(1024.0 / 768.0, landscapeRatio, 0.01,
                "Landscape aspect ratio should be ~1.33");
            assertEquals(1.0, squareRatio, 0.01,
                "Square aspect ratio should be 1.0");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6. Combined Bundle Integrity (evaluateBundleIntegrity)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("evaluateBundleIntegrity — combined hash + metadata")
    class BundleIntegrityTests {

        @Test
        @DisplayName("Clean bundle → all fields correctly populated")
        void cleanBundle_combined() throws IOException {
            Path p0 = createDistinctFieldImage("bundle_0.jpg", 0, 1024, 768);
            Path p1 = createDistinctFieldImage("bundle_1.jpg", 1, 1024, 768);
            Path p2 = createDistinctFieldImage("bundle_2.jpg", 2, 1024, 768);

            BundleIntegrityResult result = ImageIntegrityTools.evaluateBundleIntegrity(
                "CLM-BUNDLE", List.of(p0, p1, p2));

            assertTrue(result.integrityPassed());
            assertFalse(result.duplicateWithinClaim());
            assertFalse(result.duplicateAcrossClaims());
            assertNull(result.matchedEarlierClaimId());
            assertTrue(result.rejectedPhotoIndices().isEmpty());
            // Synthetic images have no EXIF
            assertFalse(result.exifTimestampPresent());
            assertFalse(result.exifGpsPresent());
        }

        @Test
        @DisplayName("Cross-claim duplicate → matchedEarlierClaimId populated")
        void crossClaimBundle_combined() throws IOException {
            // Register earlier claim
            Path e0 = createDistinctFieldImage("cb_e0.jpg", 0, 1024, 768);
            Path e1 = createDistinctFieldImage("cb_e1.jpg", 1, 1024, 768);
            ImageIntegrityTools.hashImages("CLM-OLD", List.of(e0, e1));

            // New claim with a cross-claim duplicate
            Path n0 = createDistinctFieldImage("cb_n0.jpg", 3, 1024, 768);
            Path n1 = createDistinctFieldImage("cb_n1.jpg", 4, 1024, 768);
            Path n2 = createResizedCopy("cb_n2_dup.jpg", e0, 768, 576);

            BundleIntegrityResult result = ImageIntegrityTools.evaluateBundleIntegrity(
                "CLM-NEW", List.of(n0, n1, n2));

            assertTrue(result.integrityPassed(),
                "Should pass with 2 valid photos");
            assertTrue(result.duplicateAcrossClaims());
            assertEquals("CLM-OLD", result.matchedEarlierClaimId());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 7. pHash and dHash Correctness
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Perceptual hash algorithm correctness")
    class HashCorrectnessTests {

        @Test
        @DisplayName("Same image → identical pHash")
        void sameImage_identicalHash() throws IOException {
            Path p = createDistinctFieldImage("same.jpg", 0, 1024, 768);
            BufferedImage img = ImageIO.read(p.toFile());

            long hash1 = ImageIntegrityTools.computePHash(img);
            long hash2 = ImageIntegrityTools.computePHash(img);

            assertEquals(hash1, hash2, "Same image should produce identical hash");
        }

        @Test
        @DisplayName("Resized copy → very similar pHash (low Hamming distance)")
        void resizedCopy_similarHash() throws IOException {
            Path original = createDistinctFieldImage("resize_orig.jpg", 0, 1024, 768);
            Path resized = createResizedCopy("resize_small.jpg", original, 768, 576);

            BufferedImage imgOrig = ImageIO.read(original.toFile());
            BufferedImage imgResized = ImageIO.read(resized.toFile());

            long h1 = ImageIntegrityTools.computePHash(imgOrig);
            long h2 = ImageIntegrityTools.computePHash(imgResized);

            double dist = ImageIntegrityTools.normalizedHammingDistance(h1, h2);
            assertTrue(dist <= ImageIntegrityTools.NEAR_DUPLICATE_THRESHOLD,
                "Resized copy should be within duplicate threshold, got " + dist);
        }

        @Test
        @DisplayName("Distinct images → high Hamming distance (above threshold)")
        void distinctImages_differentHash() throws IOException {
            Path p0 = createDistinctFieldImage("dist_0.jpg", 0, 1024, 768);
            Path p1 = createDistinctFieldImage("dist_1.jpg", 1, 1024, 768);

            BufferedImage img0 = ImageIO.read(p0.toFile());
            BufferedImage img1 = ImageIO.read(p1.toFile());

            long h0 = ImageIntegrityTools.computePHash(img0);
            long h1 = ImageIntegrityTools.computePHash(img1);

            double dist = ImageIntegrityTools.normalizedHammingDistance(h0, h1);
            assertTrue(dist > ImageIntegrityTools.NEAR_DUPLICATE_THRESHOLD,
                "Distinct images should be above duplicate threshold, got " + dist);
        }

        @Test
        @DisplayName("Hamming distance: identical hashes → 0")
        void hammingDistance_identical() {
            assertEquals(0, ImageIntegrityTools.hammingDistance(0xABCD1234L, 0xABCD1234L));
            assertEquals(0.0, ImageIntegrityTools.normalizedHammingDistance(0L, 0L));
        }

        @Test
        @DisplayName("Hamming distance: maximally different → 64")
        void hammingDistance_maxDifferent() {
            assertEquals(64, ImageIntegrityTools.hammingDistance(0L, -1L));
            assertEquals(1.0, ImageIntegrityTools.normalizedHammingDistance(0L, -1L));
        }

        @Test
        @DisplayName("dHash: same image → identical dHash")
        void dHash_sameImage() throws IOException {
            Path p = createDistinctFieldImage("dhash.jpg", 0, 512, 512);
            BufferedImage img = ImageIO.read(p.toFile());

            long dh1 = ImageIntegrityTools.computeDHash(img);
            long dh2 = ImageIntegrityTools.computeDHash(img);

            assertEquals(dh1, dh2, "Same image should produce identical dHash");
        }

        @Test
        @DisplayName("dHash: resized copy → low distance")
        void dHash_resizedCopy() throws IOException {
            Path orig = createDistinctFieldImage("dhash_orig.jpg", 0, 1024, 768);
            Path resized = createResizedCopy("dhash_resized.jpg", orig, 640, 480);

            BufferedImage imgOrig = ImageIO.read(orig.toFile());
            BufferedImage imgResized = ImageIO.read(resized.toFile());

            long dh1 = ImageIntegrityTools.computeDHash(imgOrig);
            long dh2 = ImageIntegrityTools.computeDHash(imgResized);

            double dist = ImageIntegrityTools.normalizedHammingDistance(dh1, dh2);
            assertTrue(dist <= 0.25,
                "Resized copy dHash should be similar, got " + dist);
        }
    }
}
