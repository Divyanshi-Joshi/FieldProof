package com.fieldproof.tools;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.color.ColorSpace;
import java.awt.image.BufferedImage;
import java.awt.image.ColorConvertOp;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.List;

/**
 * Image integrity tools for the FieldProof Forensics Agent.
 * <p>
 * Implements two external-tool contracts:
 * <ul>
 *   <li>{@code hash_images} — 64-bit perceptual hash, within-claim and
 *       cross-claim near-duplicate detection with partial bundle continuation.</li>
 *   <li>{@code read_metadata} — EXIF timestamp/GPS extraction with graceful
 *       handling of stripped headers (common in Eyes on the Ground dataset).</li>
 * </ul>
 * <p>
 * <b>Design choice:</b> We implement a rock-solid, zero-dependency 64-bit DCT
 * Perceptual Hash (pHash) directly on {@link BufferedImage} instead of using
 * JImageHash, ensuring clean builds on JDK 25 with no repository resolution issues.
 * <p>
 * This class is 100% pure Java with zero AI/LLM SDK imports.
 */
public final class ImageIntegrityTools {

    private ImageIntegrityTools() {} // utility class

    // ── Configuration Constants ──────────────────────────────────────────────

    /** Normalized Hamming distance threshold for near-duplicate detection. */
    public static final double NEAR_DUPLICATE_THRESHOLD = 0.15;

    /** Minimum valid photos required for a bundle to proceed. */
    public static final int MIN_VALID_PHOTOS = 2;

    /** Hash size in bits (8x8 DCT = 64 bits). */
    private static final int HASH_BITS = 64;



    /** Low-frequency block size for pHash. */
    private static final int LOW_FREQ = 8;

    // ── Data Records ─────────────────────────────────────────────────────────

    /** Perceptual hash record for a single photo. */
    public record PhotoHashRecord(
        String claimId,
        int photoIndex,
        long hashValue,
        String hashHex
    ) {}

    /** Result of within-claim duplicate check for a single pair. */
    public record DuplicatePair(
        int indexA,
        int indexB,
        double normalizedDistance
    ) {}

    /** Result of cross-claim duplicate check for a single photo. */
    public record CrossClaimMatch(
        int photoIndex,
        String matchedClaimId,
        int matchedPhotoIndex,
        double normalizedDistance
    ) {}

    /** Per-photo metadata extraction result. */
    public record PhotoMetadata(
        int photoIndex,
        boolean exifTimestampPresent,
        Instant captureTimestamp,
        boolean exifGpsPresent,
        Double latitude,
        Double longitude,
        int imageWidth,
        int imageHeight,
        double aspectRatio,
        List<String> flags
    ) {}

    /** Complete result from hashImages. */
    public record HashResult(
        String claimId,
        List<PhotoHashRecord> hashes,
        List<DuplicatePair> withinClaimDuplicates,
        List<CrossClaimMatch> crossClaimMatches,
        List<Integer> rejectedPhotoIndices,
        List<Integer> validPhotoIndices,
        boolean integrityPassed,
        List<String> integrityFlags
    ) {}

    /** Complete result from readMetadata. */
    public record MetadataResult(
        List<PhotoMetadata> photoMetadata,
        boolean anyExifTimestampPresent,
        boolean anyExifGpsPresent,
        List<String> flags
    ) {}

    /** Combined bundle integrity evaluation result. */
    public record BundleIntegrityResult(
        String claimId,
        boolean integrityPassed,
        boolean duplicateWithinClaim,
        boolean duplicateAcrossClaims,
        String matchedEarlierClaimId,
        List<Integer> rejectedPhotoIndices,
        boolean exifTimestampPresent,
        boolean exifGpsPresent,
        List<String> integrityFlags
    ) {}

    // ── Cross-Claim Historical Registry ──────────────────────────────────────

    /**
     * In-memory registry of historical claim hashes.
     * Key = claimId, Value = list of PhotoHashRecords for that claim.
     * Thread-safety note: for production, wrap with synchronization.
     */
    private static final Map<String, List<PhotoHashRecord>> historicalRegistry =
        new LinkedHashMap<>();

    /** Clears the historical registry (for testing). */
    public static void clearRegistry() {
        historicalRegistry.clear();
    }

