package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts;
import java.time.LocalDate;
import java.util.List;

/**
 * Pure Java contracts for Person B / Forensics / Concordance interfaces (docs/DAY2 §T2.3).
 */
public final class CoreContracts {
    private CoreContracts() {}

    public record ClaimContext(
            String claimId,
            String plotId,
            String season,
            LocalDate claimDate,
            Double latitude,
            Double longitude
    ) {}

    public record PhotoRef(
            int photoIndex,
            String fileName,
            byte[] bytes,
            String mimeType
    ) {}

    public record ClaimPhotos(
            String claimId,
            List<PhotoRef> photos
    ) {}

    public record HashReport(
            boolean integrityPassed,
            boolean duplicateWithinClaim,
            boolean duplicateAcrossClaims,
            String matchedEarlierClaimId,
            List<Integer> rejectedPhotoIndices,
            List<String> integrityFlags
    ) {}

    public record MetadataReport(
            boolean exifTimestampPresent,
            boolean exifGpsPresent,
            Double latitude,
            Double longitude,
            List<String> metadataFlags
    ) {}

    public record ConcordanceInputs(
            boolean indexPays,
            Contracts.SeverityBand photoBand,
            boolean abstained,
            Contracts.DamageType damageType,
            boolean satelliteStress,
            boolean dryspellOverlapsCriticalStage,
            boolean plotLevelRainLow,
            boolean integrityOk
    ) {}

    public interface IntegrityTools {
        HashReport hashImages(ClaimPhotos photos);
        MetadataReport readMetadata(ClaimPhotos photos, ClaimContext context);
    }

    public interface ConcordanceClassifier {
        ConcordanceTable.ConcordanceResult classify(ConcordanceInputs inputs);
    }
}
