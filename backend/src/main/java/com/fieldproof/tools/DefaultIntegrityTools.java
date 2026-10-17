package com.fieldproof.tools;

import com.fieldproof.core.CoreContracts;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Concrete implementation of CoreContracts.IntegrityTools wrapping ImageIntegrityTools.
 */
@Component
public class DefaultIntegrityTools implements CoreContracts.IntegrityTools {

    @Override
    public CoreContracts.HashReport hashImages(CoreContracts.ClaimPhotos photos) {
        if (photos == null || photos.photos() == null || photos.photos().isEmpty()) {
            return new CoreContracts.HashReport(true, false, false, null, List.of(), List.of("no_photos_to_hash"));
        }

        List<Path> tempPaths = new ArrayList<>();
        try {
            Path tempDir = Files.createTempDirectory("fp_integrity_");
            for (CoreContracts.PhotoRef ref : photos.photos()) {
                Path dest = tempDir.resolve("photo_" + ref.photoIndex() + "_" + ref.fileName());
                Files.write(dest, ref.bytes());
                tempPaths.add(dest);
            }

            ImageIntegrityTools.BundleIntegrityResult report =
                    ImageIntegrityTools.evaluateBundleIntegrity(photos.claimId(), tempPaths);

            return new CoreContracts.HashReport(
                    report.integrityPassed(),
                    report.duplicateWithinClaim(),
                    report.duplicateAcrossClaims(),
                    report.matchedEarlierClaimId(),
                    report.rejectedPhotoIndices() != null ? report.rejectedPhotoIndices() : List.of(),
                    report.integrityFlags() != null ? report.integrityFlags() : List.of()
            );
        } catch (Exception e) {
            return new CoreContracts.HashReport(false, false, false, null, List.of(), List.of("integrity_error: " + e.getMessage()));
        }
    }

    @Override
    public CoreContracts.MetadataReport readMetadata(CoreContracts.ClaimPhotos photos, CoreContracts.ClaimContext context) {
        if (photos == null || photos.photos() == null || photos.photos().isEmpty()) {
            return new CoreContracts.MetadataReport(false, false, null, null, List.of("no_photos_for_metadata"));
        }

        List<Path> tempPaths = new ArrayList<>();
        try {
            Path tempDir = Files.createTempDirectory("fp_meta_");
            for (CoreContracts.PhotoRef ref : photos.photos()) {
                Path dest = tempDir.resolve("photo_" + ref.photoIndex() + "_" + ref.fileName());
                Files.write(dest, ref.bytes());
                tempPaths.add(dest);
            }

            ImageIntegrityTools.MetadataResult res = ImageIntegrityTools.readMetadata(tempPaths);
            Double lat = null;
            Double lon = null;
            for (ImageIntegrityTools.PhotoMetadata pm : res.photoMetadata()) {
                if (pm.exifGpsPresent()) {
                    lat = pm.latitude();
                    lon = pm.longitude();
                    break;
                }
            }

            return new CoreContracts.MetadataReport(
                    res.anyExifTimestampPresent(),
                    res.anyExifGpsPresent(),
                    lat,
                    lon,
                    res.flags() != null ? res.flags() : List.of()
            );
        } catch (Exception e) {
            return new CoreContracts.MetadataReport(false, false, null, null, List.of("metadata_error: " + e.getMessage()));
        }
    }
}