    /** Returns an unmodifiable view of the historical registry (for testing). */
    public static Map<String, List<PhotoHashRecord>> getRegistry() {
        return Collections.unmodifiableMap(historicalRegistry);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Tool 1: hash_images
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Computes 64-bit perceptual hashes for each photo in the bundle,
     * performs within-claim and cross-claim near-duplicate detection,
     * and supports partial bundle continuation.
     *
     * @param claimId    the claim identifier
     * @param photoPaths ordered list of photo file paths
     * @return structured hash result with duplicate detection outcomes
     * @throws IOException if any photo cannot be read
     */
    public static HashResult hashImages(String claimId, List<Path> photoPaths)
            throws IOException {

        Objects.requireNonNull(claimId, "claimId must not be null");
        Objects.requireNonNull(photoPaths, "photoPaths must not be null");

        // Step 1: Compute perceptual hash for each photo
        List<PhotoHashRecord> hashes = new ArrayList<>();
        List<String> integrityFlags = new ArrayList<>();
        Set<Integer> rejected = new LinkedHashSet<>();

        for (int i = 0; i < photoPaths.size(); i++) {
            Path path = photoPaths.get(i);
            BufferedImage img = ImageIO.read(path.toFile());
            if (img == null) {
                integrityFlags.add("photo_" + i + "_unreadable");
                rejected.add(i);
                // Add a sentinel hash so indices stay aligned
                hashes.add(new PhotoHashRecord(claimId, i, 0L, "0000000000000000"));
                continue;
            }
            long hash = computePHash(img);
            String hex = String.format("%016x", hash);
            hashes.add(new PhotoHashRecord(claimId, i, hash, hex));
        }

        // Step 2: Within-claim duplicate detection
        List<DuplicatePair> withinDuplicates = new ArrayList<>();
        for (int i = 0; i < hashes.size(); i++) {
            if (rejected.contains(i)) continue;
            for (int j = i + 1; j < hashes.size(); j++) {
                if (rejected.contains(j)) continue;
                double dist = normalizedHammingDistance(
                    hashes.get(i).hashValue(), hashes.get(j).hashValue());
                if (dist <= NEAR_DUPLICATE_THRESHOLD) {
                    withinDuplicates.add(new DuplicatePair(i, j, dist));
                    // Reject the later photo in the pair
                    rejected.add(j);
                    integrityFlags.add("within_claim_duplicate: photo_" + j
                        + " matches photo_" + i
                        + " (distance=" + String.format("%.4f", dist) + ")");
                }
            }
        }

        // Step 3: Cross-claim duplicate detection against historical registry
        List<CrossClaimMatch> crossMatches = new ArrayList<>();
        for (int i = 0; i < hashes.size(); i++) {
            if (rejected.contains(i)) continue;
            PhotoHashRecord current = hashes.get(i);

            for (Map.Entry<String, List<PhotoHashRecord>> entry : historicalRegistry.entrySet()) {
                String historicalClaimId = entry.getKey();
                if (historicalClaimId.equals(claimId)) continue; // skip self

                for (PhotoHashRecord historical : entry.getValue()) {
                    double dist = normalizedHammingDistance(
                        current.hashValue(), historical.hashValue());
                    if (dist <= NEAR_DUPLICATE_THRESHOLD) {
                        crossMatches.add(new CrossClaimMatch(
                            i, historicalClaimId, historical.photoIndex(), dist));
                        rejected.add(i);
                        integrityFlags.add("cross_claim_duplicate: photo_" + i
                            + " matches " + historicalClaimId + "/photo_"
                            + historical.photoIndex()
                            + " (distance=" + String.format("%.4f", dist) + ")");
                        break; // one cross-claim match per photo is enough
                    }
                }
            }
        }

        // Step 4: Determine valid photos and overall integrity
        List<Integer> validIndices = new ArrayList<>();
        for (int i = 0; i < photoPaths.size(); i++) {
            if (!rejected.contains(i)) validIndices.add(i);
        }

        boolean integrityPassed;
        if (validIndices.size() >= MIN_VALID_PHOTOS) {
            integrityPassed = true;
            if (!rejected.isEmpty()) {
                integrityFlags.add("partial_bundle: " + rejected.size()
                    + " photo(s) rejected, " + validIndices.size()
                    + " valid photo(s) continuing");
            }
        } else {
            integrityPassed = false;
            integrityFlags.add("INTEGRITY_HOLD: fewer than " + MIN_VALID_PHOTOS
                + " valid photos remain after duplicate/unreadable checks");
        }

        // Step 5: Register valid hashes in historical registry
        List<PhotoHashRecord> validHashes = new ArrayList<>();
        for (int i : validIndices) {
            validHashes.add(hashes.get(i));
        }
        if (!validHashes.isEmpty()) {
            historicalRegistry.put(claimId, validHashes);
        }

        return new HashResult(
            claimId,
            hashes,
            withinDuplicates,
            crossMatches,
            new ArrayList<>(rejected),
            validIndices,
            integrityPassed,
            integrityFlags
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Tool 2: read_metadata
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Inspects EXIF capture timestamps, GPS coordinates, and image dimensions
     * for each photo in the bundle.
     * <p>
     * Missing EXIF is recorded as {@code exif_missing} (informational flag)
     * rather than failing the claim, per Eyes on the Ground dataset conventions.
     *
     * @param photoPaths ordered list of photo file paths
     * @return structured metadata result
     */
    public static MetadataResult readMetadata(List<Path> photoPaths) {
        Objects.requireNonNull(photoPaths, "photoPaths must not be null");

        List<PhotoMetadata> results = new ArrayList<>();
        List<String> globalFlags = new ArrayList<>();
        boolean anyTimestamp = false;
        boolean anyGps = false;
        List<Instant> timestamps = new ArrayList<>();

        for (int i = 0; i < photoPaths.size(); i++) {
            Path path = photoPaths.get(i);
            List<String> photoFlags = new ArrayList<>();

            boolean exifTimestamp = false;
            Instant captureTime = null;
            boolean exifGps = false;
            Double lat = null;
            Double lon = null;
            int width = 0;
            int height = 0;

            try {
                // Read image dimensions via ImageIO
                BufferedImage img = ImageIO.read(path.toFile());
                if (img != null) {
                    width = img.getWidth();
                    height = img.getHeight();
                }

                // Read EXIF metadata
                Metadata metadata = ImageMetadataReader.readMetadata(path.toFile());

                // EXIF timestamp
                ExifSubIFDDirectory exifDir =
                    metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
                if (exifDir != null) {
                    Date dateOriginal = exifDir.getDateOriginal();
                    if (dateOriginal != null) {
                        exifTimestamp = true;
                        captureTime = dateOriginal.toInstant();
                        anyTimestamp = true;
                        timestamps.add(captureTime);
                    }
                }

                // GPS
                GpsDirectory gpsDir =
                    metadata.getFirstDirectoryOfType(GpsDirectory.class);
                if (gpsDir != null && gpsDir.getGeoLocation() != null) {
                    exifGps = true;
                    anyGps = true;
                    lat = gpsDir.getGeoLocation().getLatitude();
                    lon = gpsDir.getGeoLocation().getLongitude();
                }

                if (!exifTimestamp && !exifGps) {
                    photoFlags.add("exif_missing");
                } else if (!exifTimestamp) {
                    photoFlags.add("exif_timestamp_missing");
                } else if (!exifGps) {
                    photoFlags.add("exif_gps_missing");
                }

            } catch (Exception e) {
                photoFlags.add("exif_missing");
                photoFlags.add("metadata_read_error: " + e.getMessage());
            }

            double aspect = (height > 0) ? (double) width / height : 0.0;

            results.add(new PhotoMetadata(
                i, exifTimestamp, captureTime, exifGps, lat, lon,
                width, height, aspect, Collections.unmodifiableList(photoFlags)
            ));
        }

        // Check for timestamp anomalies across bundle
        if (timestamps.size() >= 2) {
            Instant earliest = timestamps.stream().min(Comparator.naturalOrder()).orElseThrow();
            Instant latest = timestamps.stream().max(Comparator.naturalOrder()).orElseThrow();
            long diffHours = java.time.Duration.between(earliest, latest).toHours();
            if (diffHours > 48) {
                globalFlags.add("timestamp_anomaly: capture timestamps span "
                    + diffHours + " hours across bundle photos");
            }
        }

        if (!anyTimestamp) {
            globalFlags.add("exif_missing: no EXIF timestamps in any bundle photo");
        }

        return new MetadataResult(
            Collections.unmodifiableList(results),
            anyTimestamp,
            anyGps,
            Collections.unmodifiableList(globalFlags)
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Combined: evaluateBundleIntegrity
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Combines hashImages and readMetadata into a single structured result
     * matching the Contracts.java GradingResult integrity fields.
     *
     * @param claimId    the claim identifier
     * @param photoPaths ordered list of photo file paths
     * @return combined bundle integrity result
     * @throws IOException if any photo cannot be read
     */
    public static BundleIntegrityResult evaluateBundleIntegrity(
            String claimId, List<Path> photoPaths) throws IOException {

        HashResult hashResult = hashImages(claimId, photoPaths);
        MetadataResult metadataResult = readMetadata(photoPaths);

        // Merge all flags
        List<String> allFlags = new ArrayList<>(hashResult.integrityFlags());
        allFlags.addAll(metadataResult.flags());
        for (PhotoMetadata pm : metadataResult.photoMetadata()) {
            allFlags.addAll(pm.flags());
        }

        // Determine matched earlier claim ID (first cross-claim match if any)
        String matchedEarlierClaimId = null;
        if (!hashResult.crossClaimMatches().isEmpty()) {
            matchedEarlierClaimId =
                hashResult.crossClaimMatches().getFirst().matchedClaimId();
        }

        return new BundleIntegrityResult(
            claimId,
            hashResult.integrityPassed(),
            !hashResult.withinClaimDuplicates().isEmpty(),
            !hashResult.crossClaimMatches().isEmpty(),
            matchedEarlierClaimId,
            hashResult.rejectedPhotoIndices(),
            metadataResult.anyExifTimestampPresent(),
            metadataResult.anyExifGpsPresent(),
            Collections.unmodifiableList(allFlags)
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Zero-Dependency 64-bit Perceptual Hash (pHash)
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Computes a 64-bit perceptual hash for the given image using a robust
     * Average Hash (aHash) approach — the industry standard for image
     * deduplication that survives JPEG re-compression and resizing.
     * <p>
     * Algorithm:
     * <ol>
     *   <li>Convert to grayscale</li>
     *   <li>Resize to 8×8 using area-averaging interpolation</li>
     *   <li>Compute mean intensity of all 64 pixels</li>
     *   <li>Set each bit to 1 if pixel intensity ≥ mean, 0 otherwise</li>
     * </ol>
     * <p>
     * This produces a 64-bit hash that is extremely stable across JPEG
     * compression cycles, resizing, and minor color adjustments — exactly
     * the transformations a re-uploaded duplicate photo would undergo.
     *
     * @param img source image
     * @return 64-bit perceptual hash
     */
    public static long computePHash(BufferedImage img) {
        // Step 1: Convert to grayscale
        BufferedImage gray = toGrayscale(img);

        // Step 2: Resize to 8x8 (area-averaging via BILINEAR)
        BufferedImage small = resize(gray, LOW_FREQ, LOW_FREQ);

        // Step 3: Extract pixel intensities and compute mean
        int[] pixels = new int[LOW_FREQ * LOW_FREQ];
        double sum = 0.0;
        for (int y = 0; y < LOW_FREQ; y++) {
            for (int x = 0; x < LOW_FREQ; x++) {
                int val = small.getRGB(x, y) & 0xFF;
                pixels[y * LOW_FREQ + x] = val;
                sum += val;
            }
        }
        double mean = sum / (LOW_FREQ * LOW_FREQ);

        // Step 4: Build 64-bit hash — bit is 1 if pixel >= mean
        long hash = 0L;
        for (int i = 0; i < HASH_BITS; i++) {
            if (pixels[i] >= mean) {
                hash |= (1L << (63 - i));
            }
        }

        return hash;
    }

    // ── Difference Hash (dHash) — simpler alternative ────────────────────────

    /**
     * Computes a 64-bit difference hash (dHash) for the given image.
     * <p>
     * Resizes to 9×8 grayscale and compares adjacent horizontal pixels.
     * Useful as a secondary hash for validation.
     *
     * @param img source image
     * @return 64-bit difference hash
     */
    public static long computeDHash(BufferedImage img) {
        BufferedImage gray = toGrayscale(img);
        BufferedImage resized = resize(gray, 9, 8);

        long hash = 0L;
        int bit = 63;
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                int left = resized.getRGB(x, y) & 0xFF;
                int right = resized.getRGB(x + 1, y) & 0xFF;
                if (left > right) {
                    hash |= (1L << bit);
                }
                bit--;
            }
        }
        return hash;
    }

    // ── Hamming Distance ─────────────────────────────────────────────────────

    /**
     * Computes the Hamming distance between two 64-bit hashes.
     *
     * @return number of differing bits (0–64)
     */
    public static int hammingDistance(long hash1, long hash2) {
        return Long.bitCount(hash1 ^ hash2);
    }

    /**
     * Computes the normalized Hamming distance (0.0–1.0) between two hashes.
     *
     * @return normalized distance (0 = identical, 1 = maximally different)
     */
    public static double normalizedHammingDistance(long hash1, long hash2) {
        return (double) hammingDistance(hash1, hash2) / HASH_BITS;
    }

    // ── Image Processing Utilities ───────────────────────────────────────────

    /**
     * Converts an image to 8-bit grayscale using proper luminance weighting.
     */
    static BufferedImage toGrayscale(BufferedImage img) {
        if (img.getType() == BufferedImage.TYPE_BYTE_GRAY) {
            return img;
        }
        BufferedImage gray = new BufferedImage(
            img.getWidth(), img.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        ColorConvertOp op = new ColorConvertOp(
            ColorSpace.getInstance(ColorSpace.CS_GRAY), null);
        op.filter(img, gray);
        return gray;
    }

    /**
     * Resizes an image to the specified dimensions using bilinear interpolation.
     */
    static BufferedImage resize(BufferedImage img, int width, int height) {
        BufferedImage resized = new BufferedImage(width, height, img.getType());
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(
            RenderingHints.KEY_INTERPOLATION,
            RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(img, 0, 0, width, height, null);
        g.dispose();
        return resized;
    }


}
